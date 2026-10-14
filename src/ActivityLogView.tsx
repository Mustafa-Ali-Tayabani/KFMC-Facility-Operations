import { useMemo, useState } from "react"
import Icon, { type IconName } from "./Icon"

const categoryOf = (event: string) => {
  if (/stock|supply|inventory|issue/i.test(event)) return "Inventory"
  if (/plan|staff|worker|shift/i.test(event)) return "Workforce"
  if (/handover/i.test(event)) return "Handover"
  return "Tasks"
}

const iconOf: Record<string, IconName> = {
  Inventory: "box",
  Workforce: "people",
  Handover: "arrow",
  Tasks: "tasks",
}

export default function ActivityLogView({ events }: { events: string[] }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("All")
  const visible = useMemo(
    () =>
      events.filter(
        (event) =>
          event.toLowerCase().includes(query.toLowerCase()) &&
          (category === "All" || categoryOf(event) === category),
      ),
    [events, query, category],
  )
  return (
    <div className="activity-view">
      <section className="activity-summary">
        {[
          ["Total events", events.length, "activity"],
          ["Task events", events.filter((event) => categoryOf(event) === "Tasks").length, "tasks"],
          ["Inventory events", events.filter((event) => categoryOf(event) === "Inventory").length, "box"],
          ["Workforce events", events.filter((event) => categoryOf(event) === "Workforce").length, "people"],
        ].map(([label, value, icon]) => (
          <article key={String(label)}>
            <span><Icon name={icon as IconName} size={18} /></span>
            <div><small>{label}</small><strong>{value}</strong></div>
          </article>
        ))}
      </section>
      <section className="activity-ledger">
        <header>
          <div>
            <span className="eyebrow">Immutable operational trail</span>
            <h2>Activity log</h2>
            <p>Assignments, approvals, inventory movements, handovers, and task transitions.</p>
          </div>
          <span className="ops-tag success">{visible.length} events</span>
        </header>
        <div className="activity-filters">
          <label>
            <Icon name="search" size={17} />
            <input
              aria-label="Search activity"
              placeholder="Search event history…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Activity category">
            {["All", "Tasks", "Inventory", "Workforce", "Handover"].map((option) => <option key={option}>{option}</option>)}
          </select>
        </div>
        <div className="activity-timeline">
          {visible.map((event, index) => {
            const type = categoryOf(event)
            const [time, ...message] = event.split(" · ")
            return (
              <article key={`${event}-${index}`}>
                <span><Icon name={iconOf[type]} size={17} /></span>
                <div>
                  <strong>{message.join(" · ") || event}</strong>
                  <small>{type} · {message.length ? time : "Recorded event"}</small>
                </div>
                <b>Recorded</b>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
