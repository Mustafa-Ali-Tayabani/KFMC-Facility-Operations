import { useMemo, useState, type CSSProperties } from "react"
import Icon from "./Icon"
import {
  dayKey,
  item,
  weekStart,
  weekdays,
  type Database,
  type RecordItem,
} from "./operations-data"

type Commit = (next: Database, message: string) => unknown
type Confirm = (
  title: string,
  message: string,
  action: () => void,
  confirmLabel?: string,
  destructive?: boolean,
) => void

const palette = ["#20775b", "#c27a12", "#3d4f9a", "#6b5aa6", "#b4372c", "#2f7f9a"]
const minutes = (time = "00:00") => {
  const [h, m] = time.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}
/** Shift length in minutes, wrapping past midnight. */
export function shiftLength(shift: RecordItem) {
  const span = (minutes(shift.endTime) - minutes(shift.plannedStart) + 1440) % 1440
  return span || 1440
}
const hours = (mins: number) =>
  `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}`

export function ShiftManagement({
  db,
  onCommit,
  onConfirm,
}: {
  db: Database
  onCommit: Commit
  onConfirm: Confirm
}) {
  const shifts = db.records.Shifts || []
  const [draft, setDraft] = useState<RecordItem | null>(null)
  const [error, setError] = useState("")
  const today = dayKey(new Date())
  const rosteredToday = (title: string) =>
    Object.values(db.roster || {}).filter((days) => days[today] === title).length
  const isNew = draft ? !shifts.some((shift) => shift.id === draft.id) : false

  function edit(shift: RecordItem) {
    setDraft({ ...shift, days: [...(shift.days || weekdays)] })
    setError("")
  }
  function create() {
    edit(
      item("", {
        plannedStart: "07:00",
        endTime: "15:00",
        breakMins: 60,
        requiredCount: 2,
        days: [...weekdays],
        color: palette[shifts.length % palette.length],
        category: "Day",
        status: "Active",
        notes: "",
      }),
    )
  }
  function save() {
    if (!draft) return
    const title = draft.title.trim()
    if (!title) return setError("Enter a shift name.")
    if (["Off", "Leave"].includes(title))
      return setError("“Off” and “Leave” are reserved roster values.")
    if (shifts.some((s) => s.id !== draft.id && s.title.toLowerCase() === title.toLowerCase()))
      return setError("A shift with this name already exists.")
    if (!draft.plannedStart || !draft.endTime) return setError("Enter a start and end time.")
    if (draft.plannedStart === draft.endTime) return setError("Start and end time cannot be the same.")
    if ((draft.breakMins || 0) >= shiftLength(draft))
      return setError("The break must be shorter than the shift.")
    if (draft.requiredCount < 1) return setError("Required coverage must be at least 1.")
    if (!draft.days?.length) return setError("Select at least one working day.")
    const previous = shifts.find((s) => s.id === draft.id)
    const record = { ...draft, title }
    // Keep roster entries pointing at the shift when it is renamed.
    const roster =
      previous && previous.title !== title
        ? Object.fromEntries(
            Object.entries(db.roster || {}).map(([person, days]) => [
              person,
              Object.fromEntries(
                Object.entries(days).map(([date, value]) => [
                  date,
                  value === previous.title ? title : value,
                ]),
              ),
            ]),
          )
        : db.roster
    const ok = onCommit(
      {
        ...db,
        roster,
        records: {
          ...db.records,
          Shifts: previous
            ? shifts.map((s) => (s.id === record.id ? record : s))
            : [...shifts, record],
        },
      },
      previous ? `Shift “${title}” updated` : `Shift “${title}” created`,
    )
    if (ok !== false) setDraft(null)
  }
  function toggleActive(shift: RecordItem) {
    const status = shift.status === "Inactive" ? "Active" : "Inactive"
    onCommit(
      {
        ...db,
        records: {
          ...db.records,
          Shifts: shifts.map((s) => (s.id === shift.id ? { ...s, status } : s)),
        },
      },
      `Shift “${shift.title}” ${status === "Active" ? "activated" : "deactivated"}`,
    )
  }
  function remove(shift: RecordItem) {
    const used = Object.values(db.roster || {}).some((days) =>
      Object.entries(days).some(([date, value]) => value === shift.title && date >= today),
    )
    if (used)
      return setError(
        "This shift is on the upcoming roster. Reassign those days or deactivate the shift instead.",
      )
    onConfirm(
      "Delete this shift?",
      `“${shift.title}” will be removed from shift management. Past roster history keeps its name.`,
      () => {
        onCommit(
          { ...db, records: { ...db.records, Shifts: shifts.filter((s) => s.id !== shift.id) } },
          `Shift “${shift.title}” deleted`,
        )
        setDraft(null)
      },
      "Delete shift",
      true,
    )
  }

  return (
    <div className="shift-mgmt">
      <header className="master-head">
        <div>
          <p>
            Define shift timings, breaks, working days and the minimum headcount
            each shift needs. Shift Assignment uses these definitions.
          </p>
        </div>
        <button className="ops-primary" onClick={create}>
          <Icon name="plus" size={17} /> New shift
        </button>
      </header>
      <div className={`shift-mgmt-body ${draft ? "editing" : ""}`}>
        <section className="shift-cards">
          {shifts.map((shift) => {
            const length = shiftLength(shift)
            const count = rosteredToday(shift.title)
            const short = count < shift.requiredCount
            return (
              <article
                key={shift.id}
                className={`${shift.status === "Inactive" ? "inactive" : ""} ${draft?.id === shift.id ? "selected" : ""}`}
                style={{ "--shift": shift.color || palette[0] } as CSSProperties}
              >
                <header>
                  <i />
                  <div>
                    <strong>{shift.title}</strong>
                    <small>{shift.category} shift</small>
                  </div>
                  <span className={`m-pill ${shift.status === "Inactive" ? "" : "ok"}`}>
                    {shift.status === "Inactive" ? "Inactive" : "Active"}
                  </span>
                </header>
                <div className="shift-time">
                  {shift.plannedStart} <span>→</span> {shift.endTime}
                  {minutes(shift.endTime) <= minutes(shift.plannedStart) && <em>+1 day</em>}
                </div>
                <dl>
                  <div>
                    <dt>Length</dt>
                    <dd>{hours(length)}</dd>
                  </div>
                  <div>
                    <dt>Break</dt>
                    <dd>{shift.breakMins || 0}m</dd>
                  </div>
                  <div>
                    <dt>Net hours</dt>
                    <dd>{hours(length - (shift.breakMins || 0))}</dd>
                  </div>
                  <div>
                    <dt>Min. coverage</dt>
                    <dd>{shift.requiredCount}</dd>
                  </div>
                </dl>
                <div className="shift-days" aria-label="Working days">
                  {weekdays.map((day) => (
                    <span key={day} className={shift.days?.includes(day) ? "on" : ""}>
                      {day[0]}
                    </span>
                  ))}
                </div>
                <div className={`shift-today ${short ? "short" : ""}`}>
                  <span>Rostered today</span>
                  <b>
                    {count}/{shift.requiredCount}
                  </b>
                  <div>
                    <i style={{ width: `${Math.min(100, (count / Math.max(1, shift.requiredCount)) * 100)}%` }} />
                  </div>
                </div>
                {shift.notes && <p>{shift.notes}</p>}
                <footer>
                  <button onClick={() => edit(shift)}>Edit</button>
                  <button onClick={() => toggleActive(shift)}>
                    {shift.status === "Inactive" ? "Activate" : "Deactivate"}
                  </button>
                </footer>
              </article>
            )
          })}
          {!shifts.length && (
            <div className="ops-empty">
              <h2>No shifts defined</h2>
              <p>Create the first shift to start building the roster.</p>
            </div>
          )}
        </section>
        {draft && (
          <aside className="shift-editor">
            <header>
              <div>
                <span className="eyebrow">{isNew ? "New shift" : "Edit shift"}</span>
                <h3>{draft.title || "Untitled shift"}</h3>
              </div>
              <button aria-label="Close editor" onClick={() => setDraft(null)}>
                ×
              </button>
            </header>
            <label>
              Shift name
              <input
                autoFocus
                value={draft.title}
                placeholder="e.g. Morning"
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <div className="ops-form-grid">
              <label>
                Start time
                <input
                  type="time"
                  value={draft.plannedStart}
                  onChange={(e) => setDraft({ ...draft, plannedStart: e.target.value })}
                />
              </label>
              <label>
                End time
                <input
                  type="time"
                  value={draft.endTime}
                  onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                />
              </label>
              <label>
                Break (minutes)
                <input
                  type="number"
                  min="0"
                  value={draft.breakMins || 0}
                  onChange={(e) => setDraft({ ...draft, breakMins: Number(e.target.value) })}
                />
              </label>
              <label>
                Minimum coverage
                <input
                  type="number"
                  min="1"
                  value={draft.requiredCount}
                  onChange={(e) => setDraft({ ...draft, requiredCount: Number(e.target.value) })}
                />
              </label>
            </div>
            <label>
              Shift type
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              >
                {["Day", "Evening", "Night", "Office", "On-call"].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend>Working days</legend>
              <div className="shift-day-toggles">
                {weekdays.map((day) => {
                  const on = draft.days?.includes(day)
                  return (
                    <button
                      type="button"
                      key={day}
                      aria-pressed={on}
                      className={on ? "selected" : ""}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          days: on
                            ? (draft.days || []).filter((d) => d !== day)
                            : weekdays.filter((d) => d === day || draft.days?.includes(d)),
                        })
                      }
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend>Roster colour</legend>
              <div className="shift-swatches">
                {palette.map((color) => (
                  <button
                    type="button"
                    key={color}
                    aria-label={`Colour ${color}`}
                    aria-pressed={draft.color === color}
                    className={draft.color === color ? "selected" : ""}
                    style={{ background: color }}
                    onClick={() => setDraft({ ...draft, color })}
                  />
                ))}
              </div>
            </fieldset>
            <label>
              Notes
              <textarea
                rows={3}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </label>
            <p className="ops-muted">
              {hours(shiftLength(draft))} shift · {hours(Math.max(0, shiftLength(draft) - (draft.breakMins || 0)))} net
              {minutes(draft.endTime) <= minutes(draft.plannedStart) ? " · ends the next day" : ""}
            </p>
            {error && (
              <p className="ops-error" role="alert">
                {error}
              </p>
            )}
            <footer>
              {!isNew && (
                <button className="ops-danger" onClick={() => remove(draft)}>
                  Delete
                </button>
              )}
              <button onClick={() => setDraft(null)}>Cancel</button>
              <button className="ops-primary" onClick={save}>
                Save shift
              </button>
            </footer>
          </aside>
        )}
      </div>
    </div>
  )
}

export function ShiftAssignment({
  db,
  onCommit,
  onConfirm,
}: {
  db: Database
  onCommit: Commit
  onConfirm: Confirm
}) {
  const shifts = db.records.Shifts || []
  const activeShifts = shifts.filter((s) => s.status !== "Inactive")
  const roster = db.roster || {}
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("All")
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [bulkShift, setBulkShift] = useState(activeShifts[0]?.title || "")
  const [bulkDays, setBulkDays] = useState<Set<number>>(new Set([0, 1, 2, 3, 4]))
  const start = useMemo(() => {
    const d = weekStart()
    d.setDate(d.getDate() + offset * 7)
    return d
  }, [offset])
  const dates = weekdays.map((_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
  const keys = dates.map(dayKey)
  const today = dayKey(new Date())
  const people = (db.records["Staff & Roster"] || []).filter((p) => p.status !== "Inactive")
  const categories = ["All", ...new Set(people.map((p) => p.category))]
  const visible = people.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      `${p.title} ${p.code} ${p.department}`.toLowerCase().includes(query.toLowerCase()),
  )
  const shiftOf = (title: string) => shifts.find((s) => s.title === title)
  const value = (person: string, key: string) => roster[person]?.[key] || ""
  // Less than 8 h rest: a shift that ends after the next shift would start, accounting for overnight wrap.
  const restWarning = (person: string, index: number) => {
    const current = shiftOf(value(person, keys[index]))
    const prevDate = new Date(dates[index])
    prevDate.setDate(prevDate.getDate() - 1)
    const previous = shiftOf(value(person, dayKey(prevDate)))
    if (!current || !previous) return false
    const prevEnd = minutes(previous.plannedStart) + shiftLength(previous) - 1440
    return minutes(current.plannedStart) - prevEnd < 8 * 60
  }
  const coverage = activeShifts.map((shift) => ({
    shift,
    counts: keys.map((key, i) => {
      const scheduled = shift.days?.includes(weekdays[i]) ?? true
      const count = people.filter((p) => value(p.title, key) === shift.title).length
      return { count, required: scheduled ? shift.requiredCount : 0 }
    }),
  }))
  const gaps = coverage.reduce(
    (n, row) => n + row.counts.reduce((m, c) => m + Math.max(0, c.required - c.count), 0),
    0,
  )
  const unassigned = visible.reduce((n, p) => n + keys.filter((k) => !value(p.title, k)).length, 0)
  const warnings = visible.reduce(
    (n, p) => n + keys.filter((_, i) => restWarning(p.title, i)).length,
    0,
  )
  const range = `${dates[0].toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} – ${dates[6].toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`

  function apply(changes: { person: string; key: string; value: string }[], message: string) {
    const next: Record<string, Record<string, string>> = { ...roster }
    changes.forEach(({ person, key, value: v }) => {
      const days = { ...(next[person] || {}) }
      if (v) days[key] = v
      else delete days[key]
      next[person] = days
    })
    return onCommit({ ...db, roster: next }, message)
  }
  function applyBulk() {
    if (!picked.size || !bulkShift || !bulkDays.size) return
    const changes = [...picked].flatMap((person) =>
      [...bulkDays].map((i) => ({ person, key: keys[i], value: bulkShift })),
    )
    if (apply(changes, `${bulkShift} assigned to ${picked.size} staff · ${bulkDays.size} day${bulkDays.size === 1 ? "" : "s"}`) !== false)
      setPicked(new Set())
  }
  function copyPreviousWeek() {
    const changes = visible.flatMap((p) =>
      dates.map((d, i) => {
        const prev = new Date(d)
        prev.setDate(prev.getDate() - 7)
        return { person: p.title, key: keys[i], value: value(p.title, dayKey(prev)) }
      }),
    )
    onConfirm(
      "Copy previous week?",
      `The roster for ${visible.length} staff in ${range} will be replaced with the previous week's pattern.`,
      () => apply(changes, `Roster copied from previous week · ${range}`),
      "Copy roster",
    )
  }
  const allPicked = visible.length > 0 && visible.every((p) => picked.has(p.title))

  return (
    <div className="shift-assign">
      <header className="master-head">
        <div>
          <p>
            Assign each person to a shift, rest day or leave. Coverage is checked
            against the minimum headcount in Shift Management.
          </p>
        </div>
        <div className="shift-week-nav">
          <button aria-label="Previous week" onClick={() => setOffset(offset - 1)}>
            ‹
          </button>
          <span>
            <strong>{offset === 0 ? "This week" : offset === 1 ? "Next week" : offset === -1 ? "Last week" : "Week"}</strong>
            <small>{range}</small>
          </span>
          <button aria-label="Next week" onClick={() => setOffset(offset + 1)}>
            ›
          </button>
          {offset !== 0 && <button onClick={() => setOffset(0)}>Today</button>}
        </div>
      </header>

      <div className="staff-summary">
        {[
          ["Staff on roster", visible.length, ""],
          ["Coverage gaps", gaps, gaps ? "bad" : "ok"],
          ["Unassigned days", unassigned, unassigned ? "warn" : "ok"],
          ["Rest warnings (<8h)", warnings, warnings ? "bad" : "ok"],
        ].map(([label, count, tone]) => (
          <article key={String(label)} className={String(tone)}>
            <small>{label}</small>
            <strong>{count}</strong>
          </article>
        ))}
      </div>

      <div className="staff-filters">
        <label>
          <Icon name="search" size={17} />
          <input
            aria-label="Search staff"
            placeholder="Search name, ID, department…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select aria-label="Staff category" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button onClick={copyPreviousWeek}>
          <Icon name="arrow" size={15} /> Copy previous week
        </button>
        <span>{visible.length} staff shown</span>
      </div>

      {picked.size > 0 && (
        <div className="shift-bulk" role="region" aria-label="Bulk assignment">
          <strong>{picked.size} selected</strong>
          <label>
            Shift
            <select value={bulkShift} onChange={(e) => setBulkShift(e.target.value)}>
              {activeShifts.map((s) => (
                <option key={s.id} value={s.title}>
                  {s.title} · {s.plannedStart}–{s.endTime}
                </option>
              ))}
              <option value="Off">Rest day</option>
              <option value="Leave">Leave</option>
            </select>
          </label>
          <div className="shift-day-toggles">
            {weekdays.map((day, i) => (
              <button
                type="button"
                key={day}
                aria-pressed={bulkDays.has(i)}
                className={bulkDays.has(i) ? "selected" : ""}
                onClick={() => {
                  const next = new Set(bulkDays)
                  if (next.has(i)) next.delete(i)
                  else next.add(i)
                  setBulkDays(next)
                }}
              >
                {day}
              </button>
            ))}
          </div>
          <button className="ops-primary" disabled={!bulkDays.size} onClick={applyBulk}>
            Apply to selected
          </button>
          <button onClick={() => setPicked(new Set())}>Clear</button>
        </div>
      )}

      <div className="roster-wrap">
        <table className="roster-table">
          <thead>
            <tr>
              <th>
                <label className="roster-person">
                  <input
                    type="checkbox"
                    aria-label="Select all staff"
                    checked={allPicked}
                    onChange={() =>
                      setPicked(allPicked ? new Set() : new Set(visible.map((p) => p.title)))
                    }
                  />
                  Staff member
                </label>
              </th>
              {dates.map((d, i) => (
                <th key={keys[i]} className={keys[i] === today ? "today" : ""}>
                  <span>{weekdays[i]}</span>
                  <small>{d.getDate()}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((person) => (
              <tr key={person.id}>
                <th>
                  <label className="roster-person">
                    <input
                      type="checkbox"
                      aria-label={`Select ${person.title}`}
                      checked={picked.has(person.title)}
                      onChange={() => {
                        const next = new Set(picked)
                        if (next.has(person.title)) next.delete(person.title)
                        else next.add(person.title)
                        setPicked(next)
                      }}
                    />
                    <span>
                      <strong>{person.title}</strong>
                      <small>
                        {person.category} · {person.code}
                      </small>
                    </span>
                  </label>
                </th>
                {keys.map((key, i) => {
                  const v = value(person.title, key)
                  const shift = shiftOf(v)
                  const warn = restWarning(person.title, i)
                  return (
                    <td key={key} className={key === today ? "today" : ""}>
                      <select
                        aria-label={`${person.title} · ${weekdays[i]} ${dates[i].getDate()}`}
                        className={`roster-chip ${shift ? "shift" : v ? v.toLowerCase() : "empty"} ${warn ? "warn" : ""}`}
                        style={shift ? ({ "--shift": shift.color } as CSSProperties) : undefined}
                        title={warn ? "Less than 8 hours rest after the previous shift" : undefined}
                        value={v}
                        onChange={(e) =>
                          apply(
                            [{ person: person.title, key, value: e.target.value }],
                            `${person.title} · ${weekdays[i]} ${dates[i].getDate()} → ${e.target.value || "unassigned"}`,
                          )
                        }
                      >
                        <option value="">—</option>
                        {activeShifts.map((s) => (
                          <option key={s.id} value={s.title}>
                            {s.title}
                          </option>
                        ))}
                        {v && !shift && !["Off", "Leave"].includes(v) && <option value={v}>{v}</option>}
                        <option value="Off">Off</option>
                        <option value="Leave">Leave</option>
                      </select>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            {coverage.map(({ shift, counts }) => (
              <tr key={shift.id}>
                <th>
                  <span className="roster-legend" style={{ "--shift": shift.color } as CSSProperties}>
                    <i /> {shift.title} coverage
                  </span>
                </th>
                {counts.map((c, i) => (
                  <td
                    key={keys[i]}
                    className={!c.required ? "na" : c.count < c.required ? "short" : "met"}
                  >
                    {c.required ? `${c.count}/${c.required}` : c.count ? String(c.count) : "–"}
                  </td>
                ))}
              </tr>
            ))}
          </tfoot>
        </table>
        {!visible.length && (
          <div className="ops-empty">
            <h2>No staff found</h2>
            <p>Adjust the search or category filter.</p>
          </div>
        )}
      </div>
    </div>
  )
}
