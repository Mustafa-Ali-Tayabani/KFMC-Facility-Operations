import { useEffect, useState, type ReactNode } from "react"
import Icon, { type IconName } from "./Icon"
import { deptOf, rolesOf, type DeptId } from "./departments"
import FormsModule, { useForms } from "./FormsModule"
import { FormsSummary, MonthlyExtract, extractChain, extractTotals, loadExtract } from "./FoodViews"
import {
  DailyReportView,
  HousingDashboard,
  MovementsView,
  RequestsView,
  ResidentHome,
  ResidentsView,
  UnitsView,
  WaitingListView,
  overdueEvacuations,
  useHousing,
} from "./HousingViews"
import { stagesFor, type RequestKind } from "./housing-data"

type Props = {
  dept: Exclude<DeptId, "housekeeping">
  role: string
  person: string
  mobile: boolean
  onSwitch: (kind: "web" | "mobile") => void
  onSignOut: () => void
  onRoleChange: (role: string) => void
}
type NavItem = { key: string; label: string; icon: IconName; intro: string }

const NAV: Record<string, NavItem> = {
  Dashboard: { key: "Dashboard", label: "Dashboard", icon: "home", intro: "" },
  Units: { key: "Units", label: "Housing Units", icon: "building", intro: "Every unit by housing group and building, with its status and resident — the Masterlist of the daily report." },
  Residents: { key: "Residents", label: "Residents", icon: "people", intro: "Resident master data: KFMC ID, position, nationality, contract and current unit." },
  Requests: { key: "Requests", label: "Requests & Approvals", icon: "clipboard", intro: "Accommodation, relocation (Form 8.5) and evacuation (Form 8.3) requests moving through each approval stage." },
  "Waiting List": { key: "Waiting List", label: "Waiting List", icon: "clock", intro: "MAXIMO waiting list ranked by score, with planned units, done plans and plans rejected by residents." },
  Movements: { key: "Movements", label: "Movement Log", icon: "arrow", intro: "New arrivals, live-ins, relocations, live-outs and final exits." },
  "Daily Report": { key: "Daily Report", label: "Daily Report", icon: "report", intro: "Per-hospital daily report in the same Masterlist + Movement format the housing groups send today." },
  Forms: { key: "Forms", label: "Food Safety Records", icon: "clipboard", intro: "HACCP CCP / OPRP and PRP records with critical limits and the Inspected → Noted → Reviewed → Approved chain." },
  Extract: { key: "Extract", label: "Monthly Extract", icon: "trend", intro: "Monthly catering extract: meal counts × contract prices, penalties and deductions, and the payment sign-off chain." },
  "HK Forms": { key: "HK Forms", label: "Housekeeping Checklists", icon: "clipboard", intro: "Official Zahran / KFMC housekeeping checklists and their sign-off status." },
  "Food Forms": { key: "Food Forms", label: "Food Safety Records", icon: "clipboard", intro: "Food & Nutrition HACCP records across the kitchen, stores and wards." },
  Housing: { key: "Housing", label: "Housing Overview", icon: "building", intro: "Occupancy, requests and evacuations across all housing groups." },
}

function navFor(dept: Props["dept"], role: string): { label: string; items: string[] }[] {
  if (dept === "housing") {
    if (role === "Resident") return [{ label: "My housing", items: ["Dashboard", "Requests"] }]
    if (role === "Maintenance Supervisor") return [{ label: "Housing", items: ["Dashboard", "Requests", "Units"] }]
    return [
      { label: "Overview", items: ["Dashboard"] },
      { label: "Housing operations", items: ["Requests", "Waiting List", "Movements"] },
      { label: "Master data", items: ["Units", "Residents"] },
      { label: "Reports", items: ["Daily Report"] },
    ]
  }
  if (dept === "food") {
    const contract = ["Contractor Management", "Food Safety Section"].includes(role)
    return [
      { label: "Overview", items: ["Dashboard"] },
      { label: "Food safety", items: ["Forms"] },
      ...(contract ? [{ label: "Contract", items: ["Extract"] }] : []),
    ]
  }
  return [
    { label: "Overview", items: ["Dashboard"] },
    { label: "Departments", items: ["HK Forms", "Food Forms", "Housing"] },
    { label: "Contracts & reports", items: ["Extract", "Daily Report"] },
  ]
}

