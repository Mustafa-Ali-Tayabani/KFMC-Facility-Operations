import Icon from "./Icon"
import { issuesOf, templateById, templates, type FormsDb } from "./forms-data"

const today = () => new Date().toISOString().slice(0, 10)
const recDate = (r: { header: Record<string, string>; createdAt: string }) => r.header.date || r.createdAt.slice(0, 10)

/** Compliance summary of a department's form records (used by Food, Housekeeping and Executive dashboards). */
export function FormsSummary({ forms, dept, onNavigate, title, compact }: { forms: FormsDb; dept: "food" | "housekeeping"; onNavigate?: (m: string) => void; title?: string; compact?: boolean }) {
  const list = templates.filter((t) => t.dept === dept)
  const recs = forms.records.filter((r) => list.some((t) => t.id === r.templateId))
  const todays = recs.filter((r) => recDate(r) === today())
  const flagged = recs.filter((r) => issuesOf(templateById(r.templateId)!, r).length).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const review = recs.filter((r) => r.status === "In review")
  const byStep = new Map<string, number>()
  review.forEach((r) => {
    const t = templateById(r.templateId)!
    const who = t.chain[r.step]?.title || "—"
    byStep.set(who, (byStep.get(who) || 0) + 1)
  })
  const routine = list.filter((t) => ["Daily", "Per shift", "Per meal"].includes(t.frequency))
  const done = routine.filter((t) => todays.some((r) => r.templateId === t.id))
  return (
    <div className="hs-dash">
      <div className="ops-metrics">
        {[
          ["Today's records", todays.length, `${done.length}/${routine.length} routine forms started`, "clipboard"],
          ["Awaiting sign-off", review.length, [...byStep.entries()].map(([k, v]) => `${v} ${k}`).slice(0, 2).join(" · ") || "Queue clear", "check"],
          ["Non-conformities", flagged.length, "Records with out-of-limit values", "alert"],
          ["Approved", recs.filter((r) => r.status === "Approved").length, "Full chain signed", "shield"],
        ].map(([label, value, note, icon]) => (
          <button key={String(label)} className="ops-panel" onClick={() => onNavigate?.("Forms")}>
            <span><Icon name={icon as "check"} size={17} /></span>
            <small>{label}</small>
            <strong>{value}</strong>
            <b>{note}</b>
          </button>
        ))}
      </div>
      <div className="hs-grid-2">
        <article className="ops-panel">
          <span className="eyebrow">{title || "Today"}</span>
          <h2>Routine forms due today</h2>
          <div className="fn-due">
            {(compact ? [...routine].sort((a, b) => Number(todays.some((r) => r.templateId === b.id)) - Number(todays.some((r) => r.templateId === a.id))).slice(0, 6) : routine).map((t) => {
              const rs = todays.filter((r) => r.templateId === t.id)
              const state = !rs.length ? "missing" : rs.every((r) => r.status === "Approved") ? "ok" : "warn"
              return (
                <div key={t.id} className={`fn-due-row ${state}`}>
                  <span>{state === "missing" ? "○" : state === "ok" ? "✓" : "◐"}</span>
                  <div><strong>{t.title}</strong><small>{t.code} · {t.frequency}</small></div>
                  <b>{rs.length}</b>
                </div>
              )
            })}
            {compact && routine.length > 6 && <p className="ops-muted">+ {routine.length - 6} more routine forms · {routine.length - done.length} not started today</p>}
          </div>
        </article>
        <article className="ops-panel">
          <span className="eyebrow">Critical limits</span>
          <h2>Latest non-conformities</h2>
          {flagged.slice(0, 8).map((r) => {
            const t = templateById(r.templateId)!
            const issues = issuesOf(t, r)
            return (
              <div key={r.id} className="fn-issue">
                <strong>{r.ref} · {t.title}</strong>
                {issues.slice(0, 3).map((x, i) => (
                  <small key={i}>{x.row} · {x.col}: <b>{x.reason}</b> — {r.values[`${x.s}:${x.r}:__action`] || "no corrective action"}</small>
                ))}
              </div>
            )
          })}
          {!flagged.length && <p className="ops-muted">No out-of-limit readings recorded.</p>}
        </article>
      </div>
    </div>
  )
}

export { MonthlyExtract, extractChain, extractTotals, loadExtract, mealCategories, extractHospitals } from "./MonthlyExtract"
