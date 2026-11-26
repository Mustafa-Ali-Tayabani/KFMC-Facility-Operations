/**
 * Digital versions of the departments' official paper forms.
 * Every template is data: header fields, grid sections (rows × columns),
 * critical limits and the sign-off chain printed at the foot of the paper form.
 */
import type { DeptId } from "./departments"
import { ppmAreas } from "./ppm-data"

export type ColType = "yesno" | "sumna" | "temp" | "number" | "text" | "time" | "date" | "select" | "multi" | "rating"
export type Limit = { min?: number; max?: number }
export type Column = {
  key: string
  label: string
  type: ColType
  options?: string[]
  unit?: string
  min?: number
  max?: number
  /** Answers that count as a non-conformity (select / yesno). */
  flagOn?: string[]
  /** Limit chosen by another value in the same row or the form header (e.g. Hot / Cold, Chiller / Freezer). */
  limitsBy?: { key: string; map: Record<string, Limit> }
  /** Time must be within N minutes after another time column in the row. */
  within?: { from: string; minutes: number }
  /** Dates before today are non-conforming (expiry dates). */
  future?: boolean
  /** Pre-filled value (e.g. the planned PPM week). */
  default?: string
}
export type Section = {
  title: string
  rows: string[]
  columns: Column[]
  /** Rows are typed in by the user (rooms, products, staff…); `rows` are suggestions. */
  addRows?: string
  /** Per-row limits for the first temperature column. */
  rowLimits?: Record<string, Limit>
  /** Rows where a "Yes" answer is the non-conformity (negatively worded questions). */
  inverted?: string[]
  note?: string
  /** Rows chosen by a header value (PPM area → equipment, hospital → wards). */
  rowsBy?: { key: string; map: Record<string, string[]> }
  /** Columns chosen by a header value (hospital → ward columns). */
  columnsBy?: { key: string; map: Record<string, Column[]> }
  /** An out-of-limit reading needs a re-check after N minutes; still out → flagged for inspection. */
  recheck?: number
}
export type HeaderField = { key: string; label: string; type?: "text" | "select" | "date" | "time" | "number"; options?: string[]; optionsBy?: { key: string; map: Record<string, string[]> } }
export type Step = { label: string; title: string; org: string; roles: string[] }
export type FormTemplate = {
  id: string
  code: string
  title: string
  titleAr?: string
  dept: Exclude<DeptId, "executive">
  category: string
  frequency: "Per shift" | "Daily" | "Per meal" | "Per delivery" | "Per event" | "Weekly" | "Monthly"
  source: string
  header: HeaderField[]
  sections: Section[]
  limits?: string[]
  chain: Step[]
  photoRequired?: boolean
  /** Header field used to group records in the monthly register (room, fridge, area…). */
  registerKey?: string
}

/* ───────────── Sign-off chains, as printed on the forms ───────────── */
const HK_CHAIN: Step[] = [
  { label: "Team Leader initial", title: "Assigned Team Leader", org: "Zahran Company", roles: ["Team Leader", "Supervisor"] },
  { label: "Checked by", title: "Supervisor", org: "Zahran Company", roles: ["Supervisor"] },
  { label: "Reviewed by", title: "General Supervisor", org: "Zahran Company", roles: ["General Supervisor"] },
  { label: "Approved by", title: "Housekeeping Section Head", org: "King Fahad Medical City", roles: ["Housekeeping Section Head"] },
]
const FOOD_CHAIN: Step[] = [
  { label: "Inspected by", title: "Chef / Food Safety Team", org: "Contractor", roles: ["Chef", "Food Safety Team"] },
  { label: "Noted by", title: "Food Safety Specialist", org: "Contractor", roles: ["Food Safety Specialist"] },
  { label: "Reviewed by", title: "Management of Contractor", org: "SMEH", roles: ["Contractor Management"] },
  { label: "Approved by", title: "Food Safety Section", org: "King Fahad Medical City", roles: ["Food Safety Section"] },
]
const CLEAN_CHAIN: Step[] = [
  { label: "Checked by", title: "Cleaning Supervisor", org: "Contractor", roles: ["Food Safety Team", "Chef"] },
  ...FOOD_CHAIN.slice(1),
]
const STORE_CHAIN: Step[] = [
  { label: "Store keeper", title: "Store Keeper", org: "Contractor", roles: ["Food Storekeeper"] },
  { label: "Food safety officer", title: "Food Safety Officer", org: "Contractor", roles: ["Food Safety Specialist"] },
  { label: "Nutrition in-charge", title: "KFMC Nutrition In-charge", org: "King Fahad Medical City", roles: ["Food Safety Section"] },
]
const NUT_CHAIN: Step[] = [
  { label: "Evaluated / inspected by", title: "Nutrition Supervisor", org: "Contractor", roles: ["Nutrition Supervisor"] },
  { label: "Evaluated by", title: "Food Safety Specialist", org: "Contractor", roles: ["Food Safety Specialist"] },
  { label: "Review & action", title: "Project Manager / Asst. Project Manager", org: "SMEH", roles: ["Contractor Management"] },
  { label: "Approved by", title: "KFMC Food & Nutrition Specialist", org: "King Fahad Medical City", roles: ["Food Safety Section"] },
]
const FN_DEPT: Step = { label: "Approved by", title: "Food & Nutrition Services Department", org: "King Fahad Medical City", roles: ["F&N Services Department"] }
const WASTE_CHAIN: Step[] = [
  { label: "Inspected by", title: "Food Safety Specialist", org: "Contractor", roles: ["Food Safety Team", "Food Safety Specialist"] },
  { label: "Noted by", title: "SMEH Management", org: "SMEH", roles: ["Contractor Management"] },
  { label: "Reviewed by", title: "KFMC Food & Nutrition Specialist", org: "King Fahad Medical City", roles: ["Food Safety Section"] },
  FN_DEPT,
]

/* ───────────── Shared field sets ───────────── */
const YN: Column = { key: "done", label: "Done", type: "yesno" }
export const hospitals = ["Main Hospital", "Maternity Hospital", "Children's Hospital", "Rehabilitation Hospital"]
/** Wards per hospital for meal traceability. Maternity is from the client form; the other lists are placeholders until the client sends them. */
export const hospitalWards: Record<string, string[]> = {
  "Main Hospital": ["ER", "ICU", "CCU", "Ward 4A", "Ward 4B", "Ward 5A", "Ward 5B", "Ward 6A"],
  "Maternity Hospital": ["2-4", "3-3", "M-1-H", "2-1", "2-2", "ICU", "2-3", "3-1", "3-4"],
  "Children's Hospital": ["PICU", "NICU", "Ped Ward 1", "Ped Ward 2", "Ped Oncology"],
  "Rehabilitation Hospital": ["Rehab Ward 1", "Rehab Ward 2", "Spinal Unit"],
}
const shifts3 = ["1st", "2nd", "3rd"]
const meals = ["Breakfast", "Lunch", "Dinner", "Iftar", "Sahoor"]
const hk = (key: string, label: string, options?: string[]): HeaderField => ({ key, label, type: options ? "select" : "text", options })
const HOT_COLD = { key: "mode", map: { Hot: { min: 60 }, Cold: { max: 5 } } }

