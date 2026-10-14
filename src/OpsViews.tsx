import { useState } from "react"
import Icon from "./Icon"
import { presenceOf } from "./Deployment"
import { item, notify, withHistory, type Database, type RecordItem } from "./operations-data"

const SHIFT_MINUTES = 480
const done = (task: RecordItem) => ["Completed", "Closed"].includes(task.status)
const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)

export function WorkloadView({ db, onOpenTask }: { db: Database; onOpenTask: (task: RecordItem) => void }) {
  const [sort, setSort] = useState<"load" | "name">("load")
  const [expanded, setExpanded] = useState<string | null>(null)
  const staff = db.records["Staff & Roster"].filter(
    (person) => person.category === "Cleaner",
  )
  const rows = staff
    .map((person) => {
      const tasks = db.records.Tasks.filter((task) => task.assignee === person.title)
      const open = tasks.filter((task) => !done(task))
      const minutes = open.reduce((n, task) => n + task.duration, 0)
      const zone = (db.records["Shift Planning"] || []).find((z) => z.assignedStaff.includes(person.title))
      return {
        person,
        tasks,
        open,
        completed: tasks.filter(done).length,
        minutes,
        load: Math.round((minutes / SHIFT_MINUTES) * 100),
        zone: zone?.title || "Not deployed",
        note: open.length
          ? `${open.length} live task${open.length === 1 ? "" : "s"} · ${minutes} planned minutes`
          : "No active workload",
        overdue: open.filter((task) => new Date(task.due).getTime() < Date.now()).length,
        presence: presenceOf(db, person),
      }
    })
    .sort((a, b) => (sort === "load" ? b.load - a.load : a.person.title.localeCompare(b.person.title)))
  const avg = Math.round(rows.reduce((n, row) => n + row.load, 0) / (rows.length || 1))
  return (
    <div className="workload-view">
      <section className="workload-summary">
        {[
          ["Average utilisation", `${avg}%`, "of 8-hour shift capacity"],
          ["Over capacity", String(rows.filter((row) => row.load > 85).length), "staff above 85%"],
          ["Available capacity", String(rows.filter((row) => row.load < 40 && row.presence === "online").length), "online staff below 40%"],
          ["Overdue work", String(rows.reduce((n, row) => n + row.overdue, 0)), "open tasks past due"],
        ].map(([label, value, detail]) => (
          <article key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
            <span>{detail}</span>
          </article>
        ))}
      </section>
      <section className="workload-table">
        <header>
          <h2>Workload by employee</h2>
          <div className="issue-tabs">
            <button className={sort === "load" ? "selected" : ""} onClick={() => setSort("load")}>
              Highest load
            </button>
            <button className={sort === "name" ? "selected" : ""} onClick={() => setSort("name")}>
              Name
            </button>
          </div>
        </header>
        {rows.map((row) => (
          <div key={row.person.id} className="workload-row-wrap">
            <button className="workload-row" onClick={() => setExpanded(expanded === row.person.title ? null : row.person.title)}>
              <span className="deploy-avatar">
                {initials(row.person.title)}
                <i className={row.presence} />
              </span>
              <span className="workload-name">
                <strong>{row.person.title}</strong>
                <small>
                  {row.zone} · {row.person.status}
                </small>
              </span>
              <span className="workload-bar">
                <i className={row.load > 85 ? "high" : row.load < 40 ? "low" : ""} style={{ width: `${Math.min(100, row.load)}%` }} />
              </span>
              <b>{row.load}%</b>
              <span className="workload-counts">
                <span>{row.open.length} open</span>
                <span>{row.completed} done</span>
                {row.overdue > 0 && <span className="bad">{row.overdue} overdue</span>}
              </span>
              <Icon name="chevron" size={15} />
            </button>
            {expanded === row.person.title && (
              <div className="workload-detail">
                {row.note && <p>{row.note}</p>}
                {row.open.map((task) => (
                  <button key={task.id} onClick={() => onOpenTask(task)}>
                    <strong>{task.title}</strong>
                    <small>
                      {task.location} · {task.duration} min · {task.status}
                    </small>
                  </button>
                ))}
                {!row.open.length && <p>No open tasks. Available for urgent dispatch.</p>}
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}

type HandoverProps = {
  db: Database
  role: string
  me: string
  worker: boolean
  onCommit: (next: Database, message: string) => boolean
  onOpen: (record: RecordItem) => void
}

const steps = ["Tasks", "Requests", "Supplies", "Equipment", "Notes"] as const

export function HandoverFlow({ db, role, me, worker, onCommit, onOpen }: HandoverProps) {
  const [tab, setTab] = useState<"outgoing" | "incoming" | "history">(worker ? "outgoing" : "incoming")
  const [step, setStep] = useState(0)
  const [notes, setNotes] = useState("")
  const [destination, setDestination] = useState(
    worker ? "Shift Supervisor" : "Afternoon shift",
  )
  const [flags, setFlags] = useState<Record<string, string>>({})
  const [reviewing, setReviewing] = useState<string | null>(null)
  const scope =
    worker && role === "Guard"
      ? [...db.records.Patrols, ...db.records.Incidents].filter(
          (record) => record.assignee === me,
        )
      : worker
        ? db.records.Tasks.filter((task) => task.assignee === me)
        : db.records.Tasks
  const openTasks = scope.filter((t) => !done(t))
  const requests = db.records["Service Requests"].filter(
    (r) =>
      !["Closed", "Completed"].includes(r.status) &&
      (!worker || r.assignee === me),
  )
  const custody = worker
    ? Object.entries((db.custody || {})[me] || {}).filter(([, n]) => n > 0).map(([k, n]) => `${n} × ${k}`)
    : db.records["Supply Requests"].filter((r) => ["Submitted", "Approved", "Partially issued"].includes(r.status)).map((r) => `${r.title} ×${r.quantity} · ${r.status}`)
  const equipment = db.records.Equipment.filter(
    (e) =>
      e.status.toLowerCase() !== "available" &&
      (!worker || e.assignee === me),
  )
  const incoming = db.records.Handover.filter((h) => ["Submitted", "Acknowledged"].includes(h.status))
  const lists: Record<(typeof steps)[number], { key: string; label: string; meta: string }[]> = {
    Tasks: openTasks.map((t) => ({ key: t.id, label: t.title, meta: `${t.status} · ${t.assignee || "Unassigned"} · ${t.location}` })),
    Requests: requests.map((r) => ({ key: r.id, label: r.title, meta: `${r.status} · ${r.priority} · ${r.location}` })),
    Supplies: custody.map((c) => ({ key: c, label: c, meta: worker ? "In your custody" : "Pending supply" })),
    Equipment: equipment.map((e) => ({ key: e.id, label: e.title, meta: `${e.status} · ${e.location}` })),
    Notes: [],
  }

  function submit() {
    const summary = steps
      .slice(0, 4)
      .map((name) => {
        const items = lists[name]
        return `${name} (${items.length}): ${items.map((i) => `${i.label}${flags[i.key] ? ` [${flags[i.key]}]` : ""}`).join("; ") || "none"}`
      })
      .join("\n")
    const record = withHistory(
      item(`${worker ? me : "Morning shift"} → ${destination} · ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`, {
        status: "Submitted",
        assignee: worker ? me : "Faisal Al-Harbi",
        requester: destination,
        notes: `${notes.trim() ? `${notes.trim()}\n` : ""}${summary}`,
        quantity: openTasks.length + requests.length,
        createdAt: new Date().toISOString(),
        createdBy: worker ? me : role,
      }),
      `Submitted by ${worker ? me : role}`,
    )
    const next = notify(
      { ...db, records: { ...db.records, Handover: [record, ...db.records.Handover.filter((h) => !(h.status === "Draft" && h.assignee === record.assignee))] } },
      "Supervisors",
      `Handover submitted: ${record.title}`,
      "Handover",
      record.id,
    )
    if (onCommit(next, "Handover submitted to incoming shift")) {
      setStep(0)
      setNotes("")
      setDestination(worker ? "Shift Supervisor" : "Afternoon shift")
      setFlags({})
      setTab(worker ? "history" : "incoming")
    }
  }

  function advance(record: RecordItem, status: "Acknowledged" | "Closed") {
    const updated = withHistory({ ...record, status }, `${status === "Closed" ? "Responsibility accepted" : "Acknowledged"} by ${role}`)
    let next: Database = {
      ...db,
      records: { ...db.records, Handover: db.records.Handover.map((h) => (h.id === record.id ? updated : h)) },
    }
    if (status === "Closed") {
      next.records.Tasks = next.records.Tasks.map((t) =>
        done(t) || !record.notes.includes(t.title)
          ? t
          : withHistory(
              t,
              `Carried over to incoming shift via “${record.title}”`,
            ),
      )
      next = notify(next, record.assignee || "Supervisors", `Your handover was accepted: ${record.title}`, "Handover", record.id)
    }
    if (onCommit(next, status === "Closed" ? "Responsibility accepted · open work carried over" : "Handover acknowledged")) setReviewing(status === "Closed" ? null : record.id)
  }

  const current = steps[step]
  return (
    <div className="handover-flow">
      <div className="issue-tabs handover-tabs">
        <button className={tab === "outgoing" ? "selected" : ""} onClick={() => setTab("outgoing")}>
          Hand over my shift
        </button>
        {!worker && (
          <button className={tab === "incoming" ? "selected" : ""} onClick={() => setTab("incoming")}>
            Incoming {incoming.length > 0 && <b>{incoming.length}</b>}
          </button>
        )}
        <button className={tab === "history" ? "selected" : ""} onClick={() => setTab("history")}>
          History
        </button>
      </div>

      {tab === "outgoing" && (
        <section className="handover-card">
          <ol className="handover-steps">
            {steps.map((name, index) => (
              <li key={name} className={index === step ? "active" : index < step ? "done" : ""}>
                <button onClick={() => setStep(index)}>
                  <span>{index < step ? <Icon name="check" size={13} /> : index + 1}</span>
                  {name}
                  {name !== "Notes" && <em>{lists[name].length}</em>}
                </button>
              </li>
            ))}
          </ol>
          <div className="handover-body">
            <h2>
              {current === "Notes" ? "Final notes & submit" : `Review outstanding ${current.toLowerCase()}`}
            </h2>
            <p className="ops-muted">
              {current === "Notes"
                ? "Anything the incoming shift must know. Open items above are attached automatically and keep their history."
                : "Collected automatically. Flag anything that needs attention from the incoming shift."}
            </p>
            {current !== "Notes" ? (
              <div className="handover-items">
                {lists[current].map((entry) => (
                  <div key={entry.key} className={flags[entry.key] ? "flagged" : ""}>
                    <span>
                      <strong>{entry.label}</strong>
                      <small>{entry.meta}</small>
                    </span>
                    <select
                      aria-label={`Handover flag for ${entry.label}`}
                      value={flags[entry.key] || ""}
                      onChange={(e) => setFlags({ ...flags, [entry.key]: e.target.value })}
                    >
                      <option value="">Carry over</option>
                      <option>Priority</option>
                      <option>Needs follow-up</option>
                      <option>Blocked</option>
                    </select>
                  </div>
                ))}
                {!lists[current].length && (
                  <div className="handover-clear">
                    <Icon name="check" size={18} /> Nothing outstanding
                  </div>
                )}
              </div>
            ) : (
              <>
                <label className="handover-destination">
                  Handover to
                  <select
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                  >
                    {worker ? (
                      <>
                        <option>Shift Supervisor</option>
                        <option>Relief Supervisor</option>
                      </>
                    ) : (
                      <>
                        <option>Afternoon shift</option>
                        <option>Night shift</option>
                        <option>Duty manager</option>
                      </>
                    )}
                  </select>
                </label>
                <div className="handover-recap">
                  {steps.slice(0, 4).map((name) => (
                    <span key={name}>
                      <b>{lists[name].length}</b>
                      {name}
                    </span>
                  ))}
                </div>
                <textarea
                  rows={4}
                  placeholder="e.g. Ward 4 bay 3 needs terminal clean after 16:00 discharge. Spill kit in OPD restocked."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </>
            )}
            <footer>
              <button disabled={step === 0} onClick={() => setStep(step - 1)}>
                Back
              </button>
              {step < steps.length - 1 ? (
                <button className="ops-primary" onClick={() => setStep(step + 1)}>
                  Continue
                </button>
              ) : (
                <button className="ops-primary" onClick={submit}>
                  Submit handover
                </button>
              )}
            </footer>
          </div>
        </section>
      )}

      {tab === "incoming" && (
        <section className="handover-incoming">
          {incoming.map((record) => {
            const lines = record.notes.split("\n").filter(Boolean)
            const open = reviewing === record.id
            return (
              <article key={record.id} className={open ? "open" : ""}>
                <header onClick={() => setReviewing(open ? null : record.id)}>
                  <span className="deploy-avatar">{initials(record.assignee || "FA")}</span>
                  <div>
                    <strong>{record.title}</strong>
                    <small>
                      From {record.assignee || "outgoing shift"} to{" "}
                      {record.requester || "incoming shift"} ·{" "}
                      {record.createdAt ? new Date(record.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "earlier"}
                    </small>
                  </div>
                  <span className={`m-pill ${record.status === "Submitted" ? "warn" : "ok"}`}>{record.status}</span>
                </header>
                {open && (
                  <div className="handover-review">
                    {lines.map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                    <div className="handover-review-actions">
                      <button onClick={() => onOpen(record)}>Open full record</button>
                      {record.status === "Submitted" ? (
                        <button className="ops-primary" onClick={() => advance(record, "Acknowledged")}>
                          <Icon name="check" size={15} /> Acknowledge
                        </button>
                      ) : (
                        <button className="ops-primary" onClick={() => advance(record, "Closed")}>
                          <Icon name="shield" size={15} /> Accept responsibility
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            )
          })}
          {!incoming.length && (
            <div className="m-empty">
              <span>
                <Icon name="check" size={22} />
              </span>
              <strong>No handovers waiting</strong>
              <small>Submitted handovers from the outgoing shift appear here.</small>
            </div>
          )}
        </section>
      )}

      {tab === "history" && (
        <section className="handover-incoming">
          {[...db.records.Handover.filter((h) => (worker ? h.assignee === me : true) && h.status !== "Draft")]
            .map((record) => (
              <article key={record.id}>
                <header onClick={() => onOpen(record)}>
                  <span className="deploy-avatar">{initials(record.assignee || "FA")}</span>
                  <div>
                    <strong>{record.title}</strong>
                    <small>{record.notes.split("\n")[0]}</small>
                  </div>
                  <span className={`m-pill ${record.status === "Closed" ? "ok" : "warn"}`}>
                    {record.status === "Closed" ? "Accepted" : record.status}
                  </span>
                </header>
              </article>
            ))}
        </section>
      )}
    </div>
  )
}
