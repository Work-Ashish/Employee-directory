/**
 * /api/employees/import — Local handler for bulk employee import.
 *
 * Two-pass import:
 *   Pass 1: Create User + Employee for each row (without reporting_to)
 *   Pass 2: Update reporting_to for all employees whose manager was in the batch
 *
 * This ensures managers created in the same batch are resolved correctly
 * regardless of CSV row order.
 */
import { NextResponse } from "next/server"
import { salaryStore } from "@/lib/salary-store"

function getDjangoBase(): string {
    return (
        process.env.DJANGO_GATEWAY_URL ||
        process.env.DJANGO_INTERNAL_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://127.0.0.1:8000"
    )
}

function forwardHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const auth = req.headers.get("authorization")
    if (auth) headers["Authorization"] = auth
    const slug = req.headers.get("x-tenant-slug") || req.headers.get("X-Tenant-Slug")
    if (slug) headers["X-Tenant-Slug"] = slug
    return headers
}

function generateTempPassword(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
    let pw = ""
    for (let i = 0; i < 12; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length))
    return pw
}

interface ImportRow {
    employeeCode?: string
    firstName?: string
    lastName?: string
    fullName?: string
    email?: string
    designation?: string
    departmentName?: string
    managerEmail?: string
    dateOfJoining?: string
    salary?: string | number
    role?: string
}

/**
 * Parse various date formats into YYYY-MM-DD.
 */
function normalizeDate(raw: string | number | undefined | null): string | null {
    if (!raw) return null
    const val = String(raw).trim()
    if (!val) return null

    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return val.slice(0, 10)

    if (/^\d{4,5}$/.test(val) && Number(val) > 30000) {
        const excelEpoch = new Date(1899, 11, 30)
        const d = new Date(excelEpoch.getTime() + Number(val) * 86400000)
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    }

    const dmyMatch = val.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
    if (dmyMatch) {
        const [, a, b, year] = dmyMatch
        const day = parseInt(a, 10)
        const month = parseInt(b, 10)
        if (day > 12) {
            return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        } else if (month > 12) {
            return `${year}-${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}`
        } else {
            return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        }
    }

    const ymdSlash = val.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/)
    if (ymdSlash) {
        const [, year, month, day] = ymdSlash
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }

    const parsed = new Date(val)
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900) {
        return parsed.toISOString().slice(0, 10)
    }

    return null
}

/**
 * Parse salary from various formats: "50,000", "₹50,000", "$50000", "50000.00", etc.
 */
function parseSalary(raw: string | number | undefined | null): number {
    if (raw == null) return 0
    if (typeof raw === "number") return raw > 0 ? raw : 0
    // Strip currency symbols, commas, spaces
    const cleaned = String(raw).replace(/[₹$€£,\s]/g, "").trim()
    const num = parseFloat(cleaned)
    return isNaN(num) || num <= 0 ? 0 : num
}

