import { useEffect, useState } from "react"
import Icon from "./Icon"
import type { RecordItem } from "./operations-data"

/** Worker response for one sub-task (checklist item): "item", "item|Yes" or "item|No|remark". */
export function subTaskAnswer(record: RecordItem, subTask: string) {
  const raw = record.answers.find((a) => a === subTask || a.startsWith(`${subTask}|`))
  if (!raw) return { response: "", remark: "" }
  const [, response = "Yes", ...remark] = raw.split("|")
  return { response, remark: remark.join("|") }
}

const submitted = (record: RecordItem) =>
  record.createdAt
    ? new Date(record.createdAt).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "today"

export default function PhotoReviewQueue({
  records,
  mobile,
  onOpen,
  onDecision,
}: {
  records: RecordItem[]
  mobile: boolean
  onOpen: (record: RecordItem) => void
  onDecision: (record: RecordItem, status: "Completed" | "Returned", reason: string) => void
}) {
  const [filter, setFilter] = useState<"All" | "Exceptions" | "No photos">("All")
  const [selectedId, setSelectedId] = useState(mobile ? "" : records[0]?.id || "")
  const [photoIndex, setPhotoIndex] = useState(0)
  const [flags, setFlags] = useState<Record<string, string>>({})
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const exceptions = (record: RecordItem) =>
    record.checklist.filter((s) => ["No", "N/A", ""].includes(subTaskAnswer(record, s).response)).length
  const visible = records.filter(
    (r) =>
      filter === "All" ||
      (filter === "Exceptions" && exceptions(r) > 0) ||
      (filter === "No photos" && !r.photos.length),
  )
  const selected = records.find((r) => r.id === selectedId)
  useEffect(() => {
    // Move on to the next submission once the current one leaves the queue.
    if (!mobile && !selected && records.length) setSelectedId(records[0].id)
  }, [mobile, selected, records])
  useEffect(() => {
    setPhotoIndex(0)
    setFlags({})
    setNote("")
    setError("")
  }, [selectedId])

  const flagged = Object.keys(flags)
  function decide(status: "Completed" | "Returned") {
    if (!selected) return
    if (status === "Completed" && flagged.length)
      return setError("Clear the flagged sub-tasks or return the task to the worker.")
    if (status === "Returned" && !flagged.length && !note.trim())
      return setError("Flag at least one sub-task or add a note so the worker knows what to correct.")
    const reason =
      status === "Returned"
        ? [
            ...flagged.map((s) => {
              const n = selected.checklist.indexOf(s) + 1
              return `Sub-task ${n} “${s}”${flags[s] ? `: ${flags[s]}` : ""}`
            }),
            note.trim(),
          ]
            .filter(Boolean)
            .join(" · ")
        : note.trim()
    onDecision({ ...selected, reviewFlags: status === "Returned" ? flagged : [] }, status, reason)
    if (mobile) setSelectedId("")
  }

  const queue = (
    <section className="review-queue" aria-label="Submitted tasks">
      <div className="review-filters" role="tablist">
        {(["All", "Exceptions", "No photos"] as const).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            className={filter === f ? "selected" : ""}
            onClick={() => setFilter(f)}
          >
            {f}
            <b>
              {f === "All"
                ? records.length
                : f === "Exceptions"
                  ? records.filter((r) => exceptions(r) > 0).length
                  : records.filter((r) => !r.photos.length).length}
            </b>
          </button>
        ))}
      </div>
      {visible.map((record) => {
        const issues = exceptions(record)
        return (
          <button
            key={record.id}
            className={`review-queue-item ${record.id === selectedId ? "selected" : ""}`}
            onClick={() => setSelectedId(record.id)}
          >
            <span className="review-thumb">
              {record.photos[0] ? (
                <img src={record.photos[0]} alt="" />
              ) : (
                <Icon name="camera" size={18} />
              )}
            </span>
            <span>
              <strong>{record.title}</strong>
              <small>
                {record.location} · {record.assignee}
              </small>
              <em>
                <span>{record.checklist.length} sub-tasks</span>
                <span>
                  {record.photos.length} photo{record.photos.length === 1 ? "" : "s"}
                </span>
                {issues > 0 && <span className="bad">{issues} exception{issues === 1 ? "" : "s"}</span>}
              </em>
            </span>
            <Icon name="chevron" size={15} />
          </button>
        )
      })}
      {!visible.length && (
        <div className="photo-review-empty">
          <span>
            <Icon name="check" size={26} />
          </span>
          <h2>{records.length ? "Nothing matches this filter" : "Review queue is clear"}</h2>
          <p>New submitted task completions will appear here.</p>
        </div>
      )}
    </section>
  )

  const detail = selected && (
    <section className="review-detail" aria-label={`Review ${selected.title}`}>
      <header>
        {mobile && (
          <button className="review-back" onClick={() => setSelectedId("")}>
            ← Queue
          </button>
        )}
        <div>
          <span className="eyebrow">Task · {selected.category}</span>
          <h2>{selected.title}</h2>
          <p>
            {selected.location} · {selected.assignee} · submitted {submitted(selected)}
          </p>
        </div>
        <button onClick={() => onOpen(selected)}>Open full task</button>
      </header>

      <div className="review-section">
        <div className="review-section-head">
          <h3>
            <Icon name="camera" size={16} /> Task evidence
          </h3>
          <small>
            {selected.photos.length} photo{selected.photos.length === 1 ? "" : "s"} · captured once for the whole task
          </small>
        </div>
        {selected.photos.length ? (
          <div className="review-gallery">
            <img
              src={selected.photos[Math.min(photoIndex, selected.photos.length - 1)]}
              alt={`Evidence ${photoIndex + 1} for ${selected.title}`}
            />
            {selected.photos.length > 1 && (
              <div>
                {selected.photos.map((photo, i) => (
                  <button
                    key={i}
                    aria-label={`Show photo ${i + 1}`}
                    className={i === photoIndex ? "selected" : ""}
                    onClick={() => setPhotoIndex(i)}
                  >
                    <img src={photo} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="review-no-photo">
            <Icon name="alert" size={18} />
            {selected.evidenceRequired
              ? "Evidence is required for this task but no photo was attached."
              : "No photo was attached to this task."}
          </div>
        )}
      </div>

      <div className="review-section">
        <div className="review-section-head">
          <h3>
            <Icon name="clipboard" size={16} /> Sub-tasks
          </h3>
          <small>
            {selected.answers.length}/{selected.checklist.length} answered · flag any sub-task that needs correcting
          </small>
        </div>
        <ol className="review-subtasks">
          {selected.checklist.map((subTask, i) => {
            const { response, remark } = subTaskAnswer(selected, subTask)
            const isFlagged = subTask in flags
            return (
              <li key={subTask} className={isFlagged ? "flagged" : ""}>
                <span className="review-step">{i + 1}</span>
                <div>
                  <strong>{subTask}</strong>
                  {remark && <small>Worker remark: {remark}</small>}
                  {isFlagged && (
                    <input
                      aria-label={`Correction for ${subTask}`}
                      placeholder="What needs correcting? (optional)"
                      value={flags[subTask]}
                      onChange={(e) => setFlags({ ...flags, [subTask]: e.target.value })}
                    />
                  )}
                </div>
                <span className={`m-pill ${response === "Yes" ? "ok" : response ? "warn" : "bad"}`}>
                  {response || "Not answered"}
                </span>
                <button
                  className={`review-flag ${isFlagged ? "on" : ""}`}
                  aria-pressed={isFlagged}
                  onClick={() => {
                    const next = { ...flags }
                    if (isFlagged) delete next[subTask]
                    else next[subTask] = ""
                    setFlags(next)
                    setError("")
                  }}
                >
                  {isFlagged ? "Flagged" : "Flag"}
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      {selected.materials.length > 0 && (
        <div className="review-section">
          <div className="review-section-head">
            <h3>
              <Icon name="box" size={16} /> Materials
            </h3>
          </div>
          <div className="review-materials">
            {selected.materials.map((m) => (
              <span key={m.item}>
                {m.item} <b>{m.used}/{m.issued} used</b>
              </span>
            ))}
          </div>
        </div>
      )}

      {selected.notes && <p className="review-note">“{selected.notes}”</p>}

      <footer className="review-actions">
        <input
          aria-label="Reviewer note"
          placeholder={flagged.length ? "Additional note for the worker (optional)" : "Reviewer note (required when returning without flags)"}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error && (
          <p className="ops-error" role="alert">
            {error}
          </p>
        )}
        <div>
          <button onClick={() => decide("Returned")}>
            Return to worker{flagged.length ? ` · ${flagged.length} flagged` : ""}
          </button>
          <button className="ops-primary" disabled={flagged.length > 0} onClick={() => decide("Completed")}>
            <Icon name="check" size={16} /> Accept task
          </button>
        </div>
      </footer>
    </section>
  )

  return (
    <div className="photo-review">
      {(!mobile || !selected) && (
        <section className="photo-review-summary">
          <div>
            <span>
              <Icon name="camera" size={20} />
            </span>
            <div>
              <strong>{records.length}</strong>
              <small>Tasks awaiting review</small>
            </div>
          </div>
          <p>
            Each task carries one set of photo evidence. Check the photos, then
            review every sub-task and flag only the ones that need correcting.
          </p>
        </section>
      )}
      {mobile ? (
        selected ? detail : queue
      ) : (
        <div className="review-layout">
          {queue}
          {detail || (
            <section className="review-detail empty">
              <p className="ops-muted">Select a task to review its evidence and sub-tasks.</p>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
