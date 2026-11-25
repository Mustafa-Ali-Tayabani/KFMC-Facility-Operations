/**
 * Housing Administration data: housing groups per hospital, units, residents,
 * movements, requests (forms 8.3 / 8.5 / 8.6 / 8.10 / 8.15) and the waiting list.
 * Unit counts and statuses mirror the hospitals' daily reports; all people are synthetic.
 */
export type UnitStatus = "Occupied" | "Vacant" | "Reserved" | "Guest Unit" | "Emergency" | "Offices" | "Housekeeping" | "Isolation" | "Under maintenance"
export const unitStatuses: UnitStatus[] = ["Occupied", "Vacant", "Reserved", "Guest Unit", "Emergency", "Offices", "Housekeeping", "Isolation", "Under maintenance"]
export type HousingGroup = { id: string; code: string; hospital: string; hospitalAr: string; kind: "Staff" | "Families" | "Single Female" }
export type Unit = { id: string; group: string; building: string; unit: string; capacity: number; status: UnitStatus; type: string; residentId?: string; furnished: boolean }
export type Resident = { id: string; kfmcId: string; name: string; position: string; department: string; nationality: string; gender: "Male" | "Female"; marital: "Single" | "Married"; mobile: string; email: string; arrival: string; contract: string; unitId?: string; family?: number }
export type MovementType = "New arrival" | "Live-In" | "Relocation" | "Live-Out" | "Exit"
export type Movement = { id: string; residentId: string; from: string; to: string; type: MovementType; date: string; ref?: string }
export type RequestKind = "Accommodation" | "Relocation" | "Evacuation"
export type Stage = { label: string; form: string; roles: string[] }
export type StepLog = { stage: number; label: string; by: string; role: string; at: string; decision: string; note?: string }
export type HousingRequest = {
  id: string
  ref: string
  kind: RequestKind
  residentId: string
  /** Form 8.5 */
  workingHours?: "Shifts" | "Day shifts only" | "On-call"
  currentUnit?: string
  requiredUnit?: string
  acceptOther?: boolean
  reasons?: string[]
  otherReason?: string
  /** Form 8.3 */
  lastWorkingDay?: string
  flightDate?: string
  maximo?: string
  maintenance?: string[]
  missing?: string[]
  damageValue?: number
  exitType?: "Exit" | "Live-Out"
  /** Decisions */
  planDecision?: "Relocate / accommodate" | "Delay the request" | "Add to waiting list" | "Apologize to the resident" | "Other"
  planUnitId?: string
  /** Form 8.15 / Relocation Accommodation Form */
  assignment?: { reference: string; workOrder: string; housingType: "Inside" | "Outside"; processType: "New Arrival" | "Live In" | "Relocation"; unitId: string; arrivalDate: string }
  /** Forms 8.10 and 8.6 */
  pledgeSigned?: boolean
  unfurnished?: { noFurniture: boolean; noAppliances: boolean; notes: string }
  status: "In progress" | "Completed" | "Rejected" | "Waiting list" | "Delayed" | "Declined"
  stage: number
  log: StepLog[]
  createdAt: string
  createdBy: string
}
export type WaitingEntry = { id: string; workOrder: string; residentId?: string; name: string; empNo: string; currentUnit: string; hireDate: string; requestType: string; action: "Pending" | "Planned" | "Done" | "Rejected by resident"; score: number; unitPlan: string; requestRef?: string; addedAt: string }
export type HousingDb = { groups: HousingGroup[]; units: Unit[]; residents: Resident[]; movements: Movement[]; requests: HousingRequest[]; waiting: WaitingEntry[]; seq: number }

export const relocationReasons = [
  "Distance between the unit and entertainment facilities",
  "The need for a ground floor unit",
  "The need for a higher floor unit",
  "Not bonding with the neighbour",
  "Share with specific partner",
]
export const stagesFor = (kind: RequestKind): Stage[] =>
  kind === "Evacuation"
    ? [
        { label: "Evacuation request submitted", form: "Form 8.3", roles: ["Resident", "Housing Coordinator"] },
        { label: "Maintenance inspection", form: "Form 8.3 · Maintenance", roles: ["Maintenance Supervisor"] },
        { label: "Housing Supervisor clearance", form: "Form 8.3 · Housing", roles: ["Housing Supervisor"] },
        { label: "Resident endorsement & key handover", form: "Form 8.3 · Endorsement", roles: ["Resident", "Housing Coordinator"] },
      ]
    : [
        { label: "Request submitted", form: "Form 8.5", roles: ["Resident", "Housing Coordinator"] },
        { label: "Housing Supervisor recommendation", form: "Form 8.5 · Supervisor", roles: ["Housing Supervisor"] },
        { label: "Planning Unit recommendation", form: "Form 8.5 · Planning", roles: ["Planning Unit Head"] },
        { label: "Chairperson approval", form: "Form 8.5 · Approval", roles: ["Housing Chairperson"] },
        { label: kind === "Relocation" ? "Relocation assignment" : "Accommodation assignment", form: kind === "Relocation" ? "Relocation Accommodation Form" : "Form 8.15", roles: ["Housing Coordinator"] },
        { label: "Resident receives unit", form: "Forms 8.10 & 8.6", roles: ["Resident", "Housing Coordinator"] },
      ]

