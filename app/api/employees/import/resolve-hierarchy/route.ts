/**
 * /api/employees/import/resolve-hierarchy — Local handler.
 *
 * Analyzes imported CSV rows and suggests manager assignments
 * based on department, designation seniority, and existing employees.
 */
import { NextResponse } from "next/server"
import { withAuth, AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

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

// Simple seniority scoring based on common designation keywords
const SENIORITY_KEYWORDS: Record<string, number> = {
    ceo: 100, cto: 95, cfo: 95, coo: 95, "chief": 90,
    vp: 80, "vice president": 80, director: 70,
    "senior manager": 65, "head": 60, manager: 50,
    "team lead": 45, lead: 40, senior: 30,
    "": 10, intern: 5, trainee: 5,
}

function seniorityScore(designation: string): number {
    const lower = (designation || "").toLowerCase()
    for (const [keyword, score] of Object.entries(SENIORITY_KEYWORDS)) {
        if (keyword && lower.includes(keyword)) return score
    }
    return 10
}

interface ImportRow {
    rowIndex: number
    email?: string
    firstName?: string
    lastName?: string
    fullName?: string
    designation?: string
    departmentName?: string
    managerEmail?: string
}

function normalizeKey(value: string | number | undefined | null): string {
    return String(value || "").trim().toLowerCase()
}

function buildFullName(firstName?: string | null, lastName?: string | null): string {
    return `${firstName || ""} ${lastName || ""}`.trim()
}

async function handlePOST(req: Request) {
    try {
        const body = await req.json()
        const rows: ImportRow[] = body.rows || []

        if (!rows.length) {
            return NextResponse.json({ data: { suggestions: [] } })
        }

        // Fetch existing employees for context
        let existingEmployees: Record<string, unknown>[] = []
        try {
            const res = await fetch(`${getDjangoBase()}/api/v1/employees/?per_page=1000`, {
                headers: forwardHeaders(req),
                signal: AbortSignal.timeout(10_000),
            })
            if (res.ok) {
                const json = await res.json()
                existingEmployees = json.data?.results || json.results || (Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [])
            }
        } catch { /* proceed without existing employees */ }

        // Build department → highest-seniority existing employee map
        const deptHeads = new Map<string, { email: string; name: string; score: number }>()
        const existingRefs = new Map<string, { email: string; name: string }>()
        for (const emp of existingEmployees) {
            const dept = normalizeKey(emp.department as string)
            const desig = (emp.designation as string) || ""
            const score = seniorityScore(desig)
            const existing = deptHeads.get(dept)
            const fullName = buildFullName(emp.first_name as string, emp.last_name as string)
            const refValue = { email: emp.email as string, name: fullName }
            if (emp.email) existingRefs.set(normalizeKey(emp.email as string), refValue)
            if (emp.employee_code) existingRefs.set(normalizeKey(emp.employee_code as string), refValue)
            if (fullName) existingRefs.set(normalizeKey(fullName), refValue)
            if (!existing || score > existing.score) {
                deptHeads.set(dept, {
                    email: emp.email as string,
                    name: fullName,
                    score,
                })
            }
        }

        // Also build map from CSV rows for cross-referencing
        const csvRefs = new Map<string, ImportRow>()
        for (const row of rows) {
            const name = row.fullName || `${row.firstName || ""} ${row.lastName || ""}`.trim()
            if (row.email) csvRefs.set(normalizeKey(row.email), row)
            if ((row as Record<string, unknown>).employeeCode) {
                csvRefs.set(normalizeKey((row as Record<string, unknown>).employeeCode as string), row)
            }
            if (name) csvRefs.set(normalizeKey(name), row)
        }

        // Group CSV rows by department for intra-batch resolution
        const csvDeptGroups = new Map<string, ImportRow[]>()
        for (const row of rows) {
            const dept = normalizeKey(row.departmentName)
            if (!csvDeptGroups.has(dept)) csvDeptGroups.set(dept, [])
            csvDeptGroups.get(dept)!.push(row)
        }

        const suggestions = rows.map((row) => {
            const name = row.fullName || `${row.firstName || ""} ${row.lastName || ""}`.trim()
            const desig = row.designation || ""
            const dept = normalizeKey(row.departmentName)
            const score = seniorityScore(desig)
            const managerRef = normalizeKey(row.managerEmail)

            // Already has a manager assigned
            if (managerRef) {
                const matchedExisting = existingRefs.get(managerRef)
                const matchedCsv = csvRefs.get(managerRef)
                const matchedName = matchedExisting?.name || (matchedCsv?.fullName || `${matchedCsv?.firstName || ""} ${matchedCsv?.lastName || ""}`.trim()) || null
                const matchedEmail = matchedExisting?.email || matchedCsv?.email || row.managerEmail || null
                return {
                    rowIndex: row.rowIndex,
                    email: row.email || "",
                    name,
                    designation: desig,
                    departmentName: row.departmentName || "",
                    suggestedManagerEmail: matchedEmail,
                    suggestedManagerName: matchedName,
                    seniorityScore: score,
                    resolution: matchedEmail ? "already-set" as const : "unresolved" as const,
                    confidence: matchedEmail ? "high" as const : "low" as const,
                }
            }

            // CEO-level — no manager needed
            if (score >= 90) {
                return {
                    rowIndex: row.rowIndex,
                    email: row.email || "",
                    name,
                    designation: desig,
                    departmentName: row.departmentName || "",
                    suggestedManagerEmail: null,
                    suggestedManagerName: null,
                    seniorityScore: score,
                    resolution: "ceo-no-manager" as const,
                    confidence: "high" as const,
                }
            }

            // Try to find existing department head
            const existingHead = deptHeads.get(dept)
            if (existingHead && existingHead.email.toLowerCase() !== (row.email || "").toLowerCase()) {
                return {
                    rowIndex: row.rowIndex,
                    email: row.email || "",
                    name,
                    designation: desig,
                    departmentName: row.departmentName || "",
                    suggestedManagerEmail: existingHead.email,
                    suggestedManagerName: existingHead.name,
                    seniorityScore: score,
                    resolution: "auto-existing-head" as const,
                    confidence: existingHead.score > score ? "high" as const : "medium" as const,
                }
            }

            // Try to find most senior person in same department from CSV batch
            const deptPeers = csvDeptGroups.get(dept) || []
            let bestPeer: ImportRow | null = null
            let bestScore = 0
            for (const peer of deptPeers) {
                if (peer.email === row.email) continue
                const peerScore = seniorityScore(peer.designation || "")
                if (peerScore > bestScore && peerScore > score) {
                    bestPeer = peer
                    bestScore = peerScore
                }
            }

            if (bestPeer?.email) {
                const peerName = bestPeer.fullName || `${bestPeer.firstName || ""} ${bestPeer.lastName || ""}`.trim()
                return {
                    rowIndex: row.rowIndex,
                    email: row.email || "",
                    name,
                    designation: desig,
                    departmentName: row.departmentName || "",
                    suggestedManagerEmail: bestPeer.email,
                    suggestedManagerName: peerName,
                    seniorityScore: score,
                    resolution: "auto-seniority" as const,
                    confidence: "medium" as const,
                }
            }

            // No suggestion
            return {
                rowIndex: row.rowIndex,
                email: row.email || "",
                name,
                designation: desig,
                departmentName: row.departmentName || "",
                suggestedManagerEmail: null,
                suggestedManagerName: null,
                seniorityScore: score,
                resolution: "unresolved" as const,
                confidence: "low" as const,
            }
        })

        return NextResponse.json({ data: { suggestions } })
    } catch {
        return NextResponse.json(
            { error: { detail: "Invalid request body" } },
            { status: 400 }
        )
    }
}

export const POST = withAuth({ module: Module.EMPLOYEES, action: Action.VIEW }, handlePOST)
