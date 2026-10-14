export type RecordItem = {
  id: string
  title: string
  location: string
  assignee: string
  status: string
  priority: string
  due: string
  notes: string
  quantity: number
  minimum: number
  code: string
  checklist: string[]
  answers: string[]
  photos: string[]
  category: string
  unit: string
  duration: number
  plannedStart: string
  requester: string
  sla: string
  building: string
  floor: string
  department: string
  requiredCount: number
  assignedStaff: string[]
  evidenceRequired: boolean
  materials: { item: string; issued: number; used: number; returned: number }[]
  createdAt?: string
  createdBy?: string
  recurrence?: string
  linkedId?: string
  history?: string[]
  unpublished?: boolean
  /** Inventory: days one issue is expected to last before the same holder may request again. */
  usageDays?: number
  /** Tasks: sub-task (checklist item) names flagged by the reviewer. */
  reviewFlags?: string[]
  /** Tasks: one photo per sub-task answer, keyed by sub-task name. */
  subPhotos?: Record<string, string>
  /** Shifts: end time (start uses plannedStart) and unpaid break. */
  endTime?: string
  breakMins?: number
  days?: string[]
  color?: string
  /** People master data. */
  phone?: string
  email?: string
  nationality?: string
  employer?: string
  joinDate?: string
  idExpiry?: string
}
export type Notice = {
  id: string
  to: string
  text: string
  module: string
  recordId?: string
  at: string
  read?: boolean
}
export type Database = {
  records: Record<string, RecordItem[]>
  activity: string[]
  duty: boolean
  planStatus: "Draft" | "Ready for Publication" | "Published" | "Amended" | "Closed"
  planVersion: number
  publishedAt?: string
  planHistory?: string[]
  notifications?: Notice[]
  processedOps?: string[]
  custody?: Record<string, Record<string, number>>
  /** person → item → ISO time of the last issue to that person. */
  issuedAt?: Record<string, Record<string, string>>
  /** person → YYYY-MM-DD → shift title, "Off" or "Leave". */
  roster?: Record<string, Record<string, string>>
  sync: {
    online: boolean
    pending: number
    lastSynced: string
  }
}
export const modules = [
  "Tasks",
  "Photo Review",
  "Checklists",
  "Checklist Assignment",
  "Service Requests",
  "Patrols",
  "Incidents",
  "Staff & Roster",
  "Shift Planning",
  "Shift Assignment",
  "Staff Workload",
  "Inventory",
  "Stock Transactions",
  "Supply Requests",
  "Issuance & Returns",
  "Replenishment",
  "Equipment",
  "Handover",
  "Locations",
  "Shifts",
  "Announcements",
  "Activity Log",
]
export const checklist = [
  "Clean and disinfect surfaces",
  "Mop floor and remove waste",
  "Replenish consumables",
  "Confirm area is safe",
]
export const inventoryCategories = [
  "Cleaning chemicals",
  "Consumables",
  "PPE",
  "Tools & equipment",
]
const demoEvidence =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="#eaf1ed"/><path d="M0 300L230 190H370L600 300V400H0Z" fill="#bccdc2"/><rect x="240" y="70" width="120" height="150" rx="4" fill="#8daba0"/><rect x="255" y="85" width="90" height="120" fill="#dce8e0"/><text x="300" y="345" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#24533f">DEMO EVIDENCE · NOT A REAL FACILITY PHOTO</text></svg>',
  )