/* ───────────── Housekeeping (Zahran Company / Environmental Services) ───────────── */
const housekeeping: FormTemplate[] = [
  {
    id: "hk-patient-room",
    code: "HK-DC-01",
    title: "Daily Cleaning Checklist · Patient Room & Bathroom",
    titleAr: "قائمة التنظيف اليومي لغرفة المريض ودورة المياه",
    dept: "housekeeping",
    category: "Daily cleaning",
    frequency: "Per shift",
    source: "DAILY CLEANING TERMINAL DISCHARGE patient room CHECKLIST (pg1–3, 2-shift & 3-shift)",
    header: [
      hk("hospital", "Hospital", hospitals),
      hk("floor", "Floor"),
      hk("ward", "Area / Ward"),
      hk("room", "Room #"),
      { key: "date", label: "Date", type: "date" },
      hk("pattern", "Shift schedule", ["3-shift ward", "2-shift ward"]),
      hk("shift", "Shift", shifts3),
      hk("isolation", "Room type", ["Non-isolation", "Isolation"]),
    ],
    sections: [
      {
        title: "Patient room",
        columns: [YN],
        rows: [
          "Prepare the cleaning equipment/solutions — use double bucket and colour-coded mops/cloths",
          "Always perform hand hygiene",
          "Don appropriate PPE",
          "Start from the door; damp dust and disinfect all high-touch surfaces (door handles, knobs, light switches, call box, telephone, window sills & ledges, sink & faucet, soap & paper-towel dispensers, biohazard bin, dry erase marker, over-bed table, chairs, bedside tables, wall-mounted equipment)",
          "Dry mop the floor with easy-trap duster",
        ],
      },
      {
        title: "Patient rest room",
        columns: [YN],
        rows: [
          "Flush the toilet bowl with Sodium Hypochlorite 5.25% — 1:100 dilution (500 ppm = 40 ml + 1 gallon water), 10 minutes contact time",
          "Start with highest surfaces",
          "Clean the shower incl. fixtures and surfaces, sink incl. fixtures, counter area, support bars",
          "Clean the toilet bowl and seat cover LAST",
          "Clean and disinfect the toilet floor",
        ],
      },
      {
        title: "Patient's room floor",
        columns: [YN],
        rows: [
          "Change gloves",
          "Mop floor with hospital-approved disinfectant — never shake mop",
          "Remove PPE and perform hand hygiene",
          "Call medical waste hotline (18617 & 16122) for collection",
          "Thoroughly clean and disinfect all cleaning equipment and keep dry",
        ],
      },
    ],
    limits: ["Sodium Hypochlorite 5.25% at 1:100 (500 ppm), 10 minutes contact time", "Complete the checklist after the completion of cleaning"],
    chain: HK_CHAIN,
    photoRequired: true,
    registerKey: "room",
  },
  {
    id: "hk-ward-hallway",
    code: "HK-DC-02",
    title: "Daily Cleaning Checklist · Ward / Hallway, Nurse Station & Pantry",
    titleAr: "قائمة التنظيف اليومي للجناح والممرات ومحطة التمريض والمطبخ",
    dept: "housekeeping",
    category: "Daily cleaning",
    frequency: "Per shift",
    source: "STANDARD DAILY CLEANING OF WARD HALLWAY NURSE STATION PANTRY (2-shift & 3-shift weekly schedule)",
    header: [hk("hospital", "Hospital", hospitals), hk("floor", "Floor"), hk("ward", "Area / Ward"), { key: "date", label: "Date", type: "date" }, hk("pattern", "Shift schedule", ["3-shift ward", "2-shift ward"]), { ...hk("shift", "Shift", shifts3), optionsBy: { key: "pattern", map: { "3-shift ward": shifts3, "2-shift ward": ["6am–6pm", "6pm–6am"] } } }],
    sections: [
      {
        title: "Nurse station",
        columns: [YN],
        rows: ["Floor is clean, no dust, no visible dirt", "Cabinets are clean, no dust, no visible dirt", "Washing area has soap and paper towels", "Sink and underneath: no leak, rust & blistering of paint", "Wall: no visible dirt", "Normal waste container is available and clean"],
      },
      {
        title: "Pantry",
        columns: [YN],
        rows: ["Floor is clean, no dust, no visible dirt", "Cabinets are clean, no dust, no visible dirt", "Washing area has soap and paper towels", "Sink and underneath: no leak, rust & blistering of paint", "Wall: no visible dirt", "Microwave oven is clean", "Refrigerator is clean", "Normal waste container is available and clean"],
      },
      {
        title: "Waxing & buffing (as scheduled — N/A when not due)",
        columns: [YN],
        rows: ["Waxing ward hallways", "Waxing main hallway", "Waxing elevator side", "Buffing ward hallways", "Buffing main hallway", "Buffing elevator side"],
      },
      {
        title: "Hallway",
        columns: [YN],
        rows: ["Floor", "Windows", "Ceiling", "AC / exhaust frame", "Mops", "Doors and handles", "Edges and corners", "High dusting", "Frames", "Furniture"],
      },
    ],
    chain: HK_CHAIN,
    photoRequired: true,
    registerKey: "ward",
  },
  ...(["Critical", "Non-critical"] as const).map(
    (area): FormTemplate => ({
      id: `hk-terminal-${area === "Critical" ? "critical" : "noncritical"}`,
      code: area === "Critical" ? "HK-TC-01" : "HK-TC-02",
      title: `Discharge (Isolation Room) & Terminal Cleaning · ${area} Areas`,
      titleAr: "قائمة تنظيف غرف العزل عند الخروج والتنظيف النهائي",
      dept: "housekeeping",
      category: "Discharge & terminal",
      frequency: "Per event",
      source: `discharge iso and terminal cleaning checklist ${area === "Critical" ? "critical" : "non critical"}`,
      header: [hk("hospital", "Hospital", hospitals), hk("area", "Area"), hk("room", "Room no."), { key: "date", label: "Date", type: "date" }, hk("isolationSign", "Isolation sign checked", ["Yes", "No"]), hk("reason", "Trigger", ["Discharge", "Transfer", "Terminal cleaning", "Isolation precautions lifted"])],
      sections: [
        {
          title: "Preparation",
          columns: [YN],
          rows: ["PPE worn", "Used double bucket & colour-coded mop", "Removed & disposed all unwanted/unused disposable equipment", "Curtain removed"],
        },
        {
          title: "Bed — top to bottom, head to foot, left to right (bring bed up to highest position)",
          columns: [YN],
          rows: ["Raised mattress and disinfected top, sides & bottom", "Disinfected exposed frame, bed panels", "Headboard: top, front & back disinfected", "Disinfected side rails, undercarriage or lower ledges", "Disinfected all bed controls", "Disinfected the foot-board top, front & back", "Bed moved outside of the room"],
        },
        {
          title: "Room",
          columns: [YN],
          rows: [
            "Furniture and fittings cleaned with disinfectant and moved outside the room",
            "Curtain racks and all high-level ledges cleaned with detergent & disinfected",
            "TV, shelves on high surfaces cleaned",
            "Walls, door, door handles and structural surfaces cleaned with detergent & disinfected",
            "Floor cleaned with detergent & disinfected",
            "Water on the floor suctioned",
            "Waste bags emptied & relined with new plastic waste bag",
            "All cleaning equipment thoroughly cleaned and returned to storage/janitorial room",
            "New curtains hung by laundry department",
            "Furniture & beds moved back into room",
            "PPE removed",
            "Hand washing / hand hygiene done",
          ],
        },
      ],
      chain: [HK_CHAIN[0], HK_CHAIN[1], HK_CHAIN[2], HK_CHAIN[3]],
      photoRequired: true,
      registerKey: "room",
    }),
  ),
  {
    id: "hk-uv-fumigation",
    code: "HK-UV-01",
    title: "UV & Fumigation Machine Checklist",
    titleAr: "قائمة جهاز الأشعة فوق البنفسجية والتبخير",
    dept: "housekeeping",
    category: "UV & fumigation",
    frequency: "Per event",
    source: "UV & Fumigation CHECKLIST",
    header: [hk("hospital", "Hospital", hospitals), hk("location", "Location"), { key: "date", label: "Date", type: "date" }],
    sections: [
      {
        title: "Treatments",
        addRows: "Room #",
        rows: [],
        columns: [
          { key: "machine", label: "Machine", type: "select", options: ["UV", "Fogging"] },
          { key: "start", label: "Start", type: "time" },
          { key: "end", label: "End", type: "time" },
          { key: "duration", label: "Duration (min)", type: "number" },
          { key: "nurse", label: "Counter-checked by nurse (name)", type: "text" },
          { key: "by", label: "Initiated by housekeeping (name / file #)", type: "text" },
        ],
      },
    ],
    chain: HK_CHAIN,
    photoRequired: true,
    registerKey: "location",
  },
]

/* ───────────── Food & Nutrition Services (HACCP / FSMS) ───────────── */
const fh = {
  date: { key: "date", label: "Date", type: "date" } as HeaderField,
  meal: { key: "meal", label: "Meal", type: "select", options: meals } as HeaderField,
  site: { key: "site", label: "Location", type: "select", options: ["Kitchen", "Cafeteria"] } as HeaderField,
  shift: { key: "shift", label: "Shift", type: "select", options: ["1st Shift", "2nd Shift"] } as HeaderField,
}
const kitchenAreas = ["Receiving area", "Vegetable & salad room", "Fish room", "Bakery", "Butcher room", "Formula room", "Hot kitchen", "Tray line area", "Cafeteria serving side", "Pot wash room", "Dishwash room", "Preparation room", "General & daily store"]
const diets = ["Normal diet", "High fiber", "High calorie & protein", "Postpartum", "Restricted salt", "Restricted fat", "Low fat & cholesterol", "Low sodium", "Diabetic + low salt", "Insulin dependent", "Soft", "Soft DM", "Soft CD", "Soft renal", "Pediatric 1–3 years", "Pediatric 7–12 years", "Renal dialysis", "Renal pre-ESRD 9-B", "Puree diet"]
const rating: Column = { key: "", label: "", type: "rating", options: ["1 Excellent", "2 Acceptable", "3 Not acceptable"], flagOn: ["3 Not acceptable"] }
const stores = ["Cold Room 1 – Water", "Cold Room 2 – Dairy", "Cold Room 3 – Vegetables", "Chiller – Tray line", "Freezer 1 – Meat & poultry", "Freezer 2 – Fish"]

