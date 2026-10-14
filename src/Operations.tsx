import { useEffect, useState, type FormEvent } from "react"
import {
  checklist,
  inventoryCategories,
  item,
  load,
  modules,
  seed,
  storageKey,
  adjustCustody,
  ledger,
  notify,
  once,
  recordIssue,
  untilText,
  utilization,
  withHistory,
  type Database,
  type RecordItem,
} from "./operations-data"
import Icon, { type IconName } from "./Icon"
import QRScanner from "./QRScanner"
import EnterpriseDashboard from "./EnterpriseDashboard"
import ShiftPlanning from "./ShiftPlanning"
import WorkerHome from "./WorkerHome"
import { HandoverFlow, WorkloadView } from "./OpsViews"
import ChecklistAssignmentWizard from "./ChecklistAssignmentWizard"
import { InventoryCustody, LocationHierarchy, ReportsDashboard } from "./ManagementViews"
import StaffDirectory from "./StaffDirectory"
import StorekeeperHome from "./StorekeeperHome"
import EquipmentOverview from "./EquipmentOverview"
import PhotoReviewQueue from "./PhotoReviewQueue"
import ActivityLogView from "./ActivityLogView"
import { ShiftAssignment, ShiftManagement } from "./Shifts"
import StockUtilization from "./StockUtilization"

type Props = {
  role: string
  mobile: boolean
  onSwitch: (kind: "web" | "mobile") => void
  onSignOut: () => void
  onRoleChange: (role: string) => void
}
type ActionPrompt = {
  title: string
  message: string
  confirmLabel: string
  destructive?: boolean
  dismissOnly?: boolean
  inputLabel?: string
  inputPlaceholder?: string
  inputRequired?: boolean
  action?: (value?: string) => void
}
const symbols: Record<string, IconName> = {
  Dashboard: "home",
  Tasks: "tasks",
  "Photo Review": "camera",
  Checklists: "clipboard",
  "Service Requests": "bell",
  Patrols: "shield",
  Incidents: "alert",
  "Staff & Roster": "people",
  "Shift Planning": "calendar",
  "Shift Assignment": "calendar",
  "Staff Workload": "activity",
  "Checklist Assignment": "clipboard",
  Inventory: "box",
  "Stock Transactions": "report",
  "Supply Requests": "box",
  "Issuance & Returns": "arrow",
  Replenishment: "trend",
  Equipment: "activity",
  Handover: "arrow",
  Locations: "building",
  Shifts: "clock",
  Announcements: "bell",
  "Activity Log": "activity",
  Reports: "report",
  Settings: "menu",
}
const navGroups = [
  {
    label: "Overview",
    items: ["Dashboard", "Announcements"],
  },
  {
    label: "Workforce operations",
    items: ["Shift Planning", "Shifts", "Shift Assignment", "Staff Workload", "Handover"],
  },
  {
    label: "Task management",
    items: [
      "Tasks",
      "Checklists",
      "Checklist Assignment",
      "Photo Review",
    ],
  },
  {
    label: "Service operations",
    items: ["Service Requests"],
  },
  {
    label: "Supplies & inventory",
    items: [
      "Inventory",
      "Stock Transactions",
      "Supply Requests",
    ],
  },
  {
    label: "Master data",
    items: ["Locations", "Staff & Roster"],
  },
  {
    label: "Management",
    items: ["Reports", "Settings", "Activity Log"],
  },
]
const moduleLabels: Record<string, string> = {
  Dashboard: "Operations Dashboard",
  Announcements: "Notifications",
  "Staff & Roster": "People Master Data",
  Shifts: "Shift Management",
  Tasks: "Task Board",
  Checklists: "Checklist Library",
  Inventory: "Inventory Overview",
  Locations: "Location Hierarchy",
  Settings: "Configuration & Settings",
  Reports: "Reports & Analytics",
  Handover: "Shift Handover",
}
const recordNames: Record<string, string> = {
  Tasks: "task",
  Checklists: "checklist template",
  "Service Requests": "service request",
  Patrols: "patrol",
  Incidents: "incident",
  Inventory: "inventory item",
  "Stock Transactions": "stock transaction",
  "Supply Requests": "supply request",
  Equipment: "equipment record",
  Locations: "location",
  Announcements: "announcement",
  Shifts: "shift",
  "Staff & Roster": "person",
}
const moduleIntros: Record<string, string> = {
  "Staff & Roster": "Master record for every person: identity, contact, employer, role and default shift.",
  Locations: "Master structure of campus, buildings, floors and cleaning zones with their QR codes.",
  Shifts: "Shift definitions used by the weekly roster and zone deployment.",
  "Shift Assignment": "Weekly roster of who works which shift, with coverage and rest checks.",
  "Photo Review": "Review each submitted task: its photo evidence, then each sub-task.",
  "Supply Requests": "Requests open only after an item's usage period has passed since the last issue.",
}
const initials = (name: string) =>
  name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")

