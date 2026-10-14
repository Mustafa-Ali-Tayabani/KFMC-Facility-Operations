import Icon, { type IconName } from "./Icon"
import type { Database } from "./operations-data"

type Props = {
  db: Database
  mobile: boolean
  role: string
  onNavigate: (module: string) => void
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")

export default function EnterpriseDashboard({
  db,
  mobile,
  role,
  onNavigate,
}: Props) {
  const tasks = db.records.Tasks || []
  const coverage = db.records["Shift Planning"] || []
  const requests = db.records["Service Requests"] || []
  const inventory = db.records.Inventory || []
  const handovers = db.records.Handover || []
  const staff = db.records["Staff & Roster"] || []
  const completed = tasks.filter((task) => task.status === "Completed").length
  const overdue = tasks.filter(
    (task) =>
      task.status !== "Completed" && new Date(task.due).getTime() < Date.now(),
  ).length
  const requiredStaff = coverage.reduce(
    (total, zone) => total + zone.requiredCount,
    0,
  )
  const assignedStaff = new Set(coverage.flatMap((zone) => zone.assignedStaff))
    .size
  const coveredZones = coverage.filter(
    (zone) => zone.assignedStaff.length >= zone.requiredCount,
  ).length
  const coveragePercent = coverage.length
    ? Math.round((coveredZones / coverage.length) * 100)
    : 0

  const metrics: {
    label: string
    value: string
    detail: string
    module: string
    icon: IconName
    tone?: string
  }[] = [
    {
      label: "Active staff",
      value: `${assignedStaff}/${requiredStaff}`,
      detail: `${staff.filter((person) => person.status !== "Unavailable").length} available`,
      module: "Shift Planning",
      icon: "people",
    },
    {
      label: "Zone coverage",
      value: `${coveragePercent}%`,
      detail: `${coverage.length - coveredZones} zones need attention`,
      module: "Shift Planning",
      icon: "building",
      tone: coveragePercent < 90 ? "warning" : "success",
    },
    {
      label: "Scheduled tasks",
      value: String(tasks.length),
      detail: `${tasks.filter((task) => task.status === "Assigned").length} assigned`,
      module: "Tasks",
      icon: "tasks",
    },
    {
      label: "Completed",
      value: String(completed),
      detail: `${
        tasks.length ? Math.round((completed / tasks.length) * 100) : 0
      }% completion`,
      module: "Tasks",
      icon: "check",
      tone: "success",
    },
    {
      label: "Overdue tasks",
      value: String(overdue),
      detail: overdue ? "Requires supervisor action" : "No breached due times",
      module: "Tasks",
      icon: "clock",
      tone: overdue ? "danger" : "success",
    },
    {
      label: "Open requests",
      value: String(
        requests.filter((request) => request.status !== "Closed").length,
      ),
      detail: `${requests.filter((request) => request.priority === "Urgent").length} urgent`,
      module: "Service Requests",
      icon: "bell",
      tone: "information",
    },
    {
      label: "Low stock",
      value: String(
        inventory.filter((record) => record.quantity < record.minimum).length,
      ),
      detail: "Below configured minimum",
      module: "Inventory",
      icon: "box",
      tone: "warning",
    },
    {
      label: "Pending handovers",
      value: String(
        handovers.filter((handover) => handover.status !== "Closed").length,
      ),
      detail: "Awaiting shift ownership",
      module: "Handover",
      icon: "arrow",
    },
  ]

  const taskStates = [
    ["Assigned", tasks.filter((task) => task.status === "Assigned").length],
    [
      "In progress",
      tasks.filter((task) => task.status === "In progress").length,
    ],
    ["Completed", completed],
    ["Overdue", overdue],
    ["Blocked", tasks.filter((task) => task.status === "Returned").length],
  ] as const

  return (
    <div className="command-center">
      <section className="command-toolbar">
        <div className="command-context">
          <button>
            <Icon name="building" size={16} />
            KFMC Main Campus
            <Icon name="chevron" size={13} />
          </button>
          <button>
            <Icon name="calendar" size={16} />
            Today
          </button>
          <button>
            <Icon name="clock" size={16} />
            Morning · 07:00–15:00
          </button>
        </div>
        <div className="live-status">
          <i />
          Live operations
          <span>Plan v{db.planVersion}</span>
        </div>
      </section>

      {!mobile && (
        <section className="quick-actions quick-actions-top">
          <span>Quick actions</span>
          {[
            ["Create shift plan", "Shift Planning", "calendar"],
            ["Assign staff", "Shift Planning", "people"],
            ["Create task", "Tasks", "plus"],
            ["Assign checklist", "Checklist Assignment", "clipboard"],
            ["Dispatch request", "Service Requests", "bell"],
            ["Review handover", "Handover", "arrow"],
          ].map(([label, module, icon]) => (
            <button key={label} onClick={() => onNavigate(module)}>
              <Icon name={icon as IconName} size={17} />
              {label}
            </button>
          ))}
        </section>
      )}

      <section className="command-metrics">
        {metrics.slice(0, mobile ? 4 : metrics.length).map((metric) => (
          <button
            key={metric.label}
            className={metric.tone || ""}
            onClick={() => onNavigate(metric.module)}
          >
            <span>
              <Icon name={metric.icon} size={18} />
            </span>
            <small>{metric.label}</small>
            <strong>{metric.value}</strong>
            <b>{metric.detail}</b>
          </button>
        ))}
      </section>

      <section className="command-grid">
        <article className="command-panel task-progress-panel">
          <header>
            <div>
              <span className="panel-kicker">Real-time status</span>
              <h2>Live task progress</h2>
            </div>
            <button onClick={() => onNavigate("Tasks")}>
              Open task board <Icon name="arrow" size={15} />
            </button>
          </header>
          <div className="task-progress-summary">
            <div className="progress-orbit">
              <strong>
                {tasks.length
                  ? Math.round((completed / tasks.length) * 100)
                  : 0}
                %
              </strong>
              <span>complete</span>
            </div>
            <div className="task-state-list">
              {taskStates.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <div>
                    <i
                      className={label.toLowerCase().replace(" ", "-")}
                      style={{
                        width: `${Math.max(6, tasks.length ? (value / tasks.length) * 100 : 0)}%`,
                      }}
                    />
                  </div>
                  <b>{value}</b>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="command-panel">
          <header>
            <div>
              <span className="panel-kicker">Staffing</span>
              <h2>Zone coverage</h2>
            </div>
            <button onClick={() => onNavigate("Shift Planning")}>
              Manage coverage <Icon name="arrow" size={15} />
            </button>
          </header>
          <div className="coverage-list">
            {coverage.slice(0, 3).map((zone) => {
              const percentage = Math.min(
                100,
                Math.round(
                  (zone.assignedStaff.length / zone.requiredCount) * 100,
                ),
              )
              return (
                <button
                  key={zone.id}
                  onClick={() => onNavigate("Shift Planning")}
                >
                  <div>
                    <strong>{zone.title}</strong>
                    <span>
                      {zone.building} · {zone.floor}
                    </span>
                  </div>
                  <div className="coverage-bar">
                    <i style={{ width: `${percentage}%` }} />
                  </div>
                  <b className={percentage < 100 ? "gap" : ""}>
                    {zone.assignedStaff.length}/{zone.requiredCount}
                  </b>
                </button>
              )
            })}
            {coverage.length > 3 && (
              <button
                className="coverage-more"
                onClick={() => onNavigate("Shift Planning")}
              >
                <div>
                  <strong>{coverage.length - 3} more zones</strong>
                  <span>Open the full staffing and coverage view</span>
                </div>
                <Icon name="arrow" size={16} />
              </button>
            )}
          </div>
        </article>
      </section>

      <section className="command-grid lower">
        <article className="command-panel shift-timeline">
          <header>
            <div>
              <span className="panel-kicker">Morning shift</span>
              <h2>Shift timeline</h2>
            </div>
            <span className="timeline-now">Now · 09:20</span>
          </header>
          <div className="timeline-hours">
            {["07:00", "09:00", "11:00", "13:00", "15:00"].map((hour) => (
              <span key={hour}>{hour}</span>
            ))}
          </div>
          {tasks.slice(0, 4).map((task, index) => (
            <div className="timeline-row" key={task.id}>
              <span className="timeline-avatar">{initials(task.assignee)}</span>
              <div>
                <span
                  className={`timeline-block ${task.status.toLowerCase().replace(" ", "-")}`}
                  style={{
                    marginLeft: `${index * 9}%`,
                    width: `${Math.max(24, task.duration / 1.5)}%`,
                  }}
                >
                  {task.title}
                </span>
              </div>
            </div>
          ))}
        </article>

        <article className="command-panel urgent-panel">
          <header>
            <div>
              <span className="panel-kicker">SLA monitoring</span>
              <h2>Urgent requests</h2>
            </div>
            <button onClick={() => onNavigate("Service Requests")}>
              View queue <Icon name="arrow" size={15} />
            </button>
          </header>
          {requests.slice(0, 3).map((request) => {
            const minutes = Math.max(
              0,
              Math.round(
                (new Date(request.sla).getTime() - Date.now()) / 60000,
              ),
            )
            return (
              <button
                className="urgent-request"
                key={request.id}
                onClick={() => onNavigate("Service Requests")}
              >
                <span className={request.priority.toLowerCase()}>
                  {request.priority}
                </span>
                <div>
                  <strong>{request.title}</strong>
                  <small>
                    {request.location} · {request.requester}
                  </small>
                </div>
                <b>{minutes ? `${minutes}m left` : "SLA breached"}</b>
              </button>
            )
          })}
        </article>
      </section>

      <section className="command-grid lower">
        <article className="command-panel">
          <header>
            <div>
              <span className="panel-kicker">Materials</span>
              <h2>Supply alerts</h2>
            </div>
            <button onClick={() => onNavigate("Inventory")}>
              Open inventory <Icon name="arrow" size={15} />
            </button>
          </header>
          <div className="supply-alerts">
            {inventory
              .filter((record) => record.quantity < record.minimum)
              .map((record) => (
                <button key={record.id} onClick={() => onNavigate("Inventory")}>
                  <span>
                    <Icon name="box" size={17} />
                  </span>
                  <div>
                    <strong>{record.title}</strong>
                    <small>
                      {record.category} · {record.location}
                    </small>
                  </div>
                  <b>
                    {record.quantity} / {record.minimum} {record.unit}
                  </b>
                </button>
              ))}
          </div>
        </article>

        <article className="command-panel activity-panel">
          <header>
            <div>
              <span className="panel-kicker">Audit trail</span>
              <h2>Recent activity</h2>
            </div>
            <button onClick={() => onNavigate("Activity Log")}>
              View all <Icon name="arrow" size={15} />
            </button>
          </header>
          {db.activity.slice(0, 5).map((activity, index) => (
            <div key={`${activity}-${index}`}>
              <i />
              <span>{activity}</span>
            </div>
          ))}
        </article>
      </section>

      {mobile && role === "Supervisor" && (
        <section className="supervisor-mobile-actions">
          <span>Supervisor actions</span>
          <div>
            {[
              ["Assign worker", "Shift Planning", "people"],
              ["Dispatch task", "Tasks", "tasks"],
              ["Assign checklist", "Checklist Assignment", "clipboard"],
              ["Review completion", "Photo Review", "check"],
            ].map(([label, module, icon]) => (
              <button key={label} onClick={() => onNavigate(module)}>
                <Icon name={icon as IconName} size={18} />
                {label}
              </button>
            ))}
          </div>
        </section>
      )}
      <p className="demo-data-note">
        Synthetic demonstration data only · No patient or clinical records
        displayed · Signed in as {role}
      </p>
    </div>
  )
}