const food: FormTemplate[] = [
  {
    id: "ccp-01", code: "CCP-RF-01", title: "Sanitation of Fruits & Vegetables", dept: "food", category: "CCP records", frequency: "Per meal",
    source: "CCP RF 01 (Sanitations Fruits & Veg)", header: [fh.date, fh.meal, { key: "sanitizer", label: "Sanitizer", type: "text" }],
    sections: [{
      title: "Sanitizing", addRows: "Product", rows: ["Orange", "Apple", "Pears", "Tomato", "Carrots", "Cucumber"],
      columns: [
        { key: "tablets", label: "Tablets", type: "number" },
        { key: "litres", label: "Litres of water", type: "number" },
        { key: "contact", label: "Contact time (min)", type: "number" },
        { key: "ppm", label: "Test strip (ppm)", type: "number", min: 25, unit: "ppm" },
      ],
    }],
    limits: ["Chlorine tablet: 1 tablet in 40 litres of water = 25 ppm", "Test strip: read the colour code per the chlorine ppm instructions"],
    chain: [FOOD_CHAIN[0], { ...FOOD_CHAIN[1], label: "Reviewed by" }, { ...FOOD_CHAIN[2], label: "Noted by" }, FOOD_CHAIN[3]],
  },
  {
    id: "ccp-02", code: "CCP-RF-02", title: "Product Cooking — Final Internal Temperature", dept: "food", category: "CCP records", frequency: "Per meal",
    source: "CCP 02 - product cooking (Kitchen & Cafeteria)", header: [fh.date, fh.meal, fh.site],
    sections: [
      {
        title: "Regular menu", rows: ["Arabic rice", "White rice", "Soup of the day", "Potatoes", "Lamb", "Grilled chicken", "Fish", "Macaroni", "Fried lamb / beef / chicken", "Vegetable"],
        columns: [{ key: "temp", label: "Final internal temp", type: "temp", unit: "°C" }],
        rowLimits: { Lamb: { min: 74 }, "Grilled chicken": { min: 74 }, Fish: { min: 66 }, "Fried lamb / beef / chicken": { min: 74 }, "Arabic rice": { min: 60 }, "White rice": { min: 60 }, "Soup of the day": { min: 60 }, Potatoes: { min: 60 }, Macaroni: { min: 60 }, Vegetable: { min: 60 } },
      },
      {
        title: "Diet food", rows: ["Rice", "Chicken", "Fish", "Lamb", "Vegetables", "Jareesh", "Saleeq", "Soup"],
        columns: [{ key: "temp", label: "Final internal temp", type: "temp", unit: "°C" }],
        rowLimits: { Chicken: { min: 74 }, Fish: { min: 66 }, Lamb: { min: 74 }, Rice: { min: 60 }, Vegetables: { min: 60 }, Jareesh: { min: 60 }, Saleeq: { min: 60 }, Soup: { min: 60 } },
      },
    ],
    limits: ["Poultry, stuffed fish, ground beef, minced meat & any meat not specified: 74 °C (165 °F)", "Fish: 66 °C (150 °F)", "Non-meat items are checked against the hot-food limit of 60 °C", "Oven and fryer calibration; meticulous personal hygiene"],
    chain: FOOD_CHAIN,
  },
  {
    id: "ccp-03", code: "CCP-RF-03", title: "Hot / Cold Holding", dept: "food", category: "CCP records", frequency: "Per meal",
    source: "CCP 03 - holding (Kitchen & Cafeteria)", header: [fh.date, fh.meal, fh.site],
    sections: [{
      title: "Holding temperatures", addRows: "Product", rows: ["Pan cake", "French toast", "Shakshuka", "Egg (boiled / fried / omelette)", "Fried lamb / beef / chicken", "Lentil", "Foul"],
      columns: [
        { key: "mode", label: "Hot / Cold", type: "select", options: ["Hot", "Cold"] },
        { key: "temp", label: "Temperature", type: "temp", unit: "°C", limitsBy: HOT_COLD },
      ],
    }],
    limits: ["Hot food above 60 °C (140 °F)", "Cold food 5 °C (41 °F) or below"],
    chain: FOOD_CHAIN,
  },
  {
    id: "ccp-04", code: "CCP-CF-04 A/B", title: "Tray Set-up / Service · Hot & Cold Transportation", dept: "food", category: "CCP records", frequency: "Per meal",
    source: "CCP 04 A and B (incl. Ramadan)", header: [fh.date, fh.meal],
    sections: [{
      title: "Dispatch to wards", addRows: "Delivery area", rows: [],
      columns: [
        { key: "product", label: "Product", type: "text" },
        { key: "mode", label: "Hot / Cold", type: "select", options: ["Hot", "Cold"] },
        { key: "tDispatch", label: "Time at dispatch", type: "time" },
        { key: "temp", label: "Temp at dispatch", type: "temp", unit: "°C", limitsBy: HOT_COLD },
        { key: "tWard", label: "Time at ward", type: "time", within: { from: "tDispatch", minutes: 60 } },
        { key: "tempWard", label: "Temp at ward", type: "temp", unit: "°C", limitsBy: HOT_COLD },
      ],
    }],
    limits: ["Hot food above 60 °C, cold food 5 °C or below", "Deliver food to wards within 1 hour; food must be consumed within the next hour", "Time and temperature checked randomly to verify the process"],
    chain: FOOD_CHAIN,
  },
  {
    id: "oprp-01", code: "OPRP-RF-01", title: "Receiving of Chilled Products", dept: "food", category: "OPRP records", frequency: "Per delivery",
    source: "OPRP RF 01", header: [fh.date, { key: "time", label: "Time", type: "time" }],
    sections: (["Vegetables / fruits", "Meat / chicken", "Frozen items"] as const).map((title) => ({
      title, addRows: "Product / material", rows: [],
      columns: [
        { key: "supplier", label: "Supplier", type: "text" },
        { key: "qty", label: "Qty kg", type: "number" },
        { key: "temp", label: "Received temp", type: "temp", unit: "°C", ...(title === "Frozen items" ? { max: -18 } : { max: 5 }) },
        { key: "expiry", label: "Expiry", type: "date", future: true },
      ] as Column[],
    })),
    limits: ["Chilled products received at 5 °C or below", "Frozen items received at −18 °C or below (frozen-goods standard)", "Expired products are rejected"],
    chain: STORE_CHAIN,
  },
  {
    id: "oprp-02", code: "OPRP-RF-02", title: "Chilled Products Storage", dept: "food", category: "OPRP records", frequency: "Daily",
    source: "OPRP 02 Chilled Products Storage", header: [{ key: "unit", label: "Refrigerator / freezer no.", type: "select", options: stores }, { key: "kind", label: "Unit type", type: "select", options: ["Chiller", "Freezer"] }, fh.date],
    sections: [{
      title: "Readings", rows: ["5:00 AM", "9:00 AM", "1:00 PM", "5:00 PM", "9:00 PM"],
      columns: [{ key: "temp", label: "Temperature", type: "temp", unit: "°C", limitsBy: { key: "kind", map: { Chiller: { max: 5 }, Freezer: { max: -18 } } } }],
    }],
    limits: ["Chiller 5 °C or below; freezer −18 °C or below"],
    chain: FOOD_CHAIN, registerKey: "unit",
  },
  {
    id: "oprp-03", code: "OPRP-RF-03", title: "Cold Meal Portioning", dept: "food", category: "OPRP records", frequency: "Per meal",
    source: "OPRP 03 - COLD MEAL PORTIONING", header: [fh.date, fh.meal],
    sections: [{
      title: "Portioning", addRows: "Product", rows: [],
      columns: [
        { key: "start", label: "Start", type: "time" },
        { key: "end", label: "End", type: "time", within: { from: "start", minutes: 30 } },
        { key: "temp", label: "Temp", type: "temp", unit: "°C", max: 14 },
        { key: "surfaces", label: "Food-contact surfaces sanitized", type: "yesno" },
        { key: "gloves", label: "Gloves & hand sanitizer used", type: "yesno" },
        { key: "hygiene", label: "Personal hygiene maintained", type: "yesno" },
      ],
    }],
    limits: ["Exposure to ambient temperature max 30 minutes", "Product temperature max 14 °C (59 °F)", "Hats / hair nets worn by all employees"],
    chain: FOOD_CHAIN,
  },
  {
    id: "oprp-04", code: "OPRP-RF-04", title: "Product Cooling", dept: "food", category: "OPRP records", frequency: "Per event",
    source: "OPRP 04", header: [fh.date],
    sections: [{
      title: "Cooling", addRows: "Product", rows: [],
      columns: [
        { key: "initial", label: "Initial temp", type: "temp", unit: "°C" },
        { key: "start", label: "Start time at 60 °C", type: "time" },
        { key: "temp", label: "Temp after 2 hours", type: "temp", unit: "°C", max: 10 },
        { key: "end", label: "Time", type: "time", within: { from: "start", minutes: 120 } },
      ],
    }],
    limits: ["Cool from 60 °C to 10 °C within two hours"],
    chain: FOOD_CHAIN,
  },
  {
    id: "oprp-05", code: "OPRP-RF-05", title: "Shelf Life Control", dept: "food", category: "OPRP records", frequency: "Daily",
    source: "OPRP 05 - shelf life control", header: [fh.date],
    sections: [{
      title: "Products", addRows: "Product", rows: ["Sponges", "Cakes", "Jelly", "Mahalabia", "Cream caramel", "Cookies", "Dream whip", "Sweet fruits", "Custard"],
      columns: [
        { key: "location", label: "Food store / fridge no.", type: "text" },
        { key: "kind", label: "P / B", type: "select", options: ["P · Purchased ready-to-eat", "B · Prepared in bulk"] },
        { key: "expiry", label: "Expiry date", type: "date", future: true },
        { key: "undated", label: "Un-dated", type: "yesno", flagOn: ["Yes"] },
      ],
    }],
    chain: [FOOD_CHAIN[0], FOOD_CHAIN[1], FOOD_CHAIN[2], { label: "Approved by", title: "Food Production Section", org: "King Fahad Medical City", roles: ["Food Safety Section"] }],
  },
  {
    id: "oprp-06", code: "OPRP-RF-06", title: "Dish Washing Machine", dept: "food", category: "OPRP records", frequency: "Daily",
    source: "OPRP 06", header: [fh.date],
    sections: [{
      title: "Readings", rows: ["5:00 AM", "9:00 AM", "1:00 PM", "5:00 PM", "9:00 PM"], recheck: 15,
      columns: [
        { key: "t1", label: "Temp 1 · Pre-wash", type: "temp", unit: "°C", min: 40, max: 50 },
        { key: "t2", label: "Temp 2 · Power wash 1", type: "temp", unit: "°C", min: 60, max: 65 },
        { key: "t3", label: "Temp 3 · Power wash 2", type: "temp", unit: "°C", min: 60, max: 65 },
        { key: "t4", label: "Temp 4 · Power rinse", type: "temp", unit: "°C", min: 60, max: 70 },
        { key: "t5", label: "Temp 5 · Final rinse", type: "temp", unit: "°C", min: 82, max: 85 },
        { key: "t6", label: "Temp 6 · Drying", type: "temp", unit: "°C", min: 65, max: 75 },
        { key: "checkedBy", label: "Checked by", type: "text" },
      ],
    }],
    limits: ["Pre-wash 40–50 °C · power wash 1 & 2 60–65 °C · power rinse 60–70 °C · final rinse 82–85 °C (critical: never below 82 °C) · drying 65–75 °C", "An out-of-range reading is re-checked after 15 minutes; if still out, it is flagged for inspection"],
    chain: [{ label: "Checked by", title: "Maintenance Technician", org: "Contractor", roles: ["Maintenance Technician"] }, ...FOOD_CHAIN.slice(1)],
  },
  {
    id: "fryer-temp", code: "ID-FMSM FRYER-TEMP", title: "Fryer Temperature", dept: "food", category: "Equipment", frequency: "Daily",
    source: "FRYER TEMPERATURE", header: [{ key: "fryer", label: "Fryer", type: "text" }, fh.site, fh.date],
    sections: [{ title: "Readings", rows: ["Reading 1", "Reading 2"], columns: [{ key: "time", label: "Time", type: "time" }, { key: "temp", label: "Temp", type: "temp", unit: "°C" }] }],
    chain: FOOD_CHAIN, registerKey: "fryer",
  },
  {
    id: "oil-quality", code: "OIL-QUALITY", title: "Oil Quality", dept: "food", category: "Equipment", frequency: "Daily",
    source: "OIL QUALITY FORM", header: [{ key: "fryer", label: "Fryer", type: "text" }, fh.site, fh.date],
    sections: [{
      title: "Readings", rows: ["Reading 1", "Reading 2"],
      columns: [
        { key: "time", label: "Time", type: "time" },
        { key: "temp", label: "Temp", type: "temp", unit: "°C" },
        { key: "eval", label: "Evaluation", type: "select", options: ["Green", "Yellow", "Red"], flagOn: ["Yellow", "Red"] },
      ],
    }],
    limits: ["Green: good oil quality", "Yellow: medium quality — exclude", "Red: bad quality — exclude"],
    chain: FOOD_CHAIN, registerKey: "fryer",
  },
  {
    id: "room-temp", code: "KFMC-FSMS-PRP:ATT:04", title: "Daily Room Temperature Monitoring", dept: "food", category: "Monitoring", frequency: "Daily",
    source: "Room temperature monitoring", header: [{ key: "room", label: "Room / location", type: "select", options: ["Plastic store / formula", "Dry store", "General store", "Daily store", "Bakery"] }, fh.date],
    sections: [{ title: "Readings", rows: ["5:00 AM", "1:00 PM", "9:00 PM"], recheck: 15, columns: [{ key: "temp", label: "Temp", type: "temp", unit: "°C", max: 24.5 }, { key: "humidity", label: "Humidity", type: "number", unit: "%" }] }],
    limits: ["Room temperature 24.5 °C or below", "An out-of-range reading is re-checked after 15 minutes, with the corrective action recorded"],
    chain: [{ label: "Checked by", title: "Food Safety Specialist", org: "Contractor", roles: ["Food Safety Specialist", "Food Safety Team"] }, { label: "Reviewed by", title: "Management of Contractor", org: "SMEH", roles: ["Contractor Management"] }, FOOD_CHAIN[3]],
    registerKey: "room",
  },
  {
    id: "water", code: "KFMC-FSMS-PRP:ATT:02", title: "Daily Water Physical Inspection", dept: "food", category: "Monitoring", frequency: "Daily",
    source: "DAILY WATER PHYSICAL INSPECTION CHECKLIST", header: [fh.date],
    sections: [{ title: "Criteria", rows: ["Colour — colourless", "Smell — odourless", "Taste", "Visibility — clear, no cloudiness"], columns: [{ key: "ok", label: "Meets criteria", type: "yesno" }] }],
    chain: FOOD_CHAIN,
  },
  {
    id: "hand-washing", code: "KFMC-FSMS-PRP:ATT:03-B", title: "Inspection of Hand Washing Stations", dept: "food", category: "Hygiene", frequency: "Per shift",
    source: "Hand washing", header: [fh.date, fh.shift],
    sections: [{
      title: "Stations", rows: ["01 Receiving area", "02 Vegetable & salad room", "03 Fish room", "04 Bakery", "05 Butcher room", "06 Formula room", "07 Tray line area", "08 Cafeteria – serving side", "09 Cafeteria – dining area (male)", "10 Cafeteria – dining area (female)"],
      columns: [{ key: "water", label: "Hot & cold water", type: "yesno" }, { key: "soap", label: "Soap / disinfectant", type: "yesno" }, { key: "dryer", label: "Hand dryer", type: "yesno" }],
    }],
    chain: FOOD_CHAIN,
  },
  {
    id: "hygiene", code: "KFMC-PRP-APT:03-01", title: "Personal Hygiene Checklist", dept: "food", category: "Hygiene", frequency: "Daily",
    source: "PERSONAL HYGIENE CHECKLIST", header: [fh.date, { key: "area", label: "Area", type: "text" }],
    sections: [{
      title: "Staff", addRows: "Name / ID · job title", rows: [],
      columns: ["Health status", "Proper uniform / shoes", "PPE", "Trimmed hair / shaved", "Nails & jewellery", "No gum, drinking & eating", "No cuts, boils or abscess"].map((label, i) => ({ key: `h${i}`, label, type: "yesno" as const })),
    }],
    chain: WASTE_CHAIN,
  },
  {
    id: "pest", code: "PEST-CONTROL", title: "Pest Control Prevention Sheet", dept: "food", category: "Hygiene", frequency: "Per event",
    source: "PEST CONTROL PREVENTION SHEET", header: [{ key: "date", label: "Date of visit", type: "date" }, { key: "contractor", label: "Pest control contractor", type: "text" }],
    sections: [{
      title: "Installed areas", addRows: "Area",
      rows: ["Receiving area", "Lockers room", "General store room", "Salad room", "Vegetable room", "Butcher room", "Fish room", "Bakery room", "In-patient formula room", "Preparation room", "Daily store room", "Hot kitchen", "Tray line", "Male staff dining area", "Cafeteria", "Pot wash room", "Dishwashing room"],
      columns: [
        { key: "method", label: "Treatment", type: "multi", options: ["Fly killers", "Rat glue traps", "Sprayed", "Baits"] },
        { key: "product", label: "Products used", type: "text" },
        { key: "sighted", label: "Pest sighted?", type: "yesno", flagOn: ["Yes"] },
        { key: "types", label: "Types & number", type: "text" },
        { key: "dosage", label: "Dosage range", type: "text" },
        { key: "targeted", label: "Targeted areas", type: "text" },
        { key: "remarks", label: "Remarks", type: "text" },
      ],
    }],
    chain: [
      { label: "Treated by", title: "Pest Control Contractor", org: "Pest control company", roles: ["Pest Control Contractor"] },
      { label: "Checked by", title: "Food Safety Officer", org: "Contractor", roles: ["Food Safety Specialist"] },
      { label: "Reviewed by", title: "Project Manager", org: "SMEH", roles: ["Contractor Management"] },
      { label: "Approved by", title: "KFMC Dietician Specialist", org: "King Fahad Medical City", roles: ["Food Safety Section"] },
    ],
  },
  {
    id: "cleaning-schedule", code: "KFMC-FSMS-PRP:ATT:03", title: "Cleaning Checklist and Schedule", dept: "food", category: "Cleaning", frequency: "Daily",
    source: "Cleaning Checklist and Schedule", header: [{ key: "area", label: "Area", type: "select", options: kitchenAreas }, fh.date],
    sections: [{ title: "Items", rows: ["Wash basin #01", "Sink #02", "Table #03", "Table #04", "Air shower machine #05", "Floor", "Wall", "Ceiling & vents"], columns: [{ key: "done", label: "Cleaned", type: "yesno" }] }],
    chain: CLEAN_CHAIN, registerKey: "area",
  },
  {
    id: "atp", code: "KFMC-FSMS-PRP:ATT:05A", title: "Cleaning Verification Log (ATP)", dept: "food", category: "Cleaning", frequency: "Daily",
    source: "Cleaning Verification Log", header: [fh.date],
    sections: [{
      title: "ATP monitoring", addRows: "Area", rows: [],
      columns: [{ key: "rlu", label: "ATP result (RLU)", type: "number" }, { key: "status", label: "Status", type: "select", options: ["Pass", "Fail"], flagOn: ["Fail"] }],
    }],
    chain: FOOD_CHAIN,
  },
  {
    id: "daily-inspection", code: "F&N-DIS", title: "Daily Inspection Summary Report", titleAr: "تقرير ملخص التفتيش اليومي", dept: "food", category: "Inspection", frequency: "Per shift",
    source: "DAILY INSPECTION SUMMARY REPORT (Arabic)", header: [{ key: "date", label: "Date covered", type: "date" }, { key: "shift", label: "Shift", type: "text" }, { key: "type", label: "Type of inspection", type: "select", options: ["Routine", "Daily inspection", "Follow-up"] }, { key: "overall", label: "Departmental review", type: "select", options: ["Excellent", "Good", "Fair", "Poor"] }],
    sections: [{
      title: "Areas", rows: ["Fish room", "Bakery", "Butcher", "Salad room", "Vegetables room", "Formula room (enteral / tube feeding)", "Hot kitchen area", "Tray line set-up", "Cafeteria counter", "Stores", "Chillers and freezers", "Pot wash room", "Receiving area", "Cart wash room", "Dishwash room", "Preparation room", "General & daily store", "Others"],
      columns: [{ key: "rating", label: "Rating", type: "sumna" }, { key: "problem", label: "Problems / deficiency", type: "text" }],
    }],
    limits: ["S = Satisfactory · U = Unsatisfactory · M = Under maintenance / renovation · N/A = Not applicable / temporarily closed"],
    chain: [FOOD_CHAIN[0], FOOD_CHAIN[3]],
  },
  {
    id: "thermo-cal", code: "KFMC-FSMS-PRP:ATT:06", title: "Thermometer Calibration Record", dept: "food", category: "Equipment", frequency: "Monthly",
    source: "Thermometer Calibration Record", header: [fh.date],
    sections: [{
      title: "Thermometers", rows: ["Thermometer #01", "Thermometer #02", "Thermometer #03", "Thermometer #04", "Thermometer #05", "Thermometer #06", "Laser #01", "Laser #02", "Laser #03"],
      columns: [{ key: "location", label: "Location", type: "text" }, { key: "ice", label: "Iced water", type: "temp", unit: "°C", min: -1, max: 1 }, { key: "boil", label: "Boiling water", type: "temp", unit: "°C", min: 99, max: 101 }],
    }],
    limits: ["Reference points 0 °C (iced water) and 100 °C (boiling water); ±1 °C tolerance"],
    chain: [{ label: "Calibrated by", title: "Diet Technician", org: "Contractor", roles: ["Diet Technician"] }, ...FOOD_CHAIN.slice(1)],
  },
  {
    id: "thermo-ack", code: "KFMC-FSMS-PRP:ATT:06A", title: "Thermometer Acknowledgement", dept: "food", category: "Equipment", frequency: "Per event",
    source: "Thermometer Acknowledgement Form", header: [fh.date],
    sections: [{ title: "Issued thermometers", rows: Array.from({ length: 16 }, (_, i) => `Thermometer ${String(i + 1).padStart(2, "0")}`), columns: [{ key: "person", label: "Responsible person", type: "text" }, { key: "received", label: "Date received", type: "date" }, { key: "signature", label: "Signature on receipt", type: "text" }] }],
    limits: ["No approval chain: each responsible person signs on receipt of their thermometer"],
    chain: [{ label: "Issued by", title: "Food Safety Specialist", org: "Contractor", roles: ["Food Safety Specialist", "Food Safety Team"] }],
  },
  {
    id: "ppm", code: "KFMC-FSMS-PRP:ATT:02", title: "PPM Facility Equipment Schedule 2026", dept: "food", category: "Equipment", frequency: "Monthly",
    source: "PPM Facility Equipment Schedule (rev. 26 Aug 2026)", header: [{ key: "month", label: "Month", type: "text" }, { key: "area", label: "Area", type: "select", options: ppmAreas.map((a) => `${a.code} · ${a.name}`) }],
    sections: [{
      title: "Equipment", addRows: "Equipment",
      rows: [], rowsBy: { key: "area", map: Object.fromEntries(ppmAreas.map((a) => [`${a.code} · ${a.name}`, a.equipment])) },
      columns: [{ key: "week", label: "Planned", type: "select", options: ["1st week", "2nd week", "3rd week", "4th week"], default: "1st week" }, { key: "done", label: "PPM done", type: "yesno" }, { key: "doneOn", label: "Date done", type: "date" }],
    }],
    limits: ["Every item is planned for the 1st week of each month (2026 plan)"],
    chain: [{ label: "Reviewed by", title: "Management of Contractor", org: "SMEH", roles: ["Contractor Management"] }, FN_DEPT],
    registerKey: "area",
  },
  {
    id: "dry-qty", code: "F&N-DRY-QC", title: "Dry Items Quantity Control", dept: "food", category: "Stores", frequency: "Per delivery",
    source: "DRY ITEMS QUANTITY CONTROL", header: [{ key: "date", label: "Pre-receiving date", type: "date" }, { key: "after", label: "Following receiving date", type: "date" }],
    sections: [{
      title: "Products",
      rows: ["Alshalan rice", "Jasmine rice", "Misry rice", "Adas", "Jam strawberry", "Jam apricot", "Honey", "Oil", "Macarona big", "Macarona small", "Sugar portion", "Sugar", "Foul medames", "Garlic powder", "Biryani masala", "Black pepper", "White pepper", "Turmeric powder", "Custard powder", "Cumin powder", "Arabic spices", "Curry powder", "Tahina 3 kg", "Milk powder", "Patent flour", "Corn flour", "Tomato paste", "Dates", "White oats", "Ketchup", "Ketchup portion", "Tuna", "Salt", "Nescafe", "Tea", "Jelly", "Vermicelli", "Spaghetti", "Chick peas", "Olive oil portion", "Mayonnaise portion", "Green olives", "Black olives", "Pancake syrup", "Corn flakes", "Mayonnaise"],
      columns: [{ key: "pre", label: "Quantity", type: "number" }, { key: "received", label: "Following receiving", type: "number" }, { key: "stock", label: "Stock (qty)", type: "number" }],
    }],
    chain: STORE_CHAIN,
  },
  {
    id: "dry-receiving", code: "F&N-DRY-RC", title: "Receiving Control Report · Dry Items", dept: "food", category: "Stores", frequency: "Per delivery",
    source: "Receiving Control Report (Dry Items)", header: [fh.date],
    sections: [{ title: "Received", addRows: "Product name", rows: [], columns: [{ key: "maker", label: "Manufacturer", type: "text" }, { key: "qty", label: "Qty", type: "number" }, { key: "prod", label: "Production date", type: "date" }, { key: "expiry", label: "Expiry date", type: "date", future: true }] }],
    chain: STORE_CHAIN,
  },
  {
    id: "food-eval", code: "F&N-FEF", title: "Food Evaluation Form", dept: "food", category: "Patient meals", frequency: "Per meal",
    source: "Food Evaluation Form", header: [fh.date, fh.meal],
    sections: [{
      title: "Diets", rows: diets,
      columns: [{ key: "items", label: "Items", type: "text" }, ...["Appearance", "Tenderness", "Taste", "Maturity"].map((label) => ({ ...rating, key: label.toLowerCase(), label }))],
    }],
    limits: ["1 Excellent · 2 Acceptable · 3 Not acceptable", "Food safety specialist is responsible for maturity; other points are the nutrition supervisor's responsibility"],
    chain: NUT_CHAIN,
  },
  {
    id: "traceability", code: "F&N-MT", title: "Meal Traceability · Diet List Summary", dept: "food", category: "Patient meals", frequency: "Per meal",
    source: "Meal Traceability (Maternity Hospital 1–3 of 3)", header: [fh.date, { key: "hospital", label: "Hospital", type: "select", options: hospitals }, fh.meal],
    sections: [
      {
        title: "Trays per ward",
        rows: ["Normal", "Low fat / low chol", "High fiber", "Low fiber", "Low sodium", "Restricted sodium", "DM", "Renal", "Renal ESRD 9-B", "Renal dialysis", "Insulin dependent", "Restricted fat", "Soft", "Soft DM", "Soft renal", "Soft cardiac", "High cal / high pro", "Liquid", "Postpartum", "Puree", "Lactose free", "Gluten free", "High fat diet", "Tube feeding", "Hepatic (low sodium, low salt, high protein)", "Iodine free", "Iodine free DM", "Low potassium", "Low protein", "Low copper", "Low iron", "Low carbohydrate", "Ketogenic", "G6PD", "GE rate", "Ped 6–12 months", "Ped 1–3 yrs", "Ped 4–6 yrs", "Ped 7–12 yrs"],
        columns: [],
        columnsBy: { key: "hospital", map: Object.fromEntries(hospitals.map((h) => [h, hospitalWards[h].map((w) => ({ key: `w${w}`, label: w, type: "number" as const }))])) },
      },
      {
        title: "Ward sign-off",
        rows: [], rowsBy: { key: "hospital", map: hospitalWards },
        columns: [{ key: "signature", label: "Signature", type: "text" }, { key: "contact", label: "Contact person", type: "text" }, { key: "ext", label: "Extension", type: "text" }, { key: "pager", label: "Pager no.", type: "text" }],
      },
    ],
    chain: [
      { label: "Noted by", title: "Food Safety Specialist", org: "Contractor", roles: ["Food Safety Specialist"] },
      { label: "Reviewed by", title: "KFMC Food & Nutrition Specialist", org: "King Fahad Medical City", roles: ["Food Safety Section"] },
      { label: "Approved by", title: "Head of Food Distribution", org: "King Fahad Medical City", roles: ["Head of Food Distribution"] },
    ],
  },
  {
    id: "patient-meal", code: "F&N-PMI", title: "Patient Meals Daily Inspection Report", dept: "food", category: "Patient meals", frequency: "Daily",
    source: "Patients Meal Daily Inspection Report (Oct 2026)", header: [{ key: "ward", label: "Ward", type: "text" }, fh.date, { key: "type", label: "Type of inspection", type: "select", options: ["Routine", "Follow up"] }, { key: "compliant", label: "Compliant", type: "select", options: ["Yes", "No"] }],
    sections: [{
      title: "Patients visited", addRows: "Room / bed",
      rows: [],
      columns: [
        { key: "mrn", label: "MRN", type: "text" },
        { key: "diet", label: "Diet type", type: "text" },
        { key: "iso", label: "ISO / non-ISO", type: "select", options: ["Non-ISO", "ISO"] },
        { key: "meal", label: "Meal OK (temp & quality)", type: "yesno" },
        { key: "snack", label: "Snack OK", type: "yesno" },
        { key: "comment", label: "Patient's comments", type: "text" },
      ],
    }],
    limits: ["Patients should be asked about meal temperature and quality"],
    chain: [
      { label: "Inspected by", title: "Inspector (Nutrition Supervisor)", org: "Contractor", roles: ["Nutrition Supervisor"] },
      { label: "Review & action", title: "Assistant Project Manager", org: "SMEH", roles: ["Contractor Management"] },
      { label: "Remarks by", title: "KFMC Food & Nutrition Specialist", org: "King Fahad Medical City", roles: ["Food Safety Section"] },
      { label: "Approved by", title: "Head of Section", org: "King Fahad Medical City", roles: ["F&N Services Department"] },
    ],
    registerKey: "ward",
  },
  {
    id: "selective-menu", code: "F&N-SMR", title: "Reasons of Not Distributing the Selective Menu", titleAr: "سبب عدم توزيع قائمة الطعام للمريض", dept: "food", category: "Patient meals", frequency: "Daily",
    source: "Reasons of not distributing the selective menu", header: [{ key: "hospital", label: "Hospital", type: "select", options: hospitals }, { key: "ward", label: "Ward", type: "text" }, fh.date],
    sections: [{
      title: "Patients", addRows: "Room & bed no.", rows: [],
      columns: [{ key: "file", label: "File no.", type: "text" }, { key: "reason", label: "Reason", type: "select", options: ["Sleep", "Not available", "Discharge", "NPO", "Anything (no preference)", "Others"] }, { key: "notes", label: "Notes", type: "text" }],
    }],
    limits: ["Food server informs all patients and companions whose choices were not taken at menu distribution times"],
    chain: [{ label: "Food server", title: "Food Server", org: "Contractor", roles: ["Nutrition Supervisor"] }, { label: "Nut. supervisor action", title: "Nutrition Supervisor", org: "Contractor", roles: ["Nutrition Supervisor"] }, { label: "Asst. PM review", title: "Asst. Project Manager", org: "SMEH", roles: ["Contractor Management"] }],
  },
  {
    id: "tray-trolley", code: "F&N-TTT", title: "Tray and Trolley Tracking Report", dept: "food", category: "Patient meals", frequency: "Per meal",
    source: "Tray and Trolley Tracking Form (Sep 2026)", header: [fh.date, { key: "ward", label: "Ward", type: "text" }, fh.meal],
    sections: [
      {
        title: "Trolley run", rows: ["Trolley"],
        columns: [
          { key: "loaded", label: "Loaded trays", type: "number" },
          { key: "depart", label: "Departure", type: "time" },
          { key: "porter", label: "Porter (sign & ID no.)", type: "text" },
          { key: "arrive", label: "Arrival in ward", type: "time" },
          { key: "start", label: "Start distribution", type: "time" },
          { key: "finish", label: "Finish distribution", type: "time" },
          { key: "distributed", label: "Distributed", type: "number" },
          { key: "isolation", label: "Isolation trays", type: "number" },
          { key: "nurseAck", label: "Isolation trays received by nurse", type: "text" },
          { key: "collected", label: "Collected trays", type: "number" },
          { key: "collector", label: "Collected by (ID no.)", type: "text" },
        ],
      },
      {
        title: "Trays not distributed", addRows: "Room no.", rows: [],
        columns: [{ key: "mrn", label: "MRN", type: "text" }, { key: "diet", label: "Diet", type: "text" }, { key: "trays", label: "Trays", type: "number" }, { key: "reason", label: "Reason", type: "select", options: ["OOP · Out on pass", "CD · Change diet", "SL · Sleeping", "NR · Not in the room", "DC · Discharged", "DF · Dislike food", "O · Others"] }],
        note: "Per CPP Patient Meal Distribution 5.1.16, the nurse draws trays from the hot and cold waiting trolley when not consumed.",
      },
      {
        title: "Second collection · uncollected trays", addRows: "Room no.", rows: [],
        columns: [{ key: "trays", label: "Trays collected", type: "number" }, { key: "time", label: "Time", type: "time" }, { key: "collector", label: "Collected by (name / ID)", type: "text" }, { key: "nurse", label: "Acknowledged by nurse", type: "text" }],
      },
    ],
    chain: [{ label: "Checked by", title: "Nutrition Supervisor", org: "Contractor", roles: ["Nutrition Supervisor"] }, { label: "Reviewed by", title: "Management", org: "SMEH", roles: ["Contractor Management"] }],
    registerKey: "ward",
  },
  {
    id: "ward-inspection", code: "F&N-WIC-2025", title: "Ward Inspection Checklist", dept: "food", category: "Patient meals", frequency: "Daily",
    source: "Ward Inspection Checklist 2025", header: [{ key: "ward", label: "Area of inspection", type: "text" }, fh.date, { key: "time", label: "Time", type: "time" }],
    sections: [{
      title: "Checklist points",
      rows: [
        "Waste and unwanted items removed from the pantry?",
        "Cabinet in the pantry has nutrition formula?",
        "All compartments of the cabinet clean from food waste?",
        "Floor and table of the pantry properly cleaned?",
        "Microwave / hot & cold waiting trolley / fridge properly cleaned?",
        "Hot and cold waiting trolley in condition? (N/A if not provided)",
        "Fridge has food items not belonging to patients?",
        "Fridge has items without patient information / date of storing?",
        "Food in the fridge has spoiled items?",
        "Moving trolley observed with patient meals undistributed?",
        "Hot and cold moving trolley parked in designated area?",
        "Used patient trays observed uncollected?",
        "Any pest observed in the pantry / patient room?",
        "Fridge temperature regularly recorded?",
        "Food waste from patient trays observed in the ward garbage?",
      ],
      inverted: [
        "Fridge has food items not belonging to patients?",
        "Fridge has items without patient information / date of storing?",
        "Food in the fridge has spoiled items?",
        "Moving trolley observed with patient meals undistributed?",
        "Used patient trays observed uncollected?",
        "Any pest observed in the pantry / patient room?",
        "Food waste from patient trays observed in the ward garbage?",
      ],
      columns: [{ key: "answer", label: "Yes / No", type: "yesno" }, { key: "obs", label: "Observation", type: "text" }],
    }],
    chain: [{ label: "Inspector", title: "Nutrition Supervisor", org: "Contractor", roles: ["Nutrition Supervisor"] }, { label: "Reviewed by", title: "Asst. Project Manager", org: "SMEH", roles: ["Contractor Management"] }, { label: "Verified by", title: "KFMC Food & Nutrition Specialist", org: "King Fahad Medical City", roles: ["Food Safety Section"] }],
    registerKey: "ward",
  },
  {
    id: "food-waste", code: "F&N-FW", title: "Food Waste Daily Weighing Record", titleAr: "سجل الوزن اليومي لبقايا الطعام", dept: "food", category: "Monitoring", frequency: "Daily",
    source: "Food Waste (Aug 2026)", header: [fh.date],
    sections: [{
      title: "Weighing", rows: ["Food waste"],
      columns: [{ key: "total", label: "Total weight (kg)", type: "number" }, { key: "unused", label: "Unused (kg)", type: "number" }, { key: "input", label: "Into the machine (kg)", type: "number" }, { key: "compost", label: "Compost output (kg)", type: "number" }],
    }],
    limits: ["Changes in the percentage of food waste are attributed to separation of food from other materials — record remarks"],
    chain: WASTE_CHAIN,
  },
]

