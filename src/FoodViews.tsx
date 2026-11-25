import { useEffect, useState } from "react"
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

/* ───────────── Monthly extract (المستخلص الشهري) — contract 16019447 ───────────── */
export const mealCategories = [
  { key: "duty", label: "On-duty staff", ar: "مناوبين", prices: [12, 23, 27] },
  { key: "patients", label: "Regular patients", ar: "مرضى عادي", prices: [12, 26, 26] },
  { key: "water", label: "Water", ar: "مياه", prices: [3, 6.5, 6.5] },
  { key: "children", label: "Children", ar: "أطفال", prices: [6, 17, 13] },
  { key: "special", label: "Special diets", ar: "حميات خاصة", prices: [14, 28, 28] },
  { key: "companions", label: "Companions", ar: "مرافقين", prices: [10, 32, 27] },
]
export const extractHospitals = [
  { key: "main", label: "Main Hospital", ar: "المستشفى الرئيسي" },
  { key: "maternity", label: "Maternity Hospital", ar: "مستشفى الولادة" },
  { key: "children", label: "Children's Hospital", ar: "مستشفى الأطفال" },
  { key: "rehab", label: "Rehabilitation Hospital", ar: "مستشفى التأهيل" },
]
const mealNames = ["Breakfast", "Lunch", "Dinner"]
export const extractChain = [
  { label: "Contractor accountant", ar: "محاسب المتعهد", roles: ["Contractor Management"] },
  { label: "Contractor representative", ar: "مندوب المقاول", roles: ["Contractor Management"] },
  { label: "Head of Nutrition", ar: "رئيس قسم التغذية", roles: ["Food Safety Section"] },
  { label: "Support Services accountant", ar: "محاسب إدارة الخدمات المساندة", roles: ["Support Services Director"] },
  { label: "Support Services Director", ar: "مدير إدارة الخدمات المساندة", roles: ["Support Services Director"] },
]
export type Penalty = { id: string; violation: string; description: string; deduction: number; fine: number; notes: string }
export type Extract = {
  month: string
  /** hospital → category → [B, L, D] monthly counts */
  counts: Record<string, Record<string, number[]>>
  penalties: Penalty[]
  step: number
  signatures: { step: number; label: string; name: string; at: string }[]
  status: "Draft" | "In review" | "Approved"
}
const extractKey = "kfmc-food-extract-v1"
function seedExtract(month: string): Extract {
  let s = month.split("-").reduce((a, b) => a + Number(b), 7)
  const r = () => ((s = (s * 9301 + 49297) % 233280), s / 233280)
  const base: Record<string, number> = { main: 1, maternity: 0.55, children: 0.45, rehab: 0.3 }
  const per: Record<string, number> = { duty: 160, patients: 240, water: 300, children: 60, special: 110, companions: 70 }
  const counts: Extract["counts"] = {}
  extractHospitals.forEach((h) => {
    counts[h.key] = {}
    mealCategories.forEach((c) => {
      const n = per[c.key] * base[h.key] * 30
      counts[h.key][c.key] = [0.85, 1, 0.9].map((f) => Math.round(n * f * (0.92 + r() * 0.16)))
    })
  })
  return {
    month,
    counts,
    penalties: [
      { id: "p1", violation: "Late meal delivery", description: "Lunch trolley reached Ward 3-1 after 13:00 on 3 days (CCP-04 1-hour rule)", deduction: 0, fine: 1500, notes: "Tray & trolley tracking forms" },
      { id: "p2", violation: "Out-of-limit holding temperature", description: "Hot holding below 60 °C — corrective action recorded late", deduction: 0, fine: 1000, notes: "CCP-RF-03" },
    ],
    step: 0,
    signatures: [],
    status: "Draft",
  }
}
export function loadExtract(month: string): Extract {
  try {
    const all = JSON.parse(localStorage.getItem(extractKey) || "{}")
    if (all[month]) return all[month]
  } catch {
    /* reseed */
  }
  return seedExtract(month)
}
function saveExtract(e: Extract) {
  let all: Record<string, Extract> = {}
  try {
    all = JSON.parse(localStorage.getItem(extractKey) || "{}")
  } catch {
    all = {}
  }
  localStorage.setItem(extractKey, JSON.stringify({ ...all, [e.month]: e }))
}
export const extractTotals = (e: Extract) => {
  let meals = 0
  let cost = 0
  extractHospitals.forEach((h) =>
    mealCategories.forEach((c) =>
      e.counts[h.key][c.key].forEach((n, i) => {
        meals += n
        cost += n * c.prices[i]
      }),
    ),
  )
  const fines = e.penalties.reduce((a, p) => a + p.deduction + p.fine, 0)
  return { meals, cost, fines, net: cost - fines }
}
const sar = (n: number) => `SAR ${n.toLocaleString("en", { maximumFractionDigits: 2 })}`

