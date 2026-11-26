import { useEffect, useState, type ReactNode } from "react"
import Icon from "./Icon"
import {
  housingKey,
  loadHousing,
  ccList,
  housingTerms,
  relocationReasons,
  saveHousing,
  stagesFor,
  unitName,
  unitStatuses,
  type HousingDb,
  type HousingRequest,
  type Movement,
  type MovementType,
  type RequestKind,
  type Resident,
  type Unit,
  type UnitStatus,
  type WaitingEntry,
} from "./housing-data"

export function useHousing() {
  const [db, setDb] = useState<HousingDb>(loadHousing)
  useEffect(() => {
    const sync = (e: StorageEvent) => e.key === housingKey && setDb(loadHousing())
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [])
  const save = (next: HousingDb) => {
    saveHousing(next)
    setDb(next)
  }
  return [db, save] as const
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—")
const stamp = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
const statusTone = (s: string) => (["Occupied", "Completed", "Done", "Approved"].includes(s) ? "ok" : ["Vacant", "Planned"].includes(s) ? "" : ["Rejected", "Declined", "Rejected by resident", "Under maintenance", "Isolation", "Emergency"].includes(s) ? "bad" : "warn")
const residentOf = (db: HousingDb, id?: string) => db.residents.find((r) => r.id === id)
const isLive = (u: Unit) => !["Offices", "Guest Unit", "Housekeeping", "Isolation", "Emergency"].includes(u.status)

function Panel({ title, eyebrow, onClose, children }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", key)
    return () => document.removeEventListener("keydown", key)
  }, [onClose])
  return (
    <div className="ops-modal-backdrop" onClick={onClose}>
      <section className="ops-modal hs-panel" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close">×</button>
        </header>
        {children}
      </section>
    </div>
  )
}