export const templates: FormTemplate[] = [...housekeeping, ...food]
export const templateById = (id: string) => templates.find((t) => t.id === id)

/* ───────────── Records ───────────── */
export type Signature = { step: number; label: string; role: string; name: string; at: string; action: "Signed" | "Returned"; comment?: string }
export type FormRecord = {
  id: string
  ref: string
  templateId: string
  header: Record<string, string>
  values: Record<string, string>
  extraRows: Record<number, string[]>
  remarks: string
  photos: string[]
  status: "Draft" | "In review" | "Approved" | "Returned"
  /** Index of the chain step waiting for a signature. */
  step: number
  signatures: Signature[]
  createdBy: string
  createdAt: string
}

export const cellKey = (s: number, r: number, c: string) => `${s}:${r}:${c}`
type RecLike = Pick<FormRecord, "values" | "header" | "extraRows">
export const rowsOf = (t: FormTemplate, rec: Pick<FormRecord, "extraRows" | "header">, s: number) => {
  const sec = t.sections[s]
  const base = sec.rowsBy ? sec.rowsBy.map[rec.header?.[sec.rowsBy.key] || ""] || [] : sec.rows
  return [...base, ...(rec.extraRows[s] || [])]
}
export const colsOf = (t: FormTemplate, rec: Pick<FormRecord, "header">, s: number): Column[] => {
  const sec = t.sections[s]
  return sec.columnsBy ? sec.columnsBy.map[rec.header?.[sec.columnsBy.key] || ""] || [] : sec.columns
}
export const optionsOf = (h: HeaderField, header: Record<string, string>) => (h.optionsBy ? h.optionsBy.map[header[h.optionsBy.key] || ""] || h.options || [] : h.options || [])
/** Stored value, or the column default. */
export const val = (rec: Pick<FormRecord, "values">, s: number, r: number, col: Column) => rec.values[cellKey(s, r, col.key)] ?? col.default ?? ""
export const recheckKey = (s: number, r: number, c: string) => `${s}:${r}:${c}__re`
const toMin = (v: string) => {
  const [h, m] = v.split(":").map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN
}
const today = () => new Date().toISOString().slice(0, 10)

