import { useState, type DragEvent } from "react"
import Icon from "./Icon"
import type { Database, RecordItem } from "./operations-data"

type Props = {
  db: Database
  mode: "board" | "blueprint"
  onAssign: (zone: RecordItem, person: string) => void
  onRemove: (zone: RecordItem, person: string) => void
  onOpenZone: (id: string) => void
}

type Presence = "online" | "away" | "offline"

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)

export function presenceOf(db: Database, person: RecordItem): Presence {
  if (person.title === "Sara Ahmed") return db.duty ? "online" : "offline"
  if (/break/i.test(person.status)) return "away"
  if (/off|leave|inactive|unavailable/i.test(person.status)) return "offline"
  return "online"
}

const presenceLabel: Record<Presence, string> = {
  online: "Online",
  away: "On break",
  offline: "Offline",
}

export default function Deployment({ db, mode, onAssign, onRemove, onOpenZone }: Props) {
  const zones = db.records["Shift Planning"] || []
  const staff = (db.records["Staff & Roster"] || []).filter(
    (person) => person.category === "Cleaner",
  )
  const [dragging, setDragging] = useState<{ person: string; from?: string } | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const zoneOf = (person: string) => zones.find((zone) => zone.assignedStaff.includes(person))
  const openTasks = (person: string) =>
    db.records.Tasks.filter(
      (task) => task.assignee === person && !["Completed", "Closed"].includes(task.status),
    ).length

  function start(event: DragEvent, person: string, from?: string) {
    event.dataTransfer.setData("text/plain", person)
    event.dataTransfer.effectAllowed = "move"
    setDragging({ person, from })
  }
  function end() {
    setDragging(null)
    setOver(null)
  }
  function dropOnZone(event: DragEvent, zone: RecordItem) {
    event.preventDefault()
    const person = dragging?.person || event.dataTransfer.getData("text/plain")
    end()
    if (!person || zone.assignedStaff.includes(person)) return
    onAssign(zone, person)
  }
  function dropOnPool(event: DragEvent) {
    event.preventDefault()
    const from = zones.find((zone) => zone.id === dragging?.from)
    const person = dragging?.person
    end()
    if (from && person) onRemove(from, person)
  }
  const zoneTarget = (zone: RecordItem) => ({
    onDragOver: (event: DragEvent) => {
      event.preventDefault()
      setOver(zone.id)
    },
    onDragLeave: () => setOver((current) => (current === zone.id ? null : current)),
    onDrop: (event: DragEvent) => dropOnZone(event, zone),
  })

  const chip = (person: string, from?: string, compact = false) => {
    const record = staff.find((entry) => entry.title === person)
    const presence = record ? presenceOf(db, record) : "offline"
    return (
      <span
        key={person}
        className={`deploy-chip ${compact ? "compact" : ""} ${focus === person ? "focus" : ""}`}
        draggable
        onDragStart={(event) => start(event, person, from)}
        onDragEnd={end}
        onMouseEnter={() => setFocus(person)}
        onMouseLeave={() => setFocus(null)}
        title={`${person} · ${presenceLabel[presence]} · ${openTasks(person)} open tasks`}
      >
        <span className="deploy-avatar">
          {initials(person)}
          <i className={presence} />
        </span>
        {!compact && (
          <span className="deploy-chip-text">
            <strong>{person}</strong>
            <small>
              {presenceLabel[presence]} · {openTasks(person)} tasks
            </small>
          </span>
        )}
      </span>
    )
  }

  const pool = (
    <aside
      className={`deploy-pool ${dragging?.from ? "drop-ready" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={dropOnPool}
    >
      <header>
        <strong>Staff directory</strong>
        <small>Drag onto a zone to deploy · drag back here to release</small>
      </header>
      {[
        ["Not deployed", staff.filter((person) => !zoneOf(person.title))],
        ["Deployed", staff.filter((person) => zoneOf(person.title))],
      ].map(([label, list]) => (
        <div key={label as string}>
          <small className="deploy-group">
            {label as string} · {(list as RecordItem[]).length}
          </small>
          {(list as RecordItem[]).map((person) => (
            <div className="deploy-pool-row" key={person.id}>
              {chip(person.title, zoneOf(person.title)?.id)}
              <em>{zoneOf(person.title)?.title || person.status}</em>
            </div>
          ))}
        </div>
      ))}
      <div className="deploy-legend">
        <span><i className="online" /> Online</span>
        <span><i className="away" /> On break</span>
        <span><i className="offline" /> Offline</span>
      </div>
    </aside>
  )

  if (mode === "board")
    return (
      <div className={`deploy-layout ${dragging ? "is-dragging" : ""}`}>
        {pool}
        <div className="deploy-zones">
          {zones.map((zone) => {
            const gap = Math.max(0, zone.requiredCount - zone.assignedStaff.length)
            return (
              <article
                key={zone.id}
                className={`deploy-zone ${over === zone.id ? "over" : ""} ${gap ? "gap" : "ok"}`}
                {...zoneTarget(zone)}
              >
                <header>
                  <div>
                    <strong>{zone.title}</strong>
                    <small>
                      {zone.building} · {zone.floor}
                    </small>
                  </div>
                  <span className={`coverage-state ${gap ? "under" : ""}`}>
                    {zone.assignedStaff.length}/{zone.requiredCount}
                  </span>
                </header>
                <div className="deploy-slots">
                  {zone.assignedStaff.map((person) => chip(person, zone.id))}
                  {Array.from({ length: gap }).map((_, index) => (
                    <span key={index} className="deploy-slot">
                      <Icon name="plus" size={14} /> Open position
                    </span>
                  ))}
                </div>
                <footer>
                  <small>{zone.department}</small>
                  <button onClick={() => onOpenZone(zone.id)}>
                    Details <Icon name="chevron" size={13} />
                  </button>
                </footer>
              </article>
            )
          })}
        </div>
      </div>
    )

  const buildings = [...new Set(zones.map((zone) => zone.building))]
  const online = staff.filter((person) => presenceOf(db, person) === "online").length
  return (
    <div className={`deploy-layout blueprint ${dragging ? "is-dragging" : ""}`}>
      {pool}
      <div className="blueprint-canvas">
        <header className="blueprint-head">
          <div>
            <span className="eyebrow">Bird's-eye view · KFMC Main Campus</span>
            <h2>Live deployment map</h2>
          </div>
          <div className="blueprint-stats">
            <span><b>{online}</b> online</span>
            <span><b>{staff.length - online}</b> away / offline</span>
            <span>
              <b>{zones.filter((zone) => zone.assignedStaff.length < zone.requiredCount).length}</b> zones short
            </span>
          </div>
        </header>
        <div className="blueprint-site">
          {buildings.map((building) => {
            const floors = [...new Set(zones.filter((zone) => zone.building === building).map((zone) => zone.floor))].sort(
              (a, b) => (parseInt(b.replace(/\D/g, "")) || 0) - (parseInt(a.replace(/\D/g, "")) || 0),
            )
            return (
              <section className="blueprint-building" key={building}>
                <header>
                  <Icon name="building" size={15} /> {building}
                </header>
                {floors.map((floor) => (
                  <div className="blueprint-floor" key={floor}>
                    <span className="blueprint-floor-label">{floor.replace("Floor ", "L")}</span>
                    <div className="blueprint-rooms">
                      {zones
                        .filter((zone) => zone.building === building && zone.floor === floor)
                        .map((zone) => {
                          const gap = Math.max(0, zone.requiredCount - zone.assignedStaff.length)
                          return (
                            <button
                              key={zone.id}
                              className={`blueprint-room ${gap ? "gap" : "ok"} ${over === zone.id ? "over" : ""} ${
                                focus && zone.assignedStaff.includes(focus) ? "focus" : ""
                              }`}
                              onClick={() => onOpenZone(zone.id)}
                              {...zoneTarget(zone)}
                            >
                              <span className="blueprint-room-name">
                                <strong>{zone.title}</strong>
                                <small>
                                  {zone.department} · {zone.assignedStaff.length}/{zone.requiredCount}
                                </small>
                              </span>
                              <span className="blueprint-people">
                                {zone.assignedStaff.map((person) => chip(person, zone.id, true))}
                                {Array.from({ length: gap }).map((_, index) => (
                                  <span key={index} className="blueprint-empty" title="Open position" />
                                ))}
                              </span>
                            </button>
                          )
                        })}
                      <span className="blueprint-corridor" aria-hidden="true" />
                    </div>
                  </div>
                ))}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