function OptionSelect({
  value,
  options,
  onChange,
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  const list = Array.from(new Set([...options, value].filter(Boolean))).sort()
  const [custom, setCustom] = useState(false)
  if (custom)
    return (
      <input
        required
        autoFocus
        placeholder="Type a new value"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => value && setCustom(false)}
      />
    )
  return (
    <select
      required
      value={value}
      onChange={(e) => {
        if (e.target.value === "__new") {
          onChange("")
          setCustom(true)
        } else onChange(e.target.value)
      }}
    >
      {!value && <option value="">Select…</option>}
      {list.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
      <option value="__new">+ Add new…</option>
    </select>
  )
}

function formatTaskDate(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function Operations({
  role,
  mobile,
  onSwitch,
  onSignOut,
  onRoleChange,
}: Props) {
  const [db, setDb] = useState<Database>(load)
  const [active, setActive] = useState(() => {
    const fromHash = decodeURIComponent(window.location.hash.slice(1))
    if (fromHash === "Task Scheduling") return "Tasks"
    return ["Issuance & Returns", "Replenishment", "Equipment"].includes(fromHash)
      ? "Inventory"
      : fromHash || "Dashboard"
  })
  useEffect(() => {
    window.history.replaceState(null, "", `#${encodeURIComponent(active)}`)
  }, [active])
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("All")
  const [selected, setSelected] = useState<RecordItem | null>(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState("")
  const [toast, setToast] = useState("")
  const [code, setCode] = useState("")
  const [reason, setReason] = useState("")
  const [taskView, setTaskView] =
    useState<"list" | "board" | "calendar" | "timeline">(mobile ? "list" : "board")
  const [scannerOpen, setScannerOpen] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [assignTo, setAssignTo] = useState("")
  const [override, setOverride] = useState("")
  const [bellOpen, setBellOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [actionPrompt, setActionPrompt] = useState<ActionPrompt | null>(null)
  const [promptValue, setPromptValue] = useState("")
  const [stockMode, setStockMode] = useState("Issue")
  const [issueZone, setIssueZone] = useState("")
  const [equipmentReturn, setEquipmentReturn] = useState("")
  const supervisor = ["Supervisor", "QBS Admin", "Operations Manager"].includes(
    role,
  )
  const worker = !supervisor && role !== "Storekeeper"
  const owner = role === "Guard" ? "Omar Hassan" : "Sara Ahmed"
  const source = active === "Photo Review" ? "Tasks" : active
  const tasks = db.records.Tasks
  const ownTasks = worker
    ? tasks.filter((t) => t.assignee === owner && !t.unpublished)
    : tasks
  const me = worker ? owner : role === "Storekeeper" ? "Storekeeper" : "Supervisors"
  const myNotices = (db.notifications || []).filter((n) => n.to === me)
  const eligibleStaff = (db.records["Staff & Roster"] || []).filter(
    (person) =>
      !["Inactive", "On leave"].includes(person.status) &&
      person.category === "Cleaner",
  )
  const workload = (person: string) =>
    tasks.filter(
      (t) =>
        t.assignee === person &&
        !["Completed", "Closed"].includes(t.status),
    ).length
  const pending = tasks.filter((t) => t.status === "Pending review")
  const canManage =
    supervisor ||
    (role === "Storekeeper" &&
      ["Inventory", "Supply Requests", "Equipment"].includes(source))
  const visibleModules =
    role === "Storekeeper"
      ? [
          "Inventory",
          "Stock Transactions",
          "Supply Requests",
        ]
      : worker
        ? [
            "Tasks",
            ...(role === "Guard"
              ? ["Patrols", "Incidents"]
              : ["Inventory", "Supply Requests"]),
            "Service Requests",
            "Handover",
            "Announcements",
          ]
        : [
            ...modules.filter(
              (module) =>
                !["Issuance & Returns", "Replenishment", "Equipment"].includes(
                  module,
                ),
            ),
            "Reports",
            "Settings",
          ]
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === storageKey) setDb(load())
    }
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [])
  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(""), 3500)
    return () => clearTimeout(timeout)
  }, [toast])
  useEffect(() => {
    if (!selected) return
    const previous = document.activeElement as HTMLElement | null
    const dialog = document.querySelector<HTMLElement>(".ops-modal")
    dialog?.querySelector<HTMLElement>("button, input")?.focus()
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null)
      if (event.key !== "Tab") return
      const controls = Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)",
        ) || [],
      )
      const first = controls[0],
        last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener("keydown", keyboard)
    return () => {
      document.removeEventListener("keydown", keyboard)
      previous?.focus()
    }
  }, [Boolean(selected)])
  useEffect(() => {
    if (!selected && active === "Equipment" && equipmentReturn) {
      setActive(equipmentReturn)
      setEquipmentReturn("")
    }
  }, [selected, active, equipmentReturn])
  useEffect(() => {
    setQuery("")
    setFilter("All")
    setSelected(null)
    setError("")
  }, [active])
  function commit(next: Database, message: string) {
    const sync = next.sync || db.sync
    next = {
      ...next,
      sync: sync.online
        ? {
            ...sync,
            pending: 0,
            lastSynced: new Date().toISOString(),
          }
        : { ...sync, pending: sync.pending + 1 },
      activity: [
        `${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${message}`,
        ...next.activity,
      ].slice(0, 60),
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setDb(next)
      setToast(message)
      setError("")
      return true
    } catch {
      setError(
        "Storage is full. Remove unused photos or use a smaller image before saving.",
      )
      return false
    }
  }
  function requestConfirmation(
    title: string,
    message: string,
    action: () => void,
    confirmLabel = "Continue",
    destructive = false,
  ) {
    setActionPrompt({ title, message, action, confirmLabel, destructive })
  }
  function requestInput(
    title: string,
    message: string,
    action: (value: string) => void,
    confirmLabel = "Submit",
    inputLabel = "Reason",
    inputPlaceholder = "Enter a reason",
  ) {
    setPromptValue("")
    setActionPrompt({
      title,
      message,
      action,
      confirmLabel,
      inputLabel,
      inputPlaceholder,
      inputRequired: true,
    })
  }
  function closePrompt() {
    setActionPrompt(null)
    setPromptValue("")
  }
  function showNotice(title: string, message: string) {
    setActionPrompt({
      title,
      message,
      confirmLabel: "Got it",
      dismissOnly: true,
    })
  }
  function update(
    record: RecordItem,
    message: string,
    extra?: Database["records"],
  ) {
    const records = extra || db.records
    if (
      commit(
        {
          ...db,
          records: {
            ...records,
            [source]: records[source].map((r) =>
              r.id === record.id ? record : r,
            ),
          },
        },
        message,
      )
    )
      setSelected(record)
  }
  function openNotice(id: string) {
    const notice = (db.notifications || []).find((n) => n.id === id)
    if (!notice) return
    const next = {
      ...db,
      notifications: (db.notifications || []).map((n) => (n.id === id ? { ...n, read: true } : n)),
    }
    localStorage.setItem(storageKey, JSON.stringify(next))
    setDb(next)
    setBellOpen(false)
    setActive(notice.module)
    const target = (db.records[notice.module] || []).find((r) => r.id === notice.recordId)
    if (target) window.setTimeout(() => open(target), 0)
  }
  function open(record: RecordItem, edit = false) {
    setSelected({ ...record })
    setEditing(edit)
    setError("")
    setCode("")
    setReason("")
  }
  function openEquipment(record: RecordItem, returnTo: string) {
    setEquipmentReturn(returnTo)
    setActive("Equipment")
    open(record)
  }
  function create() {
    open(
      item("", {
        status:
          active === "Staff & Roster"
            ? "Available"
            : active === "Tasks" || active === "Patrols"
            ? "Assigned"
            : active === "Service Requests"
              ? "Open"
              : active === "Supply Requests"
                ? "Submitted"
                : active === "Handover"
                  ? "Draft"
                  : "Active",
        assignee: worker ? owner : "Sara Ahmed",
        createdAt: new Date().toISOString(),
        createdBy: worker ? owner : "Faisal Alharbi",
        ...(active === "Staff & Roster"
          ? {
              code: "",
              category: "Cleaner",
              department: "Housekeeping",
              location: "Morning · 07:00–15:00",
              notes: "Cleaner · workforce record",
              phone: "",
              email: "",
              nationality: "",
              employer: "QBS Facility Services",
              joinDate: new Date().toISOString().slice(0, 10),
              idExpiry: "",
            }
          : {}),
        ...(active === "Service Requests"
          ? {
              category: "Spill response",
              requester: "KFMC Helpdesk",
              status: "Open",
            }
          : {}),
        ...(active === "Checklists"
          ? { category: "Ward", duration: 30, notes: checklist.join("\n") }
          : {}),
        ...(active === "Supply Requests" ? { title: "", quantity: 1, notes: "" } : {}),
        ...(active === "Locations"
          ? {
              category: "Cleaning zone",
              building: "Main Hospital",
              floor: "Ground Floor",
              department: "Housekeeping",
              code: "",
            }
          : {}),
      }),
      true,
    )
  }
  function save(e: FormEvent) {
    e.preventDefault()
    if (!selected) return
    if (!selected.title.trim()) return setError("Please enter a name.")
    if (
      source === "Inventory" &&
      (selected.quantity < 0 || selected.minimum < 0)
    )
      return setError("Counts cannot be negative.")
    if (
      source === "Locations" &&
      db.records.Locations.some(
        (r) => r.id !== selected.id && r.code === selected.code,
      )
    )
      return setError("Location codes must be unique.")
    const exists = db.records[source].some((r) => r.id === selected.id)
    const record = {
      ...selected,
      title: selected.title.trim(),
      ...(source === "Checklists"
        ? { checklist: selected.notes.split("\n").filter(Boolean) }
        : {}),
    }
    if (!exists && source === "Supply Requests") {
      if (!db.records.Inventory.some((stock) => stock.title === record.title))
        return setError("Choose an item from the inventory catalogue.")
      if (
        db.records["Supply Requests"].some(
          (r) =>
            r.assignee === record.assignee &&
            r.title === record.title &&
            ["Submitted", "Approved"].includes(r.status),
        )
      )
        return setError(`${record.assignee} already has an open request for ${record.title}.`)
      const use = utilization(db, record.assignee, record.title)
      if (use.locked) {
        const opens = new Date(use.availableAt || "").toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
        const message = `${record.title} was issued to ${record.assignee} with a ${use.days}-day usage period. A new request opens ${opens} (in ${untilText(use.availableAt)}).`
        if (worker) return setError(message)
        return requestInput(
          "Usage period not finished",
          `${message} Record why stock is needed early to continue.`,
          (why) =>
            persist(
              withHistory(record, `Usage-period override by ${role} · ${why}`),
              exists,
            ),
          "Override & submit",
          "Override reason",
          "e.g. Large spill, bottle damaged",
        )
      }
    }
    persist(record, exists)
  }
  function persist(record: RecordItem, exists: boolean) {
    let next: Database = {
      ...db,
      records: {
        ...db.records,
        [source]: exists
          ? db.records[source].map((r) => (r.id === record.id ? record : r))
          : [...db.records[source], withHistory(record, `Created by ${worker ? owner : role}`)],
      },
    }
    if (!exists && ["Service Requests", "Supply Requests", "Incidents"].includes(source))
      next = notify(
        next,
        source === "Supply Requests" ? "Storekeeper" : "Supervisors",
        `${record.priority === "Urgent" ? "URGENT · " : ""}New ${source.replace(/s$/, "").toLowerCase()}: ${record.title} · ${record.location}`,
        source,
        record.id,
      )
    if (!exists && source === "Supply Requests") next = notify(next, "Supervisors", `Supply request awaiting approval: ${record.title}`, source, record.id)
    if (!exists && source === "Tasks" && record.assignee)
      next = notify(next, record.assignee, `New task assigned: ${record.title} · ${record.location}`, "Tasks", record.id)
    if (
      commit(
        next,
        exists ? "Changes saved" : `${source} record created`,
      )
    ) {
      setSelected(record)
      setEditing(false)
    }
  }
  function remove() {
    if (!selected) return
    if (
      source === "Locations" &&
      tasks.some((t) => t.location === selected.title)
    )
      return setError("This location is used by tasks. Deactivate it instead.")
    const record = selected
    requestConfirmation(
      "Delete this record?",
      `“${record.title}” will be permanently removed. This action cannot be undone.`,
      () => {
        if (
          commit(
            {
              ...db,
              records: {
                ...db.records,
                [source]: db.records[source].filter((r) => r.id !== record.id),
              },
            },
            "Record deleted",
          )
        )
          setSelected(null)
      },
      "Delete record",
      true,
    )
  }
  function toggleDuty() {
    const applyDutyChange = () =>
      commit(
        notify(
          {
            ...db,
            duty: !db.duty,
            sync: { ...db.sync, pending: db.sync.pending + 1 },
          },
          "Supervisors",
          `${owner} is now ${db.duty ? "off duty" : "on duty"}`,
          "Staff & Roster",
        ),
        db.duty ? "Off-duty recorded" : "On-duty confirmation recorded",
      )
    if (!db.duty) return applyDutyChange()
    const openTasks = ownTasks.filter(
      (task) =>
        !["Completed", "Closed", "Pending review"].includes(task.status),
    ).length
    requestConfirmation(
      "Go off duty?",
      `${openTasks} task(s) are still open and will remain visible to your supervisor.`,
      applyDutyChange,
      "Go off duty",
    )
  }
  function transition(status: string, target = selected, why = reason) {
    if (!target) return
    const inModal = target.id === selected?.id
    const fail = (message: string) =>
      inModal ? setError(message) : showNotice("Action not completed", message)
    const isTask = source === "Tasks"
    if (
      ["Pending review", "Completed", "Closed"].includes(status) &&
      (source === "Incidents" || (isTask && target.evidenceRequired)) &&
      !target.photos.length &&
      !(isTask && override.trim() && supervisor)
    )
      return fail(
        "Add at least one evidence photo before submitting, or record an authorised supervisor override.",
      )
    if (
      isTask &&
      target.materials.some(
        (material) => material.used < 0 || material.used > material.issued,
      )
    )
      return fail(
        "Material usage must be within the issued quantity. Request additional stock before submitting.",
      )
    if (
      isTask &&
      status === "Pending review" &&
      target.answers.length < target.checklist.length
    )
      return fail(
        `Answer every mandatory checklist item before submitting (${target.answers.length}/${target.checklist.length} done).`,
      )
    if (
      isTask &&
      status === "Pending review" &&
      target.answers.some((a) => /\|(No|N\/A)(\|\s*)?$/.test(a))
    )
      return fail("Add remarks for every checklist item answered No or N/A.")
    if (isTask && status === "In progress") {
      if (worker && target.assignee !== owner)
        return fail("You can only start tasks that are assigned to you.")
      if (target.unpublished)
        return fail("This task becomes available once the shift plan is published.")
      if (target.status === "Unassigned")
        return fail("Assign this task to a worker before it can start.")
      if (code !== target.code && !override.trim())
        return fail(
          `Scan or enter the matching location code (${target.code}), or enter a supervisor-authorised override reason.`,
        )
    }
    if (status === "Returned" && !why.trim())
      return fail("Enter a reason so the worker knows what to correct.")
    let entry = `${status} by ${worker ? owner : role}`
    if (isTask && status === "In progress")
      entry += code === target.code ? " · QR verified" : ` · QR override: ${override}`
    if (why.trim()) entry += ` · ${why}`
    const record = withHistory(
      {
        ...target,
        status,
        notes: status === "Returned" ? why : target.notes,
        reviewFlags: status === "Completed" ? [] : target.reviewFlags,
      },
      entry,
    )
    let next: Database = {
      ...db,
      records: {
        ...db.records,
        [source]: db.records[source].map((r) => (r.id === record.id ? record : r)),
      },
    }
    if (isTask) {
      // Keep a linked service request in step with its task.
      const requestStatus =
        status === "In progress"
          ? "In Progress"
          : status === "Completed"
            ? "Completed"
            : status === "Closed"
              ? "Closed"
              : ""
      if (record.linkedId && requestStatus)
        next.records["Service Requests"] = next.records["Service Requests"].map((r) =>
          r.id === record.linkedId
            ? withHistory({ ...r, status: requestStatus }, `Linked task ${status}`)
            : r,
        )
      if (status === "Returned")
        next = notify(next, record.assignee, `Correction requested: ${record.title} · ${why}`, "Tasks", record.id)
      if (status === "Pending review")
        next = notify(next, "Supervisors", `${record.title} submitted by ${record.assignee}`, "Tasks", record.id)
      if (status === "In progress")
        next = notify(next, "Supervisors", `${record.title} started by ${record.assignee}`, "Tasks", record.id)
      if (status === "Completed") {
        next = notify(next, record.assignee, `Completion confirmed: ${record.title}`, "Tasks", record.id)
        // Post consumption and returns exactly once against the worker custody balance.
        next = once(next, `consume-${record.id}`, (state) =>
          record.materials.reduce((acc, material) => {
            const unused = material.issued - material.used - material.returned
            let updated = adjustCustody(acc, record.assignee, material.item, -(material.used + Math.max(0, unused)))
            if (material.used > 0)
              updated = ledger(updated, material.item, material.used, "Consumption", `${record.assignee} · ${record.title}`, { assignee: record.assignee, location: record.location, linkedId: record.id })
            if (unused > 0) {
              updated = ledger(updated, material.item, unused, "Return to store", `${record.assignee} · unused from ${record.title}`, { assignee: record.assignee, location: record.location, linkedId: record.id })
              updated = {
                ...updated,
                records: {
                  ...updated.records,
                  Inventory: updated.records.Inventory.map((stock) =>
                    stock.title === material.item ? { ...stock, quantity: stock.quantity + unused } : stock,
                  ),
                },
              }
            }
            return updated
          }, state),
        )
      }
    }
    if (source === "Handover" && status === "Closed") {
      next.records.Tasks = next.records.Tasks.map((t) =>
        ["Completed", "Closed"].includes(t.status)
          ? t
          : withHistory(t, `Carried over to incoming shift via “${record.title}”`),
      )
      next = notify(next, "Supervisors", `Handover accepted: ${record.title}`, "Handover", record.id)
    }
    if (commit(next, `“${target.title}” → ${status}`)) {
      if (inModal) setSelected(record)
      setOverride("")
      setReason("")
    }
  }
  function reassign() {
    if (!selected) return
    const person = assignTo || ""
    if (!person || person === selected.assignee)
      return setError("Choose a different eligible worker.")
    if (!reason.trim()) return setError("A reason is required for every reassignment.")
    const previous = selected.assignee
    const record = withHistory(
      { ...selected, assignee: person, status: selected.status === "Unassigned" ? "Assigned" : selected.status },
      `Reassigned ${previous} → ${person} · ${reason}`,
    )
    let next: Database = {
      ...db,
      records: { ...db.records, Tasks: tasks.map((t) => (t.id === record.id ? record : t)) },
    }
    next = notify(next, person, `New task assigned: ${record.title} · ${record.location}`, "Tasks", record.id)
    if (previous && previous !== person)
      next = notify(next, previous, `Task reassigned away: ${record.title}`, "Tasks", record.id)
    if (commit(next, `${record.title} reassigned to ${person}`)) {
      setSelected(record)
      setReason("")
      setAssignTo("")
    }
  }
  function dispatch() {
    if (!selected) return
    const person = assignTo || eligibleStaff[0]?.title
    if (!person) return setError("No eligible worker is available.")
    const zone = db.records.Locations.find((l) => l.title === selected.location)
    const task = withHistory(
      item(`${selected.category || "Service request"} · ${selected.title}`, {
        location: selected.location,
        code: zone?.code || selected.code,
        assignee: person,
        status: "Assigned",
        priority: selected.priority,
        due: selected.sla.slice(0, 16),
        category: "Service request",
        checklist: [...checklist],
        answers: [],
        linkedId: selected.id,
        createdAt: new Date().toISOString(),
        createdBy: role,
      }),
      `Created from request ${selected.id.slice(0, 6).toUpperCase()}`,
    )
    const request = withHistory(
      { ...selected, status: "Assigned", assignee: person, linkedId: task.id },
      `Dispatched to ${person}`,
    )
    let next: Database = {
      ...db,
      records: {
        ...db.records,
        Tasks: [...tasks, task],
        "Service Requests": db.records["Service Requests"].map((r) => (r.id === request.id ? request : r)),
      },
    }
    next = notify(next, person, `${selected.priority === "Urgent" ? "Urgent dispatch" : "New request task"}: ${selected.title} · ${selected.location}`, "Tasks", task.id)
    if (commit(next, `Request dispatched to ${person} · linked task created`)) {
      setSelected(request)
      setAssignTo("")
    }
  }
  function issue() {
    if (!selected) return
    if (!["Approved"].includes(selected.status))
      return setError("Only approved requests can be issued.")
    const stock = db.records.Inventory.find((r) => r.title === selected.title)
    if (!stock || selected.quantity <= 0)
      return setError("Match the request to an inventory item with a positive quantity.")
    if (stock.quantity <= 0) return setError("No stock available. Raise a replenishment request.")
    const qty = Math.min(stock.quantity, selected.quantity)
    const partial = qty < selected.quantity
    const record = withHistory(
      { ...selected, status: partial ? "Partially issued" : "Issued" },
      `Issued ${qty}/${selected.quantity} to ${selected.assignee}`,
    )
    let next = once(db, `issue-${selected.id}`, (state) => {
      let updated: Database = {
        ...state,
        records: {
          ...state.records,
          "Supply Requests": state.records["Supply Requests"].map((r) => (r.id === record.id ? record : r)),
          Inventory: state.records.Inventory.map((r) =>
            r.id === stock.id ? { ...r, quantity: r.quantity - qty } : r,
          ),
          Tasks: (() => {
            const target = state.records.Tasks.find(
              (t) => t.assignee === selected.assignee && ["Assigned", "In progress", "Returned"].includes(t.status),
            )
            return state.records.Tasks.map((t) => {
              if (t.id !== target?.id) return t
              const exists = t.materials.find((m) => m.item === selected.title)
              return {
                ...t,
                materials: exists
                  ? t.materials.map((m) => (m.item === selected.title ? { ...m, issued: m.issued + qty } : m))
                  : [...t.materials, { item: selected.title, issued: qty, used: 0, returned: 0 }],
              }
            })
          })(),
        },
      }
      updated = adjustCustody(updated, selected.assignee, selected.title, qty)
      updated = recordIssue(updated, selected.assignee, selected.title)
      updated = ledger(
        updated,
        selected.title,
        qty,
        "Issue to custody",
        `Issued to ${selected.assignee} · ${selected.location} · request ${selected.id.slice(0, 6).toUpperCase()} · by ${role}${partial ? ` · partial ${qty}/${selected.quantity}` : ""}`,
        { assignee: selected.assignee, location: selected.location, requester: role, unit: stock.unit, linkedId: selected.id },
      )
      return notify(updated, selected.assignee, `${qty} ${stock.unit || "unit"} of ${selected.title} issued to you · please acknowledge`, "Supply Requests", selected.id)
    })
    if (next === db) return setError("This request has already been issued.")
    if (commit(next, `${qty} ${selected.title} issued${partial ? " (partial)" : ""}`)) setSelected(record)
  }
  function postStockMovement() {
    if (!selected) return
    const n = Number(code)
    if (!Number.isInteger(n) || n <= 0) return setError("Enter a positive whole quantity.")
    if (!reason.trim()) return setError("Enter a purpose or reference so the movement can be traced.")
    const issuing = stockMode === "Issue"
    if (issuing && !assignTo) return setError("Choose the staff member receiving the stock.")
    if (issuing && !issueZone) return setError("Choose the zone or task the stock is for.")
    if (issuing && n > selected.quantity) return setError(`Only ${selected.quantity} ${selected.unit} available.`)
    const task = issueZone.startsWith("task:") ? tasks.find((t) => `task:${t.id}` === issueZone) : undefined
    const zone = task ? task.location : issueZone
    const record = withHistory(
      { ...selected, quantity: selected.quantity + (issuing ? -n : n) },
      issuing ? `Issued ${n} to ${assignTo} · ${zone} · ${reason}` : `Received ${n} · ${reason}`,
    )
    let next: Database = {
      ...db,
      records: {
        ...db.records,
        Inventory: db.records.Inventory.map((r) => (r.id === record.id ? record : r)),
        Tasks: tasks.map((t) =>
          t.id !== task?.id
            ? t
            : {
                ...t,
                materials: t.materials.some((m) => m.item === selected.title)
                  ? t.materials.map((m) => (m.item === selected.title ? { ...m, issued: m.issued + n } : m))
                  : [...t.materials, { item: selected.title, issued: n, used: 0, returned: 0 }],
              },
        ),
      },
    }
    if (issuing) {
      next = adjustCustody(next, assignTo, selected.title, n)
      next = recordIssue(next, assignTo, selected.title)
      next = ledger(next, selected.title, n, "Issue to custody", `Issued to ${assignTo} · ${zone}${task ? ` · task ${task.title}` : ""} · ${reason} · by ${role}`, {
        assignee: assignTo,
        location: zone,
        requester: role,
        unit: selected.unit,
        linkedId: task?.id,
      })
      next = notify(next, assignTo, `${n} ${selected.unit} of ${selected.title} issued to you · ${zone}`, task ? "Tasks" : "Inventory", task?.id || selected.id)
    } else {
      next = ledger(next, selected.title, n, "Receipt", `${reason} · received by ${role}`, { requester: role, unit: selected.unit })
    }
    if (commit(next, issuing ? `${n} ${selected.title} issued to ${assignTo}` : `${n} ${selected.title} received`)) {
      setSelected(record)
      setCode("")
      setReason("")
      setAssignTo("")
      setIssueZone("")
    }
  }
  async function photos(files: FileList | null) {
    if (!files || !selected) return
    const file = files[0]
    if (!file.type.startsWith("image/") || file.size > 2000000)
      return setError("Choose an image smaller than 2 MB.")
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    setSelected({ ...selected, photos: [...selected.photos, data].slice(0, 5) })
  }
  function requestSupply(person: string, material: string) {
    const stock = db.records.Inventory.find((i) => i.title === material)
    const current = tasks.find(
      (t) => t.assignee === person && !["Completed", "Closed"].includes(t.status),
    )
    setActive("Supply Requests")
    window.setTimeout(
      () =>
        open(
          item(material, {
            status: "Submitted",
            quantity: 1,
            assignee: person,
            location: current?.location || db.records.Locations[0]?.title || "",
            unit: stock?.unit || "unit",
            notes: "",
            createdAt: new Date().toISOString(),
            createdBy: worker ? owner : role,
          }),
          true,
        ),
      0,
    )
  }
  function exportReport() {
    const rows = [
      ["Module", "Name", "Location", "Status", "Assignee", "Quantity"],
      ...Object.entries(db.records).flatMap(([m, records]) =>
        records.map((r) => [
          m,
          r.title,
          r.location,
          r.status,
          r.assignee,
          String(r.quantity),
        ]),
      ),
    ]
    const csv = rows
      .map((row) =>
        row
          .map((v) => `"${v.replace(/"/g, '""').replace(/^[=+@-]/, "'$&")}"`)
          .join(","),
      )
      .join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    const a = document.createElement("a")
    a.href = url
    a.download = "KFMC-operations.csv"
    a.click()
    URL.revokeObjectURL(url)
    setToast("Operations report exported")
  }
  const records = (
    active === "Photo Review" ? pending : db.records[source] || []
  )
    .filter(
      (r) =>
        (!worker ||
          !["Tasks", "Patrols", "Supply Requests", "Handover"].includes(
            source,
          ) ||
          r.assignee === owner) &&
        !(worker && r.unpublished) &&
        (filter === "All" ||
          (source === "Inventory"
            ? r.category === filter
            : r.status === filter)) &&
        `${r.title} ${r.location} ${r.assignee}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((first, second) => {
      if (source !== "Tasks") return 0
      const priority = { Urgent: 0, High: 1, Normal: 2 }
      const priorityGap =
        (priority[(first.priority as keyof typeof priority)] ?? 3) -
        (priority[(second.priority as keyof typeof priority)] ?? 3)
      return (
        priorityGap ||
        new Date(first.due).getTime() - new Date(second.due).getTime()
      )
    })
  const patch = (key: keyof RecordItem, value: string | number) =>
    selected && setSelected({ ...selected, [key]: value })
  function acceptScan(value: string) {
    const normalized = value.trim().toUpperCase()
    setScannerOpen(false)
    setCode(normalized)
    if (selected) {
      setToast(`Code captured · ${normalized}`)
      return
    }
    const matchedTask = ownTasks.find(
      (record) =>
        record.code.toUpperCase() === normalized &&
        record.status !== "Completed",
    )
    if (matchedTask) {
      setActive("Tasks")
      open(matchedTask)
      setCode(normalized)
      setToast(`Location verified · ${matchedTask.location}`)
      return
    }
    setToast(`No active task matches ${normalized}`)
  }
  return (
    <div className={`ops-shell ${mobile ? "ops-mobile" : ""}`}>
      {!mobile && (
        <aside className="ops-sidebar">
          <div className="ops-brand">
            <img src="/kfmc-logo.png" alt="King Fahad Medical City" />
            <div>
              <strong>KFMC</strong>
              <small>Facility Operations</small>
            </div>
          </div>
          <nav>
            {navGroups.map((group) => {
              const items = group.items.filter(
                (module) =>
                  module === "Dashboard" || visibleModules.includes(module),
              )
              if (!items.length) return null
              return (
                <div className="ops-nav-group" key={group.label}>
                  <span className="ops-nav-label">{group.label}</span>
                  {items.map((module) => (
                    <button
                      key={module}
                      className={active === module ? "selected" : ""}
                      onClick={() => setActive(module)}
                    >
                      <span>
                        <Icon name={symbols[module] || "grid"} size={17} />
                      </span>
                      {moduleLabels[module] || module}
                      {module === "Photo Review" && pending.length > 0 && (
                        <b>{pending.length}</b>
                      )}
                    </button>
                  ))}
                </div>
              )
            })}
          </nav>
          <div className="ops-sidebar-foot">
            <span className="ops-status-dot" /> Demonstration environment
            <small>Synthetic operational data · v3.1</small>
          </div>
        </aside>
      )}
      <div className={`ops-main ${mobile && (mobileMenu || profileOpen) ? "more-open" : ""}`}>
        {mobile ? (
          <header className="m-appbar">
            <img src="/kfmc-logo.png" alt="King Fahad Medical City" />
            <div className="m-appbar-title">
              <small>
                {active === "Dashboard"
                  ? role === "Storekeeper"
                    ? "Central Store"
                    : "KFMC Operations"
                  : role}
              </small>
              <strong>{mobileMenu || profileOpen ? "More" : active === "Dashboard" ? (role === "Storekeeper" ? "Inventory" : worker ? "My shift" : "Overview") : moduleLabels[active] || active}</strong>
            </div>
            <span className="ops-bell-wrap">
              <button
                className="m-icon-btn"
                aria-label="Notifications"
                onClick={() => {
                  setBellOpen(!bellOpen)
                  setProfileOpen(false)
                }}
              >
                <Icon name="bell" size={19} />
                {myNotices.some((n) => !n.read) && <i />}
              </button>
            </span>
            <button
              className="m-avatar"
              aria-label="Account"
              onClick={() => {
                setProfileOpen(!profileOpen)
                setBellOpen(false)
              }}
            >
              {worker ? initials(owner) : "FA"}
            </button>
            {bellOpen && (
              <div className="ops-bell-panel" role="menu">
                <header>
                  <strong>Notifications</strong>
                  <small>{myNotices.filter((n) => !n.read).length} unread</small>
                </header>
                {myNotices.slice(0, 12).map((n) => (
                  <button key={n.id} className={n.read ? "" : "unread"} onClick={() => openNotice(n.id)}>
                    <span>{n.text}</span>
                    <small>
                      {n.module} · {new Date(n.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </small>
                  </button>
                ))}
                {!myNotices.length && <p>No notifications yet.</p>}
              </div>
            )}
          </header>
        ) : (
        <header className="ops-topbar">
          <div>
            {mobile ? (
              <img src="/kfmc-logo.png" alt="KFMC" />
            ) : (
              <>
                <span>King Fahad Medical City</span>
                <b>/</b>
                <strong>{moduleLabels[active] || active}</strong>
              </>
            )}
          </div>
          <div>
            <span className="ops-sync-state">
              <i />
              {db.sync.pending
                ? `${db.sync.pending} pending sync`
                : "All changes synced"}
            </span>
            <span className="ops-bell-wrap">
              <button
                className="ops-notification-button"
                aria-label="Notifications"
                aria-expanded={bellOpen}
                onClick={() => setBellOpen(!bellOpen)}
              >
                <Icon name="bell" size={17} />
                {myNotices.some((n) => !n.read) && <i />}
              </button>
              {bellOpen && (
                <div className="ops-bell-panel" role="menu">
                  <header>
                    <strong>Notifications</strong>
                    <small>{myNotices.filter((n) => !n.read).length} unread</small>
                  </header>
                  {myNotices.slice(0, 12).map((n) => (
                    <button key={n.id} className={n.read ? "" : "unread"} onClick={() => openNotice(n.id)}>
                      <span>{n.text}</span>
                      <small>
                        {n.module} · {new Date(n.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </small>
                    </button>
                  ))}
                  {!myNotices.length && <p>No notifications yet.</p>}
                </div>
              )}
            </span>
            <select
              className="role-switcher"
              aria-label="Demonstration role"
              value={role}
              onChange={(event) => onRoleChange(event.target.value)}
            >
              {[
                "Supervisor",
                "Operations Manager",
                "Storekeeper",
                "Cleaner",
                "Guard",
                "QBS Admin",
              ].map((demoRole) => (
                <option key={demoRole}>{demoRole}</option>
              ))}
            </select>
            {supervisor && (
              <button onClick={() => onSwitch(mobile ? "web" : "mobile")}>
                {mobile ? "Web view" : "Mobile view"}
              </button>
            )}
            <span className="ops-avatar">
              {worker ? initials(owner) : "FA"}
            </span>
            <button onClick={onSignOut}>Sign out</button>
          </div>
        </header>
        )}
        <main className="ops-content">
          {!mobile && (
            <header className="ops-heading">
              <div>
                <span className="eyebrow">
                  {new Date().toLocaleDateString("en", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  · KFMC MAIN CAMPUS
                </span>
                <h1>
                  {active === "Dashboard"
                    ? `Good morning, ${worker ? owner.split(" ")[0] : "Faisal"}`
                    : moduleLabels[active] || active}
                </h1>
                <p>
                  {active === "Dashboard"
                    ? "Every shift. Every space. One connected operation."
                    : moduleIntros[active] ||
                      "Manage your operational records and keep the team connected."}
                </p>
              </div>
              {db.records[source] &&
                active !== "Photo Review" &&
                ![
                  "Dashboard",
                  "Shift Planning",
                  "Shifts",
                  "Shift Assignment",
                  "Checklist Assignment",
                  "Reports",
                  "Settings",
                  "Staff Workload",
                  "Handover",
                  "Staff & Roster",
                ].includes(active) &&
                (!worker ||
                  !["Inventory", "Announcements"].includes(active)) && (
                  <button className="ops-primary" onClick={create}>
                    + New {active === "Tasks" ? "task" : "record"}
                  </button>
                )}
            </header>
          )}
          {mobile &&
            db.records[source] &&
            active !== "Photo Review" &&
            !["Dashboard", "Shift Planning", "Shifts", "Shift Assignment", "Checklist Assignment", "Reports", "Settings", "Staff Workload", "Handover", "Equipment"].includes(active) &&
            (!worker || !["Inventory", "Announcements"].includes(active)) && (
              <button className="m-fab" onClick={create} aria-label={`New ${active === "Tasks" ? "task" : "record"}`}>
                <Icon name="plus" size={24} />
              </button>
            )}
          {active === "Dashboard" && mobile && role === "Storekeeper" ? (
            <StorekeeperHome
              db={db}
              onNavigate={setActive}
              onOpenRequest={(record) => {
                setActive("Supply Requests")
                window.setTimeout(() => open(record), 0)
              }}
              onOpenEquipment={(record) => {
                openEquipment(record, "Dashboard")
              }}
            />
          ) : active === "Dashboard" && mobile && worker ? (
            <WorkerHome
              db={db}
              owner={owner}
              onDuty={toggleDuty}
              onNavigate={setActive}
              onOpenNotice={openNotice}
              onEndShift={() => setActive("Handover")}
              onRequestSupply={(material) => requestSupply(owner, material)}
              onOpenTask={(task) => {
                setActive("Tasks")
                window.setTimeout(() => open(task), 0)
              }}
            />
          ) : active === "Dashboard" ? (
            <>
            {mobile && supervisor && (() => {
              const zones = db.records["Shift Planning"] || []
              const shortage = zones.reduce((n, z) => n + Math.max(0, z.requiredCount - z.assignedStaff.length), 0)
              const urgent = db.records["Service Requests"].filter((r) => r.status === "Open")
              const queue: [string, string, number, string, IconName][] = [
                ["Staffing shortages", `${zones.filter((z) => z.assignedStaff.length < z.requiredCount).length} uncovered zones`, shortage, "Shift Planning", "people"],
                ["Dispatch queue", urgent.filter((r) => r.priority === "Urgent").length ? "Urgent request waiting" : "Open requests", urgent.length, "Service Requests", "alert"],
                ["Awaiting confirmation", "Submitted task completions", pending.length, "Photo Review", "check"],
                ["Pending handovers", "Submitted or acknowledged", db.records.Handover.filter((h) => ["Submitted", "Acknowledged"].includes(h.status)).length, "Handover", "clipboard"],
                ["Assign checklist", "Template → zone → worker", 0, "Checklist Assignment", "tasks"],
              ]
              return (
                <section className="supervisor-queue">
                  <header>
                    <span className="eyebrow">Morning shift · Plan {db.planStatus} v{db.planVersion}</span>
                    <h2>Action queue</h2>
                  </header>
                  {queue.map(([label, detail, count, target, icon]) => (
                    <button key={label} onClick={() => setActive(target)} className={count ? "attention" : ""}>
                      <span><Icon name={icon} size={17} /></span>
                      <div>
                        <strong>{label}</strong>
                        <small>{detail}</small>
                      </div>
                      {count > 0 ? <b>{count}</b> : <Icon name="chevron" size={16} />}
                    </button>
                  ))}
                </section>
              )
            })()}
            <EnterpriseDashboard
              db={db}
              mobile={mobile}
              role={role}
              onNavigate={setActive}
            />
            </>
          ) : active === "Staff Workload" ? (
            <WorkloadView
              db={db}
              onOpenTask={(task) => {
                setActive("Tasks")
                window.setTimeout(() => open(task), 0)
              }}
            />
          ) : active === "Handover" ? (
            <HandoverFlow db={db} role={role} me={worker ? owner : "Faisal Al-Harbi"} worker={worker} onCommit={commit} onOpen={(record) => open(record)} />
          ) : active === "Shift Planning" ? (
            <ShiftPlanning
              db={db}
              onCommit={commit}
              onConfirm={requestConfirmation}
              onRequestInput={requestInput}
            />
          ) : active === "Shifts" ? (
            <ShiftManagement db={db} onCommit={commit} onConfirm={requestConfirmation} />
          ) : active === "Shift Assignment" ? (
            <ShiftAssignment db={db} onCommit={commit} onConfirm={requestConfirmation} />
          ) : active === "Checklist Assignment" ? (
            <ChecklistAssignmentWizard
              db={db}
              onCommit={commit}
              onOpenTasks={() => setActive("Tasks")}
              onNotice={showNotice}
            />
          ) : active === "Reports" ? (
            <ReportsDashboard db={db} onExport={exportReport} />
          ) : active === "Locations" ? (
            <LocationHierarchy
              db={db}
              onOpen={open}
              onAdd={(defaults) =>
                open(
                  item("", {
                    status: "Active",
                    code: "",
                    location: defaults.building || "KFMC Main Campus",
                    ...defaults,
                  }),
                  true,
                )
              }
            />
          ) : active === "Staff & Roster" && !mobile ? (
            <StaffDirectory
              staff={db.records["Staff & Roster"]}
              onOpen={open}
              onCreate={create}
              onNotice={showNotice}
              onImport={(imported) => {
                const incoming = new Map(
                  imported.map((person) => [
                    person.code || person.title.toLowerCase(),
                    person,
                  ]),
                )
                const retained = db.records["Staff & Roster"].filter(
                  (person) =>
                    !incoming.has(person.code || person.title.toLowerCase()),
                )
                commit(
                  {
                    ...db,
                    records: {
                      ...db.records,
                      "Staff & Roster": [...retained, ...imported],
                    },
                  },
                  `${imported.length} staff record${imported.length === 1 ? "" : "s"} imported`,
                )
              }}
            />
          ) : active === "Settings" ? (
            <div className="settings-grid">
              <article className="ops-panel">
                <span className="eyebrow">Demonstration environment</span>
                <h2>Prototype data & synchronization</h2>
                <p>
                  Records are stored in this browser and synchronized across
                  open tabs. No hospital production system is connected.
                </p>
                <div className="sync-control">
                  <span className={db.sync.online ? "online" : "offline"}>
                    <i /> {db.sync.online ? "Online" : "Offline mode"}
                  </span>
                  <b>{db.sync.pending} pending entries</b>
                  <button
                    onClick={() =>
                      commit(
                        {
                          ...db,
                          sync: { ...db.sync, online: !db.sync.online },
                        },
                        db.sync.online
                          ? "Offline mode enabled"
                          : "Connection restored · pending work synchronized",
                      )
                    }
                  >
                    {db.sync.online ? "Simulate offline" : "Reconnect & retry"}
                  </button>
                </div>
                <button
                  className="ops-danger"
                  onClick={() =>
                    requestConfirmation(
                      "Reset demonstration data?",
                      "All demonstration records and photos will be restored to their original state.",
                      () => commit(seed(), "Demonstration data reset"),
                      "Reset data",
                      true,
                    )
                  }
                >
                  Reset demonstration data
                </button>
              </article>
              <article className="ops-panel">
                <span className="eyebrow">Integration placeholders</span>
                <h2>Connected systems</h2>
                {[
                  [
                    "HR workforce feed",
                    "Read-only staff identity and active status",
                  ],
                  ["Attendance interface", "Shift presence when available"],
                  ["KFMC single sign-on", "Authentication and role claims"],
                  ["Notification gateway", "Handheld assignment alerts"],
                ].map(([name, detail]) => (
                  <div className="integration-row" key={name}>
                    <span>
                      <Icon name="activity" size={16} />
                    </span>
                    <div>
                      <strong>{name}</strong>
                      <small>{detail}</small>
                    </div>
                    <b>Placeholder</b>
                  </div>
                ))}
              </article>
            </div>
          ) : active === "Photo Review" ? (
            <PhotoReviewQueue
              records={pending}
              mobile={mobile}
              onOpen={open}
              onDecision={(record, status, why) => transition(status, record, why)}
            />
          ) : active === "Activity Log" ? (
            <ActivityLogView events={db.activity} />
          ) : (
            <>
              {active === "Inventory" && (
                <div className="inventory-summary">
                  {[
                    ["Catalogue items", db.records.Inventory.length, "box"],
                    [
                      "Low stock",
                      db.records.Inventory.filter(
                        (record) => record.quantity < record.minimum,
                      ).length,
                      "alert",
                    ],
                    [
                      "Pending requests",
                      db.records["Supply Requests"].filter(
                        (record) => record.status === "Submitted",
                      ).length,
                      "clipboard",
                    ],
                    [
                      "Awaiting issuance",
                      db.records["Supply Requests"].filter(
                        (record) => record.status === "Approved",
                      ).length,
                      "arrow",
                    ],
                    ["Outstanding transfers", 1, "activity"],
                  ].map(([label, value, icon]) => (
                    <button key={String(label)}>
                      <span>
                        <Icon name={icon as IconName} size={17} />
                      </span>
                      <small>{label}</small>
                      <strong>{value}</strong>
                    </button>
                  ))}
                </div>
              )}
              {["Inventory", "Service Requests"].includes(active) && (
                <EquipmentOverview
                  db={db}
                  context={active === "Inventory" ? "inventory" : "service"}
                  onOpen={(record) => openEquipment(record, active)}
                />
              )}
              {active === "Supply Requests" && (
                <StockUtilization
                  db={db}
                  people={
                    worker
                      ? [owner]
                      : [...new Set([...Object.keys(db.custody || {}), ...Object.keys(db.issuedAt || {})])]
                  }
                  title={worker ? "My materials" : "Stock utilization by staff"}
                  onRequest={requestSupply}
                />
              )}
              {!mobile && !worker && ["Inventory", "Issuance & Returns", "Stock Transactions"].includes(active) && (
                <InventoryCustody db={db} compact={active === "Inventory"} />
              )}
              <div className="ops-toolbar">
                <label className="ops-search">
                  <Icon name="search" size={17} />
                  <input
                    aria-label={`Search ${active}`}
                    placeholder={`Search ${active.toLowerCase()}…`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                {mobile && (
                  <div className="m-chips" role="tablist">
                    {[
                      "All",
                      ...new Set(
                        (db.records[source] || []).map((r) =>
                          source === "Inventory" ? r.category : r.status,
                        ),
                      ),
                    ].map((s2) => (
                      <button key={s2} className={filter === s2 ? "selected" : ""} onClick={() => setFilter(s2)}>
                        {s2 === "Pending review" ? "Awaiting review" : s2}
                      </button>
                    ))}
                  </div>
                )}
                <select
                  className="m-hide"
                  aria-label={
                    source === "Inventory" ? "Filter category" : "Filter status"
                  }
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  {[
                    "All",
                    ...new Set(
                      (db.records[source] || []).map((r) =>
                        source === "Inventory" ? r.category : r.status,
                      ),
                    ),
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                {active === "Tasks" && (
                  <div className="ops-view-switch" aria-label="Task view">
                    <button
                      className={taskView === "list" ? "selected" : ""}
                      onClick={() => setTaskView("list")}
                    >
                      <Icon name="tasks" size={15} /> List
                    </button>
                    <button
                      className={taskView === "board" ? "selected" : ""}
                      onClick={() => setTaskView("board")}
                    >
                      <Icon name="grid" size={15} /> Board
                    </button>
                    <button
                      className={taskView === "calendar" ? "selected" : ""}
                      onClick={() => setTaskView("calendar")}
                    >
                      <Icon name="calendar" size={15} /> Calendar
                    </button>
                    <button
                      className={taskView === "timeline" ? "selected" : ""}
                      onClick={() => setTaskView("timeline")}
                    >
                      <Icon name="clock" size={15} /> Timeline
                    </button>
                  </div>
                )}
                <span>{records.length} records</span>
              </div>
              {active === "Tasks" && taskView === "board" ? (
                <div className="ops-kanban">
                  {["Unassigned", "Assigned", "In progress", "Pending confirmation", "Closed"].map(
                    (status) => {
                      const column = records.filter(
                        (record) =>
                          record.status === status ||
                          (status === "Assigned" &&
                            record.status === "Returned") ||
                          (status === "Pending confirmation" &&
                            record.status === "Pending review") ||
                          (status === "Closed" &&
                            record.status === "Completed"),
                      )
                      return (
                        <section className="ops-kanban-column" key={status}>
                          <header>
                            <span
                              className={`kanban-dot ${status.toLowerCase().replace(" ", "-")}`}
                            />
                            <strong>{status}</strong>
                            <b>{column.length}</b>
                          </header>
                          <div>
                            {column.map((record) => (
                              <button
                                className="ops-kanban-card"
                                key={record.id}
                                onClick={() => open(record)}
                              >
                                <span className="ops-tag">
                                  {record.priority}
                                </span>
                                {record.status === "Returned" && (
                                  <span className="task-overdue-flag">Returned for correction</span>
                                )}
                                {!["Completed", "Closed", "Pending review"].includes(record.status) &&
                                  new Date(record.due).getTime() <
                                    Date.now() && (
                                    <span className="task-overdue-flag">
                                      <Icon name="clock" size={12} /> Overdue
                                    </span>
                                  )}
                                <strong>{record.title}</strong>
                                <small>
                                  <Icon name="building" size={13} />
                                  {record.location}
                                </small>
                                <dl className="task-card-meta">
                                  <div>
                                    <dt>Assigned to</dt>
                                    <dd>
                                      {record.assignedStaff?.length
                                        ? record.assignedStaff.join(", ")
                                        : record.status === "Unassigned"
                                          ? "Not assigned"
                                          : record.assignee}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Created</dt>
                                    <dd>
                                      {formatTaskDate(record.createdAt)}
                                      {" · "}
                                      {record.createdBy || "Faisal Alharbi"}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Due</dt>
                                    <dd>{formatTaskDate(record.due)}</dd>
                                  </div>
                                  <div>
                                    <dt>Schedule</dt>
                                    <dd>
                                      <span
                                        className={`task-recur ${(record.recurrence || "One-time") === "One-time" ? "" : "on"}`}
                                      >
                                        <Icon name="clock" size={11} />
                                        {(record.recurrence || "One-time") ===
                                        "One-time"
                                          ? "One-time task"
                                          : `Recurring · ${record.recurrence}`}
                                      </span>
                                    </dd>
                                  </div>
                                </dl>
                                <div className="task-card-footer">
                                  <span>
                                    {record.answers.length}/
                                    {record.checklist.length}
                                    checklist
                                  </span>
                                  <b>{record.duration} min</b>
                                </div>
                              </button>
                            ))}
                            {!column.length && <p>No tasks in this stage</p>}
                          </div>
                        </section>
                      )
                    },
                  )}
                </div>
              ) : active === "Tasks" &&
                (taskView === "calendar" || taskView === "timeline") ? (
                <div className={`task-schedule-view ${taskView}`}>
                  <header>
                    <strong>
                      {taskView === "calendar"
                        ? "Today · Morning shift"
                        : "Worker schedule timeline"}
                    </strong>
                    <span>07:00</span>
                    <span>09:00</span>
                    <span>11:00</span>
                    <span>13:00</span>
                    <span>15:00</span>
                  </header>
                  {records.map((record, index) => (
                    <button key={record.id} onClick={() => open(record)}>
                      <div>
                        <strong>{record.title}</strong>
                        <small>
                          {record.assignee} · {record.location}
                        </small>
                      </div>
                      <span
                        className={record.status
                          .toLowerCase()
                          .replace(" ", "-")}
                        style={{
                          marginLeft: `${Math.min(52, index * 8)}%`,
                          width: `${Math.max(18, record.duration / 1.5)}%`,
                        }}
                      >
                        {record.plannedStart} · {record.duration}m
                      </span>
                    </button>
                  ))}
                </div>
              ) : mobile ? (
                <div className="m-cards">
                  {records.map((r) => {
                    const overdue =
                      source === "Tasks" &&
                      !["Completed", "Closed", "Pending review"].includes(r.status) &&
                      new Date(r.due).getTime() < Date.now()
                    const tone = source === "Inventory" && r.quantity < r.minimum ? "bad" :
                      ["Completed", "Closed", "Available", "Covered", "Acknowledged", "Issued", "Posted"].includes(r.status)
                        ? "ok"
                        : ["Returned", "Rejected", "Out of Service", "Understaffed"].includes(r.status) || overdue
                          ? "bad"
                          : ["Pending review", "Submitted", "Open", "In progress", "In Progress"].includes(r.status)
                            ? "warn"
                            : ""
                    return (
                      <button key={r.id} className="m-card" onClick={() => open(r)}>
                        <div className="m-card-top">
                          <span className={`m-pill ${tone}`}>
                            {active === "Inventory" && r.quantity < r.minimum ? "Low stock" : r.status === "Pending review" ? "Awaiting review" : r.status}
                          </span>
                          {r.priority !== "Normal" && ["Tasks", "Service Requests"].includes(source) && (
                            <span className={`m-pill ${r.priority === "Urgent" ? "bad" : "warn"}`}>{r.priority}</span>
                          )}
                          {overdue && <span className="m-pill bad">Overdue</span>}
                        </div>
                        <strong>{r.title || "Untitled"}</strong>
                        <div className="m-card-meta">
                          {source === "Inventory" ? (
                            <>
                              <span><Icon name="box" size={14} /> {r.quantity} on hand · min {r.minimum}</span>
                              <span>{r.category}</span>
                            </>
                          ) : (
                            <>
                              {r.location && <span><Icon name="building" size={14} /> {r.location}</span>}
                              {r.assignee && <span><Icon name="people" size={14} /> {r.assignee}</span>}
                              {source === "Tasks" && (
                                <span><Icon name="clock" size={14} /> Due {formatTaskDate(r.due)}</span>
                              )}
                              {source === "Service Requests" && (
                                <span><Icon name="clock" size={14} /> SLA {new Date(r.sla).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              )}
                            </>
                          )}
                        </div>
                        {source === "Tasks" && (
                          <div className="m-card-foot">
                            <div className="m-progress">
                              <i style={{ width: `${r.checklist.length ? (r.answers.length / r.checklist.length) * 100 : 0}%` }} />
                            </div>
                            <small>
                              {r.answers.length}/{r.checklist.length} · {(r.recurrence || "One-time") === "One-time" ? "One-time" : r.recurrence}
                            </small>
                          </div>
                        )}
                        <Icon name="chevron" size={16} />
                      </button>
                    )
                  })}
                  {!records.length && (
                    <div className="m-empty">
                      <span><Icon name="search" size={22} /></span>
                      <strong>Nothing here yet</strong>
                      <small>Try another filter or add a new record.</small>
                    </div>
                  )}
                </div>
              ) : (
                <div className="ops-table-wrap">
                  <table className="ops-table">
                    <thead>
                      <tr>
                        <th>
                          {active === "Inventory"
                            ? "Supply item"
                            : "Name / description"}
                        </th>
                        <th>Location</th>
                        <th>
                          {active === "Inventory"
                            ? "Available / minimum"
                            : "Assigned to"}
                        </th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.id} onClick={() => open(r)}>
                          <td>
                            <strong>{r.title}</strong>
                            <small>
                              {active === "Inventory"
                                ? `${r.category} · ${r.notes.split("·")[0]}`
                                : active === "Service Requests"
                                  ? `${r.requester} · SLA ${new Date(
                                      r.sla,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}`
                                  : active === "Locations"
                                    ? r.code
                                    : r.priority === "Urgent"
                                      ? "Urgent priority"
                                      : r.notes.split("\n")[0]}
                            </small>
                          </td>
                          <td>{r.location}</td>
                          <td>
                            {active === "Inventory"
                              ? `${r.quantity} / ${r.minimum}`
                              : r.assignee}
                          </td>
                          <td>
                            <span
                              className={`ops-tag ${
                                r.status === "Completed" ||
                                r.status === "Closed"
                                  ? "success"
                                  : ""
                              }`}
                            >
                              {active === "Inventory" && r.quantity < r.minimum
                                ? "Low stock"
                                : r.status}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                open(r)
                              }}
                            >
                              View →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!records.length && (
                    <div className="ops-empty">
                      <h2>No records found</h2>
                      <p>Try another search or add your first record.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
        {mobile && (
          <>
            {(mobileMenu || profileOpen) && (
              <div
                className="m-drawer-backdrop"
                onClick={() => {
                  setMobileMenu(false)
                  setProfileOpen(false)
                }}
              />
            )}
            <aside className={`m-drawer ${mobileMenu || profileOpen ? "open" : ""}`} aria-hidden={!(mobileMenu || profileOpen)}>
              <div className="m-drawer-head">
                <img src="/kfmc-logo.png" alt="King Fahad Medical City" />
                <button
                  className="m-icon-btn"
                  aria-label="Close menu"
                  onClick={() => {
                    setMobileMenu(false)
                    setProfileOpen(false)
                  }}
                >
                  ×
                </button>
              </div>
              <div className="m-profile">
                <span>{worker ? initials(owner) : "FA"}</span>
                <div>
                  <strong>{worker ? owner : role === "Storekeeper" ? "Central Store" : "Faisal Al-Harbi"}</strong>
                  <small>{role} · Morning shift</small>
                </div>
              </div>
              <div className="m-sync-row">
                <i className={db.sync.online ? "" : "offline"} />
                {db.sync.online
                  ? db.sync.pending
                    ? `${db.sync.pending} changes waiting to sync`
                    : "Online · all changes saved"
                  : "Offline · changes queued"}
              </div>
              <nav className="m-drawer-nav">
                {(supervisor
                  ? navGroups.map((g) => ({ label: g.label, items: g.items.filter((m) => visibleModules.includes(m) || m === "Dashboard") }))
                  : [{ label: "My work", items: ["Dashboard", ...visibleModules] }]
                )
                  .filter((g) => g.items.length)
                  .map((group) => (
                    <div key={group.label}>
                      <small>{group.label}</small>
                      {group.items.map((module) => (
                        <button
                          key={module}
                          className={active === module ? "selected" : ""}
                          onClick={() => {
                            setActive(module)
                            setMobileMenu(false)
                            setProfileOpen(false)
                          }}
                        >
                          <Icon name={symbols[module] || "grid"} size={18} />
                          <span>{module === "Dashboard" ? (worker ? "Home" : "Overview") : moduleLabels[module] || module}</span>
                          {module === "Photo Review" && pending.length > 0 && <b>{pending.length}</b>}
                        </button>
                      ))}
                    </div>
                  ))}
              </nav>
              <div className="m-drawer-foot">
                <label>
                  <Icon name="people" size={18} />
                  <span>Demo role</span>
                  <select
                    value={role}
                    onChange={(event) => {
                      setMobileMenu(false)
                      setProfileOpen(false)
                      onRoleChange(event.target.value)
                    }}
                  >
                    {["Supervisor", "Operations Manager", "Storekeeper", "Cleaner", "Guard", "QBS Admin"].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <button
                  className="m-signout"
                  onClick={() =>
                    requestConfirmation(
                      "Sign out?",
                      "You’ll return to the KFMC mobile sign-in screen.",
                      onSignOut,
                      "Sign out",
                    )
                  }
                >
                  <Icon name="logout" size={18} />
                  <span>Sign out</span>
                </button>
                <button className="m-web-switch" onClick={() => onSwitch("web")}>
                  <Icon name="monitor" size={18} />
                  <span>Switch to web workspace</span>
                </button>
              </div>
            </aside>
            <nav className="m-tabbar" aria-label="Primary">
              {(() => {
                const items: [string, string, IconName][] =
                  role === "Storekeeper"
                    ? [
                        ["Dashboard", "Home", "home"],
                        ["Inventory", "Stock", "box"],
                        ["Supply Requests", "Approvals", "clipboard"],
                        ["Stock Transactions", "Ledger", "report"],
                      ]
                    : supervisor
                  ? [
                      ["Dashboard", "Home", "home"],
                      ["Shift Planning", "Team", "people"],
                      ["Tasks", "Tasks", "tasks"],
                      ["Service Requests", "Requests", "bell"],
                    ]
                  : [
                      ["Dashboard", "Home", "home"],
                      ["Tasks", "My Tasks", "tasks"],
                      ["__scan", "Scan", "scan"],
                      role === "Guard" ? ["Patrols", "Patrols", "shield"] : ["Supply Requests", "Supplies", "box"],
                    ]
                return [...items, ["__more", "More", "menu"] as [string, string, IconName]].map(([module, label, icon]) =>
                  module === "__scan" ? (
                    <button key={module} className="m-tab m-scan" onClick={() => setScannerOpen(true)} aria-label="Scan QR code">
                      <span>
                        <Icon name="scan" size={24} />
                      </span>
                      <b>{label}</b>
                    </button>
                  ) : (
                    <button
                      key={module}
                      className={`m-tab ${(module === "__more" ? mobileMenu : active === module && !mobileMenu) ? "selected" : ""}`}
                      onClick={() => {
                        setProfileOpen(false)
                        if (module === "__more") return setMobileMenu(!mobileMenu)
                        setActive(module)
                        setMobileMenu(false)
                      }}
                    >
                      <span>
                        <Icon name={icon} size={21} />
                      </span>
                      <b>{label}</b>
                    </button>
                  ),
                )
              })()}
            </nav>
          </>
        )}
      </div>
      {selected && (
        <div className="ops-modal-backdrop" onClick={() => setSelected(null)}>
          <section
            className="ops-modal"
            role="dialog"
            aria-modal="true"
            aria-label={editing ? "Edit record" : selected.title}
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <div>
                <span className="eyebrow">{active}</span>
                <h2>
                  {editing
                    ? selected.title ||
                      `New ${recordNames[source] || "record"}`
                    : selected.title}
                </h2>
              </div>
              <button
                aria-label="Close dialog"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            </header>
            {editing ? (
              <form onSubmit={save} className="ops-form">
                <label>
                  {source === "Inventory"
                    ? "Item name"
                    : source === "Staff & Roster"
                      ? "Staff name"
                      : source === "Checklists"
                        ? "Template name"
                        : source === "Service Requests"
                          ? "Request summary"
                          : source === "Locations"
                            ? "Location name"
                            : source === "Supply Requests"
                              ? "Item requested"
                              : "Name / title"}
                  {source === "Supply Requests" ? (
                    <select
                      required
                      value={selected.title}
                      onChange={(e) => {
                        const stock = db.records.Inventory.find((i) => i.title === e.target.value)
                        setSelected({ ...selected, title: e.target.value, unit: stock?.unit || selected.unit })
                      }}
                    >
                      <option value="">Select inventory item</option>
                      {db.records.Inventory.map((stock) => (
                        <option key={stock.id} value={stock.title}>
                          {stock.title}
                          {stock.usageDays ? ` · ${stock.usageDays}-day usage` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      required
                      value={selected.title}
                      onChange={(e) => patch("title", e.target.value)}
                    />
                  )}
                </label>
                {source === "Supply Requests" &&
                  selected.title &&
                  !db.records["Supply Requests"].some((r) => r.id === selected.id) &&
                  (() => {
                    const use = utilization(db, selected.assignee, selected.title)
                    const duplicate = db.records["Supply Requests"].some(
                      (r) =>
                        r.assignee === selected.assignee &&
                        r.title === selected.title &&
                        ["Submitted", "Approved"].includes(r.status),
                    )
                    return (
                      <div className={`usage-hint ${use.locked || duplicate ? "locked" : "open"}`} role="status">
                        <Icon name={use.locked || duplicate ? "clock" : "check"} size={16} />
                        <span>
                          {duplicate
                            ? `${selected.assignee} already has an open request for this item.`
                            : !use.days
                            ? "No usage period on this item · request can be submitted."
                            : use.locked
                              ? `Last issued ${new Date(use.issuedAt || "").toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · ${use.days}-day usage period · request opens in ${untilText(use.availableAt)}.${worker ? "" : " Submitting needs an override reason."}`
                              : `${use.days}-day usage period${use.issuedAt ? " has passed since the last issue" : " · no previous issue"} · request can be submitted.`}
                        </span>
                      </div>
                    )
                  })()}
                {[
                  "Tasks",
                  "Service Requests",
                  "Incidents",
                  "Patrols",
                  "Supply Requests",
                  "Handover",
                  "Equipment",
                ].includes(source) && (
                <div className="ops-form-grid">
                  <label>
                    Location
                    <select
                      value={selected.location}
                      onChange={(e) => {
                        const loc = db.records.Locations.find(
                          (r) => r.title === e.target.value,
                        )
                        setSelected({
                          ...selected,
                          location: e.target.value,
                          code: loc?.code || selected.code,
                        })
                      }}
                    >
                      {db.records.Locations.map((l) => (
                        <option key={l.id}>{l.title}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Assigned to
                    <select
                      disabled={worker}
                      value={selected.assignee}
                      onChange={(e) => patch("assignee", e.target.value)}
                    >
                      {db.records["Staff & Roster"].map((s) => (
                        <option key={s.id}>{s.title}</option>
                      ))}
                    </select>
                  </label>
                </div>
                )}
                {source === "Staff & Roster" && (
                  <>
                    <div className="ops-form-grid">
                      <label>
                        Employee ID
                        <input
                          required
                          value={selected.code}
                          onChange={(e) => patch("code", e.target.value)}
                        />
                      </label>
                      <label>
                        Staff category
                        <select
                          value={selected.category}
                          onChange={(e) => patch("category", e.target.value)}
                        >
                          {[
                            "Cleaner",
                            "Guard",
                            "Supervisor",
                            "Operations Manager",
                            "Storekeeper",
                            "QBS Admin",
                          ].map((category) => (
                            <option key={category}>{category}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="ops-form-grid">
                      <label>
                        Department
                        <input
                          required
                          value={selected.department}
                          onChange={(e) => patch("department", e.target.value)}
                        />
                      </label>
                      <label>
                        Default shift
                        <select
                          value={selected.location}
                          onChange={(e) => patch("location", e.target.value)}
                        >
                          {[
                            ...new Set([
                              ...db.records.Shifts.filter((shift) => shift.status !== "Inactive").map(
                                (shift) => `${shift.title} · ${shift.plannedStart}–${shift.endTime}`,
                              ),
                              selected.location,
                            ]),
                          ].map((shift) => (
                            <option key={shift}>{shift}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="ops-form-grid">
                      <label>
                        Mobile number
                        <input
                          type="tel"
                          placeholder="+966 5x xxx xxxx"
                          value={selected.phone || ""}
                          onChange={(e) => patch("phone", e.target.value)}
                        />
                      </label>
                      <label>
                        Email
                        <input
                          type="email"
                          value={selected.email || ""}
                          onChange={(e) => patch("email", e.target.value)}
                        />
                      </label>
                      <label>
                        Nationality
                        <input
                          value={selected.nationality || ""}
                          onChange={(e) => patch("nationality", e.target.value)}
                        />
                      </label>
                      <label>
                        Employer
                        <OptionSelect
                          value={selected.employer || ""}
                          options={db.records["Staff & Roster"].map((p) => p.employer || "").filter(Boolean)}
                          onChange={(v) => patch("employer", v)}
                        />
                      </label>
                      <label>
                        Joining date
                        <input
                          type="date"
                          value={selected.joinDate || ""}
                          onChange={(e) => patch("joinDate", e.target.value)}
                        />
                      </label>
                      <label>
                        ID / Iqama expiry
                        <input
                          type="date"
                          value={selected.idExpiry || ""}
                          onChange={(e) => patch("idExpiry", e.target.value)}
                        />
                      </label>
                    </div>
                    <label>
                      Availability status
                      <select
                        value={selected.status}
                        onChange={(e) => patch("status", e.target.value)}
                      >
                        {[
                          "Available",
                          "On duty",
                          "On break",
                          "Off duty",
                          "On leave",
                          "Inactive",
                          "Active",
                        ].map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                {source === "Service Requests" && (
                  <div className="ops-form-grid">
                    <label>
                      Requested by
                      <input
                        required
                        value={selected.requester}
                        onChange={(e) => patch("requester", e.target.value)}
                      />
                    </label>
                    <label>
                      Request category
                      <select
                        value={selected.category}
                        onChange={(e) => patch("category", e.target.value)}
                      >
                        {[
                          "Spill response",
                          "Restocking",
                          "Discharge clean",
                          "Complaint",
                          "Equipment support",
                          "Other",
                        ].map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      SLA target
                      <input
                        type="datetime-local"
                        required
                        value={selected.sla.slice(0, 16)}
                        onChange={(e) => patch("sla", e.target.value)}
                      />
                    </label>
                  </div>
                )}
                {source === "Locations" && (
                  <>
                    <div className="ops-form-grid">
                      <label>
                        Building
                        <OptionSelect
                          value={selected.building}
                          options={db.records.Locations.map((l) => l.building)}
                          onChange={(v) => patch("building", v)}
                        />
                      </label>
                      <label>
                        Floor / level
                        <OptionSelect
                          value={selected.floor}
                          options={[...db.records.Locations.filter((l) => !selected.building || l.building === selected.building).map((l) => l.floor), "Basement", "Ground Floor", "Floor 1", "Floor 2", "Floor 3", "Floor 4", "Roof"]}
                          onChange={(v) => patch("floor", v)}
                        />
                      </label>
                    </div>
                    <div className="ops-form-grid">
                      <label>
                        Department
                        <OptionSelect
                          value={selected.department}
                          options={[...db.records.Locations.map((l) => l.department), ...db.records["Staff & Roster"].map((r) => r.department)]}
                          onChange={(v) => patch("department", v)}
                        />
                      </label>
                      <label>
                        Location type
                        <select
                          value={selected.category}
                          onChange={(e) => patch("category", e.target.value)}
                        >
                          {["Campus", "Building", "Floor", "Cleaning zone", "Store", "Service area"].map((type) => (
                            <option key={type}>{type}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </>
                )}
                {source === "Checklists" && (
                  <div className="ops-form-grid">
                    <label>
                      Checklist category
                      <select
                        value={selected.category}
                        onChange={(e) => patch("category", e.target.value)}
                      >
                        {["Ward", "Washroom", "Terminal", "Public area", "Clinical corridor"].map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Estimated minutes
                      <input
                        type="number"
                        min="1"
                        value={selected.duration}
                        onChange={(e) => patch("duration", Number(e.target.value))}
                      />
                    </label>
                  </div>
                )}
                {["Tasks", "Service Requests", "Incidents", "Patrols"].includes(
                  source,
                ) && (
                  <div className="ops-form-grid">
                    <label>
                      Priority
                      <select
                        value={selected.priority}
                        onChange={(e) => patch("priority", e.target.value)}
                      >
                        {["Normal", "High", "Urgent"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Due time
                      <input
                        type="datetime-local"
                        required
                        value={selected.due}
                        onChange={(e) => patch("due", e.target.value)}
                      />
                    </label>
                    {source === "Tasks" && (
                      <label>
                        Recurrence
                        <select
                          value={selected.recurrence || "One-time"}
                          onChange={(e) => patch("recurrence", e.target.value)}
                        >
                          {[
                            "One-time",
                            "Every shift",
                            "Every 2 hours",
                            "Daily",
                            "Weekly",
                            "Monthly",
                          ].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                )}
                {["Inventory", "Supply Requests"].includes(source) && (
                  <div className="ops-form-grid">
                    <label>
                      Quantity
                      <input
                        required
                        type="number"
                        min={source === "Inventory" ? 0 : 1}
                        value={selected.quantity}
                        onChange={(e) =>
                          patch("quantity", Number(e.target.value))
                        }
                      />
                    </label>
                    {source === "Inventory" && (
                      <label>
                        Usage period (days)
                        <input
                          type="number"
                          min="0"
                          value={selected.usageDays || 0}
                          onChange={(e) => patch("usageDays", Number(e.target.value))}
                        />
                        <small className="ops-muted">How long one issue lasts. 0 = no lock on re-requesting.</small>
                      </label>
                    )}
                    {source === "Inventory" && (
                      <label>
                        Reorder minimum
                        <input
                          type="number"
                          min="0"
                          value={selected.minimum}
                          onChange={(e) =>
                            patch("minimum", Number(e.target.value))
                          }
                        />
                      </label>
                    )}
                  </div>
                )}
                {source === "Inventory" && (
                  <div className="ops-form-grid">
                    <label>
                      Category
                      <select
                        value={selected.category}
                        onChange={(e) => patch("category", e.target.value)}
                      >
                        {inventoryCategories.map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Unit of measure
                      <input
                        required
                        value={selected.unit}
                        onChange={(e) => patch("unit", e.target.value)}
                      />
                    </label>
                    <label>
                      Storage location
                      <input
                        required
                        value={selected.location}
                        onChange={(e) => patch("location", e.target.value)}
                      />
                    </label>
                  </div>
                )}
                {source === "Locations" && (
                  <label>
                    Unique location QR code
                    <input
                      required
                      value={selected.code}
                      onChange={(e) => patch("code", e.target.value)}
                    />
                  </label>
                )}
                <label>
                  {source === "Checklists"
                    ? "Checklist items (one per line)"
                    : source === "Staff & Roster"
                      ? "Skills / certifications / notes"
                    : "Instructions / notes"}
                  <textarea
                    value={selected.notes}
                    onChange={(e) => patch("notes", e.target.value)}
                    rows={4}
                  />
                </label>
                {error && (
                  <p className="ops-error" role="alert">
                    {error}
                  </p>
                )}
                <footer>
                  <button type="button" onClick={() => setSelected(null)}>
                    Cancel
                  </button>
                  <button className="ops-primary">
                    Save {recordNames[source] || "record"}
                  </button>
                </footer>
              </form>
            ) : (
              <div className="ops-detail">
                <div className="ops-detail-meta">
                  <span className="ops-tag">{selected.status}</span>
                  <span>{selected.location}</span>
                  <span>{selected.assignee}</span>
                </div>
                <p>{selected.notes || "No additional notes."}</p>
                {source === "Staff & Roster" && (
                  <dl className="person-profile">
                    {[
                      ["Employee ID", selected.code],
                      ["Role", selected.category],
                      ["Department", selected.department],
                      ["Employer", selected.employer],
                      ["Default shift", selected.location],
                      ["Mobile", selected.phone],
                      ["Email", selected.email],
                      ["Nationality", selected.nationality],
                      ["Joined", selected.joinDate],
                      ["ID / Iqama expiry", selected.idExpiry],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {source === "Tasks" && (
                  <>
                    <h3>Sub-tasks</h3>
                    {(selected.reviewFlags?.length || 0) > 0 && (
                      <p className="ops-error">
                        Reviewer flagged {selected.reviewFlags?.length} sub-task
                        {selected.reviewFlags?.length === 1 ? "" : "s"} for correction.
                      </p>
                    )}
                    {selected.checklist.map((checkItem, index) => {
                      const existing = selected.answers.find(
                        (answer) =>
                          answer === checkItem ||
                          answer.startsWith(`${checkItem}|`),
                      )
                      const response = existing?.includes("|")
                        ? existing.split("|")[1]
                        : existing
                          ? "Yes"
                          : ""
                      return mobile ? (
                        <div className="mobile-check-item" key={checkItem}>
                          <span>
                            Sub-task {index + 1} of {selected.checklist.length}
                            {selected.reviewFlags?.includes(checkItem) && <b className="subtask-flag"> · Flagged by reviewer</b>}
                          </span>
                          <strong>{checkItem}</strong>
                          <div>
                            {["Yes", "No", "N/A"].map((answer) => (
                              <button
                                className={
                                  response === answer ? "selected" : ""
                                }
                                disabled={
                                  !["In progress", "Returned"].includes(
                                    selected.status,
                                  )
                                }
                                key={answer}
                                onClick={() =>
                                  setSelected({
                                    ...selected,
                                    answers: [
                                      ...selected.answers.filter(
                                        (value) =>
                                          value !== checkItem &&
                                          !value.startsWith(`${checkItem}|`),
                                      ),
                                      `${checkItem}|${answer}`,
                                    ],
                                  })
                                }
                              >
                                {answer}
                              </button>
                            ))}
                          </div>
                          {(response === "No" || response === "N/A") && (
                            <label className="check-remark">
                              Remarks {response === "No" ? "(what is outstanding?)" : "(why not applicable?)"}
                              <textarea
                                rows={2}
                                placeholder={response === "No" ? "e.g. Soap dispenser broken, reported to maintenance" : "e.g. Area closed for maintenance"}
                                value={existing?.split("|").slice(2).join("|") || ""}
                                disabled={!["In progress", "Returned"].includes(selected.status)}
                                onChange={(e) =>
                                  setSelected({
                                    ...selected,
                                    answers: selected.answers.map((value) =>
                                      value.startsWith(`${checkItem}|`)
                                        ? `${checkItem}|${response}|${e.target.value.replace(/\|/g, "/")}`
                                        : value,
                                    ),
                                  })
                                }
                              />
                            </label>
                          )}
                        </div>
                      ) : (
                        <label className="ops-check" key={checkItem}>
                          <input
                            type="checkbox"
                            disabled={
                              !["In progress", "Returned"].includes(
                                selected.status,
                              )
                            }
                            checked={Boolean(existing)}
                            onChange={(event) =>
                              setSelected({
                                ...selected,
                                answers: event.target.checked
                                  ? [...selected.answers, checkItem]
                                  : selected.answers.filter(
                                      (answer) => answer !== checkItem,
                                    ),
                              })
                            }
                          />
                          {checkItem}
                          {selected.reviewFlags?.includes(checkItem) && <b className="subtask-flag">Flagged</b>}
                          {response && response !== "Yes" && (
                            <em className="check-remark-view">
                              {response}
                              {existing?.split("|")[2] ? ` · ${existing.split("|").slice(2).join("|")}` : ""}
                            </em>
                          )}
                        </label>
                      )
                    })}
                    {["Assigned", "Returned"].includes(selected.status) && (
                      <label className="ops-field">
                        Location QR code
                        <span className="ops-code-entry">
                          <input
                            placeholder={selected.code}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                          />
                          <button onClick={() => setScannerOpen(true)}>
                            <Icon name="scan" size={17} /> Scan
                          </button>
                        </span>
                        <small>
                          Scan the printed code or enter it manually.
                        </small>
                      </label>
                    )}
                    {["Assigned", "Returned"].includes(selected.status) && (
                      <label className="ops-field">
                        Supervisor-authorised QR override
                        <input
                          placeholder="Reason, e.g. QR label damaged · approved by F. Al-Harbi"
                          value={override}
                          onChange={(e) => setOverride(e.target.value)}
                        />
                        <small>Only used when the code cannot be scanned. The reason is logged on the task.</small>
                      </label>
                    )}
                  </>
                )}
                {source === "Tasks" && selected.materials.length > 0 && (
                  <>
                    <h3>Material usage</h3>
                    <div className="task-materials">
                      {selected.materials.map((material, index) => (
                        <label key={material.item}>
                          <div>
                            <strong>{material.item}</strong>
                            <small>
                              {material.issued} issued to your custody
                            </small>
                          </div>
                          <input
                            aria-label={`${material.item} quantity used`}
                            type="number"
                            min="0"
                            max={material.issued}
                            value={material.used}
                            onChange={(event) =>
                              setSelected({
                                ...selected,
                                materials: selected.materials.map(
                                  (entry, materialIndex) =>
                                    materialIndex === index
                                      ? {
                                          ...entry,
                                          used: Number(event.target.value),
                                        }
                                      : entry,
                                ),
                              })
                            }
                          />
                          <span>used</span>
                        </label>
                      ))}
                    </div>
                    <p className="ops-muted">
                      Issued stock was posted once to your custody balance.
                      Actual usage and returns reconcile that balance without a
                      second stock deduction.
                    </p>
                  </>
                )}
                {["Tasks", "Incidents"].includes(source) && (
                  <>
                    <h3>{source === "Tasks" ? "Task photo evidence" : "Photo evidence"}</h3>
                    <p className="ops-muted">
                      {source === "Tasks" && "One set of photos covers the whole task and all its sub-tasks. "}
                      Do not include patients or identifying information.
                      {selected.evidenceRequired
                        ? " Evidence is required for this task."
                        : " Evidence is optional unless an exception is reported."}{" "}
                      Maximum 5 images, 2 MB each.
                    </p>
                    <div className="ops-photo-grid">
                      {selected.photos.map((p, i) => (
                        <img key={i} src={p} alt={`Evidence ${i + 1}`} />
                      ))}
                    </div>
                    {!["Completed", "Closed"].includes(selected.status) && (
                      <label className="ops-upload">
                        + Add evidence photo
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) =>
                            photos(e.target.files).catch(() =>
                              setError(
                                "Unable to read image. Please try again.",
                              ),
                            )
                          }
                        />
                      </label>
                    )}
                  </>
                )}
                {source === "Patrols" && (
                  <>
                    <h3>Checkpoint route</h3>
                    {selected.checklist.map((c) => (
                      <div className="ops-activity" key={c}>
                        {selected.answers.includes(c) ? "Verified" : "Waiting"}{" "}
                        · {c}
                      </div>
                    ))}
                    {selected.status !== "Completed" && (
                      <>
                        <div className="ops-code-entry">
                          <input
                            aria-label="Checkpoint code"
                            placeholder="Enter checkpoint code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                          />
                          <button onClick={() => setScannerOpen(true)}>
                            <Icon name="scan" size={17} /> Scan
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            if (!selected.checklist.includes(code))
                              return setError(
                                "This checkpoint is not on this route.",
                              )
                            update(
                              {
                                ...selected,
                                status: "In progress",
                                answers: [
                                  ...new Set([...selected.answers, code]),
                                ],
                              },
                              `Checkpoint ${code} verified`,
                            )
                            setCode("")
                          }}
                        >
                          Verify checkpoint
                        </button>
                        {selected.answers.length ===
                          selected.checklist.length && (
                          <button
                            className="ops-primary"
                            onClick={() => transition("Completed")}
                          >
                            End patrol
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
                {source === "Inventory" && (
                  <>
                    <h3>{selected.quantity} units available</h3>
                    <p>
                      Minimum stock: {selected.minimum}. Stock is count-based,
                      with no pricing.{" "}
                      {selected.usageDays
                        ? `Usage period: ${selected.usageDays} day${selected.usageDays === 1 ? "" : "s"} — a holder can request this item again only after that period since their last issue.`
                        : "No usage period — holders can request again at any time."}
                    </p>
                    <h3>Who holds this item</h3>
                    <div className="custody-mini">
                      {Object.entries(db.custody || {})
                        .map(([person, items]) => [person, items[selected.title] || 0] as const)
                        .filter(([, n]) => n > 0)
                        .map(([person, n]) => (
                          <div key={person}>
                            <span>{initials(person)}</span>
                            <strong>
                              {person}
                              {(() => {
                                const use = utilization(db, person, selected.title)
                                return use.locked ? (
                                  <small className="ops-muted"> · re-request in {untilText(use.availableAt)}</small>
                                ) : null
                              })()}
                            </strong>
                            <b>
                              {n} {selected.unit}
                            </b>
                          </div>
                        ))}
                      {!Object.values(db.custody || {}).some((items) => (items[selected.title] || 0) > 0) && (
                        <p className="ops-muted">Not currently issued to any staff member.</p>
                      )}
                    </div>
                    {!worker && (
                      <div className="issue-form">
                        <div className="issue-tabs">
                          {["Issue", "Receive"].map((m) => (
                            <button key={m} className={stockMode === m ? "selected" : ""} onClick={() => setStockMode(m)}>
                              {m === "Issue" ? "Issue to staff" : "Receive stock"}
                            </button>
                          ))}
                        </div>
                        {stockMode === "Issue" ? (
                          <div className="ops-form-grid">
                            <label>
                              Issue to
                              <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                                <option value="">Select staff member</option>
                                {eligibleStaff.map((p2) => (
                                  <option key={p2.id} value={p2.title}>
                                    {p2.title} · {p2.notes.split("·")[1]?.trim() || p2.notes}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Zone / task
                              <select value={issueZone} onChange={(e) => setIssueZone(e.target.value)}>
                                <option value="">Select zone or task</option>
                                {tasks
                                  .filter((t) => (!assignTo || t.assignee === assignTo) && !["Completed", "Closed"].includes(t.status))
                                  .map((t) => (
                                    <option key={t.id} value={`task:${t.id}`}>
                                      Task · {t.title}
                                    </option>
                                  ))}
                                {db.records.Locations.map((l) => (
                                  <option key={l.id} value={l.title}>
                                    Zone · {l.title}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Quantity ({selected.unit})
                              <input type="number" min="1" value={code} onChange={(e) => setCode(e.target.value)} />
                            </label>
                            <label>
                              Purpose / reference
                              <input placeholder="e.g. Morning ward cart top-up" value={reason} onChange={(e) => setReason(e.target.value)} />
                            </label>
                          </div>
                        ) : (
                          <div className="ops-form-grid">
                            <label>
                              Quantity received
                              <input type="number" min="1" value={code} onChange={(e) => setCode(e.target.value)} />
                            </label>
                            <label>
                              PO / delivery note
                              <input placeholder="e.g. PO-44910" value={reason} onChange={(e) => setReason(e.target.value)} />
                            </label>
                          </div>
                        )}
                        <button className="ops-primary" onClick={postStockMovement}>
                          {stockMode === "Issue" ? "Post issue to custody" : "Post receipt"}
                        </button>
                      </div>
                    )}
                  </>
                )}
                {source === "Tasks" && supervisor && !["Completed", "Closed"].includes(selected.status) && (
                  <div className="ops-reassign">
                    <h3>{selected.status === "Unassigned" ? "Assign worker" : "Reassign task"}</h3>
                    <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} aria-label="Replacement worker">
                      <option value="">Select eligible worker</option>
                      {eligibleStaff.map((person) => (
                        <option key={person.id} value={person.title}>
                          {person.title} · {workload(person.title)} open tasks · {person.status}
                        </option>
                      ))}
                    </select>
                    <input placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
                    <button onClick={reassign}>
                      <Icon name="people" size={15} /> Confirm & notify
                    </button>
                  </div>
                )}
                {source === "Service Requests" && selected.status === "Open" && supervisor && (
                  <div className="ops-reassign">
                    <h3>Dispatch to available worker</h3>
                    <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} aria-label="Dispatch worker">
                      <option value="">Auto-select ({eligibleStaff[0]?.title || "none available"})</option>
                      {eligibleStaff.map((person) => (
                        <option key={person.id} value={person.title}>
                          {person.title} · {workload(person.title)} open tasks · {person.status}
                        </option>
                      ))}
                    </select>
                    <p className="ops-muted">
                      SLA target {new Date(selected.sla).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {new Date(selected.sla).getTime() < Date.now() ? " · breached" : new Date(selected.sla).getTime() - Date.now() < 30 * 60000 ? " · approaching" : ""}
                    </p>
                  </div>
                )}
                {selected.history && selected.history.length > 0 && (
                  <>
                    <h3>Activity history</h3>
                    <div className="record-history">
                      {selected.history.map((h, i) => (
                        <div key={i}>{h}</div>
                      ))}
                    </div>
                  </>
                )}
                {error && (
                  <p className="ops-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="ops-actions">
                  {source === "Tasks" && (
                    <>
                      {["Assigned", "Returned"].includes(selected.status) && (
                        <button
                          className="ops-primary"
                          onClick={() => transition("In progress")}
                        >
                          Verify & start task
                        </button>
                      )}
                      {selected.status === "In progress" && (
                        <button
                          className="ops-primary"
                          onClick={() => transition("Pending review")}
                        >
                          Submit for review
                        </button>
                      )}
                      {selected.status === "Pending review" && supervisor && (
                        <>
                          <button
                            className="ops-primary"
                            onClick={() => transition("Completed")}
                          >
                            Accept completion
                          </button>
                          <input
                            aria-label="Return reason"
                            placeholder="Reason for returning"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          />
                          <button onClick={() => transition("Returned")}>
                            Reject & return
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {source === "Tasks" && selected.status === "Completed" && supervisor && (
                    <button onClick={() => transition("Closed")}>Close task</button>
                  )}
                  {source === "Service Requests" &&
                    selected.status === "Open" &&
                    supervisor && (
                      <button className="ops-primary" onClick={dispatch}>
                        Dispatch & notify worker
                      </button>
                    )}
                  {source === "Service Requests" &&
                    supervisor &&
                    selected.status === "Completed" && (
                      <button
                        onClick={() => {
                          const linked = tasks.find((t) =>
                            selected.notes.includes(t.id),
                          )
                          if (!["Completed", "Closed"].includes(linked?.status || ""))
                            return setError(
                              "Confirm the linked task before closing this request.",
                            )
                          transition("Closed")
                        }}
                      >
                        Close request
                      </button>
                    )}
                  {source === "Incidents" && supervisor && (
                    <>
                      {selected.status === "Reported" && (
                        <button onClick={() => transition("Acknowledged")}>
                          Acknowledge
                        </button>
                      )}
                      {selected.status === "Acknowledged" && (
                        <button onClick={() => transition("Closed")}>
                          Close with evidence
                        </button>
                      )}
                    </>
                  )}
                  {source === "Supply Requests" && !worker && (
                    <>
                      {selected.status === "Submitted" && (
                        <button onClick={() => transition("Approved")}>
                          Approve request
                        </button>
                      )}
                      {selected.status === "Submitted" && (
                        <button onClick={() => transition("Rejected")}>Reject</button>
                      )}
                      {selected.status === "Approved" && (
                        <button className="ops-primary" onClick={issue}>
                          Issue from stock
                        </button>
                      )}
                    </>
                  )}
                  {source === "Supply Requests" && worker && ["Issued", "Partially issued"].includes(selected.status) && (
                    <button className="ops-primary" onClick={() => transition("Acknowledged")}>
                      Acknowledge receipt
                    </button>
                  )}
                  {source === "Equipment" && !worker && (
                    <>
                      {["Available", "In Use", "Out of Service"]
                        .filter((s2) => s2.toLowerCase() !== selected.status.toLowerCase())
                        .map((s2) => (
                          <button
                            key={s2}
                            onClick={() => {
                              if (s2 === "Out of Service" && !reason.trim())
                                return setError("Describe the fault before marking out of service.")
                              transition(s2)
                            }}
                          >
                            Mark {s2}
                          </button>
                        ))}
                      <input placeholder="Fault description / note" value={reason} onChange={(e) => setReason(e.target.value)} />
                    </>
                  )}
                  {source === "Handover" && (
                    <>
                      {selected.status === "Draft" && (
                        <button
                          onClick={() =>
                            {
                              const scope = worker ? ownTasks : tasks
                              const open = scope.filter((t) => !["Completed", "Closed"].includes(t.status))
                              const requests = db.records["Service Requests"].filter((r) => r.status !== "Closed")
                              const held = Object.entries((db.custody || {})[worker ? owner : ""] || {}).filter(([, n]) => n > 0)
                              const equipment = db.records.Equipment.filter((e) => e.status.toLowerCase() !== "available")
                              const summary = [
                                `Incomplete tasks (${open.length}): ${open.map((t) => `${t.title} [${t.status}]`).join("; ") || "none"}`,
                                `Open requests (${requests.length}): ${requests.map((r) => r.title).join("; ") || "none"}`,
                                worker ? `Materials in custody: ${held.map(([k, n]) => `${n} ${k}`).join("; ") || "none"}` : `Outstanding supplies: ${db.records["Supply Requests"].filter((r) => ["Submitted", "Approved"].includes(r.status)).length} pending`,
                                `Equipment not available: ${equipment.map((e) => `${e.title} (${e.status})`).join("; ") || "none"}`,
                              ].join("\n")
                              const record = withHistory(
                                { ...selected, status: "Submitted", notes: `${selected.notes}\n${summary}` },
                                `Submitted by ${worker ? owner : role}`,
                              )
                              const next = notify(
                                {
                                  ...db,
                                  records: {
                                    ...db.records,
                                    Handover: db.records.Handover.map((h) => (h.id === record.id ? record : h)),
                                  },
                                },
                                "Supervisors",
                                `Handover submitted: ${record.title}`,
                                "Handover",
                                record.id,
                              )
                              if (commit(next, "Handover submitted")) setSelected(record)
                            }
                          }
                        >
                          Submit handover
                        </button>
                      )}
                      {selected.status === "Submitted" && supervisor && (
                        <button onClick={() => transition("Acknowledged")}>
                          Acknowledge handover
                        </button>
                      )}
                      {selected.status === "Acknowledged" && supervisor && (
                        <button className="ops-primary" onClick={() => transition("Closed")}>
                          Accept responsibility
                        </button>
                      )}
                    </>
                  )}
                  {(!worker ||
                    [
                      "Service Requests",
                      "Supply Requests",
                      "Handover",
                      "Incidents",
                    ].includes(source)) && (
                    <button onClick={() => setEditing(true)}>
                      Edit record
                    </button>
                  )}
                  {canManage && (
                    <>
                      <button onClick={() => transition("Inactive")}>
                        Deactivate
                      </button>
                      {(source !== "Incidents" || role === "QBS Admin") && (
                        <button className="ops-danger" onClick={remove}>
                          Delete
                        </button>
                      )}
                    </>
                  )}
                  {["Tasks", "Incidents"].includes(source) && (
                    <button
                      onClick={() => update(selected, "Draft progress saved")}
                    >
                      Save progress
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
      {actionPrompt && (
        <div
          className="ops-prompt-backdrop"
          role="presentation"
          onClick={closePrompt}
        >
          <section
            className="ops-prompt"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ops-prompt-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className={actionPrompt.destructive ? "danger" : ""}>
              <Icon
                name={actionPrompt.destructive ? "alert" : "check"}
                size={22}
              />
            </span>
            <h2 id="ops-prompt-title">{actionPrompt.title}</h2>
            <p>{actionPrompt.message}</p>
            {actionPrompt.inputLabel && (
              <label className="ops-prompt-field">
                {actionPrompt.inputLabel}
                <input
                  autoFocus
                  value={promptValue}
                  placeholder={actionPrompt.inputPlaceholder}
                  onChange={(event) => setPromptValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      (!actionPrompt.inputRequired || promptValue.trim())
                    ) {
                      const action = actionPrompt.action
                      const value = promptValue.trim()
                      closePrompt()
                      action?.(value)
                    }
                  }}
                />
              </label>
            )}
            <div className="ops-prompt-actions">
              {!actionPrompt.dismissOnly && (
                <button onClick={closePrompt}>Cancel</button>
              )}
              <button
                className={actionPrompt.destructive ? "ops-danger" : "ops-primary"}
                autoFocus={!actionPrompt.inputLabel}
                disabled={
                  actionPrompt.inputRequired && !promptValue.trim()
                }
                onClick={() => {
                  const action = actionPrompt.action
                  const value = promptValue.trim()
                  closePrompt()
                  action?.(value)
                }}
              >
                {actionPrompt.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
      {toast && (
        <div className="ops-toast" role="status">
          ✓ {toast}
        </div>
      )}
      {scannerOpen && (
        <QRScanner
          codes={[
            ...new Map(
              [
                ...(selected && source === "Tasks" ? [selected] : []),
                ...ownTasks.filter((t) => !["Completed", "Closed"].includes(t.status)),
                ...db.records.Locations,
              ]
                .filter((r) => r.code && r.code !== "QR-PENDING")
                .map((r) => [r.code, { code: r.code, label: db.records.Locations.includes(r) ? r.title : r.location }]),
            ).values(),
          ].slice(0, 6)}
          onClose={() => setScannerOpen(false)}
          onResult={acceptScan}
        />
      )}
    </div>
  )
}