export function MonthlyExtract({ role, person, onToast }: { role: string; person: string; onToast?: (m: string) => void }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [e, setE] = useState<Extract>(() => loadExtract(month))
  useEffect(() => setE(loadExtract(month)), [month])
  const editable = e.status === "Draft" && role === "Contractor Management"
  const totals = extractTotals(e)
  const update = (next: Extract, msg?: string) => {
    setE(next)
    saveExtract(next)
    if (msg) onToast?.(msg)
  }
  const canSign = e.status !== "Approved" && extractChain[e.step]?.roles.includes(role)
  const sign = () => {
    const step = extractChain[e.step]
    const done = e.step + 1 >= extractChain.length
    update({ ...e, step: e.step + 1, status: done ? "Approved" : "In review", signatures: [...e.signatures, { step: e.step, label: step.label, name: person, at: new Date().toISOString() }] }, done ? `Extract ${month} approved` : `Extract ${month} signed · ${step.label}`)
  }
  return (
    <div className="fn-extract">
      <div className="forms-toolbar">
        <input type="month" value={month} onChange={(ev) => setMonth(ev.target.value)} aria-label="Month" />
        <b className={`m-pill ${e.status === "Approved" ? "ok" : e.status === "Draft" ? "" : "warn"}`}>{e.status}</b>
        <span className="ops-muted">Cooked catering contract (عقد الإعاشة المطهية) · Dar Al-Moadat Medical & Scientific Co. · Contract 16019447</span>
      </div>
      <div className="ops-metrics">
        {[["Meals served", totals.meals.toLocaleString(), "All hospitals · B / L / D"], ["Meal cost", sar(totals.cost), "Form 19 · prices × counts"], ["Penalties & deductions", sar(totals.fines), `Form 21 · ${e.penalties.length} entries`], ["Net payable", sar(totals.net), "Before VAT"]].map(([l, v, n]) => (
          <div key={l} className="ops-panel fn-metric"><small>{l}</small><strong>{v}</strong><b>{n}</b></div>
        ))}
      </div>
      <article className="ops-panel hs-flush">
        <h2 className="fn-h">Meals by hospital · بيان أعداد الوجبات</h2>
        <div className="forms-table-wrap">
          <table className="hs-table compact fn-grid">
            <thead>
              <tr><th rowSpan={2}>Hospital</th>{mealCategories.map((c) => <th key={c.key} colSpan={3}>{c.label}<small dir="rtl">{c.ar}</small></th>)}</tr>
              <tr>{mealCategories.flatMap((c) => mealNames.map((m, i) => <th key={c.key + m}>{m[0]}<small>{c.prices[i]}</small></th>))}</tr>
            </thead>
            <tbody>
              {extractHospitals.map((h) => (
                <tr key={h.key}>
                  <td><strong>{h.label}</strong><small dir="rtl">{h.ar}</small></td>
                  {mealCategories.flatMap((c) =>
                    [0, 1, 2].map((i) => (
                      <td key={c.key + i}>
                        {editable ? (
                          <input type="number" value={e.counts[h.key][c.key][i]} onChange={(ev) => {
                            const counts = structuredClone(e.counts)
                            counts[h.key][c.key][i] = Number(ev.target.value) || 0
                            update({ ...e, counts })
                          }} />
                        ) : (
                          e.counts[h.key][c.key][i].toLocaleString()
                        )}
                      </td>
                    )),
                  )}
                </tr>
              ))}
              <tr className="fn-total">
                <td>Cost</td>
                {mealCategories.flatMap((c) => [0, 1, 2].map((i) => <td key={c.key + i}>{Math.round(extractHospitals.reduce((a, h) => a + e.counts[h.key][c.key][i], 0) * c.prices[i]).toLocaleString()}</td>))}
              </tr>
            </tbody>
          </table>
        </div>
      </article>
      <article className="ops-panel hs-flush">
        <h2 className="fn-h">Penalties & deductions · بيان الغرامات والاستقطاعات</h2>
        <div className="forms-table-wrap">
          <table className="hs-table compact">
            <thead><tr><th>#</th><th>Violation</th><th>Description</th><th>Deduction</th><th>Fine</th><th>Total</th><th>Notes</th>{e.status === "Draft" && role === "Food Safety Section" && <th />}</tr></thead>
            <tbody>
              {e.penalties.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td><td><strong>{p.violation}</strong></td><td>{p.description}</td><td>{sar(p.deduction)}</td><td>{sar(p.fine)}</td><td>{sar(p.deduction + p.fine)}</td><td>{p.notes}</td>
                  {e.status === "Draft" && role === "Food Safety Section" && <td><button className="hs-link" onClick={() => update({ ...e, penalties: e.penalties.filter((x) => x.id !== p.id) }, "Penalty removed")}>Remove</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {e.status === "Draft" && role === "Food Safety Section" && <PenaltyForm onAdd={(p) => update({ ...e, penalties: [...e.penalties, p] }, "Penalty added")} />}
      </article>
      <article className="ops-panel">
        <h2>Sign-off · الاعتماد</h2>
        <ol className="forms-chain horizontal">
          {extractChain.map((s, i) => {
            const sig = e.signatures.find((x) => x.step === i)
            return (
              <li key={s.label} className={sig ? "done" : e.step === i && e.status !== "Approved" ? "current" : ""}>
                <span>{sig ? <Icon name="check" size={13} /> : i + 1}</span>
                <div><strong>{s.label}</strong><small dir="rtl">{s.ar}</small>{sig && <em>{sig.name}</em>}</div>
              </li>
            )
          })}
        </ol>
        {canSign && <button className="ops-primary" onClick={sign}><Icon name="check" size={15} /> Sign as {extractChain[e.step].label}</button>}
        {!canSign && e.status !== "Approved" && <p className="ops-muted">Waiting for {extractChain[e.step].label}. Penalties are entered by the Food Safety Section while the extract is a draft.</p>}
      </article>
    </div>
  )
}

function PenaltyForm({ onAdd }: { onAdd: (p: Penalty) => void }) {
  const [p, setP] = useState({ violation: "", description: "", deduction: "", fine: "", notes: "" })
  return (
    <form className="fn-penalty" onSubmit={(ev) => {
      ev.preventDefault()
      if (!p.violation) return
      onAdd({ id: crypto.randomUUID(), violation: p.violation, description: p.description, deduction: Number(p.deduction) || 0, fine: Number(p.fine) || 0, notes: p.notes })
      setP({ violation: "", description: "", deduction: "", fine: "", notes: "" })
    }}>
      <input placeholder="Violation" value={p.violation} onChange={(ev) => setP({ ...p, violation: ev.target.value })} />
      <input placeholder="Description" value={p.description} onChange={(ev) => setP({ ...p, description: ev.target.value })} />
      <input type="number" placeholder="Deduction" value={p.deduction} onChange={(ev) => setP({ ...p, deduction: ev.target.value })} />
      <input type="number" placeholder="Fine" value={p.fine} onChange={(ev) => setP({ ...p, fine: ev.target.value })} />
      <input placeholder="Notes / form ref" value={p.notes} onChange={(ev) => setP({ ...p, notes: ev.target.value })} />
      <button className="ops-primary" type="submit">Add</button>
    </form>
  )
}