function extractDjangoError(errJson: Record<string, unknown>): string {
    const errData = (errJson.error || errJson) as Record<string, unknown>
    if (typeof errData === "string") return errData
    if (errData.detail) {
        return Array.isArray(errData.detail) ? errData.detail.join(". ") : String(errData.detail)
    }
    const fieldErrors: string[] = []
    for (const [field, msgs] of Object.entries(errData)) {
        if (field === "data" || field === "meta") continue
        const msg = Array.isArray(msgs) ? msgs.join(", ") : String(msgs)
        fieldErrors.push(`${field}: ${msg}`)
    }
    return fieldErrors.length > 0 ? fieldErrors.join("; ") : JSON.stringify(errData)
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const rows: ImportRow[] = body.rows || []

        if (!rows.length) {
            return NextResponse.json(
                { error: { detail: "No rows provided" } },
                { status: 400 }
            )
        }

        const headers = forwardHeaders(req)
        const base = getDjangoBase()

        // Fetch existing employees to check for duplicates
        let existingEmployees: Record<string, unknown>[] = []
        try {
            const existRes = await fetch(`${base}/api/v1/employees/?per_page=1000&include_archived=true`, {
                headers,
                signal: AbortSignal.timeout(15_000),
            })
            if (existRes.ok) {
                const json = await existRes.json()
                existingEmployees = json.data?.results || json.results || (Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [])
            }
        } catch { /* proceed without */ }

        // email → employee ID map (existing + newly created)
        const emailToId = new Map<string, string>()
        // employee_code → employee ID map for duplicate detection
        const codeToId = new Map<string, string>()
        for (const emp of existingEmployees) {
            if (emp.email && emp.id) {
                emailToId.set((emp.email as string).toLowerCase(), emp.id as string)
            }
            if (emp.employee_code && emp.id) {
                codeToId.set((emp.employee_code as string).toLowerCase(), emp.id as string)
            }
        }

        const inserted: number[] = []
        const skipped: number[] = []
        const errors: Array<{ row: number; employeeCode?: string; email?: string; reason: string }> = []
        const credentials: Array<{ employeeCode: string; email: string; tempPassword: string; name: string }> = []

        // Track which created employees need reporting_to set in pass 2
        const pendingManagerLinks: Array<{
            employeeId: string
            managerEmail: string
            rowIndex: number
        }> = []

        // Track salary entries to save to local salary store
        const salaryEntries: Array<{ employeeId: string; salary: number }> = []

        // ──────────────────────────────────────────────────────────
        // PASS 1: Create User + Employee for each row (no reporting_to)
        // ──────────────────────────────────────────────────────────
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]

            // Parse name
            let firstName = row.firstName || ""
            let lastName = row.lastName || ""
            if (!firstName && row.fullName) {
                const parts = row.fullName.trim().split(/\s+/)
                firstName = parts[0] || ""
                lastName = parts.slice(1).join(" ") || ""
            }

            // Trim whitespace from all fields
            const email = (row.email || "").trim()
            firstName = firstName.trim()
            lastName = lastName.trim()

            if (!firstName || !email) {
                errors.push({ row: i + 1, employeeCode: row.employeeCode, email, reason: "Missing first name or email" })
                continue
            }

            const empCode = (row.employeeCode || "").trim()

            // Check if employee already exists (by email or employee_code)
            const existingByEmail = emailToId.get(email.toLowerCase())
            const existingByCode = empCode ? codeToId.get(empCode.toLowerCase()) : undefined
            const existingEmpId = existingByEmail || existingByCode || null

            // Build employee payload
            const djangoPayload: Record<string, unknown> = {
                first_name: firstName,
                last_name: lastName,
                email,
                department: (row.departmentName || "").trim(),
                designation: (row.designation || "").trim(),
            }
            const normalizedDate = normalizeDate(row.dateOfJoining)
            if (normalizedDate) djangoPayload.start_date = normalizedDate
            if (empCode) djangoPayload.employee_code = empCode

            // If managerEmail resolves to an EXISTING employee (not in this batch), set it now
            const mgrEmail = (row.managerEmail || "").trim().toLowerCase()
            if (mgrEmail && emailToId.has(mgrEmail)) {
                djangoPayload.reporting_to = emailToId.get(mgrEmail)
            }

            try {
                // ── UPDATE existing employee ──
                if (existingEmpId) {
                    const updateRes = await fetch(`${base}/api/v1/employees/${existingEmpId}/`, {
                        method: "PUT",
                        headers,
                        body: JSON.stringify(djangoPayload),
                        signal: AbortSignal.timeout(15_000),
                    })
                    if (updateRes.ok) {
                        emailToId.set(email.toLowerCase(), existingEmpId)
                        if (empCode) codeToId.set(empCode.toLowerCase(), existingEmpId)
                        inserted.push(i)

                        const rowSalary = parseSalary(row.salary)
                        if (rowSalary > 0) {
                            salaryEntries.push({ employeeId: existingEmpId, salary: rowSalary })
                        }

                        if (mgrEmail && !djangoPayload.reporting_to) {
                            pendingManagerLinks.push({
                                employeeId: existingEmpId,
                                managerEmail: mgrEmail,
                                rowIndex: i,
                            })
                        }
                    } else {
                        const errJson = await updateRes.json().catch(() => ({}))
                        errors.push({ row: i + 1, employeeCode: empCode, email, reason: extractDjangoError(errJson) })
                    }
                    continue
                }

                // ── CREATE new employee ──
                const tempPassword = generateTempPassword()

                // Step 1: Create Django User
                let userId: string | null = null
                try {
                    const userRes = await fetch(`${base}/api/v1/users/`, {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            email,
                            password: tempPassword,
                            first_name: firstName,
                            last_name: lastName,
                            is_tenant_admin: false,
                        }),
                        signal: AbortSignal.timeout(15_000),
                    })
                    if (userRes.ok) {
                        const userJson = await userRes.json()
                        const userData = userJson.data || userJson
                        userId = (userData.id as string) || null
                    } else {
                        const userErr = await userRes.json().catch(() => ({}))
                        const errDetail = JSON.stringify(userErr)
                        if (!errDetail.toLowerCase().includes("already exists")) {
                            console.error(`User creation failed for row ${i + 1} (${email}):`, errDetail)
                        }
                    }
                } catch {
                    // User creation failed — still try to create employee
                }

                // Step 2: Create Employee
                if (userId) djangoPayload.user = userId

                const createRes = await fetch(`${base}/api/v1/employees/`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(djangoPayload),
                    signal: AbortSignal.timeout(15_000),
                })

                if (createRes.ok) {
                    const created = await createRes.json()
                    const emp = created.data || created
                    const empId = emp.id as string
                    const resultCode = emp.employee_code || empCode || ""

                    emailToId.set(email.toLowerCase(), empId)
                    if (resultCode) codeToId.set(resultCode.toLowerCase(), empId)

                    inserted.push(i)
                    credentials.push({
                        employeeCode: resultCode,
                        email,
                        tempPassword,
                        name: `${firstName} ${lastName}`.trim(),
                    })

                    const rowSalary = parseSalary(row.salary)
                    if (rowSalary > 0) {
                        salaryEntries.push({ employeeId: empId, salary: rowSalary })
                    }

                    if (mgrEmail && !djangoPayload.reporting_to) {
                        pendingManagerLinks.push({
                            employeeId: empId,
                            managerEmail: mgrEmail,
                            rowIndex: i,
                        })
                    }
                } else {
                    const errJson = await createRes.json().catch(() => ({}))
                    const errMsg = extractDjangoError(errJson)

                    // If duplicate employee_code or email, find existing and update
                    if (errMsg.toLowerCase().includes("already exists")) {
                        let foundId: string | null = null
                        try {
                            // Search by employee_code
                            const searchRes = await fetch(
                                `${base}/api/v1/employees/?search=${encodeURIComponent(empCode || email)}&include_archived=true`,
                                { headers, signal: AbortSignal.timeout(10_000) }
                            )
                            if (searchRes.ok) {
                                const searchJson = await searchRes.json()
                                const results = searchJson.data?.results || searchJson.results || (Array.isArray(searchJson.data) ? searchJson.data : [])
                                const match = results.find((e: Record<string, unknown>) =>
                                    (empCode && (e.employee_code as string)?.toLowerCase() === empCode.toLowerCase()) ||
                                    (e.email as string)?.toLowerCase() === email.toLowerCase()
                                )
                                if (match) foundId = match.id as string
                            }
                        } catch { /* search failed */ }

                        if (foundId) {
                            // Remove fields that cause conflict on update
                            const updatePayload = { ...djangoPayload }
                            delete updatePayload.employee_code
                            const updateRes = await fetch(`${base}/api/v1/employees/${foundId}/`, {
                                method: "PUT",
                                headers,
                                body: JSON.stringify(updatePayload),
                                signal: AbortSignal.timeout(15_000),
                            })
                            if (updateRes.ok) {
                                emailToId.set(email.toLowerCase(), foundId)
                                inserted.push(i)
                                const rowSalary = parseSalary(row.salary)
                                if (rowSalary > 0) salaryEntries.push({ employeeId: foundId, salary: rowSalary })
                            } else {
                                const upErr = await updateRes.json().catch(() => ({}))
                                errors.push({ row: i + 1, employeeCode: empCode, email, reason: extractDjangoError(upErr) })
                            }
                        } else {
                            errors.push({ row: i + 1, employeeCode: empCode, email, reason: errMsg })
                        }
                    } else {
                        errors.push({ row: i + 1, employeeCode: empCode, email, reason: errMsg })
                    }
                }
            } catch {
                errors.push({ row: i + 1, employeeCode: empCode, email, reason: "Network error" })
            }
        }

        // ──────────────────────────────────────────────────────────
        // PASS 2: Link reporting_to for employees whose manager was
        //         in the same batch (now created and in emailToId)
        // ──────────────────────────────────────────────────────────
        for (const link of pendingManagerLinks) {
            const managerId = emailToId.get(link.managerEmail)
            if (!managerId) continue // Manager wasn't created (maybe had errors)

            try {
                const patchRes = await fetch(`${base}/api/v1/employees/${link.employeeId}/`, {
                    method: "PUT",
                    headers,
                    body: JSON.stringify({ reporting_to: managerId }),
                    signal: AbortSignal.timeout(10_000),
                })
                if (!patchRes.ok) {
                    // Non-critical — employee was created, just manager link failed
                    console.error(`Failed to link manager for employee ${link.employeeId}`)
                }
            } catch {
                // Non-critical
            }
        }

        // ──────────────────────────────────────────────────────────
        // PASS 3: Save salary data to file-backed salary store
        // ──────────────────────────────────────────────────────────
        if (salaryEntries.length > 0) {
            console.log(`[import] Saving ${salaryEntries.length} salary entries:`, JSON.stringify(salaryEntries))
            salaryStore.setBatch(salaryEntries)
        } else {
            console.log(`[import] No salary entries to save`)
        }

        return NextResponse.json({
            data: {
                inserted: inserted.length,
                skipped: skipped.length,
                errors,
                credentials,
                managersLinked: pendingManagerLinks.filter(l => emailToId.has(l.managerEmail)).length,
            },
        })
    } catch {
        return NextResponse.json(
            { error: { detail: "Invalid request body" } },
            { status: 400 }
        )
    }
}
