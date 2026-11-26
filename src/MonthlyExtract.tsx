/**
 * Monthly catering extract (المستخلص الشهري) for contract 16019447, modelled on the
 * client's 15-sheet workbook: daily meal counts per hospital, contract prices, utilities,
 * performance evaluation, maintenance & equipment fines, operational fines, attachments
 * index and the payment certificate with its six-step sign-off.
 */
import { useEffect, useState, type ReactNode } from "react"
import Icon from "./Icon"

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
const meals = ["Breakfast", "Lunch", "Dinner"]
/** Performance fines table (جدول الغرامات الخاص بمستوى الأداء): 18 criteria with their maximum score. */
export const criteria: { en: string; ar: string; max: number }[] = [
  { en: "Contractor responds to the supervision section's instructions and coordinates with it", ar: "الاستجابة لتعليمات قسم الإشراف والتنسيق معه", max: 5 },
  { en: "Job descriptions and duty rosters are available", ar: "وصف وظيفي وجدول مناوبة", max: 5 },
  { en: "Staff carry ID cards and wear the official uniform", ar: "بطاقة التعريف والزي الرسمي", max: 5 },
  { en: "Hygiene rules followed (gloves, head cover, nails, hair…)", ar: "الالتزام بالشروط والقواعد الصحية", max: 8 },
  { en: "Staff not assigned to duties outside their job", ar: "عدم القيام بمهام غير المهام الوظيفية", max: 5 },
  { en: "Department policies and regulations followed", ar: "اتباع السياسات والأنظمة الخاصة بالقسم", max: 5 },
  { en: "No staff replaced without prior notice and KFMC approval", ar: "استبدال الأيدي العاملة دون إخطار مسبق", max: 5 },
  { en: "Complete staff files (health certificates, iqama copies…)", ar: "ملفات منسوبي المتعهد كاملة", max: 5 },
  { en: "No shortage of contractor tools and equipment", ar: "نقص في الأدوات والمعدات", max: 8 },
  { en: "No kitchen equipment out of order", ar: "معدات وأجهزة متوقفة عن العمل", max: 6 },
  { en: "Use of disinfectants and cleaning materials", ar: "استعمال المطهرات ومواد النظافة", max: 6 },
  { en: "Hygienic assets for cleaning and food transport to wards", ar: "الأصول الصحية لأعمال النظافة ونقل الغذاء", max: 5 },
  { en: "Food preparation methods to and from the patient (storage, preparation)", ar: "طرق إعداد الطعام شاملة التخزين والتحضير", max: 6 },
  { en: "Safe waste disposal", ar: "التخلص من النفايات بصورة آمنة", max: 6 },
  { en: "Meals served as chosen by the patient or companion", ar: "تقديم الوجبة حسب اختيار المريض", max: 5 },
  { en: "Meals served per the diet prescribed by the specialist", ar: "تقديم الوجبة حسب الحمية المحددة", max: 5 },
  { en: "Transport assets used to carry meals to wards", ar: "استخدام الأصول لنقل الوجبات إلى الأجنحة", max: 5 },
  { en: "Meal trays collected 45 minutes after serving", ar: "تجميع الصواني بعد 45 دقيقة من تقديمها", max: 5 },
]
export const kwhMeters = ["GH4 ERB-B3", "GH4 DB-B3", "GH4 DB-B7", "GH3 EDB-B5", "GH3 EDB-B6", "GH4 EPP-R2", "GH4 SMDB-L-KIT"]
const waterMeters = ["Cold water meter", "Hot water supply meter", "Hot water return meter"]
/** Form 12 — attachments index of the extract. */
export const attachmentsIndex = [
  "Expense statement", "Main hospital statement", "Maternity hospital statement", "Rehabilitation hospital statement", "Children's hospital statement",
  "Total meals statement (Form 19)", "Manpower evaluation statement", "Water bill statement", "Electricity bill statement", "Water & electricity invoice",
  "Penalties statement (Form 21)", "Payroll sheet", "Certificate letter (مشهد)", "Tax certificate", "Commercial register", "Guarantee letter",
  "Chamber of commerce registration", "GOSI certificate",
]
export const extractChain = [
  { label: "Contractor accountant", ar: "محاسب المتعهد", roles: ["Contractor Accountant"] },
  { label: "Contractor representative", ar: "مندوب المقاول", roles: ["Contractor Management"] },
  { label: "Head of Nutrition", ar: "رئيس قسم التغذية", roles: ["Food Safety Section"] },
  { label: "Support Services accountant", ar: "محاسب إدارة الخدمات المساندة", roles: ["Support Services Accountant"] },
  { label: "Support Services Director", ar: "مدير إدارة الخدمات المساندة", roles: ["Support Services Director"] },
  { label: "Executive Director of Operations", ar: "المدير التنفيذي للتشغيل", roles: ["Executive Director of Operations"] },
]
const CONTRACTOR = ["Contractor Accountant", "Contractor Management"]
const KFMC_FOOD = ["Food Safety Section"]
const PRICE_EDITORS = ["Food Safety Section", "Support Services Accountant", "Support Services Director"]