function limitOf(t: FormTemplate, rec: RecLike, s: number, r: number, col: Column): Limit {
  const section = t.sections[s]
  const row = rowsOf(t, rec, s)[r]
  let limit: Limit = { min: col.min, max: col.max }
  if (section.rowLimits?.[row] && colsOf(t, rec, s).find((c) => c.type === "temp")?.key === col.key) limit = section.rowLimits[row]
  if (col.limitsBy) limit = col.limitsBy.map[rec.values[cellKey(s, r, col.limitsBy.key)] || rec.header[col.limitsBy.key] || ""] || limit
  return limit
}
function numberIssue(n: number, limit: Limit, unit = "") {
  if (limit.min !== undefined && n < limit.min) return `${n}${unit} below ${limit.min}${unit}`
  if (limit.max !== undefined && n > limit.max) return `${n}${unit} above ${limit.max}${unit}`
  return ""
}

/** Returns a reason when the cell value is a non-conformity, otherwise "". */
export function cellIssue(t: FormTemplate, rec: RecLike, s: number, r: number, col: Column): string {
  const section = t.sections[s]
  const row = rowsOf(t, rec, s)[r]
  const v = val(rec, s, r, col).trim()
  if (!v) return ""
  if (col.type === "yesno") {
    const bad = col.flagOn || (section.inverted?.includes(row) ? ["Yes"] : ["No"])
    return bad.includes(v) ? `Answered ${v}` : ""
  }
  if (col.type === "sumna") return v === "U" ? "Unsatisfactory" : ""
  if (col.type === "select" || col.type === "rating") return col.flagOn?.includes(v) ? v : ""
  if (col.type === "multi") return v.split(", ").some((x) => col.flagOn?.includes(x)) ? v : ""
  if (col.type === "date") return col.future && v < today() ? "Expired" : ""
  if (col.type === "time" && col.within) {
    const from = toMin(rec.values[cellKey(s, r, col.within.from)] || "")
    const to = toMin(v)
    if (Number.isNaN(from) || Number.isNaN(to)) return ""
    const diff = (to - from + 1440) % 1440
    return diff > col.within.minutes ? `${diff} min (limit ${col.within.minutes})` : ""
  }
  if (col.type === "temp" || col.type === "number") {
    const n = Number(v)
    if (!Number.isFinite(n)) return "Not a number"
    return numberIssue(n, limitOf(t, rec, s, r, col), col.unit)
  }
  return ""
}
export function limitText(t: FormTemplate, rec: RecLike, s: number, r: number, col: Column) {
  const limit = limitOf(t, rec, s, r, col)
  if (limit.min !== undefined && limit.max !== undefined) return `${limit.min}–${limit.max}${col.unit || ""}`
  if (limit.min !== undefined) return `≥ ${limit.min}${col.unit || ""}`
  if (limit.max !== undefined) return `≤ ${limit.max}${col.unit || ""}`
  return ""
}
/** Re-check state of an out-of-limit numeric reading on a section that requires re-checks. */
export function recheckOf(t: FormTemplate, rec: RecLike, s: number, r: number, col: Column): { needed: boolean; value: string; state: "" | "pending" | "resolved" | "inspection" } {
  const needed = Boolean(t.sections[s].recheck && (col.type === "temp" || col.type === "number") && cellIssue(t, rec, s, r, col))
  const value = (rec.values[recheckKey(s, r, col.key)] || "").trim()
  if (!needed) return { needed, value, state: "" }
  if (!value) return { needed, value, state: "pending" }
  const still = numberIssue(Number(value), limitOf(t, rec, s, r, col), col.unit)
  return { needed, value, state: still ? "inspection" : "resolved" }
}

