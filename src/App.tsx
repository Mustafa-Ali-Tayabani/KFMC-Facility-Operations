import { FormEvent, useEffect, useState } from "react"
import Operations from "./Operations"
import Icon from "./Icon"
import DeviceFrame from "./DeviceFrame"

type AppMode = "entry" | "login" | "web" | "mobile"
type AppKind = "web" | "mobile"
function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo">
      <img
        className="kfmc-mark"
        src="/kfmc-logo.png"
        alt="King Fahad Medical City"
      />
      {!compact && (
        <div>
          <strong>KFMC</strong>
          <small>Facility Operations · QBS</small>
        </div>
      )}
    </div>
  )
}

function AppSwitch({
  active,
  onChange,
}: {
  active: AppKind
  onChange: (kind: AppKind) => void
}) {
  return (
    <div className="app-switch" aria-label="Application view">
      <button
        className={active === "web" ? "active" : ""}
        onClick={() => onChange("web")}
      >
        <Icon name="monitor" size={15} /> Web
      </button>
      <button
        className={active === "mobile" ? "active" : ""}
        onClick={() => onChange("mobile")}
      >
        <Icon name="phone" size={15} /> Mobile
      </button>
    </div>
  )
}

const demos = [
  { username: "admin", password: "admin123", role: "QBS Admin", apps: ["web"] },
  {
    username: "ops",
    password: "ops123",
    role: "Operations Manager",
    apps: ["web"],
  },
  {
    username: "storekeeper",
    password: "store123",
    role: "Storekeeper",
    apps: ["web"],
  },
  {
    username: "supervisor",
    password: "sup123",
    role: "Supervisor",
    apps: ["web", "mobile"],
  },
  {
    username: "cleaner",
    password: "clean123",
    role: "Cleaner",
    apps: ["mobile"],
  },
  { username: "guard", password: "guard123", role: "Guard", apps: ["mobile"] },
]

function Entry({ onOpen }: { onOpen: (kind: AppKind) => void }) {
  return (
    <main className="entry page-enter">
      <div className="watermark" aria-hidden="true">
        QBS
      </div>
      <section className="entry-inner">
        <Logo />
        <div className="entry-copy">
          <span className="eyebrow">KFMC Cleaning & Security</span>
          <h1>
            One operation.
            <br />
            Every detail in view.
          </h1>
          <p>
            Plan, perform and prove every facility task from one connected
            workspace.
          </p>
        </div>
        <div className="app-cards">
          <button className="app-card" onClick={() => onOpen("web")}>
            <span className="app-card-icon blue">
              <Icon name="monitor" size={26} />
            </span>
            <span className="app-card-copy">
              <strong>Web App</strong>
              <small>Plan, monitor & control</small>
            </span>
            <span className="open-link">
              Open <Icon name="arrow" size={18} />
            </span>
          </button>
          <button className="app-card" onClick={() => onOpen("mobile")}>
            <span className="app-card-icon green">
              <Icon name="phone" size={26} />
            </span>
            <span className="app-card-copy">
              <strong>Mobile App</strong>
              <small>Do the work, prove it with photos</small>
            </span>
            <span className="open-link">
              Open <Icon name="arrow" size={18} />
            </span>
          </button>
        </div>
        <footer>
          Developed by QBS <span /> v3.0
        </footer>
      </section>
    </main>
  )
}

