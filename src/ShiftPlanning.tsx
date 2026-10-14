import { useMemo, useState } from "react"
import Icon from "./Icon"
import Deployment from "./Deployment"
import type { Database, RecordItem } from "./operations-data"

type Props = {
  db: Database
  onCommit: (next: Database, message: string) => void
  onConfirm: (
    title: string,
    message: string,
    action: () => void,
    confirmLabel?: string,
    destructive?: boolean,
  ) => void
  onRequestInput: (
    title: string,
    message: string,
    action: (value: string) => void,
    confirmLabel?: string,
    inputLabel?: string,
    inputPlaceholder?: string,
  ) => void
}

export default function ShiftPlanning({
  db,
  onCommit,
  onConfirm,
  onRequestInput,
}: Props) {
  const zones = db.records["Shift Planning"] || []
  const staff = db.records["Staff & Roster"] || []
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<"board" | "blueprint" | "zones" | "employees">("board")
  const [reviewOpen, setReviewOpen] = useState(false)
  const selected = zones.find((zone) => zone.id === selectedId) || null
  const assignments = useMemo(
    () =>
      zones.flatMap((zone) =>
        zone.assignedStaff.map((person) => ({ person, zone: zone.title })),
      ),
    [zones],
  )
  const uniqueAssigned = new Set(assignments.map((entry) => entry.person)).size
  const totalRequired = zones.reduce(
    (total, zone) => total + zone.requiredCount,
    0,
  )
  const gaps = zones.reduce(
    (total, zone) =>
      total + Math.max(0, zone.requiredCount - zone.assignedStaff.length),
    0,
  )

  function updateZone(
    zone: RecordItem,
    assignedStaff: string[],
    message: string,
  ) {
    const updated = {
      ...zone,
      assignedStaff,
      status:
        assignedStaff.length >= zone.requiredCount ? "Covered" : "Understaffed",
    }
    onCommit(
      {
        ...db,
        records: {
          ...db.records,
          "Shift Planning": zones.map((item) =>
            item.id === zone.id ? updated : item,
          ),
        },
        planStatus: db.planStatus === "Published" ? "Amended" : db.planStatus,
        sync: { ...db.sync, pending: db.sync.pending + 1 },
      },
      message,
    )
  }

  function addWorker(zone: RecordItem, worker: string) {
    const overlap = assignments.find(
      (assignment) =>
        assignment.person === worker && assignment.zone !== zone.title,
    )
    if (overlap) {
      onConfirm(
        "Replace existing allocation?",
        `${worker} is already assigned to ${overlap.zone}. Replace that allocation and continue?`,
        () => {
          const withoutOverlap = zones.map((item) =>
            item.title === overlap.zone
              ? {
                  ...item,
                  assignedStaff: item.assignedStaff.filter(
                    (person) => person !== worker,
                  ),
                  status: "Understaffed",
                }
              : item,
          )
          const updated = withoutOverlap.map((item) =>
            item.id === zone.id
              ? {
                  ...item,
                  assignedStaff: [...new Set([...item.assignedStaff, worker])],
                  status:
                    item.assignedStaff.length + 1 >= item.requiredCount
                      ? "Covered"
                      : "Understaffed",
                }
              : item,
          )
          onCommit(
            {
              ...db,
              records: { ...db.records, "Shift Planning": updated },
              planStatus:
                db.planStatus === "Published" ? "Amended" : db.planStatus,
              sync: { ...db.sync, pending: db.sync.pending + 1 },
            },
            `${worker} reallocated to ${zone.title}`,
          )
        },
        "Replace allocation",
      )
      return
    }
    updateZone(
      zone,
      [...new Set([...zone.assignedStaff, worker])],
      `${worker} assigned to ${zone.title}`,
    )
  }

  function publishPlan() {
    if (gaps > 0) {
      onConfirm(
        "Publish with staffing gaps?",
        `${gaps} staffing gap${
          gaps === 1 ? "" : "s"
        } remain. Publish with shortages clearly flagged?`,
        publish,
        "Publish plan",
      )
      return
    }
    publish()
  }

  function publish() {
    const version = db.planVersion + 1
    const notices = zones.flatMap((zone) =>
      zone.assignedStaff.map((person) => ({
        id: crypto.randomUUID(),
        to: person,
        text: `Shift plan v${version} ${db.planStatus === "Amended" ? "amended" : "published"} · ${zone.title} (${zone.location})`,
        module: "Tasks",
        at: new Date().toISOString(),
      })),
    )
    onCommit(
      {
        ...db,
        records: {
          ...db.records,
          Tasks: db.records.Tasks.map((task) =>
            task.unpublished ? { ...task, unpublished: false } : task,
          ),
        },
        notifications: [...notices, ...(db.notifications || [])].slice(0, 80),
        publishedAt: new Date().toISOString(),
        planHistory: [
          `${new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · v${version} ${db.planStatus === "Amended" ? "re-published after amendment" : "published"} to ${uniqueAssigned} workers${gaps ? ` · ${gaps} gaps flagged` : ""}`,
          ...(db.planHistory || []),
        ],
        planStatus: "Published",
        planVersion: version,
        sync: {
          ...db.sync,
          pending: db.sync.pending + uniqueAssigned,
          lastSynced: new Date().toISOString(),
        },
      },
      `Morning shift plan v${db.planVersion + 1} published to ${uniqueAssigned} workers`,
    )
  }

  function startNewPlan() {
    onConfirm(
      "Create a new shift plan?",
      "Current allocations will be cleared for a fresh draft. Published history and operational records will be preserved.",
      () =>
        onCommit(
          {
            ...db,
            records: {
              ...db.records,
              "Shift Planning": zones.map((zone) => ({
                ...zone,
                assignedStaff: [],
                status: "Understaffed",
              })),
            },
            planStatus: "Draft",
            planHistory: [
              `${new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · New shift draft created from v${db.planVersion}`,
              ...(db.planHistory || []),
            ],
          },
          `New shift plan draft created · next publication v${db.planVersion + 1}`,
        ),
      "Create new plan",
    )
  }

  return (
    <div className="planning-workspace">
      <section className="planning-controls">
        <label>
          Operating date
          <input
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </label>
        <label>
          Hospital / site
          <select defaultValue="KFMC Main Campus">
            <option>KFMC Main Campus</option>
            <option>Rehabilitation Hospital</option>
          </select>
        </label>
        <label>
          Shift template
          <select defaultValue="Morning · 07:00–15:00">
            <option>Morning · 07:00–15:00</option>
            <option>Afternoon · 15:00–23:00</option>
            <option>Night · 23:00–07:00</option>
          </select>
        </label>
        <label>
          Supervisor
          <select defaultValue="Faisal Al-Harbi">
            <option>Faisal Al-Harbi</option>
            <option>Reem Al-Salem</option>
          </select>
        </label>
      </section>

      <section className="planning-summary">
        {[
          ["Required headcount", totalRequired, "people"],
          ["Assigned workforce", uniqueAssigned, "check"],
          ["Coverage gaps", gaps, "alert"],
          [
            "Available staff",
            staff.filter((person) => person.status === "Available").length,
            "people",
          ],
        ].map(([label, value, icon]) => (
          <article key={String(label)}>
            <span>
              <Icon name={icon as "people" | "check" | "alert"} size={18} />
            </span>
            <div>
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
          </article>
        ))}
        <div className="plan-publish">
          <button onClick={startNewPlan}>
            <Icon name="plus" size={16} /> New shift plan
          </button>
          <span
            className={`plan-state ${db.planStatus.toLowerCase().replace(/ /g, "-")}`}
          >
            {db.planStatus} · v{db.planVersion}
          </span>
          {db.planStatus === "Draft" && (
            <button
              onClick={() =>
                onCommit(
                  { ...db, planStatus: "Ready for Publication" },
                  `Plan v${db.planVersion} reviewed and marked ready`,
                )
              }
            >
              <Icon name="check" size={16} /> Mark ready
            </button>
          )}
          {db.planStatus !== "Closed" && (
            <button className="ops-primary" onClick={() => setReviewOpen(true)}>
              <Icon name="bell" size={16} />
              Review & publish
            </button>
          )}
          {["Published", "Amended"].includes(db.planStatus) && (
            <button
              onClick={() =>
                onConfirm(
                  "Close shift plan?",
                  "Further changes will require a new plan.",
                  () =>
                    onCommit(
                      {
                        ...db,
                        planStatus: "Closed",
                        planHistory: [`${new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · v${db.planVersion} closed`, ...(db.planHistory || [])],
                      },
                      `Plan v${db.planVersion} closed`,
                    ),
                  "Close plan",
                )
              }
            >
              Close plan
            </button>
          )}
        </div>
      </section>

      <section className="planning-viewbar">
        <div>
          <button
            className={view === "board" ? "selected" : ""}
            onClick={() => setView("board")}
          >
            <Icon name="grid" size={16} /> Drag & drop
          </button>
          <button
            className={view === "blueprint" ? "selected" : ""}
            onClick={() => setView("blueprint")}
          >
            <Icon name="monitor" size={16} /> Blueprint
          </button>
          <button
            className={view === "zones" ? "selected" : ""}
            onClick={() => setView("zones")}
          >
            <Icon name="building" size={16} /> Zone coverage
          </button>
          <button
            className={view === "employees" ? "selected" : ""}
            onClick={() => setView("employees")}
          >
            <Icon name="people" size={16} /> Employee timeline
          </button>
        </div>
        <span>
          <i /> Changes notify handheld workers after publication
        </span>
      </section>

      {view === "board" || view === "blueprint" ? (
        <Deployment
          db={db}
          mode={view}
          onAssign={addWorker}
          onOpenZone={setSelectedId}
          onRemove={(zone, person) => {
            onRequestInput(
              "Release staff member?",
              `${person} will be removed from ${zone.title}. Add a reason for the deployment history.`,
              (why) =>
                updateZone(
                  zone,
                  zone.assignedStaff.filter(
                    (assigned) => assigned !== person,
                  ),
                  `${person} released from ${zone.title} · ${why}`,
                ),
              "Release staff",
              "Release reason",
              "For example: reassigned to urgent coverage",
            )
          }}
        />
      ) : view === "zones" ? (
        <div className="coverage-matrix">
          <table>
            <thead>
              <tr>
                <th>Building</th>
                <th>Floor</th>
                <th>Department</th>
                <th>Ward / zone</th>
                <th>Required</th>
                <th>Assigned</th>
                <th>Gap</th>
                <th>Coverage status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => {
                const gap = Math.max(
                  0,
                  zone.requiredCount - zone.assignedStaff.length,
                )
                return (
                  <tr key={zone.id} onClick={() => setSelectedId(zone.id)}>
                    <td>{zone.building}</td>
                    <td>{zone.floor}</td>
                    <td>{zone.department}</td>
                    <td>
                      <strong>{zone.title}</strong>
                      <small>{zone.category}</small>
                    </td>
                    <td>{zone.requiredCount}</td>
                    <td>
                      <div className="avatar-stack">
                        {zone.assignedStaff.map((person) => (
                          <span key={person} title={person}>
                            {person
                              .split(" ")
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={gap ? "coverage-gap" : ""}>{gap}</td>
                    <td>
                      <span className={`coverage-state ${gap ? "under" : ""}`}>
                        {gap ? "Understaffed" : "Covered"}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedId(zone.id)
                        }}
                      >
                        Manage <Icon name="chevron" size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="employee-timeline">
          <header>
            <span>Employee</span>
            {["07:00", "09:00", "11:00", "13:00", "15:00"].map((time) => (
              <span key={time}>{time}</span>
            ))}
          </header>
          {staff.map((person, index) => {
            const allocation = assignments.find(
              (entry) => entry.person === person.title,
            )
            return (
              <div key={person.id}>
                <strong>{person.title}</strong>
                <span
                  className={allocation ? "" : "unassigned"}
                  style={{ marginLeft: `${index % 3 === 0 ? 2 : 10}%` }}
                >
                  {allocation?.zone || "Available pool"}
                </span>
                <i>Break 10:30</i>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <div
          className="planning-drawer-backdrop"
          onClick={() => setSelectedId(null)}
        >
          <aside
            className="planning-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span className="eyebrow">Zone allocation</span>
                <h2>{selected.title}</h2>
                <p>
                  {selected.building} · {selected.floor} · {selected.department}
                </p>
              </div>
              <button onClick={() => setSelectedId(null)}>×</button>
            </header>
            <div className="zone-capacity">
              <div>
                <small>Required</small>
                <strong>{selected.requiredCount}</strong>
              </div>
              <div>
                <small>Assigned</small>
                <strong>{selected.assignedStaff.length}</strong>
              </div>
              <div>
                <small>Gap</small>
                <strong>
                  {Math.max(
                    0,
                    selected.requiredCount - selected.assignedStaff.length,
                  )}
                </strong>
              </div>
            </div>
            <h3>Assigned staff</h3>
            <div className="assigned-people">
              {selected.assignedStaff.map((person) => (
                <div key={person}>
                  <span>{person.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{person}</strong>
                    <small>
                      Morning shift ·{" "}
                      {db.records.Tasks.filter((t) => t.assignee === person && !["Completed", "Closed"].includes(t.status)).length}{" "}
                      open tasks
                    </small>
                  </div>
                  <button
                    onClick={() =>
                      onRequestInput(
                        "Remove staff member?",
                        `${person} will be removed from ${selected.title}. Add a reason for the deployment history.`,
                        (why) =>
                          updateZone(
                            selected,
                            selected.assignedStaff.filter(
                              (assigned) => assigned !== person,
                            ),
                            `${person} removed from ${selected.title} · ${why}`,
                          ),
                        "Remove staff",
                        "Removal reason",
                        "For example: shift ended or reassigned",
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <h3>Available eligible staff</h3>
            <div className="available-people">
              {staff
                .filter(
                  (person) => !selected.assignedStaff.includes(person.title),
                )
                .map((person) => {
                  const overlap = assignments.find(
                    (entry) =>
                      entry.person === person.title &&
                      entry.zone !== selected.title,
                  )
                  return (
                    <button
                      key={person.id}
                      onClick={() => addWorker(selected, person.title)}
                    >
                      <span>{person.title.slice(0, 2).toUpperCase()}</span>
                      <div>
                        <strong>{person.title}</strong>
                        <small>
                          {overlap
                            ? `Allocated to ${overlap.zone} · conflict review`
                            : `${person.status} · eligible`}
                        </small>
                      </div>
                      <Icon name="plus" size={17} />
                    </button>
                  )
                })}
            </div>
          </aside>
        </div>
      )}
      {reviewOpen && (
        <div className="ops-modal-backdrop" onClick={() => setReviewOpen(false)}>
          <section className="ops-modal plan-review" role="dialog" aria-label="Plan review" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <span className="eyebrow">Plan v{db.planVersion + 1} · pre-publication review</span>
                <h2>Review shift plan</h2>
              </div>
              <button onClick={() => setReviewOpen(false)} aria-label="Close dialog">
                ×
              </button>
            </header>
            {(() => {
              const tasks = db.records.Tasks
              const doubleBooked = [...new Set(assignments.map((a) => a.person))].filter(
                (p) => assignments.filter((a) => a.person === p).length > 1,
              )
              const rows: [string, string, boolean][] = [
                ["Staff & zone coverage", `${totalRequired - gaps}/${totalRequired} positions filled`, gaps === 0],
                ["Scheduling conflicts", doubleBooked.length ? `Double-booked: ${doubleBooked.join(", ")}` : "No overlapping assignments", !doubleBooked.length],
                ["Unassigned tasks", `${tasks.filter((t) => t.status === "Unassigned").length} unassigned · ${tasks.filter((t) => t.status === "Assigned").length} assigned`, !tasks.some((t) => t.status === "Unassigned")],
                ["Checklist assignments", `${(db.records["Checklist Assignment"] || []).length} active · ${tasks.filter((t) => !t.checklist.length).length} tasks without checklist`, !tasks.some((t) => !t.checklist.length)],
                ["Due times", `${tasks.filter((t) => !["Completed", "Closed"].includes(t.status) && new Date(t.due).getTime() < Date.now()).length} already overdue`, !tasks.some((t) => !["Completed", "Closed"].includes(t.status) && new Date(t.due).getTime() < Date.now())],
                ["Planned materials", `${db.records.Inventory.filter((i) => i.quantity < i.minimum).length} items below minimum (planning does not deduct stock)`, !db.records.Inventory.some((i) => i.quantity < i.minimum)],
                ["Tasks waiting for publication", `${tasks.filter((t) => t.unpublished).length} will be released to handhelds`, true],
              ]
              return (
                <div className="plan-review-list">
                  {rows.map(([label, detail, ok]) => (
                    <div key={label} className={ok ? "ok" : "warn"}>
                      <Icon name={ok ? "check" : "alert"} size={16} />
                      <div>
                        <strong>{label}</strong>
                        <small>{detail}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
            {(db.planHistory || []).length > 0 && (
              <>
                <h3>Version history</h3>
                <div className="record-history">
                  {(db.planHistory || []).map((h, i) => (
                    <div key={i}>{h}</div>
                  ))}
                </div>
              </>
            )}
            <div className="ops-actions">
              <button className="ops-primary" onClick={() => { setReviewOpen(false); publishPlan() }}>
                Publish to handhelds
              </button>
              <button onClick={() => setReviewOpen(false)}>Keep editing</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
