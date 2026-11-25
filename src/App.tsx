import { FormEvent, useEffect, useState } from "react"
import Operations from "./Operations"
import DeptWorkspace from "./DeptWorkspace"
import Icon, { type IconName } from "./Icon"
import DeviceFrame from "./DeviceFrame"
import { accountFor, accounts, departments, deptOf, type Account, type AppKind, type DeptId } from "./departments"

type AppMode = "entry" | "login" | "web" | "mobile"
type Session = { role: string; mode: AppMode; dept: DeptId; kind?: AppKind }
const deptIcons: Record<DeptId, IconName> = { housekeeping: "sparkles", housing: "building", food: "clipboard", executive: "trend" }

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo">
      <img className="kfmc-mark" src="/kfmc-logo.png" alt="King Fahad Medical City" />
      {!compact && (
        <div>
          <strong>KFMC</strong>
          <small>Facility Support Services · QBS</small>
        </div>
      )}
    </div>
  )
}

function Entry({ onOpen }: { onOpen: (dept: DeptId) => void }) {
  return (
    <main className="entry page-enter">
      <div className="watermark" aria-hidden="true">QBS</div>
      <section className="entry-inner">
        <Logo />
        <div className="entry-copy">
          <span className="eyebrow">Executive Management System for Facility Support Services</span>
          <h1>
            One operation.
            <br />
            Every department in view.
          </h1>
          <p dir="rtl" className="entry-ar">نظام الإدارة التنفيذية للخدمات المساندة للمرافق</p>
          <p>Choose your department to sign in. Each department has its own accounts, forms and approval chain.</p>
        </div>
        <div className="dept-cards">
          {departments.map((d) => (
            <button key={d.id} className="app-card dept-card" style={{ ["--dept" as string]: d.color }} onClick={() => onOpen(d.id)}>
              <span className="app-card-icon"><Icon name={deptIcons[d.id]} size={24} /></span>
              <span className="app-card-copy">
                <strong>{d.name} <em dir="rtl">{d.nameAr}</em></strong>
                <small>{d.tagline}</small>
                <small className="dept-card-meta">{accounts.filter((a) => a.dept === d.id).length} roles · {[...new Set(accounts.filter((a) => a.dept === d.id).flatMap((a) => a.apps))].map((k) => (k === "web" ? "Web" : "Mobile")).join(" & ")}</small>
              </span>
              <span className="open-link">Sign in <Icon name="arrow" size={18} /></span>
            </button>
          ))}
        </div>
        <footer>Developed by QBS <span /> v4.0</footer>
      </section>
    </main>
  )
}

function Login({ dept, kind, onKind, onDept, onBack, onSuccess }: { dept: DeptId; kind: AppKind; onKind: (k: AppKind) => void; onDept: (d: DeptId) => void; onBack: () => void; onSuccess: (account: Account) => void }) {
  const info = deptOf(dept)
  const available = accounts.filter((a) => a.dept === dept && a.apps.includes(kind))
  const [username, setUsername] = useState(available[0]?.username || "")
  const [password, setPassword] = useState(available[0]?.password || "")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    setUsername(available[0]?.username || "")
    setPassword(available[0]?.password || "")
    setError("")
  }, [dept, kind])

  function signIn(event: FormEvent) {
    event.preventDefault()
    const account = accounts.find((a) => a.username === username && a.password === password)
    if (!account) return setError("That username or password doesn’t look right. Try a demo account below.")
    if (account.dept !== dept) return setError(`${account.username} is a ${deptOf(account.dept).name} account. Choose that department to sign in.`)
    if (!account.apps.includes(kind)) return setError(`${account.role} uses the ${account.apps[0] === "web" ? "Web" : "Mobile"} App.`)
    setError("")
    setLoading(true)
    window.setTimeout(() => onSuccess(account), 550)
  }

  return (
    <main className={`login-page ${kind} page-enter`} style={{ ["--dept" as string]: info.color }}>
      <button className="back-button" onClick={onBack}><span>←</span> Back</button>
      {kind === "web" && (
        <section className="login-brand">
          <div className="brand-pattern" />
          <Logo />
          <div className="brand-message">
            <span className="brand-kicker"><i /> {info.unit}</span>
            <h1>{info.name}</h1>
            <p dir="rtl">{info.nameAr}</p>
            <p>{info.tagline}</p>
          </div>
          <div className="brand-proof"><Icon name="shield" size={19} /> {info.contractor}</div>
        </section>
      )}
      <section className="login-form-wrap">
        <form className="login-form" onSubmit={signIn}>
          {kind === "mobile" && <Logo />}
          <div className="login-dept-switch" role="tablist" aria-label="Department">
            {departments.map((d) => (
              <button type="button" key={d.id} role="tab" aria-selected={d.id === dept} className={d.id === dept ? "active" : ""} onClick={() => onDept(d.id)}>
                {d.name.split(" ")[0]}
              </button>
            ))}
          </div>
          <div className="form-title">
            <span className="eyebrow">{info.name} · {kind === "web" ? "Web workspace" : "Mobile app"}</span>
            <h2>Welcome back</h2>
            <p>Sign in with your {info.name.toLowerCase()} account.</p>
          </div>
          <div className="app-switch login-kind" aria-label="Application">
            {(["web", "mobile"] as AppKind[]).map((k) => (
              <button type="button" key={k} className={kind === k ? "active" : ""} disabled={!accounts.some((a) => a.dept === dept && a.apps.includes(k))} onClick={() => onKind(k)}>
                <Icon name={k === "web" ? "monitor" : "phone"} size={15} /> {k === "web" ? "Web" : "Mobile"}
              </button>
            ))}
          </div>
          <label>
            Username
            <span className="input-wrap">
              <Icon name="people" size={18} />
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </span>
          </label>
          <label>
            Password
            <span className="input-wrap">
              <Icon name="shield" size={18} />
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
            </span>
          </label>
          <div className="form-row">
            <span className="remember">Demo access · browser-local data</span>
          </div>
          {error && <div className="form-error"><Icon name="alert" size={17} /> {error}</div>}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? <span className="loader" /> : <>Sign in <Icon name="arrow" size={18} /></>}
          </button>
          <div className="demo-section">
            <div><span>Demo accounts · {info.name}</span><i /></div>
            <p>Choose a role to fill the details</p>
            <div className="demo-chips">
              {available.map((a) => (
                <button type="button" key={a.username} className={a.username === username ? "active" : ""} onClick={() => { setUsername(a.username); setPassword(a.password); setError("") }}>
                  {a.role}
                </button>
              ))}
            </div>
          </div>
        </form>
      </section>
    </main>
  )
}

