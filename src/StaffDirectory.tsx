import { useMemo, useRef, useState, type ChangeEvent } from "react"
import Icon from "./Icon"
import { item, type RecordItem } from "./operations-data"

type Props = {
  staff: RecordItem[]
  onImport: (staff: RecordItem[]) => void
  onOpen: (staff: RecordItem) => void
  onCreate: () => void
  onNotice: (title: string, message: string) => void
}

const value = (row: Record<string, unknown>, names: string[]) => {
  const key = Object.keys(row).find((candidate) =>
    names.includes(candidate.trim().toLowerCase()),
  )
  return key ? String(row[key] ?? "").trim() : ""
}

export default function StaffDirectory({
  staff,
  onImport,
  onOpen,
  onCreate,
  onNotice,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("All")
  const [status, setStatus] = useState("All")
  const categories = ["All", ...new Set(staff.map((person) => person.category))]
  const statuses = ["All", ...new Set(staff.map((person) => person.status))]
  const visible = useMemo(
    () =>
      staff.filter((person) => {
        const text = [
          person.title,
          person.code,
          person.category,
          person.department,
          person.location,
          person.status,
          person.notes,
          person.phone,
          person.email,
          person.employer,
          person.nationality,
        ]
          .join(" ")
          .toLowerCase()
        return (
          text.includes(query.toLowerCase()) &&
          (category === "All" || person.category === category) &&
          (status === "All" || person.status === status)
        )
      }),
    [staff, query, category, status],
  )

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    try {
      const XLSX = await import("xlsx")
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      })
      const imported = rows
        .map((row) => {
          const name = value(row, ["name", "staff name", "employee name"])
          if (!name) return null
          const employeeId =
            value(row, ["employee id", "employeeid", "staff id", "id"]) ||
            `KF-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
          const role =
            value(row, ["category", "role", "staff category"]) || "Cleaner"
          return item(name, {
            code: employeeId,
            category: role,
            department:
              value(row, ["department", "team", "service"]) ||
              "Housekeeping",
            location:
              value(row, ["shift", "default shift", "site"]) ||
              "Morning · 07:00–15:00",
            status: value(row, ["status", "availability"]) || "Available",
            notes:
              value(row, ["skills", "skills / notes", "notes"]) ||
              `${role} · imported workforce record`,
            phone: value(row, ["mobile", "phone", "mobile number"]),
            email: value(row, ["email", "e-mail"]),
            nationality: value(row, ["nationality"]),
            employer: value(row, ["employer", "company", "contractor"]) || "QBS Facility Services",
            joinDate: value(row, ["joining date", "join date", "joined"]),
            idExpiry: value(row, ["id expiry", "iqama expiry", "id / iqama expiry"]),
          })
        })
        .filter((person): person is RecordItem => Boolean(person))
      if (!imported.length) {
        onNotice(
          "No staff imported",
          "Use the template headings and include at least one row with a staff name.",
        )
        return
      }
      onImport(imported)
    } catch {
      onNotice(
        "Import could not be read",
        "Choose a valid Excel or CSV file using the workforce template columns.",
      )
    }
  }

  async function downloadTemplate() {
    const XLSX = await import("xlsx")
    const sheet = XLSX.utils.json_to_sheet([
      {
        Name: "Aisha Al-Harbi",
        "Employee ID": "KF-1201",
        Category: "Cleaner",
        Department: "Housekeeping",
        Shift: "Morning · 07:00–15:00",
        Status: "Available",
        "Skills / Notes": "Terminal cleaning · Infection control trained",
        Mobile: "+966 55 000 1201",
        Email: "aisha.alharbi@kfmc.example",
        Nationality: "Saudi Arabia",
        Employer: "QBS Facility Services",
        "Joining Date": "2025-01-15",
        "ID / Iqama Expiry": "",
      },
    ])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, "Staff Import")
    XLSX.writeFile(workbook, "KFMC_People_Master_Template.xlsx")
  }

  return (
    <section className="staff-directory">
      <header className="staff-directory-head">
        <div>
          <p>
            One record per person — identity, contact, employer, role and default
            shift. Rosters, tasks and stock custody all reference these records.
          </p>
        </div>
        <div>
          <button onClick={downloadTemplate}>
            <Icon name="report" size={17} /> Download template
          </button>
          <button onClick={() => inputRef.current?.click()}>
            <Icon name="arrow" size={17} /> Import Excel / CSV
          </button>
          <button className="ops-primary" onClick={onCreate}>
            <Icon name="plus" size={17} /> Add person
          </button>
          <input
            ref={inputRef}
            className="staff-file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={importFile}
          />
        </div>
      </header>

      <div className="staff-summary">
        {[
          ["Total people", staff.length, ""],
          ["On duty / available", staff.filter((person) => /On duty|Available/.test(person.status)).length, ""],
          ["Cleaners", staff.filter((person) => person.category === "Cleaner").length, ""],
          [
            "ID expiring ≤ 60 days",
            staff.filter((person) => person.idExpiry && new Date(person.idExpiry).getTime() - Date.now() < 60 * 86400000).length,
            "warn",
          ],
        ].map(([label, count, tone]) => (
          <article key={String(label)} className={Number(count) > 0 ? String(tone) : ""}>
            <small>{label}</small>
            <strong>{count}</strong>
          </article>
        ))}
      </div>

      <div className="staff-filters">
        <label>
          <Icon name="search" size={17} />
          <input
            aria-label="Search staff"
            placeholder="Search name, ID, category, department…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select
          aria-label="Staff category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {categories.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select
          aria-label="Staff status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {statuses.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <span>{visible.length} staff shown</span>
      </div>

      <div className="ops-table-wrap staff-table">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Department / employer</th>
              <th>Contact</th>
              <th>Default shift</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((person) => (
              <tr key={person.id} onClick={() => onOpen(person)}>
                <td>
                  <span className="staff-identity">
                    <b>
                      {person.title
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")}
                    </b>
                    <span>
                      <strong>{person.title}</strong>
                      <small>{person.code}</small>
                    </span>
                  </span>
                </td>
                <td>
                  <span className="staff-category">{person.category}</span>
                </td>
                <td>
                  <strong>{person.department}</strong>
                  <small>{person.employer || "—"}</small>
                </td>
                <td>
                  <strong>{person.phone || "—"}</strong>
                  <small>{person.email || ""}</small>
                </td>
                <td>{person.location}</td>
                <td>
                  <span className="ops-tag success">{person.status}</span>
                </td>
                <td>
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      onOpen(person)
                    }}
                  >
                    View →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <div className="ops-empty">
            <h2>No staff found</h2>
            <p>Adjust the search or filters to see more people.</p>
          </div>
        )}
      </div>
    </section>
  )
}