/* ───────────── Dashboard ───────────── */
export function HousingDashboard({ db, onNavigate }: { db: HousingDb; onNavigate: (m: string) => void }) {
  const live = db.units.filter(isLive)
  const occupied = live.filter((u) => u.status === "Occupied").length
  const vacant = live.filter((u) => u.status === "Vacant").length
  const open = db.requests.filter((r) => r.status === "In progress")
  const overdue = overdueEvacuations(db)
  const stageCount = (kind: "Evacuation" | "Other") => open.filter((r) => (kind === "Evacuation") === (r.kind === "Evacuation"))
  return (
    <div className="hs-dash">
      <div className="ops-metrics">
        {[
          ["Housing units", live.length, `${db.groups.length} housing groups`, "Units", "building"],
          ["Occupancy", `${pct(occupied, live.length)}%`, `${occupied} occupied · ${vacant} vacant`, "Units", "people"],
          ["Open requests", open.length, `${stageCount("Other").length} accommodation / relocation · ${stageCount("Evacuation").length} evacuation`, "Requests", "clipboard"],
          ["Waiting list", db.waiting.filter((w) => w.action === "Pending" || w.action === "Planned").length, "Pending & planned", "Waiting List", "clock"],
        ].map(([label, value, note, target, icon]) => (
          <button key={String(label)} className="ops-panel" onClick={() => onNavigate(String(target))}>
            <span><Icon name={icon as "building"} size={17} /></span>
            <small>{label}</small>
            <strong>{value}</strong>
            <b>{note}</b>
          </button>
        ))}
      </div>
      {overdue.length > 0 && (
        <div className="hs-alert">
          <Icon name="alert" size={17} />
          <div>
            <strong>{overdue.length} evacuation{overdue.length === 1 ? "" : "s"} past the 14-day handover limit</strong>
            <small>{overdue.map((r) => `${r.ref} · ${residentOf(db, r.residentId)?.name}`).join(" · ")} — Housing terms §10–11</small>
          </div>
          <button onClick={() => onNavigate("Requests")}>Review</button>
        </div>
      )}
      <div className="hs-grid-2">
        <article className="ops-panel">
          <span className="eyebrow">Daily report · all hospitals</span>
          <h2>Occupancy by housing group</h2>
          <table className="hs-table compact">
            <thead>
              <tr><th>Group</th><th>Hospital</th><th>Units</th><th>Occupied</th><th>Vacant</th><th>Other</th><th>Occupancy</th></tr>
            </thead>
            <tbody>
              {db.groups.map((g) => {
                const us = db.units.filter((u) => u.group === g.id)
                const l = us.filter(isLive)
                const o = l.filter((u) => u.status === "Occupied").length
                const v = l.filter((u) => u.status === "Vacant").length
                return (
                  <tr key={g.id}>
                    <td><strong>{g.code}</strong></td>
                    <td>{g.hospital}<small dir="rtl">{g.hospitalAr}</small></td>
                    <td>{us.length}</td>
                    <td>{o}</td>
                    <td>{v}</td>
                    <td>{us.length - o - v}</td>
                    <td><span className="hs-bar"><i style={{ width: `${pct(o, l.length)}%` }} /></span>{pct(o, l.length)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </article>
        <article className="ops-panel">
          <span className="eyebrow">Workflow</span>
          <h2>Requests by stage</h2>
          <div className="hs-stages">
            {(["Accommodation", "Evacuation"] as const).map((kind) => (
              <div key={kind}>
                <h3>{kind === "Accommodation" ? "Accommodation & relocation (8.5)" : "Evacuation (8.3)"}</h3>
                {stagesFor(kind).map((s, i) => {
                  const n = open.filter((r) => (kind === "Evacuation" ? r.kind === "Evacuation" : r.kind !== "Evacuation") && r.stage === i).length
                  return (
                    <button key={s.label} className={n ? "has" : ""} onClick={() => onNavigate("Requests")}>
                      <span>{i + 1}</span>
                      <em>{s.label}<small>{s.roles.join(" / ")}</small></em>
                      <b>{n}</b>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </article>
      </div>
      <article className="ops-panel">
        <span className="eyebrow">Movement log</span>
        <h2>Recent movements</h2>
        <MovementTable db={db} rows={db.movements.slice(0, 8)} />
      </article>
    </div>
  )
}

export function overdueEvacuations(db: HousingDb) {
  const limit = Date.now() - 14 * 86400000
  return db.requests.filter((r) => r.kind === "Evacuation" && r.status === "In progress" && r.lastWorkingDay && new Date(r.lastWorkingDay).getTime() < limit)
}

/* ───────────── Units ───────────── */
export function UnitsView({ db, role, onSave }: { db: HousingDb; role: string; onSave: (db: HousingDb, msg: string) => void }) {
  const [group, setGroup] = useState(db.groups[0].id)
  const [status, setStatus] = useState("All")
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState<Unit | null>(null)
  const units = db.units
    .filter((u) => u.group === group && (status === "All" || u.status === status))
    .filter((u) => `${u.building} ${u.unit} ${residentOf(db, u.residentId)?.name || ""}`.toLowerCase().includes(query.toLowerCase()))
  const editable = ["Housing Coordinator", "Housing Supervisor", "Housing Chairperson"].includes(role)
  const buildings = [...new Set(db.units.filter((u) => u.group === group).map((u) => u.building))]
  const g = db.groups.find((x) => x.id === group)!
  return (
    <div>
      <div className="hs-groups">
        {db.groups.map((x) => {
          const l = db.units.filter((u) => u.group === x.id && isLive(u))
          return (
            <button key={x.id} className={group === x.id ? "active" : ""} onClick={() => setGroup(x.id)}>
              <strong>{x.code}</strong>
              <small>{x.hospital}</small>
              <em>{pct(l.filter((u) => u.status === "Occupied").length, l.length)}% occupied</em>
            </button>
          )
        })}
      </div>
      <div className="forms-toolbar">
        <span className="forms-search"><Icon name="search" size={15} /><input placeholder="Search unit or resident" value={query} onChange={(e) => setQuery(e.target.value)} /></span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Unit status">
          {["All", ...unitStatuses].map((s) => <option key={s}>{s}</option>)}
        </select>
        <span className="ops-muted">{g.hospitalAr} · {units.length} units shown</span>
      </div>
      {buildings.map((b) => {
        const list = units.filter((u) => u.building === b)
        if (!list.length) return null
        return (
          <section key={b} className="hs-building">
            <h3>Building {b} <small>{list.length} units</small></h3>
            <div className="hs-unit-grid">
              {list.map((u) => (
                <button key={u.id} className={`hs-unit s-${u.status.replace(/\s/g, "")}`} onClick={() => setOpen(u)} title={`${u.unit} · ${u.status}`}>
                  <strong>{u.unit}</strong>
                  <small>{u.status === "Occupied" ? residentOf(db, u.residentId)?.name.split(" ")[0] : u.status}</small>
                </button>
              ))}
            </div>
          </section>
        )
      })}
      <div className="hs-legend">
        {unitStatuses.map((s) => <span key={s} className={`hs-unit s-${s.replace(/\s/g, "")}`}>{s}</span>)}
      </div>
      {open && (
        <UnitPanel
          db={db}
          unit={open}
          editable={editable}
          onClose={() => setOpen(null)}
          onStatus={(s) => {
            const next = { ...db, units: db.units.map((u) => (u.id === open.id ? { ...u, status: s } : u)) }
            onSave(next, `${unitName(db, open.id)} set to ${s}`)
            setOpen({ ...open, status: s })
          }}
        />
      )}
    </div>
  )
}

function UnitPanel({ db, unit, editable, onClose, onStatus }: { db: HousingDb; unit: Unit; editable: boolean; onClose: () => void; onStatus: (s: UnitStatus) => void }) {
  const r = residentOf(db, unit.residentId)
  const label = `${unit.building} · ${unit.unit}`
  const history = db.movements.filter((m) => m.from === label || m.to === label)
  return (
    <Panel title={unitName(db, unit.id)} eyebrow="Housing unit" onClose={onClose}>
      <dl className="hs-dl">
        <dt>Status</dt><dd><b className={`m-pill ${statusTone(unit.status)}`}>{unit.status}</b></dd>
        <dt>Type</dt><dd>{unit.type}</dd>
        <dt>Capacity (apartment)</dt><dd>{unit.capacity}</dd>
        <dt>Furnishing</dt><dd>{unit.furnished ? "Furnished" : "Unfurnished — Form 8.6 on handover"}</dd>
      </dl>
      {r && <ResidentCard r={r} />}
      {editable && unit.status !== "Occupied" && (
        <label className="hs-field">
          Change status
          <select value={unit.status} onChange={(e) => onStatus(e.target.value as UnitStatus)}>
            {unitStatuses.filter((s) => s !== "Occupied").map((s) => <option key={s}>{s}</option>)}
          </select>
          <small>Occupancy changes only through accommodation, relocation or evacuation requests.</small>
        </label>
      )}
      <h3>Movement history</h3>
      {history.length ? <MovementTable db={db} rows={history} /> : <p className="ops-muted">No movements recorded for this unit.</p>}
    </Panel>
  )
}

function ResidentCard({ r }: { r: Resident }) {
  return (
    <div className="hs-resident">
      <span>{r.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}</span>
      <div>
        <strong>{r.name}</strong>
        <small>{r.position} · {r.department} · {r.nationality}</small>
        <small>KFMC ID {r.kfmcId} · {r.mobile} · {r.email}</small>
        <small>{r.gender} · {r.marital}{r.family ? ` · family of ${r.family}` : ""} · arrived {day(r.arrival)} · {r.contract}</small>
      </div>
    </div>
  )
}

/* ───────────── Residents ───────────── */
export function ResidentsView({ db }: { db: HousingDb }) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState<Resident | null>(null)
  const list = db.residents.filter((r) => `${r.name} ${r.kfmcId} ${r.position} ${r.nationality} ${r.department}`.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="ops-panel hs-flush">
      <div className="forms-toolbar">
        <span className="forms-search"><Icon name="search" size={15} /><input placeholder="Search name, KFMC ID, position…" value={query} onChange={(e) => setQuery(e.target.value)} /></span>
        <span className="ops-muted">{list.length} residents · {db.residents.filter((r) => r.unitId).length} housed</span>
      </div>
      <div className="forms-table-wrap">
        <table className="hs-table">
          <thead><tr><th>Resident</th><th>KFMC ID</th><th>Position</th><th>Nationality</th><th>Unit</th><th>Arrival</th></tr></thead>
          <tbody>
            {list.slice(0, 150).map((r) => (
              <tr key={r.id} onClick={() => setOpen(r)}>
                <td><strong>{r.name}</strong><small>{r.department}</small></td>
                <td>{r.kfmcId}</td>
                <td>{r.position}</td>
                <td>{r.nationality}</td>
                <td>{r.unitId ? unitName(db, r.unitId) : <b className="m-pill">Not housed</b>}</td>
                <td>{day(r.arrival)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <Panel title={open.name} eyebrow="Resident" onClose={() => setOpen(null)}>
          <ResidentCard r={open} />
          <dl className="hs-dl"><dt>Current unit</dt><dd>{unitName(db, open.unitId)}</dd></dl>
          <h3>Requests</h3>
          {db.requests.filter((q) => q.residentId === open.id).map((q) => <p key={q.id}>{q.ref} · {q.kind} · {q.status}</p>)}
          <h3>Movements</h3>
          <MovementTable db={db} rows={db.movements.filter((m) => m.residentId === open.id)} />
        </Panel>
      )}
    </div>
  )
}

/* ───────────── Movements ───────────── */
function MovementTable({ db, rows }: { db: HousingDb; rows: Movement[] }) {
  return (
    <div className="forms-table-wrap">
      <table className="hs-table compact">
        <thead><tr><th>Resident</th><th>Employee no.</th><th>From</th><th>To</th><th>Type</th><th>Date</th></tr></thead>
        <tbody>
          {rows.map((m) => {
            const r = residentOf(db, m.residentId)
            return (
              <tr key={m.id}>
                <td><strong>{r?.name}</strong><small>{r?.position} · {r?.nationality}</small></td>
                <td>{r?.kfmcId}</td>
                <td>{m.from}</td>
                <td>{m.to}</td>
                <td><b className={`m-pill ${m.type === "Exit" || m.type === "Live-Out" ? "bad" : m.type === "Relocation" ? "warn" : "ok"}`}>{m.type}</b></td>
                <td>{day(m.date)}</td>
              </tr>
            )
          })}
          {!rows.length && <tr><td colSpan={6} className="ops-muted">No movements.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
export function MovementsView({ db }: { db: HousingDb }) {
  const [type, setType] = useState("All")
  const rows = db.movements.filter((m) => type === "All" || m.type === type)
  return (
    <div className="ops-panel hs-flush">
      <div className="forms-filter">
        {["All", "New arrival", "Live-In", "Relocation", "Live-Out", "Exit"].map((t) => (
          <button key={t} className={type === t ? "active" : ""} onClick={() => setType(t)}>{t}</button>
        ))}
      </div>
      <MovementTable db={db} rows={rows} />
    </div>
  )
}

/* ───────────── Requests workflow ───────────── */
export function RequestsView({ db, role, person, mobile, onSave, initialCreate }: { db: HousingDb; role: string; person: string; mobile: boolean; onSave: (db: HousingDb, msg: string) => void; initialCreate?: RequestKind }) {
  const [filter, setFilter] = useState(role === "Resident" ? "All" : "Mine")
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState<RequestKind | null>(initialCreate || null)
  const me = db.residents.find((r) => r.name === person)
  const actionable = (q: HousingRequest) => q.status === "In progress" && stagesFor(q.kind)[q.stage]?.roles.includes(role) && (role !== "Resident" || q.residentId === me?.id)
  const visible = db.requests
    .filter((q) => role !== "Resident" || q.residentId === me?.id)
    .filter((q) => filter === "All" || (filter === "Mine" ? actionable(q) : filter === "Open" ? q.status === "In progress" : q.status !== "In progress"))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const open = db.requests.find((q) => q.id === openId)
  const canCreate = ["Resident", "Housing Coordinator"].includes(role)
  return (
    <div>
      <div className="forms-toolbar">
        <div className="forms-filter">
          {(role === "Resident" ? ["All", "Open", "Closed"] : ["Mine", "Open", "Closed", "All"]).map((f) => (
            <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
              {f === "Mine" ? `Waiting for me · ${db.requests.filter(actionable).length}` : f}
            </button>
          ))}
        </div>
        {canCreate && (
          <span className="hs-new">
            {role === "Housing Coordinator" && <button className="ops-primary" onClick={() => setCreating("Accommodation")}>+ Accommodation</button>}
            <button className="ops-primary" onClick={() => setCreating("Relocation")}>+ Relocation</button>
            <button className="ops-primary" onClick={() => setCreating("Evacuation")}>+ Evacuation</button>
          </span>
        )}
      </div>
      <div className="forms-list">
        {visible.map((q) => {
          const r = residentOf(db, q.residentId)
          const stage = stagesFor(q.kind)[q.stage]
          return (
            <button key={q.id} className={`forms-row ${actionable(q) ? "highlight" : ""}`} onClick={() => setOpenId(q.id)}>
              <span className="forms-row-icon"><Icon name={q.kind === "Evacuation" ? "logout" : "building"} size={17} /></span>
              <div>
                <strong>{q.kind} · {r?.name}</strong>
                <small>{q.ref} · {q.kind === "Evacuation" ? `Last working day ${day(q.lastWorkingDay)}` : `${q.currentUnit || "—"} → ${q.requiredUnit || "—"}`}</small>
                <small>{q.status === "In progress" ? `Stage ${q.stage + 1}/${stagesFor(q.kind).length}: ${stage?.label} · ${stage?.roles.join(" / ")}` : `Closed · ${q.status}`}</small>
              </div>
              {overdueEvacuations(db).includes(q) && <b className="forms-flag">14-day limit passed</b>}
              <b className={`m-pill ${statusTone(q.status)}`}>{q.status}</b>
              <Icon name="chevron" size={15} />
            </button>
          )
        })}
        {!visible.length && <div className="forms-empty"><Icon name="check" size={22} /><strong>No requests here</strong></div>}
      </div>
      {creating && <NewRequest db={db} kind={creating} role={role} me={me} mobile={mobile} onClose={() => setCreating(null)} onSave={(next, msg) => { onSave(next, msg); setCreating(null) }} person={person} />}
      {open && <RequestPanel db={db} q={open} role={role} person={person} canAct={actionable(open)} onClose={() => setOpenId(null)} onSave={onSave} />}
    </div>
  )
}

function NewRequest({ db, kind, role, me, person, onClose, onSave }: { db: HousingDb; kind: RequestKind; role: string; me?: Resident; person: string; mobile: boolean; onClose: () => void; onSave: (db: HousingDb, msg: string) => void }) {
  const [residentId, setResidentId] = useState(me?.id || "")
  const [fresh, setFresh] = useState({ name: "", kfmcId: "", position: "", nationality: "", gender: "Female", mobile: "", department: "" })
  const [form, setForm] = useState<Partial<HousingRequest>>({ workingHours: "Shifts", acceptOther: true, reasons: [], otherReason: "", requiredUnit: "", lastWorkingDay: "", flightDate: "", maximo: "" })
  const [error, setError] = useState("")
  const resident = residentOf(db, residentId)
  const newArrival = kind === "Accommodation" && role === "Housing Coordinator" && !residentId
  function submit() {
    let next = db
    let rid = residentId
    if (newArrival) {
      if (!fresh.name || !fresh.kfmcId) return setError("Name and KFMC ID are required for a new arrival.")
      const r: Resident = { id: `R${db.residents.length + 1}-${Date.now() % 10000}`, kfmcId: fresh.kfmcId, name: fresh.name, position: fresh.position || "—", department: fresh.department || "—", nationality: fresh.nationality || "—", gender: fresh.gender as Resident["gender"], marital: "Single", mobile: fresh.mobile, email: "", arrival: new Date().toISOString().slice(0, 10), contract: "MOH direct" }
      next = { ...next, residents: [...next.residents, r] }
      rid = r.id
    }
    if (!rid) return setError("Choose the resident.")
    if (kind === "Evacuation" && (!form.lastWorkingDay || !form.maximo)) return setError("Last working day and MAXIMO number are required (Form 8.3).")
    if (kind !== "Evacuation" && !(form.reasons?.length || form.otherReason)) return setError("Give at least one reason for the request (Form 8.5).")
    const r = residentOf(next, rid)!
    const seq = next.seq + 1
    const q: HousingRequest = {
      id: crypto.randomUUID(),
      ref: `HR-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`,
      kind,
      residentId: rid,
      ...form,
      currentUnit: r.unitId ? unitName(next, r.unitId) : "Outside housing",
      status: "In progress",
      stage: 1,
      log: [{ stage: 0, label: stagesFor(kind)[0].label, by: person, role, at: new Date().toISOString(), decision: "Submitted" }],
      createdAt: new Date().toISOString(),
      createdBy: person,
    }
    onSave({ ...next, seq, requests: [q, ...next.requests] }, `${q.ref} submitted · ${stagesFor(kind)[1].roles[0]} notified`)
  }
  const toggleReason = (reason: string) => setForm({ ...form, reasons: form.reasons?.includes(reason) ? form.reasons.filter((x) => x !== reason) : [...(form.reasons || []), reason] })
  return (
    <Panel title={kind === "Evacuation" ? "Evacuation Housing Unit Form" : kind === "Relocation" ? "Accommodation / Relocation Request" : "Accommodation Request"} eyebrow={kind === "Evacuation" ? "Form 8.3 · نموذج إخلاء وحدة سكنية" : "Form 8.5 · نموذج طلب التسكين / الانتقال"} onClose={onClose}>
      {role !== "Resident" && (
        <label className="hs-field">
          Resident
          <select value={residentId} onChange={(e) => setResidentId(e.target.value)}>
            <option value="">{kind === "Accommodation" ? "New arrival (not yet in the system)" : "Select…"}</option>
            {db.residents.filter((r) => (kind === "Accommodation" ? !r.unitId : r.unitId)).map((r) => <option key={r.id} value={r.id}>{r.name} · {r.kfmcId}</option>)}
          </select>
        </label>
      )}
      {newArrival && (
        <div className="hs-form-grid">
          {(["name", "kfmcId", "position", "department", "nationality", "mobile"] as const).map((k) => (
            <label key={k} className="hs-field">{{ name: "Name", kfmcId: "KFMC ID", position: "Position", department: "Administration", nationality: "Nationality", mobile: "Mobile no." }[k]}<input value={fresh[k]} onChange={(e) => setFresh({ ...fresh, [k]: e.target.value })} /></label>
          ))}
          <label className="hs-field">Gender<select value={fresh.gender} onChange={(e) => setFresh({ ...fresh, gender: e.target.value })}><option>Female</option><option>Male</option></select></label>
        </div>
      )}
      {resident && <ResidentCard r={resident} />}
      {kind === "Evacuation" ? (
        <div className="hs-form-grid">
          <label className="hs-field">Housing unit no.<input disabled value={unitName(db, resident?.unitId)} /></label>
          <label className="hs-field">Date of last working day<input type="date" value={form.lastWorkingDay} onChange={(e) => setForm({ ...form, lastWorkingDay: e.target.value })} /></label>
          <label className="hs-field">Departure flight date<input type="date" value={form.flightDate} onChange={(e) => setForm({ ...form, flightDate: e.target.value })} /></label>
          <label className="hs-field">MAXIMO no.<input value={form.maximo} onChange={(e) => setForm({ ...form, maximo: e.target.value })} /></label>
          <p className="ops-muted hs-span">The unit must be handed over within 14 days of the last working day (Housing terms §10).</p>
        </div>
      ) : (
        <>
          <div className="hs-form-grid">
            <label className="hs-field">Working hours<select value={form.workingHours} onChange={(e) => setForm({ ...form, workingHours: e.target.value as HousingRequest["workingHours"] })}><option>Shifts</option><option>Day shifts only</option><option>On-call</option></select></label>
            <label className="hs-field">Current unit no.<input disabled value={resident?.unitId ? unitName(db, resident.unitId) : "Outside housing"} /></label>
            <label className="hs-field">Required unit no.<input value={form.requiredUnit} onChange={(e) => setForm({ ...form, requiredUnit: e.target.value })} placeholder="Unit, floor or group" /></label>
            <label className="hs-field">If not available, accept another?<select value={form.acceptOther ? "Yes" : "No"} onChange={(e) => setForm({ ...form, acceptOther: e.target.value === "Yes" })}><option>Yes</option><option>No</option></select></label>
          </div>
          <fieldset className="hs-reasons">
            <legend>Reason for changing the unit · سبب طلب الانتقال</legend>
            {relocationReasons.map((reason) => (
              <label key={reason}><input type="checkbox" checked={form.reasons?.includes(reason)} onChange={() => toggleReason(reason)} /> {reason}</label>
            ))}
            <input placeholder="Other reasons" value={form.otherReason} onChange={(e) => setForm({ ...form, otherReason: e.target.value })} />
          </fieldset>
        </>
      )}
      {error && <div className="form-error"><Icon name="alert" size={16} /> {error}</div>}
      <footer className="hs-foot"><button onClick={onClose}>Cancel</button><button className="ops-primary" onClick={submit}>Sign & submit</button></footer>
    </Panel>
  )
}

function RequestPanel({ db, q, role, person, canAct, onClose, onSave }: { db: HousingDb; q: HousingRequest; role: string; person: string; canAct: boolean; onClose: () => void; onSave: (db: HousingDb, msg: string) => void }) {
  const stages = stagesFor(q.kind)
  const r = residentOf(db, q.residentId)!
  const [note, setNote] = useState("")
  const [choice, setChoice] = useState("")
  const [unitId, setUnitId] = useState(q.planUnitId || "")
  const [lines, setLines] = useState({ maintenance: "", missing: "", damage: "" })
  const [assign, setAssign] = useState({ reference: q.ref.replace("HR", "ACC"), workOrder: "", housingType: "Inside", processType: q.kind === "Relocation" ? "Relocation" : "New Arrival", arrivalDate: new Date().toISOString().slice(0, 10), contractType: r.contract || "", familyMembers: String(r.family || (r.marital === "Married" ? 2 : 1)), girls: "", boys: "", domestic: "None", emergencyName: "", emergencyMobile: "" })
  const [received, setReceived] = useState(new Date().toISOString().slice(0, 10))
  const [pledge, setPledge] = useState(false)
  const [unf, setUnf] = useState({ noFurniture: false, noAppliances: false, notes: "" })
  const [exitType, setExitType] = useState<"Exit" | "Live-Out">(q.exitType || "Exit")
  const [error, setError] = useState("")
  const targetUnit = db.units.find((u) => u.id === (q.assignment?.unitId || unitId))
  const vacancies = db.units.filter((u) => (u.status === "Vacant" || u.id === q.planUnitId) && u.id !== r.unitId)

  function advance(decision: string, patch: Partial<HousingRequest>, extra: (db: HousingDb) => HousingDb = (d) => d, message?: string) {
    const entry = { stage: q.stage, label: stages[q.stage].label, by: person, role, at: new Date().toISOString(), decision, note: note || undefined }
    const updated: HousingRequest = { ...q, ...patch, log: [...q.log, entry] }
    const next = extra({ ...db, requests: db.requests.map((x) => (x.id === q.id ? updated : x)) })
    onSave(next, message || `${q.ref} · ${decision}`)
    onClose()
  }
  const movement = (type: MovementType, from: string, to: string): Movement => ({ id: crypto.randomUUID(), residentId: r.id, from, to, type, date: new Date().toISOString().slice(0, 10), ref: q.ref })
  const label = (id?: string) => {
    const u = db.units.find((x) => x.id === id)
    return u ? `${u.building} · ${u.unit}` : "—"
  }

  let action: ReactNode = null
  if (canAct && q.kind !== "Evacuation") {
    if (q.stage === 1)
      action = (
        <>
          <h3>Housing Supervisor recommendation · توصية رئيس الوحدة</h3>
          <div className="hs-choice">
            {["Resident can be relocated", "Resident can't be relocated"].map((c) => <button key={c} className={choice === c ? "active" : ""} onClick={() => setChoice(c)}>{c}</button>)}
          </div>
          <input className="hs-note" placeholder={choice.includes("can't") ? "Because… (required)" : "Note (optional)"} value={note} onChange={(e) => setNote(e.target.value)} />
          <footer className="hs-foot"><button className="ops-primary" disabled={!choice || (choice.includes("can't") && !note)} onClick={() => advance(choice, { stage: 2 })}>Sign recommendation</button></footer>
        </>
      )
    if (q.stage === 2)
      action = (
        <>
          <h3>Head, Planning Unit recommendation · توصية رئيس وحدة التخطيط</h3>
          <div className="hs-choice">
            {(["Relocate / accommodate", "Delay the request", "Add to waiting list", "Apologize to the resident", "Other"] as const).map((c) => <button key={c} className={choice === c ? "active" : ""} onClick={() => setChoice(c)}>{c}</button>)}
          </div>
          {choice === "Relocate / accommodate" && (
            <label className="hs-field">Unit
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">Select a vacant unit…</option>
                {db.groups.map((g) => (
                  <optgroup key={g.id} label={`${g.code} · ${g.hospital}`}>
                    {vacancies.filter((u) => u.group === g.id).slice(0, 60).map((u) => <option key={u.id} value={u.id}>{u.building} · {u.unit} · {u.type}{u.furnished ? "" : " · unfurnished"}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
          )}
          <input className="hs-note" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
          <footer className="hs-foot"><button className="ops-primary" disabled={!choice || (choice === "Relocate / accommodate" && !unitId)} onClick={() => advance(choice, { stage: 3, planDecision: choice as HousingRequest["planDecision"], planUnitId: unitId || undefined }, (d) => ({ ...d, units: d.units.map((u) => (u.id === unitId ? { ...u, status: "Reserved" } : u)) }))}>Sign recommendation</button></footer>
        </>
      )
    if (q.stage === 3)
      action = (
        <>
          <h3>Chairperson approval · موافقة رئيس قسم التخطيط وعلاقات السكان</h3>
          <p>Planning recommends: <strong>{q.planDecision}</strong>{q.planUnitId && ` → ${unitName(db, q.planUnitId)}`}</p>
          <input className="hs-note" placeholder="Note (required to reject)" value={note} onChange={(e) => setNote(e.target.value)} />
          <footer className="hs-foot">
            <button disabled={!note} onClick={() => advance("Rejected", { status: "Rejected" }, (d) => ({ ...d, units: d.units.map((u) => (u.id === q.planUnitId && u.status === "Reserved" ? { ...u, status: "Vacant" } : u)) }))}>Reject</button>
            <button className="ops-primary" onClick={() => {
              const d = q.planDecision
              if (d === "Relocate / accommodate") return advance("Approved", { stage: 4 })
              if (d === "Add to waiting list") {
                const entry: WaitingEntry = { id: crypto.randomUUID(), workOrder: "", residentId: r.id, name: r.name, empNo: r.kfmcId, currentUnit: r.unitId ? label(r.unitId) : "Outside", hireDate: r.arrival, requestType: q.requiredUnit || q.kind, action: "Pending", score: Math.min(20, Math.max(1, Math.round((Date.now() - new Date(r.arrival).getTime()) / (365 * 86400000)) + 2)), unitPlan: "", requestRef: q.ref, addedAt: new Date().toISOString().slice(0, 10) }
                return advance("Approved", { status: "Waiting list" }, (x) => ({ ...x, waiting: [entry, ...x.waiting] }), `${q.ref} approved · added to waiting list`)
              }
              advance("Approved", { status: d === "Delay the request" ? "Delayed" : d === "Apologize to the resident" ? "Declined" : "Completed" })
            }}>Approve</button>
          </footer>
        </>
      )
    if (q.stage === 4)
      action = (
        <>
          <h3>{q.kind === "Relocation" ? "Relocation Accommodation Form" : "Accommodation Form (8.15)"} · Coordinator, Housing Planning</h3>
          <div className="hs-form-grid">
            <label className="hs-field">Reference no.<input value={assign.reference} onChange={(e) => setAssign({ ...assign, reference: e.target.value })} /></label>
            <label className="hs-field">Work order (MAXIMO)<input value={assign.workOrder} onChange={(e) => setAssign({ ...assign, workOrder: e.target.value })} /></label>
            <label className="hs-field">Housing type<select value={assign.housingType} onChange={(e) => setAssign({ ...assign, housingType: e.target.value })}><option>Inside</option><option>Outside</option></select></label>
            <label className="hs-field">Process type<select value={assign.processType} onChange={(e) => setAssign({ ...assign, processType: e.target.value })}><option>New Arrival</option><option>Live In</option><option>Relocation</option></select></label>
            <label className="hs-field">Unit<input disabled value={unitName(db, q.planUnitId)} /></label>
            <label className="hs-field">Date of arrival / move<input type="date" value={assign.arrivalDate} onChange={(e) => setAssign({ ...assign, arrivalDate: e.target.value })} /></label>
            <label className="hs-field">Type of contract<input value={assign.contractType} onChange={(e) => setAssign({ ...assign, contractType: e.target.value })} /></label>
            <label className="hs-field">Number of family members<input type="number" min={1} value={assign.familyMembers} onChange={(e) => setAssign({ ...assign, familyMembers: e.target.value })} /></label>
            <label className="hs-field">Number of girls and ages<input placeholder="e.g. 2 · ages 4, 9" value={assign.girls} onChange={(e) => setAssign({ ...assign, girls: e.target.value })} /></label>
            <label className="hs-field">Number of boys and ages<input placeholder="e.g. 1 · age 7" value={assign.boys} onChange={(e) => setAssign({ ...assign, boys: e.target.value })} /></label>
            <label className="hs-field">Driver / house keeper<select value={assign.domestic} onChange={(e) => setAssign({ ...assign, domestic: e.target.value })}><option>None</option><option>Driver</option><option>House keeper</option><option>Driver & house keeper</option></select></label>
            <span />
            <label className="hs-field">Emergency contact · name<input value={assign.emergencyName} onChange={(e) => setAssign({ ...assign, emergencyName: e.target.value })} /></label>
            <label className="hs-field">Emergency contact · mobile no.<input value={assign.emergencyMobile} onChange={(e) => setAssign({ ...assign, emergencyMobile: e.target.value })} /></label>
          </div>
          <p className="ops-muted">Assigned by: Coordinator, Housing Planning Department ({person}). Next: approval by the Chairperson, Housing Administration.</p>
          <footer className="hs-foot"><button className="ops-primary" disabled={!assign.workOrder || !assign.emergencyName || !assign.emergencyMobile} onClick={() => advance("Unit assigned", { stage: 5, assignment: { ...assign, unitId: q.planUnitId!, housingType: assign.housingType as "Inside", processType: assign.processType as "Live In", familyMembers: Number(assign.familyMembers) || 1, domestic: assign.domestic as "None" } })}>Assign unit · send for approval</button></footer>
        </>
      )
    if (q.stage === 5)
      action = (
        <>
          <h3>Approval · Chairperson, Housing Administration</h3>
          <p>Assignment {q.assignment?.reference} · WO {q.assignment?.workOrder} · {unitName(db, q.assignment?.unitId)} · {q.assignment?.processType} from {day(q.assignment?.arrivalDate)}</p>
          <p className="ops-muted">On approval, copies go to: {ccList.join(" · ")}</p>
          <input className="hs-note" placeholder="Note (required to reject)" value={note} onChange={(e) => setNote(e.target.value)} />
          <footer className="hs-foot">
            <button disabled={!note} onClick={() => advance("Rejected", { status: "Rejected" }, (d) => ({ ...d, units: d.units.map((u) => (u.id === q.assignment?.unitId && u.status === "Reserved" ? { ...u, status: "Vacant" } : u)) }))}>Reject</button>
            <button className="ops-primary" onClick={() => advance("Approved · cc sent", { stage: 6, adminApproval: { by: person, at: new Date().toISOString(), cc: ccList } }, (d) => d, `${q.ref} approved · copies sent to ${ccList.length} offices`)}>Approve & send copies</button>
          </footer>
        </>
      )
    if (q.stage === 6)
      action = (
        <>
          <h3>Housing Terms & Conditions Pledge (8.10)</h3>
          <ol className="hs-terms">
            {housingTerms.map((term) => <li key={term}>{term}</li>)}
          </ol>
          <label className="hs-field">Date of receiving the unit<input type="date" value={received} onChange={(e) => setReceived(e.target.value)} /></label>
          <label className="hs-check"><input type="checkbox" checked={pledge} onChange={(e) => setPledge(e.target.checked)} /> {r.name} accepts the terms and receives unit {unitName(db, q.assignment?.unitId)}</label>
          {targetUnit && !targetUnit.furnished && (
            <>
              <h3>Unfurnished Housing Unit acknowledgment (8.6)</h3>
              <label className="hs-check"><input type="checkbox" checked={unf.noFurniture} onChange={(e) => setUnf({ ...unf, noFurniture: e.target.checked })} /> Received without furniture</label>
              <label className="hs-check"><input type="checkbox" checked={unf.noAppliances} onChange={(e) => setUnf({ ...unf, noAppliances: e.target.checked })} /> Received without electrical appliances</label>
              <input className="hs-note" placeholder="Notes" value={unf.notes} onChange={(e) => setUnf({ ...unf, notes: e.target.value })} />
            </>
          )}
          {error && <div className="form-error"><Icon name="alert" size={16} /> {error}</div>}
          <footer className="hs-foot"><button className="ops-primary" onClick={() => {
            if (!pledge) return setError("The resident must accept the housing terms (8.10).")
            if (targetUnit && !targetUnit.furnished && !(unf.noFurniture || unf.noAppliances)) return setError("Complete the unfurnished unit acknowledgment (8.6).")
            const newUnit = q.assignment!.unitId
            const oldUnit = r.unitId
            const type: MovementType = q.kind === "Relocation" ? "Relocation" : q.assignment?.processType === "New Arrival" ? "New arrival" : "Live-In"
            advance("Unit received", { status: "Completed", stage: 7, pledgeSigned: true, receivedDate: received, unfurnished: targetUnit && !targetUnit.furnished ? unf : undefined }, (d) => ({
              ...d,
              units: d.units.map((u) => (u.id === newUnit ? { ...u, status: "Occupied", residentId: r.id } : u.id === oldUnit ? { ...u, status: "Vacant", residentId: undefined } : u)),
              residents: d.residents.map((x) => (x.id === r.id ? { ...x, unitId: newUnit } : x)),
              movements: [movement(type, oldUnit ? label(oldUnit) : "—", label(newUnit)), ...d.movements],
            }), `${q.ref} completed · ${r.name} moved in`)
          }}>Sign & receive unit</button></footer>
        </>
      )
  }
  if (canAct && q.kind === "Evacuation") {
    if (q.stage === 1)
      action = (
        <>
          <h3>Maintenance inspection · الصيانة</h3>
          <label className="hs-field">Maintenance items (one per line)<textarea value={lines.maintenance} onChange={(e) => setLines({ ...lines, maintenance: e.target.value })} /></label>
          <label className="hs-field">Missing items (one per line)<textarea value={lines.missing} onChange={(e) => setLines({ ...lines, missing: e.target.value })} /></label>
          <label className="hs-field">Damage value (SAR)<input type="number" value={lines.damage} onChange={(e) => setLines({ ...lines, damage: e.target.value })} /></label>
          <footer className="hs-foot"><button className="ops-primary" onClick={() => {
            const maintenance = lines.maintenance.split("\n").map((s) => s.trim()).filter(Boolean)
            const missing = lines.missing.split("\n").map((s) => s.trim()).filter(Boolean)
            const damageValue = Number(lines.damage) || 0
            advance(`Inspected · ${maintenance.length} maintenance · ${missing.length} missing · SAR ${damageValue}`, { stage: 2, maintenance, missing, damageValue })
          }}>Sign inspection</button></footer>
        </>
      )
    if (q.stage === 2)
      action = (
        <>
          <h3>Housing Supervisor clearance</h3>
          <input className="hs-note" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
          <footer className="hs-foot"><button className="ops-primary" onClick={() => advance("Cleared", { stage: 3 })}>Sign clearance</button></footer>
        </>
      )
    if (q.stage === 3)
      action = (
        <>
          <h3>Endorsement · اقرار</h3>
          <p>I confirm the information above is correct and accept responsibility for the costs determined for malfunctions and missing items{q.damageValue ? ` (SAR ${q.damageValue})` : ""}.</p>
          <label className="hs-field">Movement type<select value={exitType} onChange={(e) => setExitType(e.target.value as "Exit")}><option value="Exit">Final exit</option><option value="Live-Out">Live-out (leaves housing, stays employed)</option></select></label>
          <label className="hs-check"><input type="checkbox" checked={pledge} onChange={(e) => setPledge(e.target.checked)} /> Resident endorses and hands over the keys</label>
          <footer className="hs-foot"><button className="ops-primary" disabled={!pledge} onClick={() => {
            const old = r.unitId
            advance("Endorsed & handed over", { status: "Completed", stage: 4, exitType }, (d) => ({
              ...d,
              units: d.units.map((u) => (u.id === old ? { ...u, status: "Vacant", residentId: undefined } : u)),
              residents: d.residents.map((x) => (x.id === r.id ? { ...x, unitId: undefined } : x)),
              movements: [movement(exitType, label(old), "—"), ...d.movements],
            }), `${q.ref} completed · unit ${label(old)} vacant`)
          }}>Sign & complete</button></footer>
        </>
      )
  }

  return (
    <Panel title={`${q.kind} request · ${r.name}`} eyebrow={`${q.ref} · ${stages[0].form}`} onClose={onClose}>
      <ResidentCard r={r} />
      <dl className="hs-dl">
        {q.kind === "Evacuation" ? (
          <>
            <dt>Unit</dt><dd>{unitName(db, r.unitId)}</dd>
            <dt>Last working day</dt><dd>{day(q.lastWorkingDay)} · handover due {day(q.lastWorkingDay ? new Date(new Date(q.lastWorkingDay).getTime() + 14 * 86400000).toISOString() : undefined)}</dd>
            <dt>Departure flight</dt><dd>{day(q.flightDate)}</dd>
            <dt>MAXIMO no.</dt><dd>{q.maximo}</dd>
            {q.maintenance && <><dt>Maintenance</dt><dd>{q.maintenance.join(" · ") || "None"}</dd></>}
            {q.missing && <><dt>Missing</dt><dd>{q.missing.join(" · ") || "None"}</dd></>}
            {q.damageValue !== undefined && <><dt>Damage value</dt><dd>SAR {q.damageValue}</dd></>}
          </>
        ) : (
          <>
            <dt>Working hours</dt><dd>{q.workingHours}</dd>
            <dt>Current unit</dt><dd>{q.currentUnit}</dd>
            <dt>Required unit</dt><dd>{q.requiredUnit || "—"} · {q.acceptOther ? "accepts alternative" : "no alternative"}</dd>
            <dt>Reasons</dt><dd>{[...(q.reasons || []), q.otherReason].filter(Boolean).join(" · ") || "—"}</dd>
            {q.planUnitId && <><dt>Planned unit</dt><dd>{unitName(db, q.planUnitId)}</dd></>}
            {q.assignment && <><dt>Assignment</dt><dd>{q.assignment.reference} · WO {q.assignment.workOrder} · {q.assignment.housingType} · {q.assignment.processType} · {day(q.assignment.arrivalDate)}</dd></>}
            {q.assignment?.contractType !== undefined && <><dt>Contract / family</dt><dd>{q.assignment.contractType || "—"} · {q.assignment.familyMembers} member(s){q.assignment.girls ? ` · girls ${q.assignment.girls}` : ""}{q.assignment.boys ? ` · boys ${q.assignment.boys}` : ""} · {q.assignment.domestic}</dd></>}
            {q.assignment?.emergencyName && <><dt>Emergency contact</dt><dd>{q.assignment.emergencyName} · {q.assignment.emergencyMobile}</dd></>}
            {q.adminApproval && <><dt>Approved by</dt><dd>{q.adminApproval.by} · {stamp(q.adminApproval.at)} · cc: {q.adminApproval.cc.join(", ")}</dd></>}
            {q.receivedDate && <><dt>Date of receiving unit</dt><dd>{day(q.receivedDate)}</dd></>}
          </>
        )}
      </dl>
      <ol className="forms-chain">
        {stages.map((s, i) => {
          const entry = [...q.log].reverse().find((l) => l.stage === i)
          const current = q.status === "In progress" && q.stage === i
          return (
            <li key={s.label} className={entry ? "done" : current ? "current" : ""}>
              <span>{entry ? <Icon name="check" size={13} /> : i + 1}</span>
              <div>
                <strong>{s.label}</strong>
                <small>{s.form} · {s.roles.join(" / ")}</small>
                {entry ? <em>{entry.decision}{entry.note ? ` — ${entry.note}` : ""} · {entry.by} · {stamp(entry.at)}</em> : current ? <em>Waiting</em> : null}
              </div>
            </li>
          )
        })}
      </ol>
      {q.status !== "In progress" && <p className="hs-closed">Closed · <b className={`m-pill ${statusTone(q.status)}`}>{q.status}</b></p>}
      {action && <div className="hs-action">{action}</div>}
      {!canAct && q.status === "In progress" && <p className="ops-muted">Waiting for {stages[q.stage].roles.join(" / ")}.</p>}
    </Panel>
  )
}

/* ───────────── Waiting list ───────────── */
export function WaitingListView({ db, role, onSave }: { db: HousingDb; role: string; onSave: (db: HousingDb, msg: string) => void }) {
  const [tab, setTab] = useState<"open" | "done" | "rejected">("open")
  const [plan, setPlan] = useState<WaitingEntry | null>(null)
  const [unitId, setUnitId] = useState("")
  const can = ["Housing Coordinator", "Planning Unit Head"].includes(role)
  const rows = db.waiting
    .filter((w) => (tab === "open" ? ["Pending", "Planned"].includes(w.action) : tab === "done" ? w.action === "Done" : w.action === "Rejected by resident"))
    .sort((a, b) => b.score - a.score)
  const update = (w: WaitingEntry, patch: Partial<WaitingEntry>, extra: (d: HousingDb) => HousingDb = (d) => d, msg = "Waiting list updated") =>
    onSave(extra({ ...db, waiting: db.waiting.map((x) => (x.id === w.id ? { ...x, ...patch } : x)) }), msg)
  return (
    <div className="ops-panel hs-flush">
      <div className="forms-filter">
        {([["open", "Waiting (MAXIMO)"], ["done", "Done plan"], ["rejected", "Rejected plan"]] as const).map(([k, l]) => (
          <button key={k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      <div className="forms-table-wrap">
        <table className="hs-table">
          <thead><tr><th>#</th><th>Work order</th><th>Name</th><th>Current unit</th><th>Date of hire</th><th>Employee #</th><th>Type of request</th><th>Action taken</th><th>Score</th><th>Unit plan</th>{can && tab === "open" && <th />}</tr></thead>
          <tbody>
            {rows.map((w, i) => (
              <tr key={w.id}>
                <td>{i + 1}</td>
                <td>{w.workOrder || "—"}</td>
                <td><strong>{w.name}</strong>{w.requestRef && <small>{w.requestRef}</small>}</td>
                <td>{w.currentUnit}</td>
                <td>{day(w.hireDate)}</td>
                <td>{w.empNo}</td>
                <td>{w.requestType}</td>
                <td><b className={`m-pill ${statusTone(w.action)}`}>{w.action}</b></td>
                <td><b>{w.score}</b></td>
                <td>{w.unitPlan || "—"}</td>
                {can && tab === "open" && (
                  <td className="hs-row-actions">
                    {w.action === "Pending" && <button onClick={() => { setPlan(w); setUnitId("") }}>Plan unit</button>}
                    {w.action === "Planned" && (
                      <>
                        <button onClick={() => {
                          const r = residentOf(db, w.residentId)
                          const target = db.units.find((u) => `${db.groups.find((g) => g.id === u.group)?.id} · ${u.unit}` === w.unitPlan || unitName(db, u.id) === w.unitPlan)
                          update(w, { action: "Done" }, (d) => {
                            if (!r || !target) return d
                            const old = r.unitId
                            const lbl = (id?: string) => { const u = d.units.find((x) => x.id === id); return u ? `${u.building} · ${u.unit}` : "—" }
                            return {
                              ...d,
                              units: d.units.map((u) => (u.id === target.id ? { ...u, status: "Occupied", residentId: r.id } : u.id === old ? { ...u, status: "Vacant", residentId: undefined } : u)),
                              residents: d.residents.map((x) => (x.id === r.id ? { ...x, unitId: target.id } : x)),
                              movements: [{ id: crypto.randomUUID(), residentId: r.id, from: lbl(old), to: lbl(target.id), type: old ? "Relocation" : "Live-In", date: new Date().toISOString().slice(0, 10), ref: w.requestRef }, ...d.movements],
                            }
                          }, `${w.name} moved to ${w.unitPlan}`)
                        }}>Done</button>
                        <button onClick={() => update(w, { action: "Rejected by resident" }, (d) => ({ ...d, units: d.units.map((u) => (unitName(d, u.id) === w.unitPlan && u.status === "Reserved" ? { ...u, status: "Vacant" } : u)) }), `${w.name} rejected the plan`)}>Rejected</button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={11} className="ops-muted">No entries.</td></tr>}
          </tbody>
        </table>
      </div>
      {plan && (
        <Panel title={`Plan unit · ${plan.name}`} eyebrow="Waiting list" onClose={() => setPlan(null)}>
          <p>{plan.requestType} · score {plan.score} · currently {plan.currentUnit}</p>
          <label className="hs-field">Vacant unit
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">Select…</option>
              {db.groups.map((g) => (
                <optgroup key={g.id} label={`${g.code} · ${g.hospital}`}>
                  {db.units.filter((u) => u.group === g.id && u.status === "Vacant").slice(0, 60).map((u) => <option key={u.id} value={u.id}>{u.building} · {u.unit} · {u.type}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <footer className="hs-foot"><button className="ops-primary" disabled={!unitId} onClick={() => {
            update(plan, { action: "Planned", unitPlan: unitName(db, unitId) }, (d) => ({ ...d, units: d.units.map((u) => (u.id === unitId ? { ...u, status: "Reserved" } : u)) }), `${plan.name} planned for ${unitName(db, unitId)}`)
            setPlan(null)
          }}>Plan & reserve</button></footer>
        </Panel>
      )}
    </div>
  )
}

/* ───────────── Daily report (Masterlist + Movement, as the hospitals send it) ───────────── */
export function DailyReportView({ db }: { db: HousingDb }) {
  const [group, setGroup] = useState(db.groups[0].id)
  const g = db.groups.find((x) => x.id === group)!
  const units = db.units.filter((u) => u.group === group)
  const labels = new Set(units.map((u) => `${u.building} · ${u.unit}`))
  const moves = db.movements.filter((m) => labels.has(m.from) || labels.has(m.to))
  const counts = unitStatuses.map((s) => [s, units.filter((u) => u.status === s).length] as const).filter(([, n]) => n)
  async function exportXlsx() {
    const XLSX = await import("xlsx")
    const master = [
      ["Group", "Blding No.", "Unit No.", "Unit capacity", "اسم المستشفى", "Unit status", "Types of Unit", "Resident Name", "Employee No.", "Position", "Nationality", "Arrival Date", "Email Address", "Mobile No.", "Department"],
      ...units.map((u) => {
        const r = residentOf(db, u.residentId)
        return [g.code, u.building, u.unit, u.capacity, g.hospitalAr, u.status.toUpperCase(), u.type, r?.name || "", r?.kfmcId || "", r?.position || "", r?.nationality || "", r?.arrival || "", r?.email || "", r?.mobile || "", r?.department || ""]
      }),
    ]
    const movement = [
      ["اسم الساكن", "الرقم الوظيفي", "المسمى الوظيفي", "الجنسية", "من وحده", "إلى وحده", "نوع العملية", "تاريخ ( استلام- اخلاء - انتقال) الوحده السكنية"],
      ["Resident Name", "Employee No.", "Position", "Nationality", "From", "To", "Type", "Date Received Unit"],
      ...moves.map((m) => {
        const r = residentOf(db, m.residentId)
        const ar: Record<string, string> = { "New arrival": "وصول جديد - New arrival", "Live-In": "تسكين جديد - Live-In", Relocation: "انتقال - Relocation", "Live-Out": "خروج من السكن - Live-Out", Exit: "خروج نهائي - Exit" }
        return [r?.name || "", r?.kfmcId || "", r?.position || "", r?.nationality || "", m.from, m.to, ar[m.type], m.date]
      }),
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(master), "Masterlist")
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(movement), "Movement")
    XLSX.writeFile(wb, `Daily report ${g.id} ${new Date().toISOString().slice(0, 10)} ${g.hospitalAr}.xlsx`)
  }
  return (
    <div className="ops-panel">
      <div className="forms-toolbar">
        <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Housing group">
          {db.groups.map((x) => <option key={x.id} value={x.id}>{x.code} · {x.hospital}</option>)}
        </select>
        <button className="ops-primary" onClick={exportXlsx}><Icon name="report" size={15} /> Export daily report (.xlsx)</button>
      </div>
      <h2>Daily report · {g.code} · {g.hospital} <small dir="rtl">{g.hospitalAr}</small></h2>
      <p className="ops-muted">Same layout as the hospitals' files: a Masterlist sheet (every unit with its status and resident) and a Movement sheet (arrivals, live-ins, relocations, live-outs and exits).</p>
      <div className="hs-chips">{counts.map(([s, n]) => <span key={s} className={`m-pill ${statusTone(s)}`}>{s} · {n}</span>)}</div>
      <h3>Movement ({moves.length})</h3>
      <MovementTable db={db} rows={moves} />
    </div>
  )
}

/* ───────────── Resident mobile home ───────────── */
export function ResidentHome({ db, person, onNavigate, onCreate }: { db: HousingDb; person: string; onNavigate: (m: string) => void; onCreate: (kind: RequestKind) => void }) {
  const me = db.residents.find((r) => r.name === person)
  const mine = db.requests.filter((q) => q.residentId === me?.id)
  if (!me) return <p className="ops-muted">Resident profile not found.</p>
  return (
    <div className="hs-resident-home">
      <article className="ops-panel">
        <span className="eyebrow">My housing</span>
        <h2>{unitName(db, me.unitId)}</h2>
        <ResidentCard r={me} />
      </article>
      <div className="hs-quick">
        <button onClick={() => onCreate("Relocation")}><Icon name="building" size={18} /> Request relocation</button>
        <button onClick={() => onCreate("Evacuation")}><Icon name="logout" size={18} /> Evacuate my unit</button>
      </div>
      <article className="ops-panel">
        <span className="eyebrow">My requests</span>
        {mine.map((q) => (
          <p key={q.id} className="hs-myreq" onClick={() => onNavigate("Requests")}>
            <strong>{q.ref} · {q.kind}</strong>
            <small>{q.status === "In progress" ? `Stage ${q.stage + 1}/${stagesFor(q.kind).length}: ${stagesFor(q.kind)[q.stage].label}` : q.status}</small>
          </p>
        ))}
        {!mine.length && <p className="ops-muted">No requests yet.</p>}
      </article>
    </div>
  )
}
