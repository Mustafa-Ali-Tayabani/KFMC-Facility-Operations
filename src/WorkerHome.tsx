import Icon from "./Icon"
import StockUtilization from "./StockUtilization"
import type { Database, RecordItem } from "./operations-data"

type Props = {
  db: Database
  owner: string
  onDuty: () => void
  onNavigate: (module: string) => void
  onOpenTask: (task: RecordItem) => void
  onOpenNotice: (id: string) => void
  onEndShift: () => void
  onRequestSupply: (material: string) => void
}

export default function WorkerHome({
  db,
  owner,
  onDuty,
  onNavigate,
  onOpenTask,
  onOpenNotice,
  onEndShift,
  onRequestSupply,
}: Props) {
  const published = ["Published", "Amended", "Closed"].includes(db.planStatus)
  const myZones = published
    ? (db.records["Shift Planning"] || []).filter((zone) => zone.assignedStaff.includes(owner))
    : []
  const notices = (db.notifications || []).filter((n) => n.to === owner).slice(0, 4)
  const tasks = (db.records.Tasks || [])
    .filter((task) => task.assignee === owner && !task.unpublished)
    .sort(
      (first, second) =>
        new Date(first.due).getTime() - new Date(second.due).getTime(),
    )
  const done = ["Completed", "Closed", "Pending review"]
  const remaining = tasks.filter((task) => !done.includes(task.status))
  const completed = tasks.filter((task) => done.includes(task.status))
  const returned = tasks.filter((task) => task.status === "Returned")
  const nextTask =
    remaining.find((task) => task.priority === "Urgent") || remaining[0]
  const urgentRequest = (db.records["Service Requests"] || []).find(
    (request) => request.priority === "Urgent" && request.status !== "Closed",
  )

  return (
    <div className="worker-home">
      <section className="worker-welcome">
        <div>
          <span className="eyebrow">Tuesday · Morning shift</span>
          <h1>Good morning, {owner.split(" ")[0]}</h1>
          <p>
            {myZones.length
              ? myZones.map((z) => z.title).join(" · ")
              : published
                ? "No zone allocated in the published plan"
                : "Shift plan not yet published"}
          </p>
        </div>
        <span className="worker-avatar">
          {owner
            .split(" ")
            .map((part) => part[0])
            .join("")}
          <i />
        </span>
      </section>

      <section className="worker-shift-card">
        <header>
          <span>
            <Icon name="clock" size={16} />
            07:00–15:00
          </span>
          <b className={db.duty ? "active" : ""}>
            {db.duty ? "On duty" : "Off duty"}
          </b>
        </header>
        <h2>
          {db.duty ? "Your shift is in progress" : "Ready for your shift?"}
        </h2>
        <p>
          <Icon name="building" size={15} />
          {myZones[0]?.location || "Awaiting zone allocation"} · Plan v{db.planVersion}
        </p>
        <button onClick={onDuty}>
          <Icon name={db.duty ? "logout" : "activity"} size={17} />
          {db.duty ? "Go off duty" : "Confirm on duty"}
        </button>
      </section>

      <section className="worker-stats">
        <button onClick={() => onNavigate("Tasks")}>
          <span>
            <Icon name="tasks" size={18} />
          </span>
          <strong>{remaining.length}</strong>
          <small>Tasks remaining</small>
        </button>
        <button onClick={() => onNavigate("Tasks")}>
          <span>
            <Icon name="check" size={18} />
          </span>
          <strong>{completed.length}</strong>
          <small>Completed today</small>
        </button>
      </section>

      {nextTask && (
        <section className="worker-next-task">
          <header>
            <div>
              <span className="eyebrow">Next priority</span>
              <h2>{nextTask.title}</h2>
            </div>
            <span className={`priority ${nextTask.priority.toLowerCase()}`}>
              {nextTask.priority}
            </span>
          </header>
          <div className="worker-task-meta">
            <span>
              <Icon name="building" size={15} /> {nextTask.location}
            </span>
            <span>
              <Icon name="clock" size={15} /> {nextTask.plannedStart}
            </span>
            <span>
              <Icon name="clipboard" size={15} /> {nextTask.checklist.length}{" "}
              steps
            </span>
          </div>
          <div className="worker-task-progress">
            <div>
              <i
                style={{
                  width: `${
                    nextTask.checklist.length
                      ? (nextTask.answers.length / nextTask.checklist.length) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
            <span>
              {nextTask.answers.length}/{nextTask.checklist.length} complete
            </span>
          </div>
          <button
            className="worker-primary-action"
            onClick={() => onOpenTask(nextTask)}
          >
            {nextTask.status === "In progress"
              ? "Continue task"
              : "Start next task"}
            <Icon name="arrow" size={18} />
          </button>
        </section>
      )}

      {urgentRequest && (
        <button
          className="worker-alert"
          onClick={() => onNavigate("Service Requests")}
        >
          <span>
            <Icon name="alert" size={18} />
          </span>
          <div>
            <strong>High-priority request nearby</strong>
            <small>
              {urgentRequest.title} · {urgentRequest.location}
            </small>
          </div>
          <Icon name="chevron" size={17} />
        </button>
      )}

      {returned.length > 0 && (
        <button className="worker-alert" onClick={() => onOpenTask(returned[0])}>
          <span>
            <Icon name="alert" size={18} />
          </span>
          <div>
            <strong>Correction requested</strong>
            <small>
              {returned[0].title} · {returned[0].notes}
            </small>
          </div>
          <Icon name="chevron" size={17} />
        </button>
      )}

      <StockUtilization
        db={db}
        people={[owner]}
        title="My materials"
        onRequest={(_, material) => onRequestSupply(material)}
      />

      <section className="worker-notifications">
        <header>
          <h2>Notifications</h2>
          <button onClick={() => onNavigate("Announcements")}>Announcements</button>
        </header>
        {notices.map((notice) => (
          <button key={notice.id} onClick={() => onOpenNotice(notice.id)}>
            <span>
              <Icon name="bell" size={17} />
            </span>
            <div>
              <strong>{notice.text}</strong>
              <small>
                {notice.module} · {new Date(notice.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </small>
            </div>
          </button>
        ))}
        {(db.records.Announcements || []).slice(0, 2).map((notice) => (
          <button key={notice.id} onClick={() => onNavigate("Announcements")}>
            <span>
              <Icon name="bell" size={17} />
            </span>
            <div>
              <strong>{notice.title}</strong>
              <small>{notice.notes}</small>
            </div>
          </button>
        ))}
      </section>

      <button className="worker-end-shift" onClick={onEndShift}>
        <Icon name="clipboard" size={17} /> End shift & submit handover
      </button>

      <div className="mobile-sync-banner">
        <i className={db.sync.online ? "" : "offline"} />
        {db.sync.online
          ? db.sync.pending
            ? `${db.sync.pending} changes waiting to sync`
            : "Online · All work saved and synced"
          : "Offline · Work is saved on this device"}
      </div>
    </div>
  )
}