/* ───────────── Seed ───────────── */
let rngState = 26
const rnd = () => {
  rngState = (rngState * 1103515245 + 12345) % 2147483648
  return rngState / 2147483648
}
const pick = <T,>(list: T[]) => list[Math.floor(rnd() * list.length)]
const firstF = ["Maria", "Grace", "Anju", "Joy", "Putri", "Sinta", "Fatima", "Rina", "Liza", "Aisha", "Divya", "Merin", "Asha", "Noor", "Sara", "Hana", "Rania", "Mona", "Leah", "Bianca", "Nisha", "Reshma", "Dewi", "Ayu"]
const firstM = ["Ahmed", "Mohammed", "Omar", "Rahul", "Joseph", "Arif", "Khalid", "Yusuf", "Tariq", "Samir", "Ravi", "Hassan", "Bilal", "Faisal", "Kareem", "Adel"]
const last = ["Santos", "Reyes", "Thomas", "Joseph", "Kurian", "Pratiwi", "Hidayat", "Mahmoud", "Hassan", "Al-Otaibi", "Al-Shammari", "Khan", "Siddiqui", "Varghese", "Nair", "Cruz", "Mendoza", "Wijaya", "Abdelrahman", "Saleh", "Haddad", "Mathew"]
const nations = ["Filipino", "Indian", "Indonesian", "Egyptian", "Saudi", "Pakistani", "Jordanian", "Sudanese"]
const positions = ["Nurse", "Nursing Specialist", "Staff Nurse", "Resident Doctor", "Pharmacist", "Lab Technician", "Radiology Technician", "Physiotherapist", "Dental Assistant", "Consultant", "Midwife"]
const depts = ["ER", "ICU", "NICU", "OR", "MW", "FW", "OPD", "Laboratory", "Radiology", "Pharmacy", "Quality", "Dialysis"]

export const groups: HousingGroup[] = [
  { id: "G26", code: "Group 26", hospital: "Rimah Hospital", hospitalAr: "مستشفى رماح", kind: "Staff" },
  { id: "G28", code: "Group 28", hospital: "Al-Ghat Hospital", hospitalAr: "مستشفى الغاط", kind: "Staff" },
  { id: "G30", code: "Group 30", hospital: "King Khalid Hospital, Majmaah", hospitalAr: "مستشفى الملك خالد بالمجمعة", kind: "Families" },
  { id: "G32", code: "Group 32", hospital: "Tumair General Hospital", hospitalAr: "مستشفى تمير العام", kind: "Staff" },
  { id: "G34", code: "Group 34", hospital: "Hotat Sudair Hospital", hospitalAr: "مستشفى حوطة سدير", kind: "Staff" },
  { id: "G36", code: "Group 36", hospital: "Artawiya Hospital", hospitalAr: "مستشفى الأرطاوية", kind: "Staff" },
  { id: "G38F", code: "Group 38", hospital: "Zulfi Hospital · Families", hospitalAr: "مستشفى الزلفي · عوائل", kind: "Families" },
  { id: "G38S", code: "Group 38", hospital: "Zulfi Hospital · Single Female", hospitalAr: "مستشفى الزلفي · عازبات", kind: "Single Female" },
]
/** [group, building, units, beds per apartment, type, occupied, guest, offices] — from the daily reports. */
const layout: [string, string, number, number, string, number, number, number][] = [
  ["G26", "26-A", 6, 1, "Offices", 0, 0, 6],
  ["G26", "26-B", 57, 6, "Staff", 24, 0, 3],
  ["G26", "26-C", 21, 6, "Staff", 10, 0, 4],
  ["G28", "G28", 72, 4, "Staff", 14, 0, 0],
  ...(["A", "B", "C", "D", "E", "F", "G", "H", "L", "M", "N"].map((b, i) => ["G30", b, [37, 9, 9, 11, 9, 10, 9, 54, 24, 54, 16][i], 1, "Flat", [12, 3, 3, 4, 3, 3, 3, 18, 8, 17, 5][i], 0, 0] as [string, string, number, number, string, number, number, number])),
  ["G32", "G32", 54, 3, "Staff", 18, 5, 1],
  ["G34", "G-34", 62, 2, "Staff", 21, 0, 0],
  ["G36", "G-36", 49, 3, "Staff", 8, 6, 1],
  ["G38F", "G38-A", 12, 1, "Flat", 1, 0, 0],
  ["G38F", "G38-B", 12, 1, "Flat", 1, 0, 0],
  ["G38F", "G38-C", 12, 1, "Flat", 0, 0, 0],
  ["G38S", "38-A", 60, 2, "Room", 16, 0, 0],
  ["G38S", "38-B", 60, 2, "Room", 16, 0, 0],
  ["G38S", "38-C", 60, 2, "Studio", 16, 0, 0],
]

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10)

