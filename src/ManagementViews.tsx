import { useState } from "react"
import Icon from "./Icon"
import type { Database, RecordItem } from "./operations-data"

export function ReportsDashboard({
  db,
  onExport,
}: {
  db: Database
  onExport: () => void
}) {
  const [building, setBuilding] = useState("All")
  const [employee, setEmployee] = useState("All")
  const [status, setStatus] = useState("All")
  const zonesAll = db.records["Shift Planning"] || []
  const zones = zonesAll.filter((z) => building === "All" || z.building === building)
  const zoneNames = zones.map((z) => z.title)
  const tasks = db.records.Tasks.filter(
    (t) =>
      (building === "All" || zoneNames.some((z) => t.location.startsWith(z.split(" ")[0]))) &&
      (employee === "All" || t.assignee === employee) &&
      (status === "All" || t.status === status),
  )
  const requests = db.records["Service Requests"]
  const inventory = db.records.Inventory
  const required = zones.reduce((n, z) => n + z.requiredCount, 0)
  const filled = zones.reduce((n, z) => n + Math.min(z.requiredCount, z.assignedStaff.length), 0)
  const done = (t: RecordItem) => ["Completed", "Closed"].includes(t.status)
  const txns = db.records["Stock Transactions"]
  const sum = (cat: string) => txns.filter((t) => t.category === cat).reduce((n, t) => n + t.quantity, 0)
  const equipment = db.records.Equipment
  const catalogue: [string, string, string][] = [
    ["Staff coverage", `${new Set(zones.flatMap((z) => z.assignedStaff)).size} staff on ${zones.length} zones`, `${db.records["Staff & Roster"].length} in directory`],
    ["Zone coverage", `${required ? Math.round((filled / required) * 100) : 100}%`, `${required - filled} gaps`],
    ["Task completion", `${tasks.filter(done).length}/${tasks.length}`, `${tasks.filter((t) => t.status === "Pending review").length} awaiting confirmation`],
    ["Overdue tasks", String(tasks.filter((t) => !done(t) && new Date(t.due).getTime() < Date.now()).length), "Calculated from due time"],
    ["Checklist completion", `${tasks.reduce((n, t) => n + t.answers.length, 0)}/${tasks.reduce((n, t) => n + t.checklist.length, 0)} items`, `${(db.records["Checklist Assignment"] || []).length} assignments`],
    ["Service request SLA", `${requests.filter((r) => new Date(r.sla).getTime() < Date.now() && !["Completed", "Closed"].includes(r.status)).length} breached`, `${requests.filter((r) => r.status === "Closed").length} closed of ${requests.length}`],
    ["Inventory consumption", `${sum("Consumption")} used`, `${sum("Issue to custody")} issued · ${sum("Return to store")} returned`],
    ["Low-stock items", String(inventory.filter((i) => i.quantity < i.minimum).length), inventory.filter((i) => i.quantity < i.minimum).map((i) => i.title).join(", ") || "None"],
    ["Equipment availability", `${equipment.filter((e) => e.status.toLowerCase() === "available").length}/${equipment.length}`, `${equipment.filter((e) => e.status === "Out of Service").length} out of service`],
    ["Shift handover history", String(db.records.Handover.length), `${db.records.Handover.filter((h) => h.status === "Closed").length} accepted`],
  ]
  const completion = tasks.length
    ? Math.round(
        (tasks.filter(done).length /
          tasks.length) *
          100,
      )
    : 0
  const sla = requests.length
    ? Math.round(
        (requests.filter(
          (request) =>
            request.status === "Closed" ||
            new Date(request.sla).getTime() > Date.now(),
        ).length /
          requests.length) *
          100,
      )
    : 100

  return (
    <div className="reports-dashboard">
      <section className="reports-filterbar">
        <label>
          Period
          <select defaultValue="Last 7 days">
            <option>Today</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
        </label>
        <label>
          Building
          <select value={building} onChange={(e) => setBuilding(e.target.value)}>
            <option>All</option>
            {[...new Set(zonesAll.map((z) => z.building))].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label>
          Employee
          <select value={employee} onChange={(e) => setEmployee(e.target.value)}>
            <option>All</option>
            {db.records["Staff & Roster"].map((p) => (
              <option key={p.id}>{p.title}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {["All", "Unassigned", "Assigned", "In progress", "Pending review", "Returned", "Completed", "Closed"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Shift
          <select>
            <option>All shifts</option>
            <option>Morning</option>
            <option>Afternoon</option>
          </select>
        </label>
        <button className="ops-primary" onClick={onExport}>
          <Icon name="report" size={16} /> Export operations CSV
        </button>
      </section>
      <section className="report-metrics">
        {[
          ["Task completion", `${completion}%`, "Across scheduled work"],
          ["Zone coverage", `${required ? Math.round((filled / required) * 100) : 100}%`, `${required - filled} staffing gaps`],
          ["Request SLA", `${sla}%`, "Response within target"],
          [
            "Stock availability",
            `${inventory.filter((record) => record.quantity >= record.minimum).length}/${inventory.length}`,
            "Items above minimum",
          ],
        ].map(([label, value, detail]) => (
          <article key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
            <span>{detail}</span>
          </article>
        ))}
      </section>
      <section className="report-panel report-catalogue">
        <header>
          <div>
            <span className="eyebrow">Calculated from live records</span>
            <h2>Management reports</h2>
          </div>
        </header>
        {catalogue.map(([label, value, detail]) => (
          <div key={label}>
            <strong>{label}</strong>
            <b>{value}</b>
            <small>{detail}</small>
          </div>
        ))}
      </section>
      <section className="reports-grid">
        <article className="report-panel completion-chart">
          <header>
            <div>
              <span className="eyebrow">Cleaning operations</span>
              <h2>Task completion trend</h2>
            </div>
            <span>
              Completed <i /> Scheduled <i />
            </span>
          </header>
          <div>
            {[64, 72, 68, 83, 78, 89, completion].map((value, index) => (
              <span key={index}>
                <i style={{ height: `${value}%` }} />
                <b style={{ height: `${Math.min(100, value + 12)}%` }} />
                <small>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index]}
                </small>
              </span>
            ))}
          </div>
        </article>
        <article className="report-panel workload-chart">
          <header>
            <div>
              <span className="eyebrow">Workforce</span>
              <h2>Workload distribution</h2>
            </div>
          </header>
          {db.records["Staff & Roster"].slice(0, 5).map((person, index) => {
            const count = tasks.filter(
              (task) => task.assignee === person.title,
            ).length
            return (
              <div key={person.id}>
                <span>{person.title}</span>
                <div>
                  <i style={{ width: `${Math.max(12, count * 24)}%` }} />
                </div>
                <b>{count} tasks</b>
              </div>
            )
          })}
        </article>
      </section>
      <section className="reports-grid lower">
        <article className="report-panel">
          <header>
            <div>
              <span className="eyebrow">Exceptions</span>
              <h2>Operational exception trend</h2>
            </div>
          </header>
          {[
            [
              "Overdue tasks",
              tasks.filter(
                (task) =>
                  task.status !== "Completed" &&
                  new Date(task.due).getTime() < Date.now(),
              ).length,
            ],
            [
              "Returned for correction",
              tasks.filter((task) => task.status === "Returned").length,
            ],
            [
              "SLA at risk",
              requests.filter((request) => request.status !== "Closed").length,
            ],
            [
              "Low stock items",
              inventory.filter((record) => record.quantity < record.minimum)
                .length,
            ],
          ].map(([label, value]) => (
            <div className="exception-row" key={String(label)}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </article>
        <article className="report-panel report-history">
          <header>
            <div>
              <span className="eyebrow">Accountability</span>
              <h2>Handover history</h2>
            </div>
          </header>
          {db.records.Handover.map((handover) => (
            <div key={handover.id}>
              <span>
                <Icon name="arrow" size={16} />
              </span>
              <div>
                <strong>{handover.title}</strong>
                <small>
                  {handover.assignee} · {handover.location}
                </small>
              </div>
              <b>{handover.status}</b>
            </div>
          ))}
        </article>
      </section>
    </div>
  )
}

export function LocationHierarchy({
  db,
  onOpen,
  onAdd,
}: {
  db: Database
  onOpen: (record: RecordItem) => void
  onAdd: (defaults: Partial<RecordItem>) => void
}) {
  const [selectedId, setSelectedId] = useState(
    db.records.Locations[0]?.id || "",
  )
  const selected = db.records.Locations.find(
    (record) => record.id === selectedId,
  )

  return (
    <div className="location-hierarchy">
      <aside>
        <header>
          <strong>Location hierarchy</strong>
          <button
            aria-label="Add campus location"
            onClick={() =>
              onAdd({
                building: "KFMC Main Campus",
                floor: "Ground Floor",
                department: "Facilities",
                category: "Zone",
              })
            }
          >
            <Icon name="plus" size={16} />
          </button>
        </header>
        <button className="tree-root selected">
          <Icon name="building" size={17} /> KFMC Main Campus
        </button>
        <div className="tree-branch">
          <div className="tree-level">
            <button><Icon name="building" size={15} /> Main Hospital</button>
            <button aria-label="Add floor to Main Hospital" onClick={() => onAdd({ building: "Main Hospital", floor: "New floor", department: "Facilities", category: "Floor" })}><Icon name="plus" size={14} /></button>
          </div>
          <div>
            <div className="tree-level floor">
              <button>Floor 4</button>
              <button aria-label="Add zone to Floor 4" onClick={() => onAdd({ building: "Main Hospital", floor: "Floor 4", department: "Housekeeping", category: "Cleaning zone" })}><Icon name="plus" size={13} /></button>
            </div>
            {db.records.Locations.slice(0, 2).map((location) => (
              <button
                className={selectedId === location.id ? "selected" : ""}
                key={location.id}
                onClick={() => setSelectedId(location.id)}
              >
                <Icon name="chevron" size={12} /> {location.title}
              </button>
            ))}
          </div>
          <div className="tree-level">
            <button><Icon name="building" size={15} /> Outpatient Building</button>
            <button aria-label="Add floor to Outpatient Building" onClick={() => onAdd({ building: "Outpatient Building", floor: "New floor", department: "Outpatient Services", category: "Floor" })}><Icon name="plus" size={14} /></button>
          </div>
          <div>
            <div className="tree-level floor">
              <button>Ground Floor</button>
              <button aria-label="Add zone to Outpatient Ground Floor" onClick={() => onAdd({ building: "Outpatient Building", floor: "Ground Floor", department: "Outpatient Services", category: "Cleaning zone" })}><Icon name="plus" size={13} /></button>
            </div>
            {db.records.Locations.slice(2, 3).map((location) => (
              <button
                className={selectedId === location.id ? "selected" : ""}
                key={location.id}
                onClick={() => setSelectedId(location.id)}
              >
                <Icon name="chevron" size={12} /> {location.title}
              </button>
            ))}
          </div>
          <div className="tree-level">
            <button><Icon name="building" size={15} /> Support Services</button>
            <button aria-label="Add level to Support Services" onClick={() => onAdd({ building: "Support Services", floor: "Ground Floor", department: "Shared Services", category: "Cleaning zone" })}><Icon name="plus" size={14} /></button>
          </div>
          <div>
            {db.records.Locations.slice(3).map((location) => (
              <button
                className={selectedId === location.id ? "selected" : ""}
                key={location.id}
                onClick={() => setSelectedId(location.id)}
              >
                <Icon name="chevron" size={12} /> {location.title}
              </button>
            ))}
          </div>
        </div>
      </aside>
      {selected && (
        <section>
          <header>
            <div>
              <span className="eyebrow">Cleaning zone</span>
              <h2>{selected.title}</h2>
              <p>KFMC Main Campus · {selected.location}</p>
            </div>
            <button onClick={() => onOpen(selected)}>Edit location</button>
          </header>
          <div className="location-meta">
            <span>
              <small>Location code</small>
              <strong>{selected.code}</strong>
            </span>
            <span>
              <small>Zone status</small>
              <strong>Active</strong>
            </span>
            <span>
              <small>Zone type</small>
              <strong>{selected.category}</strong>
            </span>
            <span>
              <small>Coverage minimum</small>
              <strong>2 workers</strong>
            </span>
          </div>
          <div className="qr-preview">
            <span>
              <Icon name="scan" size={52} />
            </span>
            <div>
              <small>QR identifier</small>
              <strong>{selected.code}</strong>
              <p>
                Used by handheld workers to validate task location before work
                begins.
              </p>
              <button>Download QR label</button>
            </div>
          </div>
          <h3>Change history</h3>
          {[
            "QR identifier verified · Today 08:12",
            "Coverage minimum updated to 2 · 12 Oct 14:40",
            "Zone activated · 01 Oct 09:00",
          ].map((entry) => (
            <div className="location-history" key={entry}>
              <i />
              {entry}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

export function InventoryCustody({ db, compact = false }: { db: Database; compact?: boolean }) {
  const [person, setPerson] = useState("All")
  const custody = Object.entries(db.custody || {})
    .map(([name, items]) => ({ name, items: Object.entries(items).filter(([, n]) => n > 0) }))
    .filter((entry) => entry.items.length)
  const movements = db.records["Stock Transactions"].filter(
    (t) => person === "All" || t.assignee === person || t.notes.includes(person),
  )
  const unit = (title: string) => db.records.Inventory.find((i) => i.title === title)?.unit || "unit"
  const role = (name: string) =>
    db.records["Staff & Roster"].find((s) => s.title === name)?.notes.split("·")[0].trim() || "Staff"
  return (
    <section className="custody-register">
      <header>
        <div>
          <span className="eyebrow">Issue-to-custody ledger</span>
          <h2>Stock held by staff</h2>
          <p>Every issue moves stock from the store into a named person’s custody. Consumption and returns clear it.</p>
        </div>
        <label>
          Staff
          <select value={person} onChange={(e) => setPerson(e.target.value)}>
            <option>All</option>
            {db.records["Staff & Roster"].map((s) => (
              <option key={s.id}>{s.title}</option>
            ))}
          </select>
        </label>
      </header>
      <div className="custody-cards">
        {custody
          .filter((c) => person === "All" || c.name === person)
          .map((c) => (
            <article key={c.name}>
              <div>
                <span>{c.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</span>
                <div>
                  <strong>{c.name}</strong>
                  <small>{role(c.name)}</small>
                </div>
                <b>{c.items.reduce((n, [, q]) => n + q, 0)} units</b>
              </div>
              <ul>
                {c.items.map(([item, q]) => (
                  <li key={item}>
                    <span>{item}</span>
                    <b>
                      {q} {unit(item)}
                    </b>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        {!custody.length && <p className="ops-muted">No stock is currently in staff custody.</p>}
      </div>
      {!compact && (
        <div className="custody-ledger">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Item</th>
                <th>Movement</th>
                <th>Qty</th>
                <th>Staff</th>
                <th>Zone</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {movements.slice(0, 12).map((t) => {
                const [ref, ...rest] = t.title.split(" · ")
                return (
                  <tr key={t.id}>
                    <td>
                      {t.createdAt
                        ? new Date(t.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td>{ref}</td>
                    <td>{rest.join(" · ")}</td>
                    <td>
                      <span className={`ledger-type ${t.category.toLowerCase().replace(/ /g, "-")}`}>{t.category}</span>
                    </td>
                    <td>
                      {["Issue to custody", "Consumption"].includes(t.category) ? "−" : "+"}
                      {t.quantity}
                    </td>
                    <td>{t.assignee && t.category !== "Receipt" ? t.assignee : "—"}</td>
                    <td>{t.category === "Receipt" ? "Central store" : t.location}</td>
                    <td>{t.notes}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
