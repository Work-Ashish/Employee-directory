import { prisma } from "@/lib/prisma"
import { withAuth, orgFilter } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

/**
 * POST /api/employees/import/resolve-hierarchy
 *
 * Accepts mapped import rows and returns suggested manager assignments
 * based on department + designation matching.
 *
 * Algorithm:
 *  1. Group incoming rows by department (case-insensitive).
 *  2. For each department, rank designations by a seniority score.
 *  3. The most senior person in each department becomes department head.
 *  4. If a department already has a head in the DB, use them.
 *  5. Remaining employees report to the resolved department head.
 *  6. Unknown departments or ties get flagged as "unresolved".
 */

// Seniority tiers — higher = more senior. Keywords matched case-insensitively.
const SENIORITY_KEYWORDS: [RegExp, number][] = [
    [/\b(ceo|chief.*officer|c[ftmio]o|founder|president)\b/i, 100],
    [/\b(vp|vice.?president)\b/i, 90],
    [/\b(director|head)\b/i, 80],
    [/\b(senior\s*manager|sr\.?\s*manager)\b/i, 70],
    [/\b(manager|mgr)\b/i, 60],
    [/\b(team\s*lead|tech\s*lead|lead)\b/i, 50],
    [/\b(principal)\b/i, 45],
    [/\b(senior|sr\.?)\b/i, 40],
    [/\b(mid|intermediate)\b/i, 30],
    [/\b(junior|jr\.?|associate|trainee|intern)\b/i, 20],
]

function scoreSeniority(designation: string): number {
    const d = designation.toLowerCase()
    for (const [re, score] of SENIORITY_KEYWORDS) {
        if (re.test(d)) return score
    }
    return 35 // default: mid-level if no keyword matches
}

// Simple fuzzy match: Levenshtein distance / max length < threshold
function fuzzyMatch(a: string, b: string, threshold = 0.3): boolean {
    const la = a.toLowerCase().trim()
    const lb = b.toLowerCase().trim()
    if (la === lb) return true
    if (la.includes(lb) || lb.includes(la)) return true
    const dist = levenshtein(la, lb)
    return dist / Math.max(la.length, lb.length) <= threshold
}

function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length
    if (m === 0) return n
    if (n === 0) return m
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    )
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
        }
    }
    return dp[m][n]
}

