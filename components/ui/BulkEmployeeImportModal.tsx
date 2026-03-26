"use client"

import * as React from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { Badge } from "@/components/ui/Badge"
import { Spinner } from "@/components/ui/Spinner"
import { exportToCSV } from "@/lib/exportUtils"

/* ── Types ── */

interface Department {
    id: string
    name: string
}

interface BulkEmployeeImportModalProps {
    isOpen: boolean
    onClose: () => void
    departments: Department[]
    onSuccess: () => void
}

type WizardStep = "idle" | "mapping" | "preview" | "hierarchy" | "importing" | "done" | "error"

type CanonicalField =
    | "employeeCode" | "firstName" | "lastName" | "fullName"
    | "email" | "designation" | "role" | "departmentName"
    | "managerEmail" | "dateOfJoining" | "salary" | "__skip__"

type ColumnMapping = Record<string, CanonicalField>

interface RowValidation {
    rowIndex: number
    mapped: Record<string, any>
    errors: string[]
    warnings: string[]
}

interface ImportResult {
    inserted: number
    skipped: number
    errors: Array<{ row: number; employeeCode?: string; email?: string; reason: string }>
    credentials: Array<{ employeeCode: string; email: string; tempPassword: string; name: string }>
}

interface HierarchySuggestion {
    rowIndex: number
    email: string
    name: string
    designation: string
    departmentName: string
    suggestedManagerEmail: string | null
    suggestedManagerName: string | null
    seniorityScore: number
    resolution: "auto-dept-head" | "auto-existing-head" | "auto-seniority" | "already-set" | "unresolved" | "ceo-no-manager"
    confidence: "high" | "medium" | "low"
}

/* ── Constants ── */

const MAX_ROWS = 500

const TEMPLATE_HEADERS = [
    "Employee Code", "First Name", "Last Name", "Email", "Designation",
    "Role", "Department", "Manager Email", "Date of Joining", "Salary",
]

const CANONICAL_OPTIONS: { value: CanonicalField; label: string }[] = [
    { value: "__skip__", label: "-- Skip --" },
    { value: "employeeCode", label: "Employee Code" },
    { value: "firstName", label: "First Name" },
    { value: "lastName", label: "Last Name" },
    { value: "fullName", label: "Full Name" },
    { value: "email", label: "Email" },
    { value: "designation", label: "Designation" },
    { value: "role", label: "Role" },
    { value: "departmentName", label: "Department" },
    { value: "managerEmail", label: "Manager Email" },
    { value: "dateOfJoining", label: "Date of Joining" },
    { value: "salary", label: "Salary" },
]

const AUTO_DETECT: Record<string, CanonicalField> = {
    "employee code": "employeeCode", "emp code": "employeeCode", "empcode": "employeeCode", "code": "employeeCode",
    "first name": "firstName", "firstname": "firstName",
    "last name": "lastName", "lastname": "lastName",
    "name": "fullName", "full name": "fullName",
    "email": "email", "email address": "email",
    "designation": "designation", "position": "designation", "job title": "designation", "title": "designation",
    "role": "role", "portal role": "role",
    "department": "departmentName", "dept": "departmentName",
    "manager email": "managerEmail", "manager": "managerEmail", "reports to": "managerEmail", "manager code": "managerEmail",
    "date of joining": "dateOfJoining", "joining date": "dateOfJoining", "start date": "dateOfJoining", "doj": "dateOfJoining",
    "salary": "salary", "ctc": "salary", "basic salary": "salary", "monthly salary": "salary",
}

const VALID_ROLES = ["CEO", "HR", "PAYROLL", "TEAM_LEAD", "EMPLOYEE"]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const RESOLUTION_LABELS: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default" | "purple" }> = {
    "auto-existing-head": { label: "Existing Head", variant: "success" },
    "auto-dept-head": { label: "Dept Head", variant: "purple" },
    "auto-seniority": { label: "By Seniority", variant: "success" },
    "already-set": { label: "From File", variant: "default" },
    "ceo-no-manager": { label: "CEO", variant: "purple" },
    "unresolved": { label: "Unresolved", variant: "danger" },
}

/* ── Component ── */

