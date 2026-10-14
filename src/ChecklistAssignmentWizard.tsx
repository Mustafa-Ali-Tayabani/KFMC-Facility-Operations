import { useMemo, useState } from "react"
import Icon from "./Icon"
import { item, type Database } from "./operations-data"

type Props = {
  db: Database
  onCommit: (next: Database, message: string) => void
  onOpenTasks: () => void
  onNotice: (title: string, message: string) => void
}

const steps = [
  "Template",
  "Zones",
  "Schedule",
  "Assignee",
  "Due time",
  "Review",
]

export default function ChecklistAssignmentWizard({
  db,
  onCommit,
  onOpenTasks,
  onNotice,
}: Props) {
  const [step, setStep] = useState(0)
  const [templateId, setTemplateId] = useState(
    db.records.Checklists[0]?.id || "",
  )
  const [zones, setZones] = useState<string[]>([])
  const [shift, setShift] = useState("Morning · 07:00–15:00")
  const [recurrence, setRecurrence] = useState("Every shift")
  const [assignee, setAssignee] = useState("Sara Ahmed")
  const [dueTime, setDueTime] = useState("10:00")
  const [complete, setComplete] = useState(false)
  const template = db.records.Checklists.find(
    (record) => record.id === templateId,
  )
  const eligibleStaff = db.records["Staff & Roster"].filter(
    (person) => person.status !== "Unavailable",
  )
  const preview = useMemo(
    () =>
      zones.map((zone) => ({
        zone,
        title: `${zone} · ${template?.title || "Cleaning checklist"}`,
      })),
    [template, zones],
  )

  function toggleZone(zone: string) {
    setZones((current) =>
      current.includes(zone)
        ? current.filter((entry) => entry !== zone)
        : [...current, zone],
    )
  }

  function canContinue() {
    if (step === 0) return Boolean(template)
    if (step === 1) return zones.length > 0
    if (step === 3) return Boolean(assignee)
    return true
  }

  function assign() {
    if (!template || !zones.length) return
    const live = ["Published", "Amended"].includes(db.planStatus)
    const duplicates = preview.filter(({ title }) =>
      db.records.Tasks.some(
        (task) =>
          task.title === title &&
          task.assignee === assignee &&
          !["Completed", "Closed"].includes(task.status),
      ),
    )
    if (duplicates.length === preview.length) {
      onNotice(
        "Tasks already assigned",
        "These checklist tasks already exist for this worker. No duplicates were created.",
      )
      return
    }
    const generated = preview.filter((entry) => !duplicates.includes(entry)).map(({ zone, title }) => {
      const location = db.records.Locations.find(
        (record) => record.title === zone,
      )
      return item(title, {
        location: zone,
        code: location?.code || "QR-PENDING",
        assignee,
        status: "Assigned",
        category: template.category,
        duration: template.duration,
        due: `${new Date().toISOString().slice(0, 10)}T${dueTime}`,
        plannedStart: dueTime,
        checklist: template.notes.split("\n").filter(Boolean),
        answers: [],
        notes: `${template.title} · ${recurrence} · ${shift}`,
        recurrence,
        createdAt: new Date().toISOString(),
        unpublished: !live,
        history: [`Created from template “${template.title}” · ${live ? "released immediately (plan amended)" : "held until publication"}`],
        evidenceRequired: template.category === "Terminal",
      })
    })
    onCommit(
      {
        ...db,
        records: {
          ...db.records,
          Tasks: [...db.records.Tasks, ...generated],
          "Checklist Assignment": [
            ...db.records["Checklist Assignment"],
            item(`${template.title} · ${zones.length} zones`, {
              status: "Active",
              category: recurrence,
              assignee,
              notes: `${shift} · Due ${dueTime}\n${zones.join(", ")}`,
              checklist: [...template.checklist],
            }),
          ],
        },
        sync: {
          ...db.sync,
          pending: db.sync.pending + generated.length,
        },
        planStatus: db.planStatus === "Published" ? "Amended" : db.planStatus,
        notifications: live
          ? [
              {
                id: crypto.randomUUID(),
                to: assignee,
                text: `${generated.length} checklist task(s) added to your shift · ${template.title}`,
                module: "Tasks",
                at: new Date().toISOString(),
              },
              ...(db.notifications || []),
            ]
          : db.notifications,
      },
      `${generated.length} checklist task${
        generated.length === 1 ? "" : "s"
      } assigned to ${assignee}${duplicates.length ? ` · ${duplicates.length} duplicate(s) skipped` : ""}${live ? "" : " · released on publication"}`,
    )
    setComplete(true)
  }

  if (complete) {
    return (
      <section className="wizard-complete">
        <span>
          <Icon name="check" size={32} />
        </span>
        <small>Assignment confirmed</small>
        <h2>{preview.length} task instances created</h2>
        <p>
          {template?.title} is linked to each task and has been queued for
          synchronization to {assignee}’s handheld.
        </p>
        <div>
          <button
            onClick={() => {
              setComplete(false)
              setStep(0)
              setZones([])
            }}
          >
            Create another
          </button>
          <button className="ops-primary" onClick={onOpenTasks}>
            Open task board <Icon name="arrow" size={16} />
          </button>
        </div>
      </section>
    )
  }

  return (
    <div className="assignment-wizard">
      <nav aria-label="Checklist assignment progress">
        {steps.map((label, index) => (
          <button
            key={label}
            className={
              index === step ? "active" : index < step ? "complete" : ""
            }
            onClick={() => {
              if (index < step) setStep(index)
            }}
          >
            <span>
              {index < step ? <Icon name="check" size={13} /> : index + 1}
            </span>
            <b>{label}</b>
          </button>
        ))}
      </nav>

      <section className="wizard-content">
        <header>
          <span className="eyebrow">
            Step {step + 1} of {steps.length}
          </span>
          <h2>
            {
              [
                "Select an approved template",
                "Choose one or more cleaning zones",
                "Set shift and recurrence",
                "Select an eligible worker",
                "Configure the due time",
                "Review generated task instances",
              ][step]
            }
          </h2>
          <p>
            Checklist instances remain part of their cleaning task rather than
            becoming separate duplicate work.
          </p>
        </header>

        {step === 0 && (
          <div className="template-picker">
            {db.records.Checklists.map((record) => (
              <button
                key={record.id}
                className={templateId === record.id ? "selected" : ""}
                onClick={() => setTemplateId(record.id)}
              >
                <span>
                  <Icon name="clipboard" size={20} />
                </span>
                <div>
                  <strong>{record.title}</strong>
                  <small>
                    {record.category} · {record.duration} min ·{" "}
                    {record.notes.split("\n").length} questions
                  </small>
                </div>
                <i>
                  {templateId === record.id && <Icon name="check" size={15} />}
                </i>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="zone-picker">
            {db.records.Locations.map((record) => (
              <label key={record.id}>
                <input
                  type="checkbox"
                  checked={zones.includes(record.title)}
                  onChange={() => toggleZone(record.title)}
                />
                <span>
                  <Icon name="building" size={18} />
                </span>
                <div>
                  <strong>{record.title}</strong>
                  <small>{record.code} · Active cleaning zone</small>
                </div>
              </label>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="wizard-fields">
            <label>
              Operating shift
              <select
                value={shift}
                onChange={(event) => setShift(event.target.value)}
              >
                <option>Morning · 07:00–15:00</option>
                <option>Afternoon · 15:00–23:00</option>
                <option>Night · 23:00–07:00</option>
              </select>
            </label>
            <label>
              Recurrence
              <select
                value={recurrence}
                onChange={(event) => setRecurrence(event.target.value)}
              >
                <option>Every shift</option>
                <option>Every 4 hours</option>
                <option>Weekdays</option>
                <option>On demand</option>
              </select>
            </label>
            <label>
              Start date
              <input
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="worker-picker">
            {eligibleStaff.map((person) => {
              const workload = db.records.Tasks.filter(
                (task) =>
                  task.assignee === person.title && task.status !== "Completed",
              ).length
              return (
                <button
                  key={person.id}
                  className={assignee === person.title ? "selected" : ""}
                  onClick={() => setAssignee(person.title)}
                >
                  <span>{person.title.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{person.title}</strong>
                    <small>
                      {person.status} · {workload} active tasks
                    </small>
                  </div>
                  <b>{workload > 3 ? "High workload" : "Eligible"}</b>
                </button>
              )
            })}
          </div>
        )}

        {step === 4 && (
          <div className="due-time-panel">
            <label>
              Due time
              <input
                type="time"
                value={dueTime}
                onChange={(event) => setDueTime(event.target.value)}
              />
            </label>
            <div>
              <Icon name="clock" size={20} />
              <p>
                Estimated duration is{" "}
                <strong>{template?.duration} minutes</strong>. The worker will
                receive the task during {shift.toLowerCase()}.
              </p>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="assignment-review">
            <div className="review-summary">
              <span>
                <small>Template</small>
                <strong>{template?.title}</strong>
              </span>
              <span>
                <small>Worker</small>
                <strong>{assignee}</strong>
              </span>
              <span>
                <small>Schedule</small>
                <strong>{recurrence}</strong>
              </span>
              <span>
                <small>Due</small>
                <strong>{dueTime}</strong>
              </span>
            </div>
            <h3>Generated preview</h3>
            {preview.map(({ zone, title }) => (
              <article key={zone}>
                <span>
                  <Icon name="tasks" size={18} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <small>
                    {zone} · {assignee} · Due {dueTime}
                  </small>
                </div>
                <b>Assigned</b>
              </article>
            ))}
          </div>
        )}

        <footer>
          <button disabled={step === 0} onClick={() => setStep(step - 1)}>
            Previous
          </button>
          {step < steps.length - 1 ? (
            <button
              className="ops-primary"
              disabled={!canContinue()}
              onClick={() => setStep(step + 1)}
            >
              Continue <Icon name="arrow" size={16} />
            </button>
          ) : (
            <button className="ops-primary" onClick={assign}>
              Confirm & assign {preview.length} task
              {preview.length === 1 ? "" : "s"}
            </button>
          )}
        </footer>
      </section>
    </div>
  )
}