interface ImportRow {
    rowIndex: number
    firstName?: string
    lastName?: string
    fullName?: string
    email: string
    designation: string
    departmentName: string
    role?: string
    managerEmail?: string
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

export const POST = withAuth({ module: Module.EMPLOYEES, action: Action.IMPORT }, async (req, ctx) => {
    try {
        const { rows } = await req.json() as { rows: ImportRow[] }

        if (!Array.isArray(rows) || rows.length === 0) {
            return apiError("No rows provided", ApiErrorCode.BAD_REQUEST, 400)
        }

        const orgId = ctx.organizationId

        // Fetch existing employees and departments
        const [existingEmployees, departments] = await Promise.all([
            prisma.employee.findMany({
                where: { ...orgFilter(ctx), status: "ACTIVE", deletedAt: null },
                select: { id: true, email: true, firstName: true, lastName: true, designation: true, managerId: true, department: { select: { name: true } } },
            }),
            prisma.department.findMany({
                where: { organizationId: orgId },
                select: { id: true, name: true },
            }),
        ])

        // Build department name lookup (case-insensitive, fuzzy)
        const deptNames = departments.map(d => d.name)

        // Find existing department heads (employees with no manager, or most senior per dept)
        const existingByDept: Record<string, typeof existingEmployees> = {}
        for (const emp of existingEmployees) {
            const dept = emp.department?.name?.toLowerCase() || ""
            if (!existingByDept[dept]) existingByDept[dept] = []
            existingByDept[dept].push(emp)
        }

        // For each department, find the most senior existing employee (head)
        const existingHeads: Record<string, { email: string; name: string }> = {}
        for (const [dept, emps] of Object.entries(existingByDept)) {
            // Head = employee with no manager, or highest seniority
            const head = emps
                .sort((a, b) => {
                    if (!a.managerId && b.managerId) return -1
                    if (a.managerId && !b.managerId) return 1
                    return scoreSeniority(b.designation) - scoreSeniority(a.designation)
                })[0]
            if (head) {
                existingHeads[dept] = { email: head.email, name: `${head.firstName} ${head.lastName}` }
            }
        }

        // Process incoming rows
        const enriched = rows.map((row) => {
            const name = row.firstName
                ? `${row.firstName} ${row.lastName || ""}`.trim()
                : String(row.fullName || "")
            return {
                ...row,
                name,
                seniorityScore: scoreSeniority(row.designation || ""),
                resolvedDept: deptNames.find(d => fuzzyMatch(d, row.departmentName || "")) || row.departmentName,
            }
        })

        // Group by resolved department
        const byDept: Record<string, typeof enriched> = {}
        for (const row of enriched) {
            const key = (row.resolvedDept || "").toLowerCase()
            if (!byDept[key]) byDept[key] = []
            byDept[key].push(row)
        }

        const suggestions: HierarchySuggestion[] = []

        for (const [deptKey, deptRows] of Object.entries(byDept)) {
            // Sort by seniority (descending)
            const sorted = [...deptRows].sort((a, b) => b.seniorityScore - a.seniorityScore)
            const topRow = sorted[0]

            // Check if row already has a manager set
            for (const row of sorted) {
                const isCEO = (row.role || "").toUpperCase() === "CEO"

                // If already has manager email set, keep it
                if (row.managerEmail) {
                    suggestions.push({
                        rowIndex: row.rowIndex,
                        email: row.email,
                        name: row.name,
                        designation: row.designation,
                        departmentName: row.departmentName,
                        suggestedManagerEmail: row.managerEmail,
                        suggestedManagerName: null,
                        seniorityScore: row.seniorityScore,
                        resolution: "already-set",
                        confidence: "high",
                    })
                    continue
                }

                // CEO doesn't need a manager
                if (isCEO) {
                    suggestions.push({
                        rowIndex: row.rowIndex,
                        email: row.email,
                        name: row.name,
                        designation: row.designation,
                        departmentName: row.departmentName,
                        suggestedManagerEmail: null,
                        suggestedManagerName: null,
                        seniorityScore: row.seniorityScore,
                        resolution: "ceo-no-manager",
                        confidence: "high",
                    })
                    continue
                }

                // Check if there's an existing department head in DB
                const existingHead = existingHeads[deptKey]
                if (existingHead && existingHead.email !== row.email) {
                    suggestions.push({
                        rowIndex: row.rowIndex,
                        email: row.email,
                        name: row.name,
                        designation: row.designation,
                        departmentName: row.departmentName,
                        suggestedManagerEmail: existingHead.email,
                        suggestedManagerName: existingHead.name,
                        seniorityScore: row.seniorityScore,
                        resolution: "auto-existing-head",
                        confidence: "high",
                    })
                    continue
                }

                // If this is the top person in this department batch
                if (row === topRow && sorted.length > 1) {
                    // They become the dept head — no manager from import (unresolved)
                    suggestions.push({
                        rowIndex: row.rowIndex,
                        email: row.email,
                        name: row.name,
                        designation: row.designation,
                        departmentName: row.departmentName,
                        suggestedManagerEmail: null,
                        suggestedManagerName: null,
                        seniorityScore: row.seniorityScore,
                        resolution: "auto-dept-head",
                        confidence: "medium",
                    })
                    continue
                }

                // Others report to the department's top person
                if (topRow && topRow.email !== row.email) {
                    suggestions.push({
                        rowIndex: row.rowIndex,
                        email: row.email,
                        name: row.name,
                        designation: row.designation,
                        departmentName: row.departmentName,
                        suggestedManagerEmail: topRow.email,
                        suggestedManagerName: topRow.name,
                        seniorityScore: row.seniorityScore,
                        resolution: "auto-seniority",
                        confidence: row.seniorityScore !== topRow.seniorityScore ? "medium" : "low",
                    })
                    continue
                }

                // Single person in department with no existing head
                suggestions.push({
                    rowIndex: row.rowIndex,
                    email: row.email,
                    name: row.name,
                    designation: row.designation,
                    departmentName: row.departmentName,
                    suggestedManagerEmail: null,
                    suggestedManagerName: null,
                    seniorityScore: row.seniorityScore,
                    resolution: "unresolved",
                    confidence: "low",
                })
            }
        }

        // Sort by rowIndex for stable output
        suggestions.sort((a, b) => a.rowIndex - b.rowIndex)

        const resolved = suggestions.filter(s => s.suggestedManagerEmail !== null || s.resolution === "ceo-no-manager" || s.resolution === "auto-dept-head").length
        const unresolved = suggestions.length - resolved

        return apiSuccess({ suggestions, resolved, unresolved, total: suggestions.length })
    } catch (error) {
        console.error("[HIERARCHY_RESOLVE]", error)
        return apiError("Hierarchy resolution failed", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