export type Penalty = { id: string; violation: string; description: string; deduction: number; fine: number; notes: string }
type Maintenance = { id: string; date: string; equipment: string; repair: string; parts: string; company: string; cost: number }
type EquipmentFine = { id: string; equipment: string; count: number; value: number; violation: string; duration: string; clause: string; amount: number }
export type Extract = {
  month: string
  status: "Draft" | "In review" | "Approved"
  step: number
  signatures: { step: number; label: string; name: string; at: string; action?: "Signed" | "Returned"; comment?: string }[]
  prices: Record<string, number[]>
  /** hospital → category → day (0–30) → [breakfast, lunch, dinner] */
  daily: Record<string, Record<string, number[][]>>
  water: { prev: number; curr: number }[]
  kwh: { prev: number; curr: number; factor: number }[]
  rates: { water: number; kwh: number }
  scores: (number | null)[]
  amountPerPoint: number
  maintenance: Maintenance[]
  equipmentFines: EquipmentFine[]
  penalties: Penalty[]
  otherDeductions: number
  attachments: Record<string, boolean>
  noHousingCertificate: boolean
}

const extractKey = "kfmc-food-extract-v2"
const daysIn = (month: string) => {
  const [y, m] = month.split("-").map(Number)
  return new Date(y, m, 0).getDate()
}
function seedExtract(month: string): Extract {
  let seed = month.split("-").reduce((a, b) => a + Number(b), 7)
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280), seed / 233280)
  const factor: Record<string, number> = { main: 1, maternity: 0.55, children: 0.45, rehab: 0.3 }
  const perDay: Record<string, number> = { duty: 160, patients: 240, water: 300, children: 60, special: 110, companions: 70 }
  const current = new Date().toISOString().slice(0, 7)
  const lastDay = month === current ? new Date().getDate() : month > current ? 0 : daysIn(month)
  const daily: Extract["daily"] = {}
  extractHospitals.forEach((h) => {
    daily[h.key] = {}
    mealCategories.forEach((c) => {
      daily[h.key][c.key] = Array.from({ length: 31 }, (_, d) =>
        d < lastDay ? [0.85, 1, 0.9].map((f) => Math.round(perDay[c.key] * factor[h.key] * f * (0.9 + rnd() * 0.2))) : [0, 0, 0],
      )
    })
  })
  return {
    month,
    status: "Draft",
    step: 0,
    signatures: [],
    prices: Object.fromEntries(mealCategories.map((c) => [c.key, [...c.prices]])),
    daily,
    water: [{ prev: 41870, curr: 43557 }, { prev: 18342, curr: 19949 }, { prev: 9120, curr: 9800 }],
    kwh: kwhMeters.map((_, i) => ({ prev: 120000 + i * 15000, curr: 120000 + i * 15000 + Math.round(2500 + rnd() * 3000), factor: 1 })),
    rates: { water: 6, kwh: 0.3 },
    scores: criteria.map((c, i) => (i === 8 ? 6 : i === 17 ? 4 : c.max)),
    amountPerPoint: 6270,
    maintenance: [
      { id: "m1", date: `${month}-06`, equipment: "Pot wash machine #01", repair: "Replaced wash pump seal", parts: "Pump seal kit", company: "Contractor maintenance team", cost: 850 },
      { id: "m2", date: `${month}-14`, equipment: "Hot & cold trolley #23", repair: "Thermostat replaced", parts: "Thermostat", company: "Contractor maintenance team", cost: 420 },
    ],
    equipmentFines: [{ id: "e1", equipment: "Wet vacuum (kitchen)", count: 1, value: 3500, violation: "Out of service, not replaced", duration: "6 days", clause: "Equipment availability clause", amount: 600 }],
    penalties: [
      { id: "p1", violation: "Late meal delivery", description: "Lunch trolley reached Ward 3-1 after 13:00 on 3 days (CCP-04 1-hour rule)", deduction: 0, fine: 1500, notes: "Tray & trolley tracking forms" },
      { id: "p2", violation: "Out-of-limit holding temperature", description: "Hot holding below 60 °C — corrective action recorded late", deduction: 0, fine: 1000, notes: "CCP-RF-03" },
    ],
    otherDeductions: 0,
    attachments: Object.fromEntries(attachmentsIndex.map((a, i) => [a, i < 11])),
    noHousingCertificate: false,
  }
}
export function loadExtract(month: string): Extract {
  try {
    const all = JSON.parse(localStorage.getItem(extractKey) || "{}")
    if (all[month]?.daily) return all[month]
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

/* ───────────── Calculations ───────────── */
export const hospitalTotals = (e: Extract, h: string) =>
  Object.fromEntries(mealCategories.map((c) => [c.key, [0, 1, 2].map((m) => e.daily[h][c.key].reduce((a, day) => a + (day[m] || 0), 0))]))
export const categoryTotals = (e: Extract) =>
  Object.fromEntries(mealCategories.map((c) => [c.key, [0, 1, 2].map((m) => extractHospitals.reduce((a, h) => a + hospitalTotals(e, h.key)[c.key][m], 0))]))
export const waterConsumption = (e: Extract) => {
  const used = e.water.map((w) => Math.max(0, w.curr - w.prev))
  return Math.max(0, used[0] + used[1] - used[2])
}
export const kwhConsumption = (e: Extract) => e.kwh.reduce((a, k) => a + Math.max(0, k.curr - k.prev) * (k.factor || 1), 0)
export const criterionFine = (e: Extract, i: number) => {
  const score = e.scores[i]
  if (score === null || score === undefined) return { amount: criteria[i].max * e.amountPerPoint, performance: null as number | null, deduction: 0, fine: 0 }
  const amount = criteria[i].max * e.amountPerPoint
  const performance = Math.min(1, Math.max(0, score / criteria[i].max))
  return { amount, performance, deduction: 1 - performance, fine: amount * (1 - performance) }
}
export const extractTotals = (e: Extract) => {
  const totals = categoryTotals(e)
  let meals = 0
  let cost = 0
  mealCategories.forEach((c) => totals[c.key].forEach((n, i) => ((meals += n), (cost += n * (e.prices[c.key]?.[i] || 0)))))
  const utilities = waterConsumption(e) * e.rates.water + kwhConsumption(e) * e.rates.kwh
  const performance = criteria.reduce((a, _, i) => a + criterionFine(e, i).fine, 0)
  const equipment = e.equipmentFines.reduce((a, f) => a + f.amount, 0)
  const operational = e.penalties.reduce((a, p) => a + p.deduction + p.fine, 0)
  const staff = 0
  const other = e.otherDeductions || 0
  const fines = utilities + performance + equipment + operational + staff + other
  const due = cost - fines
  const vat = due * 0.15
  return { meals, cost, utilities, performance, equipment, operational, staff, other, fines, due, vat, net: due + vat }
}
const sar = (n: number) => `SAR ${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const int = (n: number) => n.toLocaleString("en")

/* ───────────── UI ───────────── */
type Tab = "certificate" | "meals" | "prices" | "utilities" | "performance" | "maintenance" | "fines" | "attachments"
function Num({ value, onChange, disabled, wide }: { value: number; onChange: (n: number) => void; disabled?: boolean; wide?: boolean }) {
  if (disabled) return <>{int(value)}</>
  return <input className={`ex-num ${wide ? "wide" : ""}`} type="number" step="any" value={value} onChange={(ev) => onChange(Number(ev.target.value) || 0)} />
}
function Panel({ title, ar, children, note }: { title: string; ar?: string; note?: string; children: ReactNode }) {
  return (
    <article className="ops-panel hs-flush">
      <h2 className="fn-h">{title}{ar && <> · <span dir="rtl">{ar}</span></>}</h2>
      {note && <p className="ops-muted ex-note">{note}</p>}
      {children}
    </article>
  )
}

export function MonthlyExtract({ role, person, onToast }: { role: string; person: string; onToast?: (m: string) => void }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [e, setE] = useState<Extract>(() => loadExtract(month))
  const [tab, setTab] = useState<Tab>("certificate")
  const [hospital, setHospital] = useState(extractHospitals[0].key)
  const [comment, setComment] = useState("")
  useEffect(() => setE(loadExtract(month)), [month])
  const draft = e.status === "Draft"
  const can = (roles: string[]) => draft && roles.includes(role)
  const t = extractTotals(e)
  const days = daysIn(month)
  const update = (next: Extract, msg?: string) => {
    setE(next)
    saveExtract(next)
    if (msg) onToast?.(msg)
  }
  const canSign = e.status !== "Approved" && extractChain[e.step]?.roles.includes(role)
  const sign = () => {
    const step = extractChain[e.step]
    const done = e.step + 1 >= extractChain.length
    update({ ...e, step: e.step + 1, status: done ? "Approved" : "In review", signatures: [...e.signatures, { step: e.step, label: step.label, name: person, at: new Date().toISOString(), action: "Signed" }] }, done ? `Extract ${month} approved` : `Extract ${month} signed · ${step.label}`)
    setComment("")
  }
  const sendBack = () => {
    update({ ...e, step: 0, status: "Draft", signatures: [...e.signatures, { step: e.step, label: extractChain[e.step].label, name: person, at: new Date().toISOString(), action: "Returned", comment }] }, `Extract ${month} returned to the contractor`)
    setComment("")
  }
  const signed = (i: number) => {
    const lastReturn = e.signatures.map((x) => x.action).lastIndexOf("Returned")
    return e.signatures.find((x, idx) => x.step === i && x.action !== "Returned" && idx > lastReturn)
  }

  const tabs: [Tab, string][] = [
    ["certificate", "Payment certificate"],
    ["meals", "Meal counts"],
    ["prices", "Contract prices"],
    ["utilities", "Water & electricity"],
    ["performance", "Performance evaluation"],
    ["maintenance", "Maintenance & equipment"],
    ["fines", "Operational fines"],
    ["attachments", "Attachments"],
  ]
  const lastReturn = [...e.signatures].reverse().find((x) => x.action === "Returned")

  return (
    <div className="fn-extract">
      <div className="forms-toolbar">
        <input type="month" value={month} onChange={(ev) => setMonth(ev.target.value)} aria-label="Month" />
        <b className={`m-pill ${e.status === "Approved" ? "ok" : e.status === "Draft" ? "" : "warn"}`}>{e.status}</b>
        <span className="ops-muted">Cooked catering contract (عقد الإعاشة المطهية) · Dar Al-Moadat Medical & Scientific Co. · Contract 16019447</span>
      </div>
      {draft && lastReturn && <div className="forms-returned"><Icon name="alert" size={15} /> Returned by {lastReturn.name} ({lastReturn.label}): {lastReturn.comment || "no comment"}</div>}
      <div className="ops-metrics">
        {[["Meal cost (a)", sar(t.cost), `${int(t.meals)} meals · 4 hospitals`], ["Deductions (b)", sar(t.fines), "Utilities, fines and deductions"], ["Due to contractor", sar(t.due), "a − b"], ["Net payable", sar(t.net), `incl. 15% VAT ${sar(t.vat)}`]].map(([l, v, n]) => (
          <div key={l} className="ops-panel fn-metric"><small>{l}</small><strong>{v}</strong><b>{n}</b></div>
        ))}
      </div>
      <div className="forms-tabs">
        {tabs.map(([k, l]) => <button key={k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === "certificate" && (
        <>
          <Panel title="Monthly completion & payment certificate" ar="شهادة الإنجاز والاستحقاق الشهري">
            <table className="hs-table compact ex-cert">
              <tbody>
                <tr className="fn-total"><td>a</td><td>Cost of meals supplied (attached statement)</td><td>{sar(t.cost)}</td></tr>
                <tr><td>b</td><td><strong>Deductions, withholdings and fines</strong></td><td /></tr>
                {[
                  ["Water & electricity consumption (attached record)", t.utilities],
                  ["Staff fines & deductions (attendance sheet)", t.staff],
                  ["Service staff performance fine", t.performance],
                  ["Equipment & tools fines and deductions", t.equipment],
                  ["Operational fines and deductions", t.operational],
                  ["Other fines or deductions", t.other],
                ].map(([l, v]) => <tr key={String(l)}><td /><td>{l}{l === "Staff fines & deductions (attendance sheet)" && <small>Not built yet — waiting for the client to confirm scope (FN-06, contains salaries)</small>}</td><td>{sar(Number(v))}</td></tr>)}
                <tr className="fn-total"><td /><td>Total deductions (b)</td><td>{sar(t.fines)}</td></tr>
                <tr><td /><td>Due to contractor after deductions (a − b)</td><td>{sar(t.due)}</td></tr>
                <tr><td /><td>VAT 15%</td><td>{sar(t.vat)}</td></tr>
                <tr className="fn-total"><td /><td>Net payable after VAT</td><td>{sar(t.net)}</td></tr>
              </tbody>
            </table>
            {can(PRICE_EDITORS) && (
              <label className="hs-field ex-inline">Other fines or deductions (SAR)<input type="number" value={e.otherDeductions} onChange={(ev) => update({ ...e, otherDeductions: Number(ev.target.value) || 0 })} /></label>
            )}
          </Panel>
          <article className="ops-panel">
            <h2>Sign-off · الاعتماد</h2>
            <p className="ops-muted">Signed on the payment certificate and the maintenance sheet. Every step after the contractor accountant reviews; any signer can return the extract to the contractor with a comment.</p>
            <ol className="forms-chain horizontal">
              {extractChain.map((s, i) => {
                const sig = signed(i)
                return (
                  <li key={s.label} className={sig ? "done" : e.step === i && e.status !== "Approved" ? "current" : ""}>
                    <span>{sig ? <Icon name="check" size={13} /> : i + 1}</span>
                    <div><strong>{s.label}</strong><small dir="rtl">{s.ar}</small>{sig && <em>{sig.name}</em>}</div>
                  </li>
                )
              })}
            </ol>
            {canSign ? (
              <div className="forms-editor-foot forms-sign">
                {e.step > 0 && <input placeholder="Comment (required to return)" value={comment} onChange={(ev) => setComment(ev.target.value)} />}
                {e.step > 0 && <button disabled={!comment.trim()} onClick={sendBack}>Return to contractor</button>}
                <button className="ops-primary" onClick={sign}><Icon name="check" size={15} /> Sign as {extractChain[e.step].label}</button>
              </div>
            ) : e.status !== "Approved" ? (
              <p className="ops-muted">Waiting for {extractChain[e.step].label}.</p>
            ) : null}
          </article>
        </>
      )}

      {tab === "meals" && (
        <>
          <Panel title="Daily meal counts" ar="بيان أعداد الوجبات" note={can(CONTRACTOR) ? "The contractor enters each day's counts while the extract is a draft. Totals and cost update automatically." : "Read-only — the contractor enters counts while the extract is a draft."}>
            <div className="forms-filter ex-hosp">
              {extractHospitals.map((h) => <button key={h.key} className={hospital === h.key ? "active" : ""} onClick={() => setHospital(h.key)}>{h.label}</button>)}
            </div>
            <div className="forms-table-wrap">
              <table className="hs-table compact fn-grid ex-daily">
                <thead>
                  <tr><th rowSpan={2}>Day</th>{mealCategories.map((c) => <th key={c.key} colSpan={3}>{c.label}<small dir="rtl">{c.ar}</small></th>)}</tr>
                  <tr>{mealCategories.flatMap((c) => meals.map((m) => <th key={c.key + m}>{m[0]}</th>))}</tr>
                </thead>
                <tbody>
                  {Array.from({ length: days }, (_, d) => (
                    <tr key={d}>
                      <td>{d + 1}</td>
                      {mealCategories.flatMap((c) =>
                        [0, 1, 2].map((m) => (
                          <td key={c.key + m}>
                            <Num value={e.daily[hospital][c.key][d][m]} disabled={!can(CONTRACTOR)} onChange={(n) => {
                              const daily = structuredClone(e.daily)
                              daily[hospital][c.key][d][m] = n
                              update({ ...e, daily })
                            }} />
                          </td>
                        )),
                      )}
                    </tr>
                  ))}
                  <tr className="fn-total">
                    <td>Total</td>
                    {mealCategories.flatMap((c) => [0, 1, 2].map((m) => <td key={c.key + m}>{int(hospitalTotals(e, hospital)[c.key][m])}</td>))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="All hospitals · Form 19" ar="بيان إجمالي الوجبات">
            <div className="forms-table-wrap">
              <table className="hs-table compact fn-grid">
                <thead>
                  <tr><th rowSpan={2}>Site</th>{mealCategories.map((c) => <th key={c.key} colSpan={3}>{c.label}</th>)}</tr>
                  <tr>{mealCategories.flatMap((c) => meals.map((m) => <th key={c.key + m}>{m[0]}</th>))}</tr>
                </thead>
                <tbody>
                  {extractHospitals.map((h) => (
                    <tr key={h.key}><td><strong>{h.label}</strong></td>{mealCategories.flatMap((c) => [0, 1, 2].map((m) => <td key={c.key + m}>{int(hospitalTotals(e, h.key)[c.key][m])}</td>))}</tr>
                  ))}
                  <tr className="fn-total"><td>Total meals</td>{mealCategories.flatMap((c) => [0, 1, 2].map((m) => <td key={c.key + m}>{int(categoryTotals(e)[c.key][m])}</td>))}</tr>
                  <tr><td>Meal price</td>{mealCategories.flatMap((c) => [0, 1, 2].map((m) => <td key={c.key + m}>{e.prices[c.key][m]}</td>))}</tr>
                  <tr className="fn-total"><td>Cost</td>{mealCategories.flatMap((c) => [0, 1, 2].map((m) => <td key={c.key + m}>{int(Math.round(categoryTotals(e)[c.key][m] * e.prices[c.key][m]))}</td>))}</tr>
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      {tab === "prices" && (
        <Panel title="Contract meal prices" ar="أسعار الوجبات" note="From the client's extract workbook. The currency is not labelled in the file; SAR is assumed. Editable by the Food Safety Section and Support Services while the extract is a draft.">
          <table className="hs-table compact ex-prices">
            <thead><tr><th>Category</th>{meals.map((m) => <th key={m}>{m}</th>)}</tr></thead>
            <tbody>
              {mealCategories.map((c) => (
                <tr key={c.key}>
                  <td><strong>{c.label}</strong><small dir="rtl">{c.ar}</small></td>
                  {[0, 1, 2].map((m) => (
                    <td key={m}><Num value={e.prices[c.key][m]} disabled={!can(PRICE_EDITORS)} onChange={(n) => update({ ...e, prices: { ...e.prices, [c.key]: e.prices[c.key].map((p, i) => (i === m ? n : p)) } })} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {tab === "utilities" && (
        <>
          <Panel title="Water meter record (monthly) · Main kitchen" note="Total = (cold water meter + hot water supply meter) − hot water return meter.">
            <table className="hs-table compact">
              <thead><tr><th>Meter</th><th>Previous</th><th>Current</th><th>Consumption (m³)</th></tr></thead>
              <tbody>
                {e.water.map((w, i) => (
                  <tr key={i}>
                    <td>{waterMeters[i]}</td>
                    <td><Num wide value={w.prev} disabled={!can(CONTRACTOR)} onChange={(n) => update({ ...e, water: e.water.map((x, j) => (j === i ? { ...x, prev: n } : x)) })} /></td>
                    <td><Num wide value={w.curr} disabled={!can(CONTRACTOR)} onChange={(n) => update({ ...e, water: e.water.map((x, j) => (j === i ? { ...x, curr: n } : x)) })} /></td>
                    <td>{int(Math.max(0, w.curr - w.prev))}</td>
                  </tr>
                ))}
                <tr className="fn-total"><td>Total consumption</td><td /><td /><td>{int(waterConsumption(e))} m³</td></tr>
              </tbody>
            </table>
          </Panel>
          <Panel title="kWh meter record (monthly) · Main kitchen">
            <table className="hs-table compact">
              <thead><tr><th>Meter</th><th>Previous reading</th><th>Current reading</th><th>Factor</th><th>Consumed (kWh)</th></tr></thead>
              <tbody>
                {e.kwh.map((k, i) => (
                  <tr key={i}>
                    <td>Meter #{i + 1} · {kwhMeters[i]}</td>
                    <td><Num wide value={k.prev} disabled={!can(CONTRACTOR)} onChange={(n) => update({ ...e, kwh: e.kwh.map((x, j) => (j === i ? { ...x, prev: n } : x)) })} /></td>
                    <td><Num wide value={k.curr} disabled={!can(CONTRACTOR)} onChange={(n) => update({ ...e, kwh: e.kwh.map((x, j) => (j === i ? { ...x, curr: n } : x)) })} /></td>
                    <td><Num value={k.factor} disabled={!can(CONTRACTOR)} onChange={(n) => update({ ...e, kwh: e.kwh.map((x, j) => (j === i ? { ...x, factor: n } : x)) })} /></td>
                    <td>{int(Math.max(0, k.curr - k.prev) * (k.factor || 1))}</td>
                  </tr>
                ))}
                <tr className="fn-total"><td>Total</td><td /><td /><td /><td>{int(kwhConsumption(e))} kWh</td></tr>
              </tbody>
            </table>
          </Panel>
          <Panel title="Consumption deduction" ar="بيان باستهلاك المياه والكهرباء" note="Tariffs are not in the client file; the defaults below are assumptions — confirm the contract rates.">
            <table className="hs-table compact">
              <thead><tr><th /><th>Consumption</th><th>Rate (SAR)</th><th>Value</th></tr></thead>
              <tbody>
                <tr><td>a · Water</td><td>{int(waterConsumption(e))} m³</td><td><Num value={e.rates.water} disabled={!can(PRICE_EDITORS)} onChange={(n) => update({ ...e, rates: { ...e.rates, water: n } })} /> / m³</td><td>{sar(waterConsumption(e) * e.rates.water)}</td></tr>
                <tr><td>b · Electricity</td><td>{int(kwhConsumption(e))} kWh</td><td><Num value={e.rates.kwh} disabled={!can(PRICE_EDITORS)} onChange={(n) => update({ ...e, rates: { ...e.rates, kwh: n } })} /> / kWh</td><td>{sar(kwhConsumption(e) * e.rates.kwh)}</td></tr>
                <tr className="fn-total"><td>Total deduction</td><td /><td /><td>{sar(t.utilities)}</td></tr>
              </tbody>
            </table>
          </Panel>
        </>
      )}

      {tab === "performance" && (
        <Panel title="Performance level fines" ar="جدول الغرامات الخاص بمستوى الأداء" note={`Amount per activity = maximum score × SAR ${int(e.amountPerPoint)}. Performance % = score ÷ maximum; deduction % = 100% − performance %; fine = amount × deduction %. Scored by the Food Safety Section while the extract is a draft; leave blank for criteria not evaluated.`}>
          <div className="forms-table-wrap">
            <table className="hs-table compact ex-perf">
              <thead><tr><th>#</th><th>Activity</th><th>Max</th><th>Score</th><th>Performance</th><th>Deduction</th><th>Amount per activity</th><th>Fine</th></tr></thead>
              <tbody>
                {criteria.map((c, i) => {
                  const f = criterionFine(e, i)
                  return (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td><strong>{c.en}</strong><small dir="rtl">{c.ar}</small></td>
                      <td>{c.max}</td>
                      <td>
                        {can(KFMC_FOOD) ? (
                          <input className="ex-num" type="number" min={0} max={c.max} value={e.scores[i] ?? ""} onChange={(ev) => update({ ...e, scores: e.scores.map((x, j) => (j === i ? (ev.target.value === "" ? null : Math.min(c.max, Math.max(0, Number(ev.target.value)))) : x)) })} />
                        ) : (e.scores[i] ?? "—")}
                      </td>
                      <td>{f.performance === null ? "—" : `${Math.round(f.performance * 100)}%`}</td>
                      <td>{f.performance === null ? "—" : `${Math.round(f.deduction * 100)}%`}</td>
                      <td>{int(f.amount)}</td>
                      <td className={f.fine ? "ex-bad" : ""}>{sar(f.fine)}</td>
                    </tr>
                  )
                })}
                <tr className="fn-total"><td /><td>Total performance fine</td><td>{criteria.reduce((a, c) => a + c.max, 0)}</td><td>{e.scores.reduce<number>((a, s) => a + (s || 0), 0)}</td><td /><td /><td /><td>{sar(t.performance)}</td></tr>
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "maintenance" && (
        <>
          <Panel title="Maintenance & repair of site equipment · Form 10" ar="الصيانة والإصلاح لتجهيزات الموقع">
            <RowsTable
              rows={e.maintenance}
              editable={can(CONTRACTOR)}
              columns={[["date", "Date", "date"], ["equipment", "Equipment"], ["repair", "Repair & maintenance"], ["parts", "Spare parts"], ["company", "Responsible company"], ["cost", "Cost (SAR)", "number"]]}
              onChange={(maintenance) => update({ ...e, maintenance })}
              blank={() => ({ id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), equipment: "", repair: "", parts: "", company: "", cost: 0 })}
              total={["cost", "Total cost"]}
            />
          </Panel>
          <Panel title="Equipment fines record" ar="محضر غرامات التجهيزات" note="Entered by the Food Safety Section; the total is deducted on the payment certificate.">
            <RowsTable
              rows={e.equipmentFines}
              editable={can(KFMC_FOOD)}
              columns={[["equipment", "Equipment / tool"], ["count", "Count", "number"], ["value", "Value", "number"], ["violation", "Violation type"], ["duration", "Duration"], ["clause", "Fine clause"], ["amount", "Amount deducted", "number"]]}
              onChange={(equipmentFines) => update({ ...e, equipmentFines })}
              blank={() => ({ id: crypto.randomUUID(), equipment: "", count: 1, value: 0, violation: "", duration: "", clause: "", amount: 0 })}
              total={["amount", "Total deducted"]}
            />
          </Panel>
        </>
      )}

      {tab === "fines" && (
        <Panel title="Penalties & deductions · Form 21" ar="بيان الغرامات والاستقطاعات">
          <RowsTable
            rows={e.penalties}
            editable={can(KFMC_FOOD)}
            columns={[["violation", "Violation"], ["description", "Description"], ["deduction", "Deduction", "number"], ["fine", "Fine", "number"], ["notes", "Notes / form ref"]]}
            onChange={(penalties) => update({ ...e, penalties })}
            blank={() => ({ id: crypto.randomUUID(), violation: "", description: "", deduction: 0, fine: 0, notes: "" })}
            total={["fine", "Total fines (deductions listed separately)"]}
          />
        </Panel>
      )}

      {tab === "attachments" && (
        <>
          <Panel title="Attachments index · Form 12" ar="فهرس مستخلص الشهر" note="Tick each attachment once it is included in the extract pack.">
            <div className="ex-attach">
              {attachmentsIndex.map((a, i) => (
                <label key={a} className="hs-check">
                  <input type="checkbox" checked={!!e.attachments[a]} disabled={!can(CONTRACTOR)} onChange={(ev) => update({ ...e, attachments: { ...e.attachments, [a]: ev.target.checked } })} />
                  {i + 1}. {a}
                </label>
              ))}
            </div>
            <p className="ops-muted">{attachmentsIndex.filter((a) => e.attachments[a]).length} of {attachmentsIndex.length} attached</p>
          </Panel>
          <Panel title="No-housing certificate" ar="مشهد">
            <p dir="rtl" className="ex-cert-text">يشهد قسم التغذية بمدينة الملك فهد الطبية بأن عمالة متعهد الإعاشة شركة دار المعدات الطبية والعلمية لا تسكن بداخل مدينة الملك فهد الطبية ولا يصرف لهم وجبات مطهية على حساب مدينة الملك فهد الطبية.</p>
            <p>The Nutrition Department certifies that the catering contractor's workforce does not live inside KFMC and receives no cooked meals at KFMC's expense.</p>
            <label className="hs-check">
              <input type="checkbox" checked={e.noHousingCertificate} disabled={!can(KFMC_FOOD)} onChange={(ev) => update({ ...e, noHousingCertificate: ev.target.checked }, ev.target.checked ? "No-housing certificate confirmed" : undefined)} />
              Certified by the Head of Nutrition for {month}
            </label>
          </Panel>
        </>
      )}
    </div>
  )
}

type ColDef = [string, string, ("date" | "number")?]
function RowsTable<T extends { id: string } & Record<string, unknown>>({ rows, editable, columns, onChange, blank, total }: { rows: T[]; editable: boolean; columns: ColDef[]; onChange: (rows: T[]) => void; blank: () => T; total?: [string, string] }) {
  return (
    <div className="forms-table-wrap">
      <table className="hs-table compact ex-rows">
        <thead><tr><th>#</th>{columns.map(([, l]) => <th key={l}>{l}</th>)}{editable && <th />}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id}>
              <td>{i + 1}</td>
              {columns.map(([k, , type]) => (
                <td key={k}>
                  {editable ? (
                    <input className={type === "number" ? "ex-num" : "ex-text"} type={type || "text"} value={String(row[k] ?? "")} onChange={(ev) => onChange(rows.map((r) => (r.id === row.id ? { ...r, [k]: type === "number" ? Number(ev.target.value) || 0 : ev.target.value } : r)))} />
                  ) : type === "number" ? int(Number(row[k]) || 0) : String(row[k] ?? "")}
                </td>
              ))}
              {editable && <td><button className="hs-link" onClick={() => onChange(rows.filter((r) => r.id !== row.id))}>Remove</button></td>}
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={columns.length + 2} className="ops-muted">No entries this month.</td></tr>}
          {total && <tr className="fn-total"><td /><td colSpan={columns.length + (editable ? 1 : 0)}>{total[1]}: SAR {int(rows.reduce((a, r) => a + (Number(r[total[0]]) || 0), 0))}</td></tr>}
        </tbody>
      </table>
      {editable && <button className="forms-addrow-btn" onClick={() => onChange([...rows, blank()])}><Icon name="plus" size={14} /> Add row</button>}
    </div>
  )
}