function Login({
  kind,
  onBack,
  onSuccess,
}: {
  kind: AppKind
  onBack: () => void
  onSuccess: (role: string) => void
}) {
  const [username, setUsername] = useState(
    kind === "web" ? "supervisor" : "cleaner",
  )
  const [password, setPassword] = useState(
    kind === "web" ? "sup123" : "clean123",
  )
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const availableDemos = demos.filter((demo) => demo.apps.includes(kind))

  function signIn(event: FormEvent) {
    event.preventDefault()
    const account = demos.find(
      (demo) => demo.username === username && demo.password === password,
    )
    if (!account) {
      setError(
        "That username or password doesn’t look right. Try a demo account below.",
      )
      return
    }
    if (!account.apps.includes(kind)) {
      setError(
        `${account.role}s use the ${
          account.apps[0] === "web" ? "Web" : "Mobile"
        } App.`,
      )
      return
    }
    setError("")
    setLoading(true)
    window.setTimeout(() => onSuccess(account.role), 650)
  }

  function fillDemo(index: number) {
    setUsername(availableDemos[index].username)
    setPassword(availableDemos[index].password)
    setError("")
  }

  return (
    <main className={`login-page ${kind} page-enter`}>
      <button className="back-button" onClick={onBack}>
        <span>←</span> Back
      </button>
      {kind === "web" && (
        <section className="login-brand">
          <div className="brand-pattern" />
          <Logo />
          <div className="brand-message">
            <span className="brand-kicker">
              <i /> Live operations
            </span>
            <h1>
              Every room.
              <br />
              Every round.
              <br />
              Proven.
            </h1>
            <p>A clearer standard for facility operations at KFMC.</p>
          </div>
          <div className="brand-proof">
            <Icon name="shield" size={19} /> Secure operations workspace
          </div>
        </section>
      )}
      <section className="login-form-wrap">
        <form className="login-form" onSubmit={signIn}>
          {kind === "mobile" && <Logo />}
          <div className="form-title">
            <span className="eyebrow">
              {kind === "web" ? "Operations workspace" : "Worker mobile"}
            </span>
            <h2>Welcome back</h2>
            <p>Sign in to continue to your {kind} app.</p>
          </div>
          <label>
            Username
            <span className="input-wrap">
              <Icon name="people" size={18} />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
              />
            </span>
          </label>
          <label>
            Password
            <span className="input-wrap">
              <Icon name="shield" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
          </label>
          <div className="form-row">
            <span className="remember">Demo access · browser-local data</span>
            <button
              type="button"
              className="text-button"
              onClick={() =>
                setError(
                  "Use a demo account below. Production password recovery requires an authentication service.",
                )
              }
            >
              Forgot password?
            </button>
          </div>
          {error && (
            <div className="form-error">
              <Icon name="alert" size={17} /> {error}
            </div>
          )}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? (
              <span className="loader" />
            ) : (
              <>
                Sign in <Icon name="arrow" size={18} />
              </>
            )}
          </button>
          <div className="demo-section">
            <div>
              <span>Demo accounts</span>
              <i />
            </div>
            <p>Choose a role to fill the details</p>
            <div className="demo-chips">
              {availableDemos.map((demo, index) => (
                <button
                  type="button"
                  key={demo.username}
                  onClick={() => fillDemo(index)}
                >
                  {demo.role}
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
  const [role, setRole] = useState("Supervisor")

  useEffect(() => {
    const saved = window.sessionStorage.getItem("qbs-session")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.mode === "login") {
          setLoginKind(parsed.kind === "web" ? "web" : "mobile")
          setMode("login")
          return
        }
        const account = demos.find((d) => d.role === parsed.role)
        if (account && account.apps.includes(parsed.mode)) {
          setRole(parsed.role)
          setMode(parsed.mode)
        }
      } catch {
        window.sessionStorage.removeItem("qbs-session")
      }
    }
  }, [])

  function openLogin(kind: AppKind) {
    setLoginKind(kind)
    setMode("login")
  }

  function completeLogin(nextRole: string) {
    setRole(nextRole)
    setMode(loginKind)
    window.sessionStorage.setItem(
      "qbs-session",
      JSON.stringify({ role: nextRole, mode: loginKind }),
    )
  }

  function switchApp(kind: AppKind) {
    const account = demos.find((d) => d.role === role)
    if (!account?.apps.includes(kind)) {
      window.sessionStorage.removeItem("qbs-session")
      openLogin(kind)
      return
    }
    setMode(kind)
    window.sessionStorage.setItem(
      "qbs-session",
      JSON.stringify({ role, mode: kind }),
    )
  }

  function signOut() {
    window.sessionStorage.removeItem("qbs-session")
    setLoginKind(mode === "mobile" ? "mobile" : "web")
    setMode("login")
  }

  function changeDemoRole(nextRole: string) {
    setRole(nextRole)
    window.sessionStorage.setItem(
      "qbs-session",
      JSON.stringify({ role: nextRole, mode }),
    )
  }

  if (mode === "entry") return <Entry onOpen={openLogin} />
  if (mode === "login") {
    const login = (
      <Login
        kind={loginKind}
        onBack={() => setMode("entry")}
        onSuccess={completeLogin}
      />
    )
    return loginKind === "mobile" ? <DeviceFrame>{login}</DeviceFrame> : login
  }
  const workspace = (
    <Operations
      role={role}
      mobile={mode === "mobile"}
      onSwitch={switchApp}
      onSignOut={signOut}
      onRoleChange={changeDemoRole}
    />
  )
  return mode === "mobile" ? <DeviceFrame>{workspace}</DeviceFrame> : workspace
}