export function seedHousing(): HousingDb {
  rngState = 26
  const units: Unit[] = []
  const residents: Resident[] = []
  let empNo = 51600000
  const person = (female: boolean, family = false): Resident => {
    const name = `${pick(female ? firstF : firstM)} ${pick(last)}`
    const id = `R${residents.length + 1}`
    const r: Resident = {
      id,
      kfmcId: String(++empNo + Math.floor(rnd() * 90)),
      name,
      position: pick(positions),
      department: pick(depts),
      nationality: pick(nations),
      gender: female ? "Female" : "Male",
      marital: family ? "Married" : "Single",
      mobile: `05${Math.floor(10000000 + rnd() * 89999999)}`,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.kfmc`,
      arrival: iso(Math.floor(30 + rnd() * 2400)),
      contract: pick(["MOH direct", "Operation contract", "Locum"]),
      family: family ? 2 + Math.floor(rnd() * 4) : undefined,
    }
    residents.push(r)
    return r
  }
  layout.forEach(([group, building, count, beds, type, occupied, guest, offices]) => {
    const g = groups.find((x) => x.id === group)!
    const made: Unit[] = []
    for (let i = 0; i < count; i++) {
      const apt = Math.floor(i / beds)
      const floor = Math.floor(apt / 4)
      const label = beds > 1 ? `${floor + 1}${String((apt % 4) + 1).padStart(2, "0")}-${"ABCDEF"[i % beds]}` : `${String(i + 1).padStart(3, "0")}`
      made.push({ id: `${group}-${building}-${label}`, group, building, unit: label, capacity: beds, status: "Vacant", type, furnished: rnd() > 0.15 })
    }
    made.slice(0, offices).forEach((u) => ((u.status = "Offices"), (u.type = "Offices")))
    made.slice(offices, offices + guest).forEach((u) => ((u.status = "Guest Unit"), (u.type = "Guest Unit")))
    const free = made.slice(offices + guest)
    const chosen = new Set<number>()
    while (chosen.size < Math.min(occupied, free.length)) chosen.add(Math.floor(rnd() * free.length))
    free.forEach((u, i) => {
      if (chosen.has(i)) {
        const r = person(g.kind === "Single Female" || rnd() < 0.7, g.kind === "Families")
        u.status = "Occupied"
        u.residentId = r.id
        r.unitId = u.id
      } else if (rnd() < 0.035) u.status = "Under maintenance"
    })
    units.push(...made)
  })
  // A few special-purpose units seen in the reports' status list.
  const g26 = units.filter((u) => u.group === "G26" && u.status === "Vacant")
  if (g26[0]) g26[0].status = "Isolation"
  if (g26[1]) g26[1].status = "Emergency"
  if (g26[2]) g26[2].status = "Housekeeping"

  // The demo resident account.
  const lina = residents.find((r) => r.gender === "Female" && units.find((u) => u.id === r.unitId)?.group === "G34")!
  lina.name = "Lina Haddad"
  lina.nationality = "Jordanian"
  lina.position = "Pharmacist"
  lina.department = "Pharmacy"
  lina.email = "lina.haddad@example.kfmc"
  const unitLabel = (id?: string) => {
    const u = units.find((x) => x.id === id)
    return u ? `${u.building} · ${u.unit}` : "—"
  }

  const occupiedRes = residents.filter((r) => r.unitId && r.id !== lina.id)
  const movements: Movement[] = occupiedRes.filter((_, i) => i % 8 === 1).slice(0, 26).map((r, i) => ({
    id: `M${i + 1}`,
    residentId: r.id,
    from: i % 5 === 3 ? unitLabel(units.find((u) => u.group === units.find((x) => x.id === r.unitId)?.group && u.status === "Vacant")?.id) : "—",
    to: unitLabel(r.unitId),
    type: (i % 5 === 3 ? "Relocation" : i % 3 === 0 ? "New arrival" : "Live-In") as MovementType,
    date: iso(Math.floor(i * 3.4) + 1),
  }))
  // Departed residents (no unit).
  for (let i = 0; i < 4; i++) {
    const r = person(true)
    movements.push({ id: `M${movements.length + 1}`, residentId: r.id, from: unitLabel(units.find((u) => u.group === ["G26", "G34", "G32", "G30"][i] && u.status === "Vacant")?.id), to: "—", type: i === 2 ? "Live-Out" : "Exit", date: iso(5 + i * 9) })
  }
  movements.sort((a, b) => b.date.localeCompare(a.date))

  const vacantIn = (group: string, n = 0) => units.filter((u) => u.group === group && u.status === "Vacant")[n]
  const at = (h: number) => new Date(Date.now() - h * 3600000).toISOString()
  const log = (stage: number, label: string, by: string, role: string, h: number, decision: string, note?: string): StepLog => ({ stage, label, by, role, at: at(h), decision, note })
  const newcomer = person(true)
  const newcomer2 = person(false)
  const leaver = occupiedRes[8]
  const leaver2 = occupiedRes[15]
  const mover = occupiedRes[3]
  const mover2 = occupiedRes[20]
  const planned = vacantIn("G34", 2)
  const reserved = vacantIn("G30", 1)
  if (reserved) reserved.status = "Reserved"
  const requests: HousingRequest[] = [
    { id: "q1", ref: "HR-2026-0412", kind: "Relocation", residentId: lina.id, workingHours: "Shifts", currentUnit: unitLabel(lina.unitId), requiredUnit: "Ground floor, same group", acceptOther: true, reasons: ["The need for a ground floor unit"], otherReason: "", status: "In progress", stage: 1, log: [log(0, "Request submitted", "Lina Haddad", "Resident", 20, "Submitted")], createdAt: at(20), createdBy: "Lina Haddad" },
    { id: "q2", ref: "HR-2026-0409", kind: "Accommodation", residentId: newcomer.id, workingHours: "Shifts", currentUnit: "—", requiredUnit: "Any vacant bed space · Group 34", acceptOther: true, reasons: [], otherReason: "New arrival — nursing recruitment batch Oct 2026", status: "In progress", stage: 2, log: [log(0, "Request submitted", "Hessa Al-Dossary", "Housing Coordinator", 52, "Submitted on behalf of new arrival"), log(1, "Housing Supervisor recommendation", "Mansour Al-Ghamdi", "Housing Supervisor", 30, "Resident can be accommodated")], createdAt: at(52), createdBy: "Hessa Al-Dossary" },
    { id: "q3", ref: "HR-2026-0401", kind: "Relocation", residentId: mover.id, workingHours: "Day shifts only", currentUnit: unitLabel(mover.unitId), requiredUnit: "Share with specific partner", acceptOther: false, reasons: ["Share with specific partner", "Not bonding with the neighbour"], otherReason: "", planDecision: "Relocate / accommodate", planUnitId: planned?.id, status: "In progress", stage: 3, log: [log(0, "Request submitted", mover.name, "Resident", 120, "Submitted"), log(1, "Housing Supervisor recommendation", "Mansour Al-Ghamdi", "Housing Supervisor", 96, "Resident can be relocated"), log(2, "Planning Unit recommendation", "Bandar Al-Rashid", "Planning Unit Head", 70, "Relocate / accommodate", `Unit ${unitLabel(planned?.id)}`)], createdAt: at(120), createdBy: mover.name },
    { id: "q4", ref: "HR-2026-0396", kind: "Accommodation", residentId: newcomer2.id, workingHours: "On-call", currentUnit: "Outside housing", requiredUnit: "Family flat · Group 30", acceptOther: true, reasons: [], otherReason: "Married — family of 4", planDecision: "Relocate / accommodate", planUnitId: reserved?.id, status: "In progress", stage: 4, log: [log(0, "Request submitted", "Hessa Al-Dossary", "Housing Coordinator", 200, "Submitted"), log(1, "Housing Supervisor recommendation", "Mansour Al-Ghamdi", "Housing Supervisor", 170, "Resident can be accommodated"), log(2, "Planning Unit recommendation", "Bandar Al-Rashid", "Planning Unit Head", 150, "Relocate / accommodate", `Unit ${unitLabel(reserved?.id)}`), log(3, "Chairperson approval", "Dr. Mona Al-Saud", "Housing Chairperson", 100, "Approved")], createdAt: at(200), createdBy: "Hessa Al-Dossary" },
    { id: "q5", ref: "HR-2026-0405", kind: "Evacuation", residentId: leaver.id, lastWorkingDay: iso(17), flightDate: iso(3), maximo: "18902231", status: "In progress", stage: 1, log: [log(0, "Evacuation request submitted", leaver.name, "Resident", 90, "Submitted")], createdAt: at(90), createdBy: leaver.name },
    { id: "q6", ref: "HR-2026-0398", kind: "Evacuation", residentId: leaver2.id, lastWorkingDay: iso(4), flightDate: iso(-6), maximo: "18877104", maintenance: ["AC filter replacement", "Bathroom tap leaking"], missing: ["1 × wardrobe key"], damageValue: 150, status: "In progress", stage: 3, exitType: "Exit", log: [log(0, "Evacuation request submitted", leaver2.name, "Resident", 140, "Submitted"), log(1, "Maintenance inspection", "Yasser Al-Harthi", "Maintenance Supervisor", 60, "Inspected", "2 maintenance items · 1 missing · SAR 150"), log(2, "Housing Supervisor clearance", "Mansour Al-Ghamdi", "Housing Supervisor", 30, "Cleared")], createdAt: at(140), createdBy: leaver2.name },
    { id: "q7", ref: "HR-2026-0388", kind: "Relocation", residentId: mover2.id, workingHours: "Shifts", currentUnit: unitLabel(mover2.unitId), requiredUnit: "Higher floor", acceptOther: true, reasons: ["The need for a higher floor unit"], planDecision: "Add to waiting list", status: "Waiting list", stage: 4, log: [log(0, "Request submitted", mover2.name, "Resident", 400, "Submitted"), log(1, "Housing Supervisor recommendation", "Mansour Al-Ghamdi", "Housing Supervisor", 380, "Resident can be relocated"), log(2, "Planning Unit recommendation", "Bandar Al-Rashid", "Planning Unit Head", 360, "Add to waiting list", "No higher-floor vacancy in the group"), log(3, "Chairperson approval", "Dr. Mona Al-Saud", "Housing Chairperson", 340, "Approved")], createdAt: at(400), createdBy: mover2.name },
  ]
  const waiting: WaitingEntry[] = [
    { id: "w1", workOrder: "18810457", residentId: mover2.id, name: mover2.name, empNo: mover2.kfmcId, currentUnit: unitLabel(mover2.unitId), hireDate: mover2.arrival, requestType: "Upper floor in same group", action: "Pending", score: 12, unitPlan: "", requestRef: "HR-2026-0388", addedAt: iso(14) },
    ...[
      ["17389049", "Live-in (from outside housing)", 9, "Pending", ""],
      ["13489577", "Outside to inside request", 11, "Planned", "G30 · H-021"],
      ["16400667", "Upper floor to ground floor", 14, "Planned", "G34 · 102-A"],
      ["14589504", "Family flat request", 15, "Pending", ""],
      ["12476430", "From Group 26 to Group 34", 8, "Done", "G34 · 108-B"],
      ["12046145", "Live-in", 4, "Rejected by resident", "G26 · 203-B"],
    ].map(([wo, type, score, action, plan], i): WaitingEntry => {
      const r = occupiedRes[30 + i * 7]
      return { id: `w${i + 2}`, workOrder: String(wo), residentId: r.id, name: r.name, empNo: r.kfmcId, currentUnit: unitLabel(r.unitId), hireDate: r.arrival, requestType: String(type), action: action as WaitingEntry["action"], score: Number(score), unitPlan: String(plan), addedAt: iso(20 + i * 11) }
    }),
  ]
  return { groups, units, residents, movements, requests, waiting, seq: 412 }
}

export const housingKey = "kfmc-housing-v1"
export function loadHousing(): HousingDb {
  try {
    const data = JSON.parse(localStorage.getItem(housingKey) || "null")
    if (data?.units && data?.requests) return data
  } catch {
    /* reseed */
  }
  return seedHousing()
}
export function saveHousing(db: HousingDb) {
  localStorage.setItem(housingKey, JSON.stringify(db))
}
export const unitName = (db: HousingDb, id?: string) => {
  const u = db.units.find((x) => x.id === id)
  if (!u) return "—"
  const g = db.groups.find((x) => x.id === u.group)
  return `${g?.code || u.group} · ${u.building} · ${u.unit}`
}
