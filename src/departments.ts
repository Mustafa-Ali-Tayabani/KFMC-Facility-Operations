/**
 * Department structure of the Facility Support Services programme
 * (مشروع نظام الإدارة التنفيذية للخدمات المساندة للمرافق).
 * Each department has its own login accounts, roles and workspace.
 */
export type DeptId = "housekeeping" | "housing" | "food" | "executive"
export type AppKind = "web" | "mobile"

export type Department = {
  id: DeptId
  name: string
  nameAr: string
  unit: string
  contractor: string
  tagline: string
  color: string
}

export const departments: Department[] = [
  {
    id: "housekeeping",
    name: "Housekeeping",
    nameAr: "قسم النظافة",
    unit: "Environmental Services Department · Housekeeping Section",
    contractor: "Zahran Company",
    tagline: "Daily, discharge & terminal cleaning, UV & fumigation",
    color: "#20775b",
  },
  {
    id: "housing",
    name: "Housing",
    nameAr: "إدارة الإسكان",
    unit: "Housing Planning & Residents Relations",
    contractor: "KFMC Housing Administration",
    tagline: "Units, residents, accommodation, relocation & evacuation",
    color: "#3d4f9a",
  },
  {
    id: "food",
    name: "Food & Nutrition",
    nameAr: "خدمات الغذاء والتغذية",
    unit: "Food & Nutrition Services Department · Food Safety Section",
    contractor: "Dar Al-Moadat (SMEH) · Contract 16019447",
    tagline: "HACCP CCP/OPRP records, patient meals, monthly extract",
    color: "#c27a12",
  },
  {
    id: "executive",
    name: "Support Services Management",
    nameAr: "إدارة الخدمات المساندة",
    unit: "Executive Management · Facility Support Services",
    contractor: "KFMC",
    tagline: "Cross-department compliance, approvals and occupancy",
    color: "#163e32",
  },
]

export type Account = {
  username: string
  password: string
  role: string
  dept: DeptId
  apps: AppKind[]
  /** Display name used for signatures and "assigned to me" filters. */
  person: string
}

export const accounts: Account[] = [
  // Housekeeping — the original operations workspace plus the Zahran / KFMC sign-off chain.
  { username: "supervisor", password: "sup123", role: "Supervisor", dept: "housekeeping", apps: ["web", "mobile"], person: "Faisal Al-Harbi" },
  { username: "teamlead", password: "lead123", role: "Team Leader", dept: "housekeeping", apps: ["mobile", "web"], person: "Khalid Al-Otaibi" },
  { username: "gensup", password: "gs123", role: "General Supervisor", dept: "housekeeping", apps: ["web"], person: "Tariq Al-Zahrani" },
  { username: "hkhead", password: "head123", role: "Housekeeping Section Head", dept: "housekeeping", apps: ["web"], person: "Madeah Al-Shehri" },
  { username: "ops", password: "ops123", role: "Operations Manager", dept: "housekeeping", apps: ["web"], person: "Reem Al-Salem" },
  { username: "storekeeper", password: "store123", role: "Storekeeper", dept: "housekeeping", apps: ["web"], person: "Layla Al-Mansour" },
  { username: "cleaner", password: "clean123", role: "Cleaner", dept: "housekeeping", apps: ["mobile"], person: "Sara Ahmed" },
  { username: "guard", password: "guard123", role: "Guard", dept: "housekeeping", apps: ["mobile"], person: "Omar Hassan" },
  { username: "admin", password: "admin123", role: "QBS Admin", dept: "housekeeping", apps: ["web"], person: "Nasser Al-Qahtani" },
  // Housing
  { username: "hcoord", password: "coord123", role: "Housing Coordinator", dept: "housing", apps: ["web"], person: "Hessa Al-Dossary" },
  { username: "hsup", password: "hsup123", role: "Housing Supervisor", dept: "housing", apps: ["web", "mobile"], person: "Mansour Al-Ghamdi" },
  { username: "hplan", password: "plan123", role: "Planning Unit Head", dept: "housing", apps: ["web"], person: "Bandar Al-Rashid" },
  { username: "hchair", password: "chair123", role: "Housing Chairperson", dept: "housing", apps: ["web"], person: "Dr. Mona Al-Saud" },
  { username: "hmaint", password: "maint123", role: "Maintenance Supervisor", dept: "housing", apps: ["mobile", "web"], person: "Yasser Al-Harthi" },
  { username: "resident", password: "res123", role: "Resident", dept: "housing", apps: ["mobile"], person: "Lina Haddad" },
  // Food & Nutrition
  { username: "chef", password: "chef123", role: "Chef", dept: "food", apps: ["mobile", "web"], person: "Chef Ramesh Kumar" },
  { username: "fsteam", password: "fst123", role: "Food Safety Team", dept: "food", apps: ["mobile", "web"], person: "Joy Santos" },
  { username: "fstore", password: "fstore123", role: "Food Storekeeper", dept: "food", apps: ["mobile", "web"], person: "Imran Sheikh" },
  { username: "nutsup", password: "nut123", role: "Nutrition Supervisor", dept: "food", apps: ["mobile", "web"], person: "Aisha Al-Qarni" },
  { username: "fss", password: "fss123", role: "Food Safety Specialist", dept: "food", apps: ["web", "mobile"], person: "Hanan Al-Buraidi" },
  { username: "smeh", password: "smeh123", role: "Contractor Management", dept: "food", apps: ["web"], person: "Ahmed Azab" },
  { username: "fsection", password: "fsec123", role: "Food Safety Section", dept: "food", apps: ["web"], person: "Ahlam Al-Qahtani" },
  // Executive
  { username: "director", password: "dir123", role: "Support Services Director", dept: "executive", apps: ["web"], person: "Eng. Ahmed Al-Kathiri" },
]

export const deptOf = (id: DeptId) => departments.find((d) => d.id === id) || departments[0]
export const rolesOf = (dept: DeptId) => accounts.filter((a) => a.dept === dept)
export const accountFor = (role: string) => accounts.find((a) => a.role === role)