export default function App() {
  const [mode, setMode] = useState<AppMode>("entry")
  const [loginKind, setLoginKind] = useState<AppKind>("web")
  const [dept, setDept] = useState<DeptId>("housekeeping")
  const [role, setRole] = useState("Supervisor")
  const account = accountFor(role)
  const person = account?.person || role

  const persist = (s: Session) => window.sessionStorage.setItem("qbs-session", JSON.stringify(s))
  useEffect(() => {
    const saved = window.sessionStorage.getItem("qbs-session")
    if (!saved) return
    try {
      const parsed = JSON.parse(saved) as Session
      if (parsed.mode === "login") {
        setDept(parsed.dept || "housekeeping")
        setLoginKind(parsed.kind === "mobile" ? "mobile" : "web")
        setMode("login")
        return
      }
      const found = accountFor(parsed.role)
      if (found && found.apps.includes(parsed.mode as AppKind)) {
        setRole(found.role)
        setDept(found.dept)
        setMode(parsed.mode)
      }
    } catch {
      window.sessionStorage.removeItem("qbs-session")
    }
  }, [])

  function openLogin(nextDept: DeptId, kind?: AppKind) {
    const apps = accounts.filter((a) => a.dept === nextDept).flatMap((a) => a.apps)
    const k = kind && apps.includes(kind) ? kind : apps.includes("web") ? "web" : "mobile"
    setDept(nextDept)
    setLoginKind(k)
    setMode("login")
    persist({ role, mode: "login", dept: nextDept, kind: k })
  }
  function completeLogin(a: Account) {
    setRole(a.role)
    setDept(a.dept)
    setMode(loginKind)
    persist({ role: a.role, mode: loginKind, dept: a.dept })
  }
  function switchApp(kind: AppKind) {
    if (!account?.apps.includes(kind)) {
      window.sessionStorage.removeItem("qbs-session")
      return openLogin(dept, kind)
    }
    setMode(kind)
    persist({ role, mode: kind, dept })
  }
  function signOut() {
    window.sessionStorage.removeItem("qbs-session")
    openLogin(dept, mode === "mobile" ? "mobile" : "web")
  }
  function changeDemoRole(nextRole: string) {
    const next = accountFor(nextRole)
    if (!next) return
    const nextMode = next.apps.includes(mode as AppKind) ? mode : next.apps[0]
    setRole(next.role)
    setDept(next.dept)
    setMode(nextMode)
    persist({ role: next.role, mode: nextMode, dept: next.dept })
  }

  if (mode === "entry") return <Entry onOpen={(d) => openLogin(d)} />
  if (mode === "login") {
    const login = <Login dept={dept} kind={loginKind} onKind={setLoginKind} onDept={(d) => openLogin(d, loginKind)} onBack={() => setMode("entry")} onSuccess={completeLogin} />
    return loginKind === "mobile" ? <DeviceFrame>{login}</DeviceFrame> : login
  }
  const workspace =
    dept === "housekeeping" ? (
      <Operations role={role} person={person} mobile={mode === "mobile"} onSwitch={switchApp} onSignOut={signOut} onRoleChange={changeDemoRole} />
    ) : (
      <DeptWorkspace key={dept} dept={dept} role={role} person={person} mobile={mode === "mobile"} onSwitch={switchApp} onSignOut={signOut} onRoleChange={changeDemoRole} />
    )
  return mode === "mobile" ? <DeviceFrame>{workspace}</DeviceFrame> : workspace
}