export function item(
  title: string,
  extra: Partial<RecordItem> = {},
): RecordItem {
  return {
    id: crypto.randomUUID(),
    title,
    location: "Ward 4",
    assignee: "Sara Ahmed",
    status: "Active",
    priority: "Normal",
    due: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    notes: "",
    quantity: 20,
    minimum: 10,
    code: "Z-A1-W4",
    checklist: [...checklist],
    answers: [],
    photos: [],
    category: "Consumables",
    unit: "unit",
    duration: 30,
    plannedStart: "08:00",
    requester: "KFMC Operations",
    sla: new Date(Date.now() + 7200000).toISOString(),
    building: "Main Hospital",
    floor: "Floor 4",
    department: "Housekeeping",
    requiredCount: 1,
    assignedStaff: [],
    evidenceRequired: false,
    materials: [],
    createdAt: new Date(Date.now() - 5400000).toISOString(),
    createdBy: "Faisal Alharbi",
    recurrence: "One-time",
    ...extra,
  }
}
export function seed(): Database {
  const records: Database["records"] = {}
  modules.forEach((m) => (records[m] = []))
  records.Tasks = [
    item("Ward 4 routine cleaning", {
      status: "Assigned",
      priority: "Urgent",
      category: "Ward routine",
      recurrence: "Every shift",
      duration: 35,
      plannedStart: "08:10",
      materials: [
        { item: "Surface disinfectant", issued: 2, used: 0, returned: 0 },
      ],
    }),
    item("ICU corridor mop", {
      status: "In progress",
      location: "ICU Corridor",
      code: "Z-A2-ICU",
      category: "Clinical corridor",
      recurrence: "Daily",
      duration: 25,
      plannedStart: "08:30",
    }),
    item("OPD lobby deep clean", {
      status: "Assigned",
      location: "OPD Lobby",
      code: "Z-G-OPD",
      category: "Public area",
      duration: 45,
      plannedStart: "09:00",
    }),
    item("Building B washroom", {
      status: "Returned",
      location: "Building B",
      notes: "Please replenish the soap dispenser.",
      category: "Washroom",
      recurrence: "Every 2 hours",
      plannedStart: "09:15",
    }),
    item("Staff room disinfection", {
      status: "Completed",
      answers: [...checklist],
      photos: [demoEvidence],
      category: "Touchpoint disinfection",
      plannedStart: "07:30",
    }),
    item("Ward 4 touchpoint cleaning", {
      status: "Pending review",
      answers: [...checklist],
      photos: [demoEvidence],
      notes: "Synthetic demo evidence. All checklist items completed.",
      subPhotos: Object.fromEntries(checklist.map((s) => [s, demoEvidence])),
      category: "Ward routine",
      plannedStart: "08:00",
    }),
    item("OPD washroom hourly check", {
      status: "Pending review",
      assignee: "Maha Khalid",
      location: "OPD Lobby",
      code: "Z-G-OPD",
      category: "Washroom",
      checklist: [
        "Display wet floor sign",
        "Clean fixtures",
        "Disinfect touchpoints",
        "Replenish consumables",
      ],
      answers: [
        "Display wet floor sign|Yes",
        "Clean fixtures|Yes",
        "Disinfect touchpoints|Yes",
        "Replenish consumables|No|Soap refill out of stock at OPD store",
      ],
      photos: [demoEvidence, demoEvidence],
      subPhotos: Object.fromEntries(
        ["Display wet floor sign", "Clean fixtures", "Disinfect touchpoints", "Replenish consumables"].map((s) => [s, demoEvidence]),
      ),
      notes: "Soap dispenser could not be refilled.",
      plannedStart: "09:00",
      createdAt: new Date(Date.now() - 70 * 60000).toISOString(),
    }),
  ]
  records.Checklists = [
    item("Ward Routine Cleaning", {
      notes: checklist.join("\n"),
      category: "Ward",
      duration: 35,
      status: "Active",
    }),
    item("Washroom Cleaning", {
      notes:
        "Display wet floor sign\nClean fixtures\nDisinfect touchpoints\nReplenish consumables",
      category: "Washroom",
      duration: 25,
    }),
    item("Terminal clean", {
      notes:
        "Disinfect all surfaces\nChange consumables\nRemove clinical waste safely",
      category: "Terminal",
      duration: 75,
    }),
    item("Corridor Cleaning", {
      notes: "Remove waste\nDust mop\nDamp mop\nCheck safety signage",
      category: "Public area",
      duration: 30,
    }),
    item("Public Area Cleaning", {
      notes:
        "Clean seating\nDisinfect touchpoints\nRemove waste\nInspect floor",
      category: "Public area",
      duration: 40,
    }),
  ]
  records["Service Requests"] = [
    item("Spill at OPD reception", {
      status: "Open",
      priority: "Urgent",
      location: "OPD Lobby",
      notes: "Water spill near reception desk.",
      requester: "OPD Reception",
      sla: new Date(Date.now() + 25 * 60000).toISOString(),
      category: "Spill response",
    }),
    item("Restock washroom supplies", {
      status: "Open",
      location: "Building B",
      requester: "Facilities Helpdesk",
      sla: new Date(Date.now() + 90 * 60000).toISOString(),
      category: "Restocking",
    }),
  ]
  records.Patrols = [
    item("Main campus morning round", {
      assignee: "Omar Hassan",
      status: "Assigned",
      checklist: ["Z-A1-W4", "Z-A2-ICU", "Z-G-OPD"],
    }),
  ]
  records.Incidents = [
    item("Restricted entrance left open", {
      status: "Reported",
      assignee: "Omar Hassan",
      notes: "Door secured; supervisor follow-up requested.",
      priority: "High",
    }),
  ]
  records["Staff & Roster"] = [
    item("Sara Ahmed", {
      phone: "+966 55 214 1042", nationality: "Philippines", employer: "QBS Facility Services", joinDate: "2022-03-14", idExpiry: "2027-02-01", email: "sara.ahmed@kfmc.example",
      notes: "Cleaner · HR reference KF-1042",
      status: "Available",
      code: "KF-1042",
      category: "Cleaner",
      department: "Housekeeping",
      location: "Morning · 07:00–15:00",
    }),
    item("Omar Hassan", {
      phone: "+966 55 214 1081", nationality: "Egypt", employer: "QBS Security", joinDate: "2021-09-05", idExpiry: "2026-11-20", email: "omar.hassan@kfmc.example",
      notes: "Guard · HR reference KF-1081",
      status: "Available",
      code: "KF-1081",
      category: "Guard",
      department: "Security",
      location: "Morning · 07:00–15:00",
    }),
    item("Faisal Al-Harbi", {
      phone: "+966 50 118 1007", nationality: "Saudi Arabia", employer: "KFMC", joinDate: "2018-01-10", idExpiry: "", email: "faisal.alharbi@kfmc.example",
      notes: "Supervisor · HR reference KF-1007",
      status: "On duty",
      code: "KF-1007",
      category: "Supervisor",
      department: "Soft Services Operations",
      location: "Morning · 07:00–15:00",
    }),
    item("Noura Al-Qahtani", {
      phone: "+966 54 330 1058", nationality: "Saudi Arabia", employer: "QBS Facility Services", joinDate: "2023-06-01", idExpiry: "", email: "noura.alqahtani@kfmc.example",
      notes: "Cleaner · HR reference KF-1058",
      status: "Available",
      code: "KF-1058",
      category: "Cleaner",
      department: "Housekeeping",
      location: "Morning · 07:00–15:00",
    }),
    item("Abdullah Saleh", {
      phone: "+966 56 902 1072", nationality: "Yemen", employer: "QBS Facility Services", joinDate: "2022-11-20", idExpiry: "2026-10-30", email: "abdullah.saleh@kfmc.example",
      notes: "Cleaner · HR reference KF-1072",
      status: "Break 10:30",
      code: "KF-1072",
      category: "Cleaner",
      department: "Housekeeping",
      location: "Morning · 07:00–15:00",
    }),
    item("Maha Khalid", {
      phone: "+966 53 771 1093", nationality: "Sudan", employer: "QBS Facility Services", joinDate: "2024-01-08", idExpiry: "2027-05-12", email: "maha.khalid@kfmc.example",
      notes: "Cleaner · HR reference KF-1093",
      status: "Available",
      code: "KF-1093",
      category: "Cleaner",
      department: "Housekeeping",
      location: "Morning · 07:00–15:00",
    }),
    item("Reem Al-Salem", {
      phone: "+966 50 445 1002", nationality: "Saudi Arabia", employer: "KFMC", joinDate: "2016-04-03", idExpiry: "", email: "reem.alsalem@kfmc.example",
      notes: "Operations Manager · HR reference KF-1002",
      status: "On duty",
      code: "KF-1002",
      category: "Operations Manager",
      department: "Facility Operations",
      location: "Day · 08:00–16:00",
    }),
    item("Layla Al-Mansour", {
      phone: "+966 55 660 1018", nationality: "Saudi Arabia", employer: "KFMC", joinDate: "2019-08-19", idExpiry: "", email: "layla.almansour@kfmc.example",
      notes: "Storekeeper · HR reference KF-1018",
      status: "On duty",
      code: "KF-1018",
      category: "Storekeeper",
      department: "Central Store",
      location: "Morning · 07:00–15:00",
    }),
    item("Nasser Al-Qahtani", {
      phone: "+966 50 900 0004", nationality: "Saudi Arabia", employer: "QBS", joinDate: "2020-02-02", idExpiry: "", email: "nasser.alqahtani@kfmc.example",
      notes: "QBS Admin · HR reference QBS-004",
      status: "Active",
      code: "QBS-004",
      category: "QBS Admin",
      department: "Platform Administration",
      location: "Day · 08:00–16:00",
    }),
  ]
  records["Shift Planning"] = [
    item("Ward 4", {
      location: "Main Hospital · Floor 4",
      building: "Main Hospital",
      floor: "Floor 4",
      department: "Inpatient Services",
      requiredCount: 3,
      assignedStaff: ["Sara Ahmed", "Noura Al-Qahtani"],
      status: "Understaffed",
      category: "Inpatient ward",
    }),
    item("ICU Corridor", {
      location: "Main Hospital · Floor 2",
      building: "Main Hospital",
      floor: "Floor 2",
      department: "Critical Care",
      requiredCount: 2,
      assignedStaff: ["Abdullah Saleh", "Maha Khalid"],
      status: "Covered",
      category: "Clinical corridor",
    }),
    item("OPD Lobby", {
      location: "Outpatient Building · Ground",
      building: "Outpatient Building",
      floor: "Ground Floor",
      department: "Outpatient Services",
      requiredCount: 2,
      assignedStaff: ["Maha Khalid"],
      status: "Understaffed",
      category: "Public area",
    }),
    item("Building B Washrooms", {
      location: "Support Services · Floor 1",
      building: "Support Services",
      floor: "Floor 1",
      department: "Shared Services",
      requiredCount: 1,
      assignedStaff: ["Sara Ahmed"],
      status: "Covered",
      category: "Washroom",
    }),
  ]
  records.Inventory = [
    item("Surface disinfectant", {
      quantity: 48,
      notes: "Bottles · Central store",
      category: "Cleaning chemicals",
      unit: "Bottle",
      usageDays: 3,
    }),
    item("Microfibre cloth", {
      quantity: 8,
      minimum: 12,
      notes: "Pieces · Building A store",
      category: "Tools & equipment",
      unit: "Piece",
      usageDays: 7,
    }),
    item("Disposable gloves", {
      quantity: 120,
      minimum: 30,
      notes: "Boxes · Central store",
      category: "PPE",
      unit: "Box",
      usageDays: 2,
    }),
    item("Waste liners 60L", {
      quantity: 18,
      minimum: 25,
      notes: "Rolls · Central store",
      category: "Consumables",
      unit: "Roll",
    }),
  ]
  records["Stock Transactions"] = [
    item("TXN-2408 · Surface disinfectant", {
      status: "Posted",
      quantity: 24,
      unit: "Bottle",
      notes: "Receipt PO-44821 · Central store",
      category: "Receipt",
    }),
    item("TXN-2411 · Disposable gloves", {
      status: "Posted",
      quantity: 4,
      unit: "Box",
      notes: "Issued to Sara Ahmed · Ward 4 cart",
      category: "Issue to custody",
    }),
  ]
  records["Supply Requests"] = [
    item("Surface disinfectant", { status: "Submitted", quantity: 2 }),
  ]
  records.Equipment = [
    item("Floor scrubber A-01", { status: "Available", code: "EQ-FS-01", category: "Floor care", location: "Central store" }),
    item("Cleaning trolley B-02", { status: "In Use", code: "EQ-TR-02", category: "Trolley", location: "Building B" }),
    item("Wet vacuum C-03", { status: "Out of Service", code: "EQ-WV-03", category: "Floor care", location: "Building A store", history: ["Fault reported · motor not starting"] }),
  ]
  records.Handover = [
    item("Morning to afternoon shift", {
      status: "Draft",
      notes: "Check OPD lobby and replenish Building B supplies.",
    }),
  ]
  records.Locations = [
    item("Ward 4"),
    item("ICU Corridor", { code: "Z-A2-ICU" }),
    item("OPD Lobby", { code: "Z-G-OPD" }),
    item("Building B", { code: "Z-B1" }),
  ]
  records.Shifts = defaultShifts()
  records.Announcements = [
    item("Team briefing at 14:30", {
      notes: "Please meet at Building A staff room.",
    }),
  ]
  records["Staff & Roster"].push(
    item("Khalid Al-Otaibi", { phone: "+966 55 120 1101", nationality: "Saudi Arabia", employer: "QBS Facility Services", joinDate: "2024-05-02", idExpiry: "", email: "khalid.alotaibi@kfmc.example", notes: "Cleaner · HR reference KF-1101", status: "On duty", code: "KF-1101", category: "Cleaner", department: "Housekeeping", location: "Morning · 07:00–15:00" }),
    item("Reem Al-Shehri", { phone: "+966 54 211 1115", nationality: "Saudi Arabia", employer: "QBS Facility Services", joinDate: "2024-07-15", idExpiry: "", email: "reem.alshehri@kfmc.example", notes: "Cleaner · HR reference KF-1115", status: "Available", code: "KF-1115", category: "Cleaner", department: "Housekeeping", location: "Morning · 07:00–15:00" }),
    item("Yousef Nasser", { phone: "+966 56 313 1122", nationality: "Jordan", employer: "QBS Facility Services", joinDate: "2023-10-01", idExpiry: "2026-12-04", email: "yousef.nasser@kfmc.example", notes: "Cleaner · HR reference KF-1122", status: "Off duty", code: "KF-1122", category: "Cleaner", department: "Housekeeping", location: "Afternoon · 15:00–23:00" }),
    item("Huda Al-Mutairi", { phone: "+966 53 414 1130", nationality: "Saudi Arabia", employer: "QBS Facility Services", joinDate: "2025-01-12", idExpiry: "", email: "huda.almutairi@kfmc.example", notes: "Cleaner · HR reference KF-1130", status: "On duty", code: "KF-1130", category: "Cleaner", department: "Housekeeping", location: "Morning · 07:00–15:00" }),
  )
  records["Shift Planning"].push(
    item("Emergency Department", { location: "Main Hospital · Ground", building: "Main Hospital", floor: "Ground Floor", department: "Emergency", requiredCount: 2, assignedStaff: ["Khalid Al-Otaibi"], status: "Understaffed", category: "Clinical area" }),
    item("Pharmacy Corridor", { location: "Main Hospital · Ground", building: "Main Hospital", floor: "Ground Floor", department: "Pharmacy", requiredCount: 1, assignedStaff: ["Huda Al-Mutairi"], status: "Covered", category: "Clinical corridor" }),
    item("Pediatric Ward", { location: "Main Hospital · Floor 4", building: "Main Hospital", floor: "Floor 4", department: "Pediatrics", requiredCount: 2, assignedStaff: ["Reem Al-Shehri"], status: "Understaffed", category: "Inpatient ward" }),
    item("Radiology Waiting", { location: "Outpatient Building · Floor 1", building: "Outpatient Building", floor: "Floor 1", department: "Radiology", requiredCount: 1, assignedStaff: [], status: "Understaffed", category: "Public area" }),
    item("Laboratory Reception", { location: "Support Services · Ground", building: "Support Services", floor: "Ground Floor", department: "Laboratory", requiredCount: 1, assignedStaff: ["Noura Al-Qahtani"], status: "Covered", category: "Public area" }),
  )
  const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString()
  const ahead = (min: number) => new Date(Date.now() + min * 60000).toISOString().slice(0, 16)
  records.Tasks.push(
    item("Pharmacy corridor spot clean", {
      status: "Unassigned",
      assignee: "",
      location: "Pharmacy Corridor",
      code: "Z-G-PH",
      category: "Clinical corridor",
      due: ahead(120),
      plannedStart: "11:00",
      createdAt: ago(40),
    }),
    item("Radiology waiting area reset", {
      status: "Assigned",
      assignee: "Noura Al-Qahtani",
      location: "Radiology Waiting",
      code: "Z-1-RAD",
      category: "Public area",
      recurrence: "Daily",
      due: ahead(-20),
      plannedStart: "09:30",
      createdAt: ago(180),
    }),
    item("Emergency bay turnover clean", {
      status: "In progress",
      assignee: "Khalid Al-Otaibi",
      location: "Emergency Department",
      code: "Z-G-ED",
      category: "Clinical area",
      duration: 55,
      due: ahead(50),
      plannedStart: "10:00",
    }),
    item("Pediatric discharge clean", {
      status: "Assigned",
      assignee: "Reem Al-Shehri",
      location: "Pediatric Ward",
      code: "Z-4-PED",
      category: "Terminal",
      duration: 45,
      due: ahead(90),
      plannedStart: "10:30",
    }),
    item("Pharmacy touchpoint round", {
      status: "Assigned",
      assignee: "Huda Al-Mutairi",
      location: "Pharmacy Corridor",
      code: "Z-G-PH",
      category: "Clinical corridor",
      duration: 30,
      due: ahead(75),
      plannedStart: "10:15",
    }),
    item("ICU equipment wipe-down", {
      status: "Assigned",
      assignee: "Abdullah Saleh",
      location: "ICU Corridor",
      code: "Z-A2-ICU",
      category: "Touchpoint disinfection",
      duration: 35,
      due: ahead(110),
      plannedStart: "11:00",
    }),
  )
  records["Checklist Assignment"] = [
    item("Ward Routine Cleaning · 2 zones", { status: "Active", category: "Every shift", assignee: "Sara Ahmed", notes: "Morning · 07:00–15:00 · Due 10:00\nWard 4, Building B" }),
    item("Corridor Cleaning · ICU Corridor", { status: "Active", category: "Daily", assignee: "Abdullah Saleh", notes: "Morning · Due 09:00\nICU Corridor" }),
    item("Public Area Cleaning · OPD Lobby", { status: "Paused", category: "Every 2 hours", assignee: "Maha Khalid", notes: "Morning · Due 12:00\nOPD Lobby" }),
  ]
  records["Staff Workload"] = [
    item("Sara Ahmed", { status: "High load", quantity: 5, duration: 185, location: "Ward 4", notes: "5 open tasks · 185 planned minutes" }),
    item("Noura Al-Qahtani", { status: "Balanced", quantity: 2, duration: 80, location: "Ward 4", notes: "2 open tasks · 80 planned minutes" }),
    item("Abdullah Saleh", { status: "Balanced", quantity: 2, duration: 70, location: "ICU Corridor", notes: "On break 10:30–11:00" }),
    item("Maha Khalid", { status: "Available", quantity: 1, duration: 40, location: "OPD Lobby", notes: "Capacity for urgent dispatch" }),
    item("Khalid Al-Otaibi", { status: "High load", quantity: 4, duration: 210, location: "Emergency Department", notes: "ED turnover cleans every 45 min" }),
    item("Reem Al-Shehri", { status: "Balanced", quantity: 3, duration: 120, location: "Pediatric Ward", notes: "Bed-space cleans after discharge" }),
    item("Huda Al-Mutairi", { status: "Balanced", quantity: 2, duration: 95, location: "Pharmacy Corridor", notes: "Corridor + touchpoints" }),
    item("Yousef Nasser", { status: "Off shift", quantity: 0, duration: 0, location: "—", notes: "Afternoon shift from 15:00" }),
  ]
  records.Inventory.push(
    item("Floor cleaner concentrate", { quantity: 22, minimum: 10, notes: "Litres · Central store", category: "Cleaning chemicals", unit: "Litre", usageDays: 5 }),
    item("Hand towel rolls", { quantity: 64, minimum: 40, notes: "Rolls · Building B satellite store", category: "Consumables", unit: "Roll" }),
    item("Face masks", { quantity: 9, minimum: 20, notes: "Boxes · Building A store", category: "PPE", unit: "Box", usageDays: 1 }),
  )
  records["Stock Transactions"] = [
    item("TXN-2416 · Surface disinfectant", { status: "Posted", quantity: 2, unit: "Bottle", category: "Issue to custody", assignee: "Sara Ahmed", location: "Ward 4", requester: "Storekeeper", createdAt: ago(95), notes: "Issued to Sara Ahmed · Ward 4 · task Ward 4 routine cleaning · morning cart · by Storekeeper" }),
    item("TXN-2415 · Waste liners 60L", { status: "Posted", quantity: 3, unit: "Roll", category: "Issue to custody", assignee: "Noura Al-Qahtani", location: "Ward 4", requester: "Storekeeper", createdAt: ago(110), notes: "Issued to Noura Al-Qahtani · Ward 4 · waste round · by Storekeeper" }),
    item("TXN-2414 · Hand towel rolls", { status: "Posted", quantity: 6, unit: "Roll", category: "Issue to custody", assignee: "Maha Khalid", location: "OPD Lobby", requester: "Storekeeper", createdAt: ago(130), notes: "Issued to Maha Khalid · OPD Lobby · dispenser refill · by Storekeeper" }),
    item("TXN-2413 · Microfibre cloth", { status: "Posted", quantity: 4, unit: "Piece", category: "Consumption", assignee: "Abdullah Saleh", location: "ICU Corridor", createdAt: ago(150), notes: "Abdullah Saleh · ICU corridor mop" }),
    item("TXN-2412 · Disposable gloves", { status: "Posted", quantity: 1, unit: "Box", category: "Return to store", assignee: "Abdullah Saleh", location: "ICU Corridor", createdAt: ago(160), notes: "Abdullah Saleh · unused from ICU corridor mop" }),
    item("TXN-2411 · Disposable gloves", { status: "Posted", quantity: 4, unit: "Box", category: "Issue to custody", assignee: "Sara Ahmed", location: "Ward 4", requester: "Storekeeper", createdAt: ago(200), notes: "Issued to Sara Ahmed · Ward 4 cart · by Storekeeper" }),
    item("TXN-2408 · Surface disinfectant", { status: "Posted", quantity: 24, unit: "Bottle", category: "Receipt", requester: "Storekeeper", createdAt: ago(1440), notes: "Receipt PO-44821 · Central store" }),
  ]
  records["Supply Requests"] = [
    item("Floor cleaner concentrate", { status: "Submitted", quantity: 2, assignee: "Sara Ahmed", location: "Ward 4", notes: "Previous issue fully used after 6 days" }),
    item("Waste liners 60L", { status: "Approved", quantity: 4, assignee: "Noura Al-Qahtani", location: "Ward 4", notes: "Afternoon waste round" }),
    item("Hand towel rolls", { status: "Issued", quantity: 6, assignee: "Maha Khalid", location: "OPD Lobby", notes: "Dispenser refill" }),
    item("Face masks", { status: "Rejected", quantity: 10, assignee: "Abdullah Saleh", location: "ICU Corridor", notes: "Use ICU PPE station stock" }),
  ]
  records["Issuance & Returns"] = [
    item("ISS-1042 · Surface disinfectant ×2", { status: "Acknowledged", assignee: "Sara Ahmed", location: "Ward 4", quantity: 2, notes: "Issued 07:20 by Storekeeper · acknowledged 07:25" }),
    item("ISS-1043 · Waste liners 60L ×3", { status: "Issued", assignee: "Noura Al-Qahtani", location: "Ward 4", quantity: 3, notes: "Awaiting worker acknowledgement" }),
    item("RET-0311 · Disposable gloves ×1", { status: "Returned", assignee: "Abdullah Saleh", location: "ICU Corridor", quantity: 1, notes: "Unused stock returned to Central store" }),
  ]
  records.Replenishment = [
    item("Microfibre cloth", { status: "Requested", quantity: 40, unit: "Piece", notes: "Below minimum (8/12) · Building A store" }),
    item("Waste liners 60L", { status: "Ordered", quantity: 60, unit: "Roll", notes: "PO-44937 · ETA tomorrow" }),
    item("Face masks", { status: "Draft", quantity: 30, unit: "Box", notes: "Below minimum (9/20)" }),
  ]
  records.Equipment.push(
    item("Window cleaning kit D-04", { status: "Available", code: "EQ-WK-04", category: "Kit", location: "Building A store" }),
    item("Spill response cart E-05", { status: "In Use", code: "EQ-SR-05", category: "Trolley", location: "OPD Lobby", assignee: "Maha Khalid" }),
  )
  records.Handover.push(
    item("Night to morning shift", { status: "Closed", assignee: "Faisal Al-Harbi", notes: "All wards covered. Wet vacuum C-03 reported faulty." }),
    item("Night shift → Morning shift · open items", { status: "Submitted", assignee: "Abdullah Saleh", createdAt: new Date(Date.now() - 50 * 60000).toISOString(), notes: "ICU bay 6 terminal clean pending (patient transfer at 09:00).\nTasks (2): ICU corridor mop [Priority]; Building B washroom\nRequests (1): Spill at OPD reception\nEquipment: Wet vacuum C-03 (Out of Service)" }),
    item("Sara Ahmed · end of shift (yesterday)", { status: "Acknowledged", assignee: "Sara Ahmed", notes: "Washroom B soap refill pending. 2 bottles disinfectant in custody." }),
  )
  records.Patrols.push(
    item("OPD perimeter evening round", { assignee: "Omar Hassan", status: "Completed", checklist: ["Z-G-OPD", "Z-B1"], answers: ["Z-G-OPD", "Z-B1"] }),
  )
  records.Incidents.push(
    item("Wet floor without signage", { status: "Closed", assignee: "Omar Hassan", priority: "Normal", location: "ICU Corridor", notes: "Signage placed, cleaner informed." }),
  )
  records["Service Requests"].push(
    item("Bed-space cleaning after discharge", { status: "Assigned", location: "Ward 4", assignee: "Noura Al-Qahtani", requester: "Ward 4 Nursing Station", sla: new Date(Date.now() + 45 * 60000).toISOString(), category: "Discharge clean" }),
    item("Odour complaint · washroom", { status: "Closed", location: "Building B", assignee: "Sara Ahmed", requester: "Patient Relations", sla: new Date(Date.now() - 120 * 60000).toISOString(), category: "Complaint" }),
  )
  records.Locations.push(
    item("Pharmacy Corridor", { code: "Z-G-PH" }),
    item("Radiology Waiting", { code: "Z-1-RAD" }),
  )
  records.Announcements.push(
    item("New spill kit locations", { notes: "Spill kits now on every floor near the lifts." }),
    item("Infection control reminder", { notes: "Change gloves between every patient-area task." }),
  )
  records["Activity Log"] = [
    item("Plan v3 published", { status: "Logged", assignee: "Faisal Al-Harbi", notes: "5 workers notified" }),
    item("Task started · ICU corridor mop", { status: "Logged", assignee: "Abdullah Saleh", notes: "QR verified Z-A2-ICU" }),
    item("Supply request approved", { status: "Logged", assignee: "Storekeeper", notes: "Waste liners 60L ×4 for Ward 4" }),
    item("Completion returned", { status: "Logged", assignee: "Faisal Al-Harbi", notes: "Building B washroom · replenish soap" }),
  ]
  return {
    records,
    activity: [
      "08:42 · Task “ICU corridor mop” started by Sara Ahmed",
      "08:36 · Supply request SR-018 approved for Ward 4",
      "08:28 · OPD spill request received with urgent priority",
      "08:15 · Morning plan v3 published to 5 handheld workers",
      "Demonstration workspace initialized with synthetic data",
    ],
    duty: false,
    planStatus: "Published",
    planVersion: 3,
    publishedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    planHistory: ["08:15 · v3 published to 5 workers"],
    notifications: [
      {
        id: "n-seed-1",
        to: "Sara Ahmed",
        text: "Morning plan v3 published · Ward 4 assigned",
        module: "Tasks",
        at: new Date().toISOString(),
      },
      {
        id: "n-seed-2",
        to: "Omar Hassan",
        text: "Morning security patrol assigned · Main campus",
        module: "Patrols",
        at: new Date().toISOString(),
      },
      {
        id: "n-seed-3",
        to: "Storekeeper",
        text: "Supply request awaiting issue · Waste liners 60L",
        module: "Supply Requests",
        at: new Date().toISOString(),
      },
      {
        id: "n-seed-4",
        to: "Supervisors",
        text: "Two staffing gaps require review before afternoon handover",
        module: "Shift Planning",
        at: new Date().toISOString(),
      },
    ],
    processedOps: [],
    custody: {
      "Sara Ahmed": { "Surface disinfectant": 2, "Disposable gloves": 4, "Floor cleaner concentrate": 1 },
      "Noura Al-Qahtani": { "Waste liners 60L": 3 },
      "Maha Khalid": { "Hand towel rolls": 6 },
    },
    issuedAt: {
      "Sara Ahmed": {
        "Surface disinfectant": ago(95),
        "Disposable gloves": ago(200),
        "Floor cleaner concentrate": ago(6 * 1440),
      },
      "Noura Al-Qahtani": { "Waste liners 60L": ago(110) },
      "Maha Khalid": { "Hand towel rolls": ago(130) },
    },
    roster: seedRoster(records["Staff & Roster"]),
    sync: {
      online: true,
      pending: 0,
      lastSynced: new Date().toISOString(),
    },
  }
}
export const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
export function defaultShifts(): RecordItem[] {
  const all = [...weekdays]
  return [
    item("Morning", { plannedStart: "07:00", endTime: "15:00", breakMins: 60, requiredCount: 5, days: all, color: "#20775b", category: "Day", status: "Active", notes: "Main cleaning shift · ward routines and public areas" }),
    item("Afternoon", { plannedStart: "15:00", endTime: "23:00", breakMins: 60, requiredCount: 4, days: all, color: "#c27a12", category: "Evening", status: "Active", notes: "Discharge cleans, OPD close-down" }),
    item("Night", { plannedStart: "23:00", endTime: "07:00", breakMins: 45, requiredCount: 3, days: all, color: "#3d4f9a", category: "Night", status: "Active", notes: "ED and ICU cover, terminal cleans" }),
    item("Day", { plannedStart: "08:00", endTime: "16:00", breakMins: 60, requiredCount: 2, days: ["Sun", "Mon", "Tue", "Wed", "Thu"], color: "#6b5aa6", category: "Office", status: "Active", notes: "Management and store hours" }),
  ]
}
/** Local calendar date as YYYY-MM-DD. */
export function dayKey(date: Date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return d.toISOString().slice(0, 10)
}
export function weekStart(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}
function seedRoster(people: RecordItem[]) {
  const start = weekStart()
  const roster: Record<string, Record<string, string>> = {}
  people.forEach((person, index) => {
    const shift = person.location.split(" · ")[0] || "Morning"
    const days: Record<string, string> = {}
    for (let i = 0; i < 14; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const weekday = d.getDay()
      // Stagger two rest days per person so weekend cover is shared.
      const rest = [(5 + index) % 7, (6 + index) % 7]
      days[dayKey(d)] = shift === "Day" ? (weekday >= 5 ? "Off" : "Day") : rest.includes(weekday) ? "Off" : shift
    }
    roster[person.title] = days
  })
  return roster
}
export type Utilization = {
  days: number
  issuedAt?: string
  availableAt?: string
  locked: boolean
  progress: number
}
/** Whether a holder may request the same item again, based on the item's usage period. */
export function utilization(db: Database, person: string, material: string): Utilization {
  const days = db.records.Inventory.find((stock) => stock.title === material)?.usageDays || 0
  const issuedAt = db.issuedAt?.[person]?.[material]
  if (!days || !issuedAt) return { days, issuedAt, locked: false, progress: 1 }
  const start = new Date(issuedAt).getTime()
  const end = start + days * 86400000
  return {
    days,
    issuedAt,
    availableAt: new Date(end).toISOString(),
    locked: Date.now() < end,
    progress: Math.min(1, Math.max(0, (Date.now() - start) / (end - start))),
  }
}
export function untilText(iso?: string) {
  if (!iso) return ""
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return "now"
  const hours = Math.ceil(ms / 3600000)
  return hours >= 24 ? `${Math.floor(hours / 24)}d ${hours % 24}h` : `${hours}h`
}
/** Downscale a camera image to a JPEG data URL so several photos fit in browser storage. */
export async function compressImage(file: File, maxSide = 1024, quality = 0.7): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = source
  })
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL("image/jpeg", quality)
}
export function recordIssue(db: Database, person: string, material: string): Database {
  return {
    ...db,
    issuedAt: {
      ...(db.issuedAt || {}),
      [person]: { ...(db.issuedAt?.[person] || {}), [material]: new Date().toISOString() },
    },
  }
}
export function stamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}
export function withHistory(record: RecordItem, entry: string): RecordItem {
  return { ...record, history: [`${stamp()} · ${entry}`, ...(record.history || [])] }
}
export function notify(
  db: Database,
  to: string | string[],
  text: string,
  module: string,
  recordId?: string,
): Database {
  const list = (Array.isArray(to) ? to : [to]).map((person) => ({
    id: crypto.randomUUID(),
    to: person,
    text,
    module,
    recordId,
    at: new Date().toISOString(),
  }))
  return { ...db, notifications: [...list, ...(db.notifications || [])].slice(0, 80) }
}
/** Runs a stock-affecting change exactly once per operation ID (retry/offline safe). */
export function once(db: Database, opId: string, apply: (db: Database) => Database): Database {
  if ((db.processedOps || []).includes(opId)) return db
  const next = apply(db)
  return { ...next, processedOps: [opId, ...(next.processedOps || [])].slice(0, 400) }
}
export function ledger(
  db: Database,
  title: string,
  quantity: number,
  category: string,
  notes: string,
  extra: Partial<RecordItem> = {},
): Database {
  const txn = item(`TXN-${String(Date.now()).slice(-5)} · ${title}`, {
    status: "Posted",
    quantity,
    category,
    notes,
    createdAt: new Date().toISOString(),
    ...extra,
  })
  return {
    ...db,
    records: { ...db.records, "Stock Transactions": [txn, ...db.records["Stock Transactions"]] },
  }
}
export function adjustCustody(db: Database, person: string, material: string, delta: number): Database {
  const custody = { ...(db.custody || {}) }
  const mine = { ...(custody[person] || {}) }
  mine[material] = Math.max(0, (mine[material] || 0) + delta)
  custody[person] = mine
  return { ...db, custody }
}
export const storageKey = "kfmc-operations-v1"
export function load(): Database {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || "null")
    if (data?.records && data?.activity) {
      const defaults = seed()
      modules.forEach((module) => {
        if (!data.records[module]?.length)
          data.records[module] = defaults.records[module]
        data.records[module] = data.records[module].map(
          (record: Partial<RecordItem>) => ({
            ...item(record.title || ""),
            ...record,
            category:
              record.category ||
              (module === "Inventory" ? "Consumables" : "General"),
            assignedStaff: record.assignedStaff || [],
            materials: record.materials || [],
          }),
        )
      })
      data.records.Equipment = data.records.Equipment.map((e: RecordItem) =>
        e.status === "In use" ? { ...e, status: "In Use" } : e,
      )
      // Bring older demo data up to the current reference set (adds missing zones/staff only).
      for (const module of ["Shift Planning", "Staff & Roster", "Staff Workload", "Handover", "Shifts"]) {
        const titles = new Set(data.records[module].map((r: RecordItem) => r.title))
        data.records[module] = [
          ...data.records[module],
          ...defaults.records[module].filter((r) => !titles.has(r.title)),
        ]
      }
      const workloadTaskTitles = new Set([
        "Emergency bay turnover clean",
        "Pediatric discharge clean",
        "Pharmacy touchpoint round",
        "ICU equipment wipe-down",
      ])
      const taskTitles = new Set(
        data.records.Tasks.map((task: RecordItem) => task.title),
      )
      data.records.Tasks = [
        ...data.records.Tasks,
        ...defaults.records.Tasks.filter(
          (task) =>
            workloadTaskTitles.has(task.title) && !taskTitles.has(task.title),
        ),
      ]
      data.records["Staff & Roster"] = data.records["Staff & Roster"].map(
        (person: RecordItem) => {
          const reference = defaults.records["Staff & Roster"].find(
            (candidate) => candidate.title === person.title,
          )
          if (!reference) return person
          return {
            ...person,
            code:
              !person.code || person.code === "Z-A1-W4"
                ? reference.code
                : person.code,
            category:
              !person.category ||
              ["General", "Consumables"].includes(person.category)
                ? reference.category
                : person.category,
            department:
              !person.department || person.department === "Housekeeping"
                ? reference.department
                : person.department,
            location:
              !person.location || person.location === "Ward 4"
                ? reference.location
                : person.location,
          }
        },
      )
      data.planStatus ||= "Draft"
      data.planVersion ||= 1
      data.sync ||= defaults.sync
      data.notifications ||= defaults.notifications
      const noticeIds = new Set(
        data.notifications.map((notice: Notice) => notice.id),
      )
      data.notifications = [
        ...data.notifications,
        ...defaults.notifications.filter(
          (notice) => !noticeIds.has(notice.id),
        ),
      ]
      // Backfill fields introduced after the data was first stored.
      const fill = (module: string, keys: (keyof RecordItem)[]) => {
        data.records[module] = data.records[module].map((record: RecordItem) => {
          const reference = defaults.records[module].find((candidate) => candidate.title === record.title)
          if (!reference) return record
          const patch: Partial<RecordItem> = {}
          keys.forEach((key) => {
            if (record[key] === undefined) Object.assign(patch, { [key]: reference[key] })
          })
          return { ...record, ...patch }
        })
      }
      fill("Inventory", ["usageDays"])
      // Legacy shift rows only had a notes string; take the full definition when endTime is missing.
      data.records.Shifts = data.records.Shifts.map((shift: RecordItem) => {
        const reference = defaults.records.Shifts.find((candidate) => candidate.title === shift.title)
        if (shift.endTime !== undefined || !reference) return shift
        const { id, history, ...definition } = reference
        return { ...shift, ...definition }
      })
      fill("Staff & Roster", ["phone", "email", "nationality", "employer", "joinDate", "idExpiry"])
      data.processedOps ||= []
      data.custody ||= defaults.custody
      data.issuedAt ||= defaults.issuedAt
      data.roster ||= defaults.roster
      data.planHistory ||= defaults.planHistory
      return data
    }
  } catch {
    /* Recover invalid demo storage. */
  }
  return seed()
}
