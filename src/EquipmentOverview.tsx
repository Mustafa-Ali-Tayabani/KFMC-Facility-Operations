import Icon from "./Icon"
import type { Database, RecordItem } from "./operations-data"

export default function EquipmentOverview({
  db,
  context,
  onOpen,
}: {
  db: Database
  context: "inventory" | "service"
  onOpen: (record: RecordItem) => void
}) {
  const records =
    context === "service"
      ? db.records.Equipment.filter((record) => record.status !== "Available")
      : db.records.Equipment
  return (
    <section className="equipment-overview">
      <header>
        <div>
          <span className="eyebrow">
            {context === "service" ? "Service-linked assets" : "Asset inventory"}
          </span>
          <h2>
            {context === "service"
              ? "Equipment requiring attention"
              : "Equipment availability & custody"}
          </h2>
          <p>
            {context === "service"
              ? "Track equipment in use or out of service alongside service requests."
              : "Issue equipment to staff and retain its current location and custody status."}
          </p>
        </div>
        <span>{records.length} assets</span>
      </header>
      <div>
        {records.map((record) => (
          <button key={record.id} onClick={() => onOpen(record)}>
            <span><Icon name="activity" size={18} /></span>
            <div>
              <strong>{record.title}</strong>
              <small>{record.code} · {record.assignee || record.location}</small>
            </div>
            <b className={`m-pill ${record.status === "Available" ? "ok" : record.status === "Out of Service" ? "bad" : "warn"}`}>
              {record.status}
            </b>
            <Icon name="chevron" size={15} />
          </button>
        ))}
      </div>
    </section>
  )
}
