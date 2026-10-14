import Icon from "./Icon"
import type { Database, RecordItem } from "./operations-data"

type Props = {
  db: Database
  onNavigate: (module: string) => void
  onOpenRequest: (record: RecordItem) => void
  onOpenEquipment: (record: RecordItem) => void
}

export default function StorekeeperHome({
  db,
  onNavigate,
  onOpenRequest,
  onOpenEquipment,
}: Props) {
  const inventory = db.records.Inventory
  const requests = db.records["Supply Requests"]
  const equipment = db.records.Equipment
  const pending = requests.filter((request) =>
    ["Submitted", "Approved"].includes(request.status),
  )

  return (
    <div className="storekeeper-home">
      <header>
        <span className="eyebrow">Central store · Morning shift</span>
        <h1>Inventory operations</h1>
        <p>Approve requests, issue stock and equipment, and track custody.</p>
      </header>
      <section className="storekeeper-metrics">
        {[
          ["Pending approvals", pending.filter((r) => r.status === "Submitted").length, "clipboard"],
          ["Ready to issue", pending.filter((r) => r.status === "Approved").length, "arrow"],
          ["Low stock", inventory.filter((r) => r.quantity < r.minimum).length, "alert"],
          ["Equipment out", equipment.filter((e) => e.status === "In Use").length, "activity"],
        ].map(([label, count, icon]) => (
          <button key={String(label)} onClick={() => onNavigate(label === "Equipment out" ? "Inventory" : label === "Low stock" ? "Inventory" : "Supply Requests")}>
            <span><Icon name={icon as "clipboard" | "arrow" | "alert" | "activity"} size={18} /></span>
            <strong>{count}</strong>
            <small>{label}</small>
          </button>
        ))}
      </section>
      <section className="storekeeper-panel">
        <header>
          <div>
            <span className="eyebrow">Approval queue</span>
            <h2>Supply requests</h2>
          </div>
          <button onClick={() => onNavigate("Supply Requests")}>View all</button>
        </header>
        {pending.slice(0, 4).map((request) => (
          <button key={request.id} onClick={() => onOpenRequest(request)}>
            <span className={`m-pill ${request.status === "Submitted" ? "warn" : "ok"}`}>{request.status}</span>
            <div>
              <strong>{request.title} ×{request.quantity}</strong>
              <small>{request.assignee} · {request.location}</small>
            </div>
            <Icon name="chevron" size={16} />
          </button>
        ))}
      </section>
      <section className="storekeeper-panel">
        <header>
          <div>
            <span className="eyebrow">Equipment custody</span>
            <h2>Issue and track equipment</h2>
          </div>
        </header>
        {equipment.map((record) => (
          <button key={record.id} onClick={() => onOpenEquipment(record)}>
            <span className={`m-pill ${record.status === "Available" ? "ok" : record.status === "Out of Service" ? "bad" : "warn"}`}>{record.status}</span>
            <div>
              <strong>{record.title}</strong>
              <small>{record.assignee || record.location} · {record.code}</small>
            </div>
            <Icon name="chevron" size={16} />
          </button>
        ))}
      </section>
    </div>
  )
}