export type Issue = { s: number; r: number; row: string; col: string; reason: string; recheck?: string }
export function issuesOf(t: FormTemplate, rec: RecLike): Issue[] {
  const out: Issue[] = []
  t.sections.forEach((section, s) =>
    rowsOf(t, rec, s).forEach((row, r) =>
      colsOf(t, rec, s).forEach((col) => {
        const reason = cellIssue(t, rec, s, r, col)
        if (!reason) return
        const re = recheckOf(t, rec, s, r, col)
        out.push({ s, r, row, col: col.label, reason, recheck: re.state === "resolved" ? `re-checked ${re.value}${col.unit || ""} after ${section.recheck} min — within limit` : re.state === "inspection" ? `re-checked ${re.value}${col.unit || ""} — still out, flagged for inspection` : re.state === "pending" ? `re-check due in ${section.recheck} min` : undefined })
      }),
    ),
  )
  return out
}
export const needsInspection = (t: FormTemplate, rec: RecLike) => issuesOf(t, rec).some((x) => x.recheck?.includes("inspection"))
/** Every row needs an answer; every non-conformity, "No" or "N/A" needs a corrective action / remark; re-checks must be recorded. */
export function validate(t: FormTemplate, rec: FormRecord): string[] {
  const problems: string[] = []
  t.header.forEach((h) => {
    if (!rec.header[h.key]) problems.push(`${h.label} is required`)
  })
  let empty = 0
  let missingAction = 0
  let missingRecheck = 0
  t.sections.forEach((section, s) => {
    const cols = colsOf(t, rec, s)
    rowsOf(t, rec, s).forEach((_, r) => {
      const answered = cols.some((c) => !c.default && val(rec, s, r, c).trim())
      if (!answered) empty++
      const needsAction = cols.some((c) => cellIssue(t, rec, s, r, c)) || cols.some((c) => (c.type === "yesno" || c.type === "sumna") && val(rec, s, r, c) === "N/A")
      if (needsAction && !(rec.values[cellKey(s, r, "__action")] || "").trim()) missingAction++
      if (cols.some((c) => recheckOf(t, rec, s, r, c).state === "pending")) missingRecheck++
    })
  })
  if (empty) problems.push(`${empty} row${empty === 1 ? " has" : "s have"} no answer`)
  if (missingAction) problems.push(`${missingAction} non-conforming or N/A row${missingAction === 1 ? " needs" : "s need"} a corrective action / remark`)
  if (missingRecheck) problems.push(`${missingRecheck} out-of-limit reading${missingRecheck === 1 ? " needs" : "s need"} the re-check value`)
  if (t.photoRequired && !rec.photos.length) problems.push("Attach at least one photo as evidence")
  return problems
}