export default function DeptWorkspace({ dept, role, person, mobile, onSwitch, onSignOut, onRoleChange }: Props) {
  const info = deptOf(dept)
  const groups = navFor(dept, role)
  const items = groups.flatMap((g) => g.items)
  const [active, setActive] = useState(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1))
    return items.includes(hash) ? hash : "Dashboard"
  })
  const [toast, setToast] = useState("")
  const [menu, setMenu] = useState(false)
  const [intent, setIntent] = useState<RequestKind | undefined>()
  const [housing, saveHousing] = useHousing()
  const [forms] = useForms()
  useEffect(() => {
    if (!items.includes(active)) setActive("Dashboard")
  }, [role])
  useEffect(() => {
    if (active !== "Requests") setIntent(undefined)
    window.history.replaceState(null, "", `#${encodeURIComponent(active)}`)
  }, [active])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(""), 3500)
    return () => clearTimeout(t)
  }, [toast])
  const commitHousing = (next: typeof housing, msg: string) => {
    saveHousing(next)
    setToast(msg)
  }
  const nav = NAV[active] || NAV.Dashboard
  const accounts = rolesOf(dept)
  const housingQueue = housing.requests.filter((q) => q.status === "In progress" && stagesFor(q.kind)[q.stage]?.roles.includes(role)).length
  const badge = (key: string) => (key === "Requests" ? housingQueue : 0)

  let content: ReactNode
  if (dept === "housing") {
    if (active === "Dashboard") content = role === "Resident" ? <ResidentHome db={housing} person={person} onNavigate={setActive} onCreate={(kind) => { setIntent(kind); setActive("Requests") }} /> : <HousingDashboard db={housing} onNavigate={setActive} />
    else if (active === "Units") content = <UnitsView db={housing} role={role} onSave={commitHousing} />
    else if (active === "Residents") content = <ResidentsView db={housing} />
    else if (active === "Requests") content = <RequestsView key={intent || "list"} db={housing} role={role} person={person} mobile={mobile} onSave={commitHousing} initialCreate={intent} />
    else if (active === "Waiting List") content = <WaitingListView db={housing} role={role} onSave={commitHousing} />
    else if (active === "Movements") content = <MovementsView db={housing} />
    else if (active === "Daily Report") content = <DailyReportView db={housing} />
  } else if (dept === "food") {
    if (active === "Dashboard") content = <FormsSummary forms={forms} dept="food" onNavigate={setActive} title="Food & Nutrition · today" />
    else if (active === "Forms") content = <FormsModule key={role} dept="food" role={role} person={person} mobile={mobile} onToast={setToast} />
    else if (active === "Extract") content = <MonthlyExtract role={role} person={person} onToast={setToast} />
  } else {
    if (active === "Dashboard") content = <ExecutiveOverview housing={housing} forms={forms} onNavigate={setActive} />
    else if (active === "HK Forms") content = <FormsModule key="hk" dept="housekeeping" role={role} person={person} mobile={mobile} tab="records" onToast={setToast} />
    else if (active === "Food Forms") content = <FormsModule key="fn" dept="food" role={role} person={person} mobile={mobile} tab="records" onToast={setToast} />
    else if (active === "Housing") content = <HousingDashboard db={housing} onNavigate={(m) => setActive(m === "Units" || m === "Requests" || m === "Waiting List" ? "Housing" : m)} />
    else if (active === "Extract") content = <MonthlyExtract role={role} person={person} onToast={setToast} />
    else if (active === "Daily Report") content = <DailyReportView db={housing} />
  }

  const title = active === "Dashboard" ? (role === "Resident" ? "My housing" : `${info.name} overview`) : nav.label
  return (
    <div className={`ops-shell dept-${dept} ${mobile ? "ops-mobile" : ""}`} style={{ ["--dept" as string]: info.color }}>
      {!mobile && (
        <aside className="ops-sidebar">
          <div className="ops-brand">
            <img src="/kfmc-logo.png" alt="King Fahad Medical City" />
            <div>
              <strong>KFMC</strong>
              <small>{info.name}</small>
            </div>
          </div>
          <nav>
            {groups.map((g) => (
              <div className="ops-nav-group" key={g.label}>
                <span className="ops-nav-label">{g.label}</span>
                {g.items.map((key) => (
                  <button key={key} className={active === key ? "selected" : ""} onClick={() => setActive(key)}>
                    <span><Icon name={NAV[key].icon} size={17} /></span>
                    {NAV[key].label}
                    {badge(key) > 0 && <b>{badge(key)}</b>}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="ops-sidebar-foot">
            <span className="ops-status-dot" /> {info.nameAr}
            <small>{info.unit}</small>
          </div>
        </aside>
      )}
      <div className="ops-main">
        {mobile ? (
          <header className="m-appbar">
            <img src="/kfmc-logo.png" alt="King Fahad Medical City" />
            <div className="m-appbar-title">
              <small>{info.name} · {role}</small>
              <strong>{title}</strong>
            </div>
            <button className="m-avatar" aria-label="Sign out" onClick={onSignOut} title="Sign out">
              <Icon name="logout" size={16} />
            </button>
          </header>
        ) : (
          <header className="ops-topbar">
            <div>
              <span>King Fahad Medical City</span>
              <b>/</b>
              <span>{info.name}</span>
              <b>/</b>
              <strong>{nav.label}</strong>
            </div>
            <div>
              <select className="role-switcher" aria-label="Demonstration role" value={role} onChange={(e) => onRoleChange(e.target.value)}>
                {accounts.map((a) => <option key={a.role}>{a.role}</option>)}
              </select>
              {accounts.find((a) => a.role === role)?.apps.includes("mobile") && <button onClick={() => onSwitch("mobile")}>Mobile view</button>}
              <span className="ops-avatar" title={person}>{person.replace(/^(Dr\.|Eng\.|Chef) /, "").split(" ").map((s) => s[0]).slice(0, 2).join("")}</span>
              <button onClick={onSignOut}>Sign out</button>
            </div>
          </header>
        )}
        <main className="ops-content">
          {!mobile && (
            <header className="ops-heading">
              <div>
                <span className="eyebrow">{new Date().toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })} · {info.unit}</span>
                <h1>{active === "Dashboard" ? `Welcome, ${person.split(" ").slice(0, 2).join(" ")}` : nav.label}</h1>
                <p>{active === "Dashboard" ? `${role} · ${info.contractor}` : nav.intro}</p>
              </div>
            </header>
          )}
          {content}
        </main>
        {mobile && (
          <nav className="m-tabbar" aria-label="Primary">
            {items.slice(0, 4).map((key) => (
              <button key={key} className={`m-tab ${active === key && !menu ? "selected" : ""}`} onClick={() => { setActive(key); setMenu(false) }}>
                <span><Icon name={NAV[key].icon} size={21} /></span>
                <b>{key === "Dashboard" ? "Home" : NAV[key].label.split(" ")[0]}</b>
              </button>
            ))}
            {accounts.find((a) => a.role === role)?.apps.includes("web") && (
              <button className="m-tab" onClick={() => onSwitch("web")}>
                <span><Icon name="monitor" size={21} /></span>
                <b>Web</b>
              </button>
            )}
          </nav>
        )}
      </div>
      {toast && <div className="ops-toast" role="status">{toast}</div>}
    </div>
  )
}

function ExecutiveOverview({ housing, forms, onNavigate }: { housing: ReturnType<typeof useHousing>[0]; forms: ReturnType<typeof useForms>[0]; onNavigate: (m: string) => void }) {
  const live = housing.units.filter((u) => !["Offices", "Guest Unit", "Housekeeping", "Isolation", "Emergency"].includes(u.status))
  const occ = live.filter((u) => u.status === "Occupied").length
  const extract = loadExtract(new Date().toISOString().slice(0, 7))
  const totals = extractTotals(extract)
  const cards = [
    { dept: "housekeeping" as const, key: "HK Forms" },
    { dept: "food" as const, key: "Food Forms" },
  ].map(({ dept, key }) => {
    const recs = forms.records.filter((r) => r.ref.startsWith(dept === "housekeeping" ? "HK" : "FN"))
    return { dept, key, review: recs.filter((r) => r.status === "In review").length, approved: recs.filter((r) => r.status === "Approved").length, returned: recs.filter((r) => r.status === "Returned").length, total: recs.length }
  })
  return (
    <div className="hs-dash">
      <div className="exec-cards">
        {cards.map((c) => {
          const info = deptOf(c.dept)
          return (
            <button key={c.dept} className="ops-panel exec-card" style={{ ["--dept" as string]: info.color }} onClick={() => onNavigate(c.key)}>
              <span className="eyebrow">{info.name} · {info.contractor}</span>
              <strong>{c.total} records</strong>
              <small>{c.review} awaiting sign-off · {c.returned} returned · {c.approved} approved</small>
              <span className="hs-bar"><i style={{ width: `${c.total ? (c.approved / c.total) * 100 : 0}%` }} /></span>
            </button>
          )
        })}
        <button className="ops-panel exec-card" style={{ ["--dept" as string]: deptOf("housing").color }} onClick={() => onNavigate("Housing")}>
          <span className="eyebrow">Housing · {housing.groups.length} groups</span>
          <strong>{live.length ? Math.round((occ / live.length) * 100) : 0}% occupied</strong>
          <small>{occ} of {live.length} units · {housing.requests.filter((q) => q.status === "In progress").length} open requests · {overdueEvacuations(housing).length} evacuations past 14 days</small>
          <span className="hs-bar"><i style={{ width: `${live.length ? (occ / live.length) * 100 : 0}%` }} /></span>
        </button>
        <button className="ops-panel exec-card" style={{ ["--dept" as string]: deptOf("food").color }} onClick={() => onNavigate("Extract")}>
          <span className="eyebrow">Catering extract · {extract.month}</span>
          <strong>SAR {Math.round(totals.net).toLocaleString()}</strong>
          <small>{extract.status === "Approved" ? "Approved" : `Waiting: ${extractChain[extract.step]?.label}`} · {totals.meals.toLocaleString()} meals · SAR {totals.fines.toLocaleString()} penalties</small>
          <span className="hs-bar"><i style={{ width: `${(extract.step / extractChain.length) * 100}%` }} /></span>
        </button>
      </div>
      <h2 className="exec-h">Housekeeping · Zahran Company</h2>
      <FormsSummary compact forms={forms} dept="housekeeping" title="Housekeeping · today" onNavigate={() => onNavigate("HK Forms")} />
      <h2 className="exec-h">Food & Nutrition · SMEH</h2>
      <FormsSummary compact forms={forms} dept="food" title="Food & Nutrition · today" onNavigate={() => onNavigate("Food Forms")} />
    </div>
  )
}
