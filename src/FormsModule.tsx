import { useEffect, useMemo, useState } from "react"
import Icon from "./Icon"
import { compressImage } from "./operations-data"
import {
  canFill,
  canSign,
  cellIssue,
  cellKey,
  formsKey,
  issuesOf,
  limitText,
  loadForms,
  nextRef,
  rowsOf,
  saveForms,
  templateById,
  templates,
  validate,
  type Column,
  type FormRecord,
  type FormTemplate,
  type FormsDb,
} from "./forms-data"

export type FormsTab = "signoffs" | "records" | "library" | "register"
type Props = {
  dept: "housekeeping" | "food" | "all"
  role: string
  person: string
  mobile: boolean
  tab?: FormsTab
  onToast?: (message: string) => void
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
const today = () => new Date().toISOString().slice(0, 10)
const statusTone = (s: FormRecord["status"]) => (s === "Approved" ? "ok" : s === "Returned" ? "bad" : s === "Draft" ? "" : "warn")

/** Shared hook so dashboards read the same form records the module writes. */
export function useForms() {
  const [db, setDb] = useState<FormsDb>(loadForms)
  useEffect(() => {
    const sync = (e: StorageEvent) => e.key === formsKey && setDb(loadForms())
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [])
  const commit = (next: FormsDb) => {
    try {
      saveForms(next)
      setDb(next)
      return true
    } catch {
      return false
    }
  }
  return [db, commit] as const
}

export default function FormsModule({ dept, role, person, mobile, tab: initialTab, onToast }: Props) {
  const [db, save] = useForms()
  const mine = useMemo(() => templates.filter((t) => dept === "all" || t.dept === dept), [dept])
  const fillable = mine.filter((t) => canFill(t, role))
  const signQueue = db.records.filter((r) => {
    const t = templateById(r.templateId)
    return t && mine.includes(t) && canSign(t, r, role)
  })
  const [tab, setTab] = useState<FormsTab>(initialTab || (signQueue.length ? "signoffs" : fillable.length ? "library" : "records"))
  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState<FormRecord | null>(null)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("All")
  const [category, setCategory] = useState("All")
  const [error, setError] = useState<string[]>([])
  const toast = (m: string) => onToast?.(m)

  const records = db.records
    .filter((r) => mine.some((t) => t.id === r.templateId))
    .filter((r) => status === "All" || r.status === status)
    .filter((r) => {
      const t = templateById(r.templateId)!
      const text = `${r.ref} ${t.title} ${t.code} ${Object.values(r.header).join(" ")} ${r.createdBy}`.toLowerCase()
      return text.includes(query.toLowerCase())
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const open = db.records.find((r) => r.id === openId) || null

  function start(t: FormTemplate) {
    const header: Record<string, string> = {}
    t.header.forEach((h) => {
      if (h.type === "date") header[h.key] = today()
      else if (h.type === "time") header[h.key] = new Date().toTimeString().slice(0, 5)
    })
    if (t.header.some((h) => h.key === "month")) header.month = new Date().toLocaleDateString("en", { month: "long", year: "numeric" })
    setError([])
    setDraft({ id: crypto.randomUUID(), ref: "", templateId: t.id, header, values: {}, extraRows: {}, remarks: "", photos: [], status: "Draft", step: 0, signatures: [], createdBy: person, createdAt: new Date().toISOString() })
  }
  function persist(record: FormRecord, submit: boolean) {
    const t = templateById(record.templateId)!
    if (submit) {
      const problems = validate(t, record)
      if (problems.length) {
        setError(problems)
        return
      }
    }
    let next = db
    let rec = record
    if (!rec.ref) {
      const [ref, seq] = nextRef(db, t)
      rec = { ...rec, ref }
      next = seq
    }
    if (submit) {
      rec = {
        ...rec,
        status: "In review",
        step: 1,
        signatures: [...rec.signatures, { step: 0, label: t.chain[0].label, role, name: person, at: new Date().toISOString(), action: "Signed" }],
      }
    }
    const exists = next.records.some((r) => r.id === rec.id)
    const ok = save({ ...next, records: exists ? next.records.map((r) => (r.id === rec.id ? rec : r)) : [rec, ...next.records] })
    if (!ok) {
      setError(["Browser storage is full. Remove a photo or use a smaller image."])
      return
    }
    setDraft(null)
    setError([])
    setOpenId(rec.id)
    toast(submit ? `${rec.ref} submitted to ${t.chain[1].title}` : `${rec.ref} saved as draft`)
  }
  function sign(record: FormRecord, approve: boolean, comment = "") {
    const t = templateById(record.templateId)!
    const step = t.chain[record.step]
    const signature = { step: record.step, label: step.label, role, name: person, at: new Date().toISOString(), action: approve ? ("Signed" as const) : ("Returned" as const), comment }
    const done = approve && record.step + 1 >= t.chain.length
    const rec: FormRecord = approve
      ? { ...record, step: record.step + 1, status: done ? "Approved" : "In review", signatures: [...record.signatures, signature] }
      : { ...record, step: 0, status: "Returned", signatures: [...record.signatures, signature] }
    save({ ...db, records: db.records.map((r) => (r.id === rec.id ? rec : r)) })
    toast(approve ? (done ? `${rec.ref} approved` : `${rec.ref} signed · sent to ${t.chain[rec.step].title}`) : `${rec.ref} returned to ${record.createdBy}`)
  }

  if (draft) {
    return <FormEditor record={draft} mobile={mobile} error={error} onChange={setDraft} onCancel={() => { setDraft(null); setError([]) }} onSave={(submit) => persist(draft, submit)} />
  }
  if (open) {
    const t = templateById(open.templateId)!
    const editable = (open.status === "Draft" || open.status === "Returned") && canFill(t, role)
    return (
      <FormViewer
        record={open}
        template={t}
        mobile={mobile}
        canSign={canSign(t, open, role)}
        editable={editable}
        onBack={() => setOpenId(null)}
        onEdit={() => { setDraft(open); setError([]) }}
        onSign={(approve, comment) => sign(open, approve, comment)}
      />
    )
  }

  const categories = ["All", ...new Set(mine.map((t) => t.category))]
  return (
    <section className={`forms-module ${mobile ? "is-mobile" : ""}`}>
      <div className="forms-tabs" role="tablist">
        {([
          ["signoffs", `My sign-offs${signQueue.length ? ` · ${signQueue.length}` : ""}`],
          ["library", "Start a form"],
          ["records", "All records"],
          ["register", "Monthly register"],
        ] as [FormsTab, string][]).map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "signoffs" && (
        <div className="forms-list">
          {signQueue.map((r) => <RecordRow key={r.id} record={r} onOpen={() => setOpenId(r.id)} highlight />)}
          {!signQueue.length && (
            <div className="forms-empty">
              <Icon name="check" size={22} />
              <strong>Nothing waiting for your signature</strong>
              <p>Records reach you when the previous person in the sign-off chain signs.</p>
            </div>
          )}
        </div>
      )}

      {tab === "library" && (
        <>
          <div className="forms-filter">
            {categories.map((c) => (
              <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
          <div className="forms-library">
            {mine
              .filter((t) => category === "All" || t.category === category)
              .map((t) => {
                const allowed = canFill(t, role)
                const count = db.records.filter((r) => r.templateId === t.id).length
                return (
                  <article key={t.id} className={allowed ? "" : "locked"}>
                    <header>
                      <span className="forms-code">{t.code}</span>
                      <span className="m-pill">{t.frequency}</span>
                    </header>
                    <strong>{t.title}</strong>
                    {t.titleAr && <small dir="rtl">{t.titleAr}</small>}
                    <p>{t.chain.map((s) => s.title).join(" → ")}</p>
                    <footer>
                      <small>{count} record{count === 1 ? "" : "s"}</small>
                      {allowed ? (
                        <button onClick={() => start(t)}>
                          <Icon name="plus" size={14} /> Start
                        </button>
                      ) : (
                        <small>Filled by {t.chain[0].title}</small>
                      )}
                    </footer>
                  </article>
                )
              })}
          </div>
        </>
      )}

      {tab === "records" && (
        <>
          <div className="forms-toolbar">
            <span className="forms-search">
              <Icon name="search" size={15} />
              <input placeholder="Search ref, form, room, ward…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
              {["All", "Draft", "In review", "Returned", "Approved"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="forms-list">
            {records.map((r) => <RecordRow key={r.id} record={r} onOpen={() => setOpenId(r.id)} />)}
            {!records.length && <p className="ops-muted">No records match.</p>}
          </div>
        </>
      )}

      {tab === "register" && <Register db={db} templates={mine} onOpen={(id) => setOpenId(id)} />}
    </section>
  )
}

function RecordRow({ record, onOpen, highlight }: { record: FormRecord; onOpen: () => void; highlight?: boolean }) {
  const t = templateById(record.templateId)!
  const issues = issuesOf(t, record).length
  const where = ["room", "ward", "area", "unit", "location", "fryer", "site", "meal"].map((k) => record.header[k]).filter(Boolean).slice(0, 2).join(" · ")
  const waiting = record.status === "In review" ? t.chain[record.step]?.title : record.status === "Returned" ? record.createdBy : ""
  return (
    <button className={`forms-row ${highlight ? "highlight" : ""}`} onClick={onOpen}>
      <span className="forms-row-icon"><Icon name="clipboard" size={17} /></span>
      <div>
        <strong>{t.title}</strong>
        <small>
          {record.ref || "Draft"} · {t.code}{where && ` · ${where}`} · {record.header.date || record.header.month || ""}
        </small>
        <small>
          By {record.createdBy} · {when(record.createdAt)}
          {waiting && ` · waiting: ${waiting}`}
        </small>
      </div>
      {issues > 0 && <b className="forms-flag">{issues} flag{issues === 1 ? "" : "s"}</b>}
      <b className={`m-pill ${statusTone(record.status)}`}>{record.status}</b>
      <Icon name="chevron" size={15} />
    </button>
  )
}

function Cell({ col, value, issue, limit, onChange, disabled }: { col: Column; value: string; issue: string; limit: string; onChange: (v: string) => void; disabled?: boolean }) {
  if (col.type === "yesno" || col.type === "sumna") {
    const options = col.type === "yesno" ? ["Yes", "No", "N/A"] : ["S", "U", "M", "N/A"]
    return (
      <span className={`forms-seg ${issue ? "bad" : ""}`}>
        {options.map((o) => (
          <button type="button" key={o} disabled={disabled} className={value === o ? `on v-${o.replace("/", "")}` : ""} onClick={() => onChange(value === o ? "" : o)}>
            {o}
          </button>
        ))}
      </span>
    )
  }
  if (col.type === "select" || col.type === "rating")
    return (
      <select className={issue ? "bad" : ""} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} aria-label={col.label}>
        <option value="">—</option>
        {col.options?.map((o) => <option key={o}>{o}</option>)}
      </select>
    )
  return (
    <span className={`forms-input ${issue ? "bad" : ""}`}>
      <input
        type={col.type === "temp" || col.type === "number" ? "number" : col.type === "time" ? "time" : col.type === "date" ? "date" : "text"}
        step="any"
        inputMode={col.type === "temp" || col.type === "number" ? "decimal" : undefined}
        value={value}
        disabled={disabled}
        aria-label={col.label}
        placeholder={limit || (col.unit ? col.unit : "")}
        onChange={(e) => onChange(e.target.value)}
      />
      {col.unit && <i>{col.unit}</i>}
    </span>
  )
}

function FormEditor({ record, mobile, error, onChange, onCancel, onSave }: { record: FormRecord; mobile: boolean; error: string[]; onChange: (r: FormRecord) => void; onCancel: () => void; onSave: (submit: boolean) => void }) {
  const t = templateById(record.templateId)!
  const [newRow, setNewRow] = useState<Record<number, string>>({})
  const set = (key: string, v: string) => onChange({ ...record, values: { ...record.values, [key]: v } })
  const issues = issuesOf(t, record)
  const returned = [...record.signatures].reverse().find((s) => s.action === "Returned")
  return (
    <section className={`forms-editor ${mobile ? "is-mobile" : ""}`}>
      <header className="forms-editor-head">
        <button className="forms-back" onClick={onCancel}>← Back</button>
        <div>
          <span className="eyebrow">{t.code} · {t.frequency}</span>
          <h2>{t.title}</h2>
          {t.titleAr && <small dir="rtl">{t.titleAr}</small>}
        </div>
        {issues.length > 0 && <b className="forms-flag">{issues.length} out of limit</b>}
      </header>
      {record.status === "Returned" && returned && (
        <div className="forms-returned">
          <Icon name="alert" size={16} /> Returned by {returned.name} ({returned.label}): {returned.comment || "no comment"}
        </div>
      )}
      {t.limits && (
        <ul className="forms-limits">
          {t.limits.map((l) => <li key={l}>{l}</li>)}
        </ul>
      )}
      <div className="forms-header-grid">
        {t.header.map((h) => (
          <label key={h.key}>
            {h.label}
            {h.type === "select" ? (
              <select value={record.header[h.key] || ""} onChange={(e) => onChange({ ...record, header: { ...record.header, [h.key]: e.target.value } })}>
                <option value="">Select…</option>
                {h.options?.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input type={h.type === "date" ? "date" : h.type === "time" ? "time" : h.type === "number" ? "number" : "text"} value={record.header[h.key] || ""} onChange={(e) => onChange({ ...record, header: { ...record.header, [h.key]: e.target.value } })} />
            )}
          </label>
        ))}
      </div>
      {t.sections.map((section, s) => {
        const rows = rowsOf(t, record, s)
        return (
          <div className="forms-section" key={section.title}>
            <h3>{section.title}</h3>
            {section.note && <p className="ops-muted">{section.note}</p>}
            {mobile || section.columns.length === 1 ? (
              <div className="forms-cards">
                {rows.map((row, r) => {
                  const rowIssue = section.columns.some((c) => cellIssue(t, record, s, r, c))
                  const na = section.columns.some((c) => record.values[cellKey(s, r, c.key)] === "N/A")
                  return (
                    <div key={`${row}-${r}`} className={`forms-card ${rowIssue ? "bad" : ""}`}>
                      <strong>{r + 1}. {row}</strong>
                      <div className="forms-card-cells">
                        {section.columns.map((c) => {
                          const issue = cellIssue(t, record, s, r, c)
                          const limit = limitText(t, record, s, r, c)
                          return (
                            <label key={c.key}>
                              {section.columns.length > 1 && <span>{c.label}{limit && <em> {limit}</em>}</span>}
                              {section.columns.length === 1 && limit && <span><em>{limit}</em></span>}
                              <Cell col={c} value={record.values[cellKey(s, r, c.key)] || ""} issue={issue} limit={limit} onChange={(v) => set(cellKey(s, r, c.key), v)} />
                              {issue && <small className="forms-issue">{issue}</small>}
                            </label>
                          )
                        })}
                      </div>
                      {(rowIssue || na) && (
                        <input className="forms-action" placeholder={na ? "Reason for N/A (required)" : "Corrective action taken (required)"} value={record.values[cellKey(s, r, "__action")] || ""} onChange={(e) => set(cellKey(s, r, "__action"), e.target.value)} />
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="forms-table-wrap">
                <table className="forms-table">
                  <thead>
                    <tr>
                      <th>{section.addRows || "Item"}</th>
                      {section.columns.map((c) => <th key={c.key}>{c.label}</th>)}
                      <th>Corrective action / remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, r) => {
                      const rowIssue = section.columns.some((c) => cellIssue(t, record, s, r, c))
                      const na = section.columns.some((c) => record.values[cellKey(s, r, c.key)] === "N/A")
                      return (
                        <tr key={`${row}-${r}`} className={rowIssue ? "bad" : ""}>
                          <td>{row}</td>
                          {section.columns.map((c) => {
                            const issue = cellIssue(t, record, s, r, c)
                            const limit = limitText(t, record, s, r, c)
                            return (
                              <td key={c.key} title={issue || limit}>
                                <Cell col={c} value={record.values[cellKey(s, r, c.key)] || ""} issue={issue} limit={limit} onChange={(v) => set(cellKey(s, r, c.key), v)} />
                              </td>
                            )
                          })}
                          <td>
                            <input className={`forms-action ${(rowIssue || na) && !(record.values[cellKey(s, r, "__action")] || "").trim() ? "required" : ""}`} placeholder={rowIssue ? "Required" : na ? "Reason for N/A" : "Optional"} value={record.values[cellKey(s, r, "__action")] || ""} onChange={(e) => set(cellKey(s, r, "__action"), e.target.value)} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {section.addRows && (
              <form
                className="forms-addrow"
                onSubmit={(e) => {
                  e.preventDefault()
                  const label = (newRow[s] || "").trim()
                  if (!label) return
                  onChange({ ...record, extraRows: { ...record.extraRows, [s]: [...(record.extraRows[s] || []), label] } })
                  setNewRow({ ...newRow, [s]: "" })
                }}
              >
                <input placeholder={`Add ${section.addRows.toLowerCase()}`} value={newRow[s] || ""} onChange={(e) => setNewRow({ ...newRow, [s]: e.target.value })} />
                <button type="submit"><Icon name="plus" size={14} /> Add row</button>
              </form>
            )}
          </div>
        )
      })}
      <div className="forms-section">
        <h3>Remarks & evidence</h3>
        <textarea placeholder="General remarks" value={record.remarks} onChange={(e) => onChange({ ...record, remarks: e.target.value })} />
        <div className="forms-photos">
          {record.photos.map((p, i) => (
            <span key={i}>
              <img src={p} alt={`Evidence ${i + 1}`} />
              <button onClick={() => onChange({ ...record, photos: record.photos.filter((_, j) => j !== i) })} aria-label="Remove photo">×</button>
            </span>
          ))}
          <label className="forms-photo-add">
            <Icon name="camera" size={18} />
            {t.photoRequired ? "Add photo (required)" : "Add photo"}
            <input type="file" accept="image/*" capture="environment" hidden onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const url = await compressImage(file, 900, 0.6)
              onChange({ ...record, photos: [...record.photos, url] })
              e.target.value = ""
            }} />
          </label>
        </div>
      </div>
      {error.length > 0 && (
        <div className="form-error forms-errors">
          <Icon name="alert" size={16} />
          <div>{error.map((e) => <div key={e}>{e}</div>)}</div>
        </div>
      )}
      <footer className="forms-editor-foot">
        <button onClick={() => onSave(false)}>Save draft</button>
        <button className="ops-primary" onClick={() => onSave(true)}>
          Sign as {t.chain[0].label} & submit <Icon name="arrow" size={15} />
        </button>
      </footer>
    </section>
  )
}

function FormViewer({ record, template: t, mobile, canSign, editable, onBack, onEdit, onSign }: { record: FormRecord; template: FormTemplate; mobile: boolean; canSign: boolean; editable: boolean; onBack: () => void; onEdit: () => void; onSign: (approve: boolean, comment?: string) => void }) {
  const [comment, setComment] = useState("")
  const issues = issuesOf(t, record)
  const signedAt = (i: number) => [...record.signatures].reverse().find((s) => s.step === i && s.action === "Signed" && record.signatures.indexOf(s) > record.signatures.map((x) => x.action).lastIndexOf("Returned"))
  return (
    <section className={`forms-editor forms-view ${mobile ? "is-mobile" : ""}`}>
      <header className="forms-editor-head">
        <button className="forms-back" onClick={onBack}>← Back</button>
        <div>
          <span className="eyebrow">{record.ref} · {t.code}</span>
          <h2>{t.title}</h2>
          <small>{t.header.map((h) => record.header[h.key] && `${h.label}: ${record.header[h.key]}`).filter(Boolean).join(" · ")}</small>
        </div>
        <b className={`m-pill ${statusTone(record.status)}`}>{record.status}</b>
        {!mobile && <button className="forms-print" onClick={() => window.print()}>Print</button>}
      </header>

      <ol className="forms-chain">
        {t.chain.map((step, i) => {
          const sig = signedAt(i)
          const current = record.status === "In review" && record.step === i
          return (
            <li key={step.label} className={sig ? "done" : current ? "current" : ""}>
              <span>{sig ? <Icon name="check" size={13} /> : i + 1}</span>
              <div>
                <strong>{step.label}</strong>
                <small>{step.title} · {step.org}</small>
                {sig ? <em>{sig.name} · {when(sig.at)}</em> : current ? <em>Waiting for signature</em> : null}
              </div>
            </li>
          )
        })}
      </ol>
      {record.signatures.filter((s) => s.action === "Returned").map((s, i) => (
        <div key={i} className="forms-returned"><Icon name="alert" size={15} /> Returned by {s.name} · {when(s.at)}: {s.comment || "no comment"}</div>
      ))}

      {issues.length > 0 && (
        <div className="forms-issues">
          <strong><Icon name="alert" size={15} /> {issues.length} non-conformit{issues.length === 1 ? "y" : "ies"}</strong>
          {issues.map((x, i) => (
            <div key={i}>
              <span>{x.row} · {x.col}: {x.reason}</span>
              <em>{record.values[cellKey(x.s, x.r, "__action")] || "No corrective action recorded"}</em>
            </div>
          ))}
        </div>
      )}

      {t.sections.map((section, s) => (
        <div className="forms-section" key={section.title}>
          <h3>{section.title}</h3>
          <div className="forms-table-wrap">
            <table className="forms-table read">
              <thead>
                <tr>
                  <th>{section.addRows || "Item"}</th>
                  {section.columns.map((c) => <th key={c.key}>{c.label}</th>)}
                  <th>Corrective action / remark</th>
                </tr>
              </thead>
              <tbody>
                {rowsOf(t, record, s).map((row, r) => (
                  <tr key={`${row}-${r}`}>
                    <td>{row}</td>
                    {section.columns.map((c) => {
                      const v = record.values[cellKey(s, r, c.key)] || "—"
                      const issue = cellIssue(t, record, s, r, c)
                      return <td key={c.key} className={issue ? "bad" : ""}>{v}{c.unit && v !== "—" ? ` ${c.unit}` : ""}</td>
                    })}
                    <td>{record.values[cellKey(s, r, "__action")] || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {(record.remarks || record.photos.length > 0) && (
        <div className="forms-section">
          <h3>Remarks & evidence</h3>
          {record.remarks && <p>{record.remarks}</p>}
          <div className="forms-photos">{record.photos.map((p, i) => <span key={i}><img src={p} alt={`Evidence ${i + 1}`} /></span>)}</div>
        </div>
      )}
      {canSign && (
        <footer className="forms-editor-foot forms-sign">
          <input placeholder="Comment (required to return)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button disabled={!comment.trim()} onClick={() => onSign(false, comment)}>Return</button>
          <button className="ops-primary" onClick={() => onSign(true, comment)}>
            <Icon name="check" size={15} /> Sign · {t.chain[record.step].label}
          </button>
        </footer>
      )}
      {editable && (
        <footer className="forms-editor-foot">
          <button className="ops-primary" onClick={onEdit}>{record.status === "Returned" ? "Correct & resubmit" : "Continue editing"}</button>
        </footer>
      )}
    </section>
  )
}

/** Paper-style monthly sheet: one row per room / unit / area, one column per day. */
function Register({ db, templates: list, onOpen }: { db: FormsDb; templates: FormTemplate[]; onOpen: (id: string) => void }) {
  const [templateId, setTemplateId] = useState(list.find((t) => t.registerKey)?.id || list[0]?.id)
  const [month, setMonth] = useState(today().slice(0, 7))
  const t = templateById(templateId)
  if (!t) return null
  const key = t.registerKey || "date"
  const [y, m] = month.split("-").map(Number)
  const days = new Date(y, m, 0).getDate()
  const recs = db.records.filter((r) => r.templateId === t.id && (r.header.date || r.createdAt).slice(0, 7) === month)
  const groups = [...new Set(recs.map((r) => r.header[key] || "—"))].sort()
  return (
    <div className="forms-register">
      <div className="forms-toolbar">
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} aria-label="Form">
          {list.map((x) => <option key={x.id} value={x.id}>{x.code} · {x.title}</option>)}
        </select>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month" />
        <span className="ops-muted">{recs.length} records · grouped by {t.header.find((h) => h.key === key)?.label || "date"}</span>
      </div>
      <div className="forms-table-wrap">
        <table className="forms-register-grid">
          <thead>
            <tr>
              <th>{t.header.find((h) => h.key === key)?.label || "—"}</th>
              {Array.from({ length: days }, (_, i) => <th key={i}>{i + 1}</th>)}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g}>
                <td>{g}</td>
                {Array.from({ length: days }, (_, i) => {
                  const date = `${month}-${String(i + 1).padStart(2, "0")}`
                  const cell = recs.filter((r) => (r.header[key] || "—") === g && (r.header.date || r.createdAt.slice(0, 10)) === date).sort((a, b) => (a.header.shift || "").localeCompare(b.header.shift || ""))
                  return (
                    <td key={i}>
                      {cell.map((r) => (
                        <button key={r.id} className={`reg-dot ${statusTone(r.status)} ${issuesOf(t, r).length ? "flagged" : ""}`} title={`${r.ref} · ${r.status}${r.header.shift ? ` · ${r.header.shift}` : ""}`} onClick={() => onOpen(r.id)}>
                          {r.header.shift ? r.header.shift.replace(/[^0-9]/g, "") || r.header.shift[0] : "●"}
                        </button>
                      ))}
                    </td>
                  )
                })}
              </tr>
            ))}
            {!groups.length && (
              <tr><td colSpan={days + 1} className="ops-muted">No records for this form in {month}.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="ops-muted">Green = approved · amber = in review · red = returned · ring = has non-conformities. Numbers are the shift (1st / 2nd / 3rd).</p>
    </div>
  )
}