export function BulkEmployeeImportModal({ isOpen, onClose, departments, onSuccess }: BulkEmployeeImportModalProps) {
    const [step, setStep] = React.useState<WizardStep>("idle")
    const [rawRows, setRawRows] = React.useState<Record<string, any>[]>([])
    const [headers, setHeaders] = React.useState<string[]>([])
    const [mapping, setMapping] = React.useState<ColumnMapping>({})
    const [validations, setValidations] = React.useState<RowValidation[]>([])
    const [importMode, setImportMode] = React.useState<"skip-errors" | "all-or-nothing">("skip-errors")
    const [result, setResult] = React.useState<ImportResult | null>(null)
    const [errorMsg, setErrorMsg] = React.useState("")
    const [isDragging, setIsDragging] = React.useState(false)
    const [showOnlyIssues, setShowOnlyIssues] = React.useState(false)
    const fileRef = React.useRef<HTMLInputElement>(null)

    // Hierarchy state
    const [hierarchySuggestions, setHierarchySuggestions] = React.useState<HierarchySuggestion[]>([])
    const [hierarchyOverrides, setHierarchyOverrides] = React.useState<Record<number, string>>({}) // rowIndex → managerEmail
    const [hierarchyLoading, setHierarchyLoading] = React.useState(false)
    const [showOnlyUnresolved, setShowOnlyUnresolved] = React.useState(false)

    // Reset on close
    React.useEffect(() => {
        if (!isOpen) {
            setStep("idle")
            setRawRows([])
            setHeaders([])
            setMapping({})
            setValidations([])
            setImportMode("skip-errors")
            setResult(null)
            setErrorMsg("")
            setShowOnlyIssues(false)
            setHierarchySuggestions([])
            setHierarchyOverrides({})
            setHierarchyLoading(false)
            setShowOnlyUnresolved(false)
        }
    }, [isOpen])

    /* ── File parsing ── */

    function parseFile(file: File) {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                if (!e.target?.result) return
                const data = new Uint8Array(e.target.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: "array" })
                const sheet = workbook.Sheets[workbook.SheetNames[0]]
                const parsed: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false })
                if (parsed.length === 0) {
                    setErrorMsg("The file appears to be empty.")
                    setStep("error")
                    return
                }
                if (parsed.length > MAX_ROWS) {
                    setErrorMsg(`File contains ${parsed.length} rows. Maximum is ${MAX_ROWS}.`)
                    setStep("error")
                    return
                }
                const hdrs = Object.keys(parsed[0])
                setRawRows(parsed)
                setHeaders(hdrs)

                // Auto-detect mapping
                const autoMap: ColumnMapping = {}
                for (const h of hdrs) {
                    autoMap[h] = AUTO_DETECT[h.toLowerCase().trim()] ?? "__skip__"
                }
                setMapping(autoMap)
                setStep("mapping")
            } catch {
                setErrorMsg("Could not parse the file. Use a valid CSV or Excel file.")
                setStep("error")
            }
        }
        reader.readAsArrayBuffer(file)
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) parseFile(file)
    }

    function downloadTemplate() {
        const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Template")
        XLSX.writeFile(wb, "Employee_Import_Template.xlsx")
    }

    /* ── Column mapping ── */

    function updateMapping(header: string, field: CanonicalField) {
        setMapping(prev => ({ ...prev, [header]: field }))
    }

    const hasRequiredMappings = React.useMemo(() => {
        const mappedFields = new Set(Object.values(mapping).filter(v => v !== "__skip__"))
        return mappedFields.has("email") &&
            (mappedFields.has("firstName") || mappedFields.has("fullName")) &&
            mappedFields.has("designation") &&
            mappedFields.has("departmentName")
    }, [mapping])

    /* ── Client-side validation ── */

    function runValidation() {
        const deptNames = new Set(departments.map(d => d.name.toLowerCase()))
        const results: RowValidation[] = rawRows.map((raw, i) => {
            const mapped: Record<string, any> = {}
            for (const [header, field] of Object.entries(mapping)) {
                if (field !== "__skip__") mapped[field] = raw[header]
            }

            const errors: string[] = []
            const warnings: string[] = []

            if (!mapped.email || !EMAIL_RE.test(String(mapped.email))) errors.push("Invalid email")
            if (!mapped.firstName && !mapped.fullName) errors.push("Missing name")
            if (!mapped.designation) errors.push("Missing designation")
            if (!mapped.departmentName) {
                errors.push("Missing department")
            } else if (!deptNames.has(String(mapped.departmentName).toLowerCase())) {
                warnings.push(`New department "${mapped.departmentName}" will be created`)
            }
            if (!mapped.salary || isNaN(Number(mapped.salary)) || Number(mapped.salary) <= 0) {
                warnings.push("Salary missing or invalid")
            }
            const role = String(mapped.role || "EMPLOYEE").toUpperCase().replace(/\s+/g, "_")
            if (mapped.role && !VALID_ROLES.includes(role)) warnings.push(`Unknown role "${mapped.role}"`)
            if (role !== "CEO" && !mapped.managerEmail) warnings.push("No manager for non-CEO")

            return { rowIndex: i, mapped, errors, warnings }
        })
        setValidations(results)
        setStep("preview")
    }

    /* ── Hierarchy resolution ── */

    async function resolveHierarchy() {
        setHierarchyLoading(true)
        setStep("hierarchy")
        try {
            const mappedRows = rawRows.map((raw, i) => {
                const mapped: Record<string, any> = { rowIndex: i }
                for (const [header, field] of Object.entries(mapping)) {
                    if (field !== "__skip__") mapped[field] = raw[header]
                }
                return mapped
            })

            const headers: Record<string, string> = { "Content-Type": "application/json" }
            if (typeof window !== "undefined") {
                const token = localStorage.getItem("access_token")
                if (token) headers["Authorization"] = `Bearer ${token}`
                const slug = localStorage.getItem("tenant_slug")
                if (slug) headers["X-Tenant-Slug"] = slug
            }
            const res = await fetch("/api/employees/import/resolve-hierarchy", {
                method: "POST",
                headers,
                body: JSON.stringify({ rows: mappedRows }),
            })
            if (!res.ok) throw new Error("Hierarchy resolution failed")
            const json = await res.json()
            const resolved = json.data || json
            setHierarchySuggestions(resolved.suggestions || [])
        } catch {
            setHierarchySuggestions([])
        } finally {
            setHierarchyLoading(false)
        }
    }

    function updateHierarchyOverride(rowIndex: number, managerEmail: string) {
        setHierarchyOverrides(prev => ({ ...prev, [rowIndex]: managerEmail }))
    }

    /* ── Import ── */

    async function handleImport() {
        setStep("importing")
        try {
            // Build set of row indices that have validation errors — skip them
            const errorRowIndices = new Set(
                validations.filter(v => v.errors.length > 0).map(v => v.rowIndex)
            )

            const mappedRows = rawRows
                .map((raw, i) => {
                    // Skip rows with validation errors
                    if (errorRowIndices.has(i)) return null

                    const mapped: Record<string, any> = {}
                    for (const [header, field] of Object.entries(mapping)) {
                        if (field !== "__skip__") mapped[field] = raw[header]
                    }

                    // Apply hierarchy suggestions + overrides
                    if (hierarchySuggestions.length > 0) {
                        const override = hierarchyOverrides[i]
                        if (override !== undefined) {
                            mapped.managerEmail = override || null
                        } else {
                            const suggestion = hierarchySuggestions.find(s => s.rowIndex === i)
                            if (suggestion?.suggestedManagerEmail && !mapped.managerEmail) {
                                mapped.managerEmail = suggestion.suggestedManagerEmail
                            }
                        }
                    }

                    return mapped
                })
                .filter((row): row is Record<string, any> => row !== null)

            // Build audit log of hierarchy resolutions
            const hierarchyAudit = hierarchySuggestions.map(s => {
                const override = hierarchyOverrides[s.rowIndex]
                return {
                    email: s.email,
                    name: s.name,
                    department: s.departmentName,
                    designation: s.designation,
                    resolution: override !== undefined ? "manual-override" : s.resolution,
                    assignedManager: override !== undefined ? override : s.suggestedManagerEmail,
                    confidence: override !== undefined ? "manual" : s.confidence,
                }
            })

            const importHeaders: Record<string, string> = { "Content-Type": "application/json" }
            if (typeof window !== "undefined") {
                const token = localStorage.getItem("access_token")
                if (token) importHeaders["Authorization"] = `Bearer ${token}`
                const slug = localStorage.getItem("tenant_slug")
                if (slug) importHeaders["X-Tenant-Slug"] = slug
            }
            const importRes = await fetch("/api/employees/import", {
                method: "POST",
                headers: importHeaders,
                body: JSON.stringify({ rows: mappedRows, mode: importMode, hierarchyAudit }),
            })
            if (!importRes.ok) throw new Error("Import failed")
            const importJson = await importRes.json()
            const data = importJson.data || importJson
            setResult({
                inserted: data.inserted ?? 0,
                skipped: data.skipped ?? 0,
                errors: data.errors ?? [],
                credentials: data.credentials ?? [],
            })
            setStep("done")
            if (data.inserted > 0) onSuccess()
        } catch {
            setErrorMsg("Network error during import.")
            setStep("error")
        }
    }

    /* ── Downloads ── */

    function downloadErrorReport() {
        if (!result?.errors.length) return
        exportToCSV(
            result.errors.map(e => ({ Row: e.row, Email: e.email || "", "Employee Code": e.employeeCode || "", Reason: e.reason })),
            "bulk-import-errors"
        )
    }

    function downloadCredentials() {
        if (!result?.credentials.length) return
        exportToCSV(
            result.credentials.map(c => ({ Name: c.name, "Employee Code": c.employeeCode, Email: c.email, "Temp Password": c.tempPassword })),
            "employee-credentials"
        )
    }

    function downloadHierarchyAudit() {
        if (!hierarchySuggestions.length) return
        exportToCSV(
            hierarchySuggestions.map(s => {
                const override = hierarchyOverrides[s.rowIndex]
                return {
                    Row: s.rowIndex + 1,
                    Name: s.name,
                    Email: s.email,
                    Department: s.departmentName,
                    Designation: s.designation,
                    "Assigned Manager": override !== undefined ? override : (s.suggestedManagerEmail || "None"),
                    Resolution: override !== undefined ? "Manual Override" : s.resolution,
                    Confidence: override !== undefined ? "Manual" : s.confidence,
                }
            }),
            "hierarchy-audit-log"
        )
    }

    /* ── Render ── */

    const { errorCount, warningCount, validCount } = React.useMemo(() => {
        let errors = 0, warnings = 0, valid = 0
        for (const v of validations) {
            if (v.errors.length > 0) errors++
            else { valid++; if (v.warnings.length > 0) warnings++ }
        }
        return { errorCount: errors, warningCount: warnings, validCount: valid }
    }, [validations])

    const { unresolvedCount, autoResolvedCount, overrideCount } = React.useMemo(() => {
        let unresolved = 0, autoResolved = 0
        for (const s of hierarchySuggestions) {
            if (s.resolution === "unresolved" && hierarchyOverrides[s.rowIndex] === undefined) unresolved++
            else if (s.resolution !== "unresolved" && s.resolution !== "already-set" && s.resolution !== "ceo-no-manager") autoResolved++
        }
        return { unresolvedCount: unresolved, autoResolvedCount: autoResolved, overrideCount: Object.keys(hierarchyOverrides).length }
    }, [hierarchySuggestions, hierarchyOverrides])

    // Memoize filtered hierarchy rows to avoid re-filtering on every render
    const filteredHierarchy = React.useMemo(() => {
        if (!showOnlyUnresolved) return hierarchySuggestions
        return hierarchySuggestions.filter(s => s.resolution === "unresolved" || hierarchyOverrides[s.rowIndex] !== undefined)
    }, [hierarchySuggestions, hierarchyOverrides, showOnlyUnresolved])

    // Memoize dropdown options to avoid 500*500 option elements
    const managerOptionsByRow = React.useMemo(() => {
        const emails = hierarchySuggestions.map(s => ({ email: s.email, name: s.name }))
        const map: Record<number, typeof emails> = {}
        for (const s of hierarchySuggestions) {
            map[s.rowIndex] = emails.filter(e => e.email !== s.email)
        }
        return map
    }, [hierarchySuggestions])

    if (!isOpen) return null

    const STEP_LABELS = ["Upload", "Map", "Review", "Hierarchy", "Import"]
    const stepIdxMap: Record<string, number> = { idle: 0, mapping: 1, preview: 2, hierarchy: 3, importing: 4, done: 5, error: -1 }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-border">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-lg">
                            {step === "done" ? "\u2705" : step === "hierarchy" ? "\u{1F333}" : "\u{1F4E5}"}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-text">Bulk Import Employees</h2>
                            <p className="text-xs text-text-3">
                                {step === "idle" && "Upload a CSV or Excel file"}
                                {step === "mapping" && "Map columns to employee fields"}
                                {step === "preview" && "Review validation results"}
                                {step === "hierarchy" && "Review auto-resolved reporting hierarchy"}
                                {step === "importing" && "Importing records..."}
                                {step === "done" && "Import complete"}
                                {step === "error" && "Something went wrong"}
                            </p>
                        </div>
                    </div>
                    {/* Step indicator */}
                    <div className="flex items-center gap-1.5">
                        {STEP_LABELS.map((label, i) => {
                            const stepIdx = stepIdxMap[step] ?? 0
                            const active = i <= stepIdx
                            return (
                                <div key={label} className="flex items-center gap-1.5">
                                    <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${active ? "bg-accent text-white" : "bg-bg-2 text-text-4"}`}>
                                        {i + 1}
                                    </div>
                                    <span className={`text-[10px] font-medium hidden sm:inline ${active ? "text-text" : "text-text-4"}`}>{label}</span>
                                    {i < STEP_LABELS.length - 1 && <div className={`w-3 h-px ${active ? "bg-accent" : "bg-border"}`} />}
                                </div>
                            )
                        })}
                        <button onClick={onClose} className="ml-3 w-7 h-7 flex items-center justify-center rounded-full hover:bg-bg-2 text-text-3 hover:text-text transition-colors text-lg">&times;</button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">

                    {/* ── Step 1: Upload ── */}
                    {step === "idle" && (
                        <>
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${isDragging ? "border-accent bg-accent/[0.06]" : "border-border-2 hover:border-accent hover:bg-accent/[0.03]"}`}
                            >
                                <div className="text-4xl">{"\u{1F4C2}"}</div>
                                <p className="text-md font-semibold text-text">Drop a CSV or Excel file here</p>
                                <p className="text-sm text-text-3">or click to browse &mdash; supports .csv, .xlsx, .xls &mdash; max {MAX_ROWS} rows</p>
                                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f) }} />
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-bg border border-border">
                                <span className="text-xl">{"\u{1F4CB}"}</span>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-text">Need a template?</p>
                                    <p className="text-xs text-text-3">Download a pre-formatted Excel file with the correct column headers</p>
                                </div>
                                <Button variant="secondary" size="sm" onClick={downloadTemplate}>Download Template</Button>
                            </div>
                        </>
                    )}

                    {/* ── Step 2: Column Mapping ── */}
                    {step === "mapping" && (
                        <>
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-text">{rawRows.length} rows detected &mdash; map your columns</p>
                                <button onClick={() => setStep("idle")} className="text-xs text-text-3 hover:text-text underline">Choose another file</button>
                            </div>

                            <div className="overflow-auto max-h-[50vh] rounded-xl border border-border">
                                <table className="w-full text-xs border-collapse">
                                    <thead className="sticky top-0 bg-surface-2 z-10">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-bold text-text-3 uppercase border-b border-border w-[200px]">Excel Column</th>
                                            <th className="px-3 py-2 text-left font-bold text-text-3 uppercase border-b border-border w-[200px]">Maps To</th>
                                            <th className="px-3 py-2 text-left font-bold text-text-3 uppercase border-b border-border">Sample Values</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {headers.map((h) => (
                                            <tr key={h} className="border-b border-border last:border-0">
                                                <td className="px-3 py-2 font-medium text-text">{h}</td>
                                                <td className="px-3 py-2">
                                                    <Select
                                                        options={CANONICAL_OPTIONS}
                                                        value={mapping[h] || "__skip__"}
                                                        onChange={(e) => updateMapping(h, e.target.value as CanonicalField)}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-text-3">
                                                    {rawRows.slice(0, 3).map((r, i) => (
                                                        <span key={i}>{i > 0 && ", "}{String(r[h]).slice(0, 30)}</span>
                                                    ))}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {!hasRequiredMappings && (
                                <p className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2 border border-warning/20">
                                    Required: Email, First Name (or Full Name), Designation, and Department must be mapped.
                                </p>
                            )}
                        </>
                    )}

                    {/* ── Step 3: Preview + Validation ── */}
                    {step === "preview" && (
                        <>
                            {/* Summary banner */}
                            <div className="flex items-center gap-4 p-3 rounded-xl bg-bg border border-border">
                                <Badge variant="success" size="sm" dot>{validCount} valid</Badge>
                                {warningCount > 0 && <Badge variant="warning" size="sm" dot>{warningCount} warnings</Badge>}
                                {errorCount > 0 && <Badge variant="danger" size="sm" dot>{errorCount} errors</Badge>}
                                <div className="flex-1" />
                                <label className="flex items-center gap-1.5 text-xs text-text-3 cursor-pointer">
                                    <input type="checkbox" checked={showOnlyIssues} onChange={(e) => setShowOnlyIssues(e.target.checked)} className="rounded" />
                                    Show only issues
                                </label>
                            </div>

                            <div className="overflow-auto max-h-[40vh] rounded-xl border border-border">
                                <table className="w-full text-xs border-collapse">
                                    <thead className="sticky top-0 bg-surface-2 z-10">
                                        <tr>
                                            <th className="px-2 py-2 text-left font-bold text-text-3 border-b border-border w-10">#</th>
                                            <th className="px-2 py-2 text-left font-bold text-text-3 border-b border-border">Email</th>
                                            <th className="px-2 py-2 text-left font-bold text-text-3 border-b border-border">Name</th>
                                            <th className="px-2 py-2 text-left font-bold text-text-3 border-b border-border">Department</th>
                                            <th className="px-2 py-2 text-left font-bold text-text-3 border-b border-border">Role</th>
                                            <th className="px-2 py-2 text-left font-bold text-text-3 border-b border-border">Manager</th>
                                            <th className="px-2 py-2 text-left font-bold text-text-3 border-b border-border">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {validations
                                            .filter(v => !showOnlyIssues || v.errors.length > 0 || v.warnings.length > 0)
                                            .map((v) => {
                                                const hasError = v.errors.length > 0
                                                const hasWarning = v.warnings.length > 0
                                                const name = v.mapped.firstName
                                                    ? `${v.mapped.firstName} ${v.mapped.lastName || ""}`.trim()
                                                    : String(v.mapped.fullName || "")
                                                return (
                                                    <tr key={v.rowIndex} className={`border-b border-border last:border-0 ${hasError ? "bg-danger/[0.04]" : hasWarning ? "bg-warning/[0.04]" : ""}`}>
                                                        <td className="px-2 py-1.5 text-text-4 font-mono">{v.rowIndex + 1}</td>
                                                        <td className="px-2 py-1.5 text-text-2">{String(v.mapped.email || "")}</td>
                                                        <td className="px-2 py-1.5 text-text">{name}</td>
                                                        <td className="px-2 py-1.5 text-text-2">{String(v.mapped.departmentName || "")}</td>
                                                        <td className="px-2 py-1.5 text-text-2">{String(v.mapped.role || "EMPLOYEE")}</td>
                                                        <td className="px-2 py-1.5 text-text-2">{String(v.mapped.managerEmail || "-")}</td>
                                                        <td className="px-2 py-1.5">
                                                            {hasError && v.errors.map((e, i) => <Badge key={i} variant="danger" size="sm" className="mr-1 mb-0.5">{e}</Badge>)}
                                                            {!hasError && hasWarning && v.warnings.map((w, i) => <Badge key={i} variant="warning" size="sm" className="mr-1 mb-0.5">{w}</Badge>)}
                                                            {!hasError && !hasWarning && <Badge variant="success" size="sm">OK</Badge>}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Import mode */}
                            <div className="flex items-center gap-4 p-3 rounded-xl bg-bg border border-border">
                                <span className="text-xs font-semibold text-text-3">Import mode:</span>
                                <label className="flex items-center gap-1.5 text-xs text-text cursor-pointer">
                                    <input type="radio" name="mode" checked={importMode === "skip-errors"} onChange={() => setImportMode("skip-errors")} />
                                    Skip errors
                                </label>
                                <label className="flex items-center gap-1.5 text-xs text-text cursor-pointer">
                                    <input type="radio" name="mode" checked={importMode === "all-or-nothing"} onChange={() => setImportMode("all-or-nothing")} />
                                    All or nothing
                                </label>
                                {importMode === "all-or-nothing" && errorCount > 0 && (
                                    <span className="text-[10px] text-danger font-medium">Fix all errors or switch to skip-errors</span>
                                )}
                            </div>
                        </>
                    )}

                    {/* ── Step 4: Hierarchy Resolution ── */}
                    {step === "hierarchy" && (
                        <>
                            {hierarchyLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <Spinner size="lg" />
                                    <p className="text-md font-semibold text-text">Resolving reporting hierarchy...</p>
                                    <p className="text-xs text-text-3">Matching departments and designations to find managers</p>
                                </div>
                            ) : (
                                <>
                                    {/* Summary */}
                                    <div className="flex items-center gap-4 p-3 rounded-xl bg-bg border border-border">
                                        <Badge variant="success" size="sm" dot>{autoResolvedCount} auto-resolved</Badge>
                                        {overrideCount > 0 && <Badge variant="purple" size="sm" dot>{overrideCount} overridden</Badge>}
                                        {unresolvedCount > 0 && <Badge variant="danger" size="sm" dot>{unresolvedCount} unresolved</Badge>}
                                        <div className="flex-1" />
                                        <label className="flex items-center gap-1.5 text-xs text-text-3 cursor-pointer">
                                            <input type="checkbox" checked={showOnlyUnresolved} onChange={(e) => setShowOnlyUnresolved(e.target.checked)} className="rounded" />
                                            Show only unresolved
                                        </label>
                                        <Button variant="secondary" size="sm" onClick={downloadHierarchyAudit}>
                                            Download Audit Log
                                        </Button>
                                    </div>

                                    <p className="text-xs text-text-3 bg-accent/[0.06] rounded-lg px-3 py-2 border border-accent/15">
                                        The system automatically matched managers based on department and designation seniority. Override any assignment using the dropdown, or leave unresolved rows to import without a manager.
                                    </p>

                                    {/* Hierarchy table */}
                                    <div className="overflow-auto max-h-[40vh] rounded-xl border border-border">
                                        <table className="w-full text-xs border-collapse">
                                            <thead className="sticky top-0 bg-surface-2 z-10">
                                                <tr>
                                                    <th className="px-2 py-2 text-left font-bold text-text-3 border-b border-border w-10">#</th>
                                                    <th className="px-2 py-2 text-left font-bold text-text-3 border-b border-border">Employee</th>
                                                    <th className="px-2 py-2 text-left font-bold text-text-3 border-b border-border">Designation</th>
                                                    <th className="px-2 py-2 text-left font-bold text-text-3 border-b border-border">Department</th>
                                                    <th className="px-2 py-2 text-left font-bold text-text-3 border-b border-border">Reports To</th>
                                                    <th className="px-2 py-2 text-left font-bold text-text-3 border-b border-border w-[100px]">Resolution</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredHierarchy.map((s) => {
                                                    const override = hierarchyOverrides[s.rowIndex]
                                                    const isOverridden = override !== undefined
                                                    const effectiveManager = isOverridden ? override : s.suggestedManagerEmail
                                                    const effectiveManagerName = isOverridden
                                                        ? (managerOptionsByRow[s.rowIndex]?.find(e => e.email === override)?.name || override)
                                                        : s.suggestedManagerName
                                                    const resInfo = isOverridden
                                                        ? { label: "Manual", variant: "purple" as const }
                                                        : (RESOLUTION_LABELS[s.resolution] || { label: s.resolution, variant: "default" as const })
                                                    const isUnresolved = s.resolution === "unresolved" && !isOverridden
                                                    const options = managerOptionsByRow[s.rowIndex] || []

                                                    return (
                                                        <tr key={s.rowIndex} className={`border-b border-border last:border-0 ${isUnresolved ? "bg-danger/[0.04]" : isOverridden ? "bg-purple-50 dark:bg-purple-950/20" : ""}`}>
                                                            <td className="px-2 py-1.5 text-text-4 font-mono">{s.rowIndex + 1}</td>
                                                            <td className="px-2 py-1.5">
                                                                <div className="text-text font-medium">{s.name}</div>
                                                                <div className="text-text-4 text-[10px]">{s.email}</div>
                                                            </td>
                                                            <td className="px-2 py-1.5 text-text-2">{s.designation}</td>
                                                            <td className="px-2 py-1.5 text-text-2">{s.departmentName}</td>
                                                            <td className="px-2 py-1.5">
                                                                <select
                                                                    value={isOverridden ? override : (s.suggestedManagerEmail || "")}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value
                                                                        if (val === (s.suggestedManagerEmail || "")) {
                                                                            setHierarchyOverrides(prev => {
                                                                                const next = { ...prev }
                                                                                delete next[s.rowIndex]
                                                                                return next
                                                                            })
                                                                        } else {
                                                                            updateHierarchyOverride(s.rowIndex, val)
                                                                        }
                                                                    }}
                                                                    className="input-base text-xs py-1 max-w-[200px]"
                                                                >
                                                                    <option value="">No manager</option>
                                                                    {options.map(e => (
                                                                        <option key={e.email} value={e.email}>{e.name} ({e.email})</option>
                                                                    ))}
                                                                </select>
                                                                {effectiveManager && (
                                                                    <div className="text-[10px] text-text-4 mt-0.5">{effectiveManagerName}</div>
                                                                )}
                                                            </td>
                                                            <td className="px-2 py-1.5">
                                                                <Badge variant={resInfo.variant} size="sm">{resInfo.label}</Badge>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* ── Step 5: Importing ── */}
                    {step === "importing" && (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <Spinner size="lg" />
                            <p className="text-md font-semibold text-text">Importing {rawRows.length} employees...</p>
                            <p className="text-xs text-text-3">This may take a moment for large files</p>
                        </div>
                    )}

                    {/* ── Step 6: Results ── */}
                    {step === "done" && result && (
                        <>
                            <div className="flex items-center justify-center gap-6 py-6">
                                <div className="px-5 py-3 rounded-xl bg-success/10 border border-success/20 text-center">
                                    <div className="text-2xl font-extrabold text-success">{result.inserted}</div>
                                    <div className="text-xs text-success font-semibold">Inserted</div>
                                </div>
                                {result.skipped > 0 && (
                                    <div className="px-5 py-3 rounded-xl bg-warning/10 border border-warning/20 text-center">
                                        <div className="text-2xl font-extrabold text-warning">{result.skipped}</div>
                                        <div className="text-xs text-warning font-semibold">Skipped</div>
                                    </div>
                                )}
                                {result.errors.length > 0 && (
                                    <div className="px-5 py-3 rounded-xl bg-danger/10 border border-danger/20 text-center">
                                        <div className="text-2xl font-extrabold text-danger">{result.errors.length}</div>
                                        <div className="text-xs text-danger font-semibold">Errors</div>
                                    </div>
                                )}
                            </div>

                            {/* Error details */}
                            {result.errors.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-text">Failed Rows</p>
                                        <Button variant="secondary" size="sm" onClick={downloadErrorReport}>Download Error Report</Button>
                                    </div>
                                    <div className="overflow-auto max-h-[200px] rounded-xl border border-border">
                                        <table className="w-full text-xs border-collapse">
                                            <thead className="sticky top-0 bg-surface-2">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-bold text-text-3 border-b border-border">Row</th>
                                                    <th className="px-3 py-2 text-left font-bold text-text-3 border-b border-border">Email</th>
                                                    <th className="px-3 py-2 text-left font-bold text-text-3 border-b border-border">Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.errors.map((e, i) => (
                                                    <tr key={i} className="border-b border-border last:border-0">
                                                        <td className="px-3 py-1.5 font-mono text-text-3">{e.row}</td>
                                                        <td className="px-3 py-1.5 text-text-2">{e.email || e.employeeCode || "-"}</td>
                                                        <td className="px-3 py-1.5 text-danger">{e.reason}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Credentials */}
                            {result.credentials.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-text">Login Credentials</p>
                                        <Button variant="secondary" size="sm" onClick={downloadCredentials}>Download CSV</Button>
                                    </div>
                                    <p className="text-[10px] text-warning bg-warning/10 rounded-lg px-3 py-1.5 border border-warning/20 font-medium">
                                        These temporary passwords are shown once. Download them now to distribute to employees.
                                    </p>
                                    <div className="overflow-auto max-h-[200px] rounded-xl border border-border">
                                        <table className="w-full text-xs border-collapse">
                                            <thead className="sticky top-0 bg-surface-2">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-bold text-text-3 border-b border-border">Name</th>
                                                    <th className="px-3 py-2 text-left font-bold text-text-3 border-b border-border">Email</th>
                                                    <th className="px-3 py-2 text-left font-bold text-text-3 border-b border-border">Temp Password</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.credentials.map((c, i) => (
                                                    <tr key={i} className="border-b border-border last:border-0">
                                                        <td className="px-3 py-1.5 text-text">{c.name}</td>
                                                        <td className="px-3 py-1.5 text-text-2">{c.email}</td>
                                                        <td className="px-3 py-1.5 font-mono text-text-3">{c.tempPassword}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Error state ── */}
                    {step === "error" && (
                        <div className="flex flex-col items-center justify-center py-10 gap-4">
                            <div className="text-5xl">{"\u26A0\uFE0F"}</div>
                            <p className="text-md font-semibold text-text">Import Failed</p>
                            <p className="text-sm text-center text-text-3 max-w-sm">{errorMsg}</p>
                            <Button variant="secondary" size="sm" onClick={() => setStep("idle")}>Try Again</Button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-2 rounded-b-2xl">
                    <div>
                        {step === "mapping" && (
                            <Button variant="secondary" size="sm" onClick={() => setStep("idle")}>Back</Button>
                        )}
                        {step === "preview" && (
                            <Button variant="secondary" size="sm" onClick={() => setStep("mapping")}>Back</Button>
                        )}
                        {step === "hierarchy" && !hierarchyLoading && (
                            <Button variant="secondary" size="sm" onClick={() => setStep("preview")}>Back</Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {step === "done" ? (
                            <Button onClick={onClose}>Done</Button>
                        ) : step === "mapping" ? (
                            <>
                                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                                <Button onClick={runValidation} disabled={!hasRequiredMappings}>
                                    Validate &amp; Preview
                                </Button>
                            </>
                        ) : step === "preview" ? (
                            <>
                                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                                <Button onClick={resolveHierarchy}>
                                    Resolve Hierarchy
                                </Button>
                            </>
                        ) : step === "hierarchy" && !hierarchyLoading ? (
                            <>
                                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={importMode === "all-or-nothing" && errorCount > 0}
                                >
                                    Import {validCount} Employees
                                </Button>
                            </>
                        ) : step !== "importing" ? (
                            <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    )
}
