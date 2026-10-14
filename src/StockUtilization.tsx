import Icon from "./Icon"
import { untilText, utilization, type Database } from "./operations-data"

const when = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"

/** Items each person holds or was last issued, with the usage-period lock on re-requesting. */
export default function StockUtilization({
  db,
  people,
  onRequest,
  title = "Stock utilization",
}: {
  db: Database
  people: string[]
  onRequest?: (person: string, material: string) => void
  title?: string
}) {
  const single = people.length === 1
  const rows = people.flatMap((person) => {
    const held = db.custody?.[person] || {}
    const materials = [...new Set([...Object.keys(db.issuedAt?.[person] || {}), ...Object.keys(held)])]
    return materials
      .map((material) => ({ person, material, qty: held[material] || 0, use: utilization(db, person, material) }))
      .filter((row) => row.qty > 0 || row.use.locked)
  })
  const pending = (person: string, material: string) =>
    db.records["Supply Requests"].some(
      (r) => r.assignee === person && r.title === material && ["Submitted", "Approved"].includes(r.status),
    )
  const unit = (material: string) => db.records.Inventory.find((i) => i.title === material)?.unit || "unit"
  const locked = rows.filter((r) => r.use.locked).length

  return (
    <section className="utilization">
      <header>
        <div>
          <span className="eyebrow">Usage period control</span>
          <h2>{title}</h2>
          <p>
            Each item has a usage period set in Inventory. A new request for the
            same item opens only after that period has passed since the last issue.
          </p>
        </div>
        <span className="utilization-count">
          <b>{locked}</b> locked · <b>{rows.length - locked}</b> open
        </span>
      </header>
      <div className="utilization-rows">
        {rows.map(({ person, material, qty, use }) => (
          <article key={`${person}-${material}`} className={use.locked ? "locked" : "open"}>
            <span className="utilization-icon">
              <Icon name="box" size={16} />
            </span>
            <div className="utilization-main">
              <strong>{material}</strong>
              <small>
                {!single && `${person} · `}
                {qty} {unit(material)} in custody · issued {when(use.issuedAt)}
              </small>
              {use.days > 0 && (
                <div className="utilization-bar" aria-label={`${Math.round(use.progress * 100)}% of usage period elapsed`}>
                  <i style={{ width: `${use.progress * 100}%` }} />
                </div>
              )}
              <em>
                {use.days ? `${use.days}-day usage period` : "No usage period"}
                {use.locked && ` · opens ${when(use.availableAt)}`}
              </em>
            </div>
            {pending(person, material) ? (
              <span className="utilization-open">Request pending</span>
            ) : use.locked ? (
              <span className="utilization-lock" title={`Next request available ${when(use.availableAt)}`}>
                <Icon name="clock" size={14} /> {untilText(use.availableAt)}
              </span>
            ) : onRequest ? (
              <button className="utilization-request" onClick={() => onRequest(person, material)}>
                Request
              </button>
            ) : (
              <span className="utilization-open">Request open</span>
            )}
          </article>
        ))}
        {!rows.length && <p className="ops-muted">No materials currently issued{single ? " to you" : ""}.</p>}
      </div>
    </section>
  )
}