export const canSign = (t: FormTemplate, rec: FormRecord, role: string) =>
  rec.status === "In review" && Boolean(t.chain[rec.step]?.roles.includes(role))
export const canFill = (t: FormTemplate, role: string) => t.chain[0].roles.includes(role)

/* ───────────── Housing / store wrapper ───────────── */
export const formsKey = "kfmc-dept-forms-v2"
export type FormsDb = { records: FormRecord[]; seq: Record<string, number> }

export function nextRef(db: FormsDb, t: FormTemplate): [string, FormsDb] {
  const prefix = t.dept === "housekeeping" ? "HK" : "FN"
  const n = (db.seq[prefix] || 1000) + 1
  return [`${prefix}-${n}`, { ...db, seq: { ...db.seq, [prefix]: n } }]
}

function seedForms(): FormsDb {
  const day = (offset: number) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10)
  const at = (h: number) => new Date(Date.now() - h * 3600000).toISOString()
  const records: FormRecord[] = []
  let hk = 1000
  let fn = 1000
  const make = (templateId: string, header: Record<string, string>, fill: (t: FormTemplate) => Record<string, string>, status: FormRecord["status"], step: number, by: string, hoursAgo: number, extraRows: Record<number, string[]> = {}, remarks = "") => {
    const t = templateById(templateId)!
    const ref = t.dept === "housekeeping" ? `HK-${++hk}` : `FN-${++fn}`
    const signatures: Signature[] = []
    const signers: Record<string, string> = { "Team Leader": "Khalid Al-Otaibi", Supervisor: "Faisal Al-Harbi", "General Supervisor": "Tariq Al-Zahrani", "Housekeeping Section Head": "Madeah Al-Shehri", Chef: "Chef Ramesh Kumar", "Food Safety Team": "Joy Santos", "Food Safety Specialist": "Hanan Al-Buraidi", "Contractor Management": "Ahmed Azab", "Food Safety Section": "Ahlam Al-Qahtani", "Food Storekeeper": "Imran Sheikh", "Nutrition Supervisor": "Aisha Al-Qarni", "F&N Services Department": "Dr. Nawal Al-Harbi", "Maintenance Technician": "Sanjay Pillai", "Diet Technician": "Mariam Al-Juhani", "Pest Control Contractor": "Rashid Pest Control", "Head of Food Distribution": "Fahad Al-Mutlaq" }
    const signedUpTo = status === "Approved" ? t.chain.length : status === "Draft" ? 0 : step
    for (let i = 0; i < signedUpTo; i++) {
      const role = t.chain[i].roles[0]
      signatures.push({ step: i, label: t.chain[i].label, role, name: signers[role] || role, at: at(hoursAgo - i * 0.5), action: "Signed" })
    }
    records.push({ id: crypto.randomUUID(), ref, templateId, header, values: fill(t), extraRows, remarks, photos: [], status, step: status === "Approved" ? t.chain.length : step, signatures, createdBy: by, createdAt: at(hoursAgo) })
  }
  const allYes = (t: FormTemplate, extra: Record<string, string> = {}) => {
    const v: Record<string, string> = {}
    t.sections.forEach((section, s) => section.rows.forEach((_, r) => section.columns.forEach((c) => c.type === "yesno" && (v[cellKey(s, r, c.key)] = "Yes"))))
    return { ...v, ...extra }
  }
  // Housekeeping
  const room = { hospital: "Main Hospital", floor: "Floor 4", ward: "Ward 4A", pattern: "3-shift ward", isolation: "Non-isolation" }
  make("hk-patient-room", { ...room, room: "4A-12", date: day(0), shift: "1st" }, (t) => allYes(t), "In review", 1, "Khalid Al-Otaibi", 2)
  make("hk-patient-room", { ...room, room: "4A-14", date: day(0), shift: "1st", isolation: "Isolation" }, (t) => allYes(t, { [cellKey(1, 0, "done")]: "No", [cellKey(1, 0, "__action")]: "Hypochlorite stock out at ward store — refilled from central store and re-done at 09:40" }), "In review", 2, "Khalid Al-Otaibi", 3)
  make("hk-patient-room", { ...room, room: "4A-12", date: day(1), shift: "3rd" }, (t) => allYes(t), "Approved", 4, "Khalid Al-Otaibi", 20)
  make("hk-patient-room", { ...room, room: "4A-12", date: day(1), shift: "2nd" }, (t) => allYes(t), "Approved", 4, "Khalid Al-Otaibi", 28)
  make("hk-patient-room", { ...room, room: "4A-12", date: day(1), shift: "1st" }, (t) => allYes(t), "Approved", 4, "Khalid Al-Otaibi", 34)
  make("hk-ward-hallway", { hospital: "Main Hospital", floor: "Floor 4", ward: "Ward 4A", date: day(0), pattern: "3-shift ward", shift: "1st" }, (t) => allYes(t, { ...Object.fromEntries([0, 1, 2, 3, 4, 5].map((r) => [cellKey(2, r, "done"), "N/A"])), ...Object.fromEntries([0, 1, 2, 3, 4, 5].map((r) => [cellKey(2, r, "__action"), "Not scheduled today — waxing on Thursday"])) }), "In review", 3, "Khalid Al-Otaibi", 4)
  make("hk-terminal-critical", { hospital: "Main Hospital", area: "ICU", room: "ICU-06", date: day(0), isolationSign: "Yes", reason: "Discharge" }, (t) => allYes(t), "Returned", 0, "Khalid Al-Otaibi", 5, {}, "")
  make("hk-uv-fumigation", { hospital: "Main Hospital", location: "ICU", date: day(0) }, () => ({ [cellKey(0, 0, "machine")]: "UV", [cellKey(0, 0, "start")]: "08:10", [cellKey(0, 0, "end")]: "08:40", [cellKey(0, 0, "duration")]: "30", [cellKey(0, 0, "nurse")]: "N. Rahma", [cellKey(0, 0, "by")]: "K. Al-Otaibi / 1101" }), "In review", 1, "Khalid Al-Otaibi", 1, { 0: ["ICU-06"] })
  // Food
  make("ccp-02", { date: day(0), meal: "Lunch", site: "Kitchen" }, () => ({ [cellKey(0, 0, "temp")]: "78", [cellKey(0, 1, "temp")]: "80", [cellKey(0, 2, "temp")]: "85", [cellKey(0, 3, "temp")]: "72", [cellKey(0, 4, "temp")]: "76", [cellKey(0, 5, "temp")]: "71", [cellKey(0, 5, "__action")]: "Returned to oven 6 min — re-probed 77 °C", [cellKey(0, 6, "temp")]: "68", [cellKey(0, 7, "temp")]: "70", [cellKey(0, 8, "temp")]: "79", [cellKey(0, 9, "temp")]: "66", ...Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7].map((r, i) => [cellKey(1, r, "temp"), String([75, 77, 69, 78, 70, 72, 74, 82][i])])) }), "In review", 1, "Chef Ramesh Kumar", 2)
  make("ccp-03", { date: day(0), meal: "Breakfast", site: "Kitchen" }, () => Object.fromEntries([0, 1, 2, 3, 4, 5, 6].flatMap((r, i) => [[cellKey(0, r, "mode"), "Hot"], [cellKey(0, r, "temp"), String([63, 65, 66, 64, 70, 68, 62][i])]])), "In review", 2, "Chef Ramesh Kumar", 6)
  make("oprp-02", { unit: "Cold Room 1 – Water", kind: "Chiller", date: day(0) }, () => ({ [cellKey(0, 0, "temp")]: "3", [cellKey(0, 1, "temp")]: "4", [cellKey(0, 2, "temp")]: "7", [cellKey(0, 2, "__action")]: "Door left open during receiving — closed, re-checked 4 °C at 13:30" }), "Draft", 0, "Joy Santos", 1)
  make("oprp-02", { unit: "Freezer 1 – Meat & poultry", kind: "Freezer", date: day(1) }, () => Object.fromEntries([0, 1, 2, 3, 4].map((r) => [cellKey(0, r, "temp"), "-20"])), "Approved", 4, "Joy Santos", 26)
  make("hand-washing", { date: day(0), shift: "1st Shift" }, (t) => allYes(t, { [cellKey(0, 6, "dryer")]: "No", [cellKey(0, 6, "__action")]: "Hand dryer fault reported to maintenance WO 18833102; paper towels placed" }), "In review", 1, "Joy Santos", 3)
  make("ward-inspection", { ward: "Ward 3-1 (Maternity)", date: day(0), time: "11:30" }, (t) => ({ ...Object.fromEntries(t.sections[0].rows.map((row, r) => [cellKey(0, r, "answer"), t.sections[0].inverted?.includes(row) ? "No" : "Yes"])), [cellKey(0, 11, "answer")]: "Yes", [cellKey(0, 11, "__action")]: "6 lunch trays uncollected at 15:10 — porter called, collected 15:25" }), "In review", 1, "Aisha Al-Qarni", 2)
  make("oprp-01", { date: day(0), time: "06:40" }, () => ({ [cellKey(0, 0, "supplier")]: "Al-Watania Farms", [cellKey(0, 0, "qty")]: "40", [cellKey(0, 0, "temp")]: "4", [cellKey(0, 0, "expiry")]: day(-5), [cellKey(1, 0, "supplier")]: "Al-Watania Poultry", [cellKey(1, 0, "qty")]: "60", [cellKey(1, 0, "temp")]: "3", [cellKey(1, 0, "expiry")]: day(-4) }), "In review", 1, "Imran Sheikh", 5, { 0: ["Lettuce"], 1: ["Chicken breast"] })
  make("food-waste", { date: day(1) }, () => ({ [cellKey(0, 0, "total")]: "212", [cellKey(0, 0, "unused")]: "38", [cellKey(0, 0, "input")]: "174", [cellKey(0, 0, "compost")]: "21" }), "Approved", 3, "Joy Santos", 22)
  make("oprp-06", { date: day(0) }, () => ({ ...Object.fromEntries([0, 1, 2].flatMap((r) => [[cellKey(0, r, "t1"), "45"], [cellKey(0, r, "t2"), "62"], [cellKey(0, r, "t3"), "63"], [cellKey(0, r, "t4"), "66"], [cellKey(0, r, "t5"), r === 2 ? "80" : "83"], [cellKey(0, r, "t6"), "70"], [cellKey(0, r, "checkedBy"), "S. Pillai"]])), [`0:2:t5__re`]: "83", [cellKey(0, 2, "__action")]: "Booster heater tripped — reset by maintenance, re-checked at 13:15" }), "In review", 1, "Sanjay Pillai", 2, { 0: [] })
  make("ppm", { month: new Date().toLocaleDateString("en", { month: "long", year: "numeric" }), area: "A · Receiving Area" }, () => Object.fromEntries(Array.from({ length: 13 }, (_, r) => [[cellKey(0, r, "done"), "Yes"], [cellKey(0, r, "doneOn"), day(20)]]).flat()), "In review", 1, "Ahmed Azab", 30)
  return { records, seq: { HK: hk, FN: fn } }
}

export function loadForms(): FormsDb {
  try {
    const data = JSON.parse(localStorage.getItem(formsKey) || "null")
    if (data?.records && data?.seq) return data
  } catch {
    /* fall through to seed */
  }
  return seedForms()
}
export function saveForms(db: FormsDb) {
  localStorage.setItem(formsKey, JSON.stringify(db))
}
