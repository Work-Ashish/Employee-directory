import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"
import { EmployeeApiData } from "@/features/employees/types"

interface EmployeeListResponse {
    results: Record<string, unknown>[]
    total: number
    page: number
    limit: number
    totalPages: number
}

interface CredentialsResponse {
    employeeId: string
    email: string
    tempPassword: string
}

/**
 * Transform a Django employee response into the shape the frontend expects.
 * Django returns `department` as a plain string; the frontend expects it as
 * an object with { id, name, color } and a separate `departmentId` field.
 */
/** Map Django status values to frontend uppercase enum values. */
const STATUS_MAP: Record<string, string> = {
    pre_joining: "ACTIVE",
    active: "ACTIVE",
    on_notice: "ON_LEAVE",
    exited: "TERMINATED",
    // Also handle already-uppercase values from frontend
    ACTIVE: "ACTIVE",
    ON_LEAVE: "ON_LEAVE",
    RESIGNED: "RESIGNED",
    TERMINATED: "TERMINATED",
}

function enrichEmployee(raw: Record<string, unknown>): EmployeeApiData {
    const dept = raw.department as string | undefined | null

    // Map Django snake_case fields to frontend camelCase
    // api-client.ts already does camelCase transform, so both forms may exist
    const firstName = (raw.firstName || raw.first_name || "") as string
    const lastName = (raw.lastName || raw.last_name || "") as string
    const employeeCode = (raw.employeeCode || raw.employee_code || "") as string
    const startDate = (raw.startDate || raw.start_date || raw.dateOfJoining || "") as string
    const reportingTo = raw.reportingTo || raw.reporting_to || raw.managerId || null
    const reportingToName = raw.reportingToName || raw.reporting_to_name || null
    const statusRaw = (raw.status || "") as string
    const status = STATUS_MAP[statusRaw] || statusRaw.toUpperCase() || "ACTIVE"

    // Build manager object if reporting_to data is available
    let manager: EmployeeApiData["manager"] = undefined
    if (reportingToName && typeof reportingToName === "string") {
        const parts = reportingToName.split(" ")
        manager = {
            id: (reportingTo || "") as string,
            firstName: parts[0] || "",
            lastName: parts.slice(1).join(" ") || "",
            designation: "",
        }
    }

    return {
        ...raw,
        firstName,
        lastName,
        employeeCode,
        email: (raw.email || "") as string,
        phone: (raw.phone || null) as string | null,
        designation: (raw.designation || "") as string,
        department: dept ? { id: dept, name: dept, color: "from-[#007aff] to-[#5856d6]" } : undefined,
        departmentId: (dept || "") as string,
        dateOfJoining: startDate as string,
        salary: (raw.salary || 0) as number,
        status,
        managerId: (reportingTo || null) as string | null,
        manager,
        avatarUrl: (raw.avatarUrl || null) as string | null,
    } as EmployeeApiData
}

/**
 * Transform frontend form data into the shape Django expects.
 * The form sends `departmentId` (department name in our system);
 * Django expects `department` as a plain string field.
 */
function toDjangoPayload(payload: Record<string, unknown>): Record<string, unknown> {
    const out = { ...payload }
    if (out.departmentId !== undefined) {
        out.department = out.departmentId
        delete out.departmentId
    }
    if (out.dateOfJoining !== undefined) {
        out.startDate = out.dateOfJoining
        delete out.dateOfJoining
    }
    if (out.managerId !== undefined) {
        out.reportingTo = out.managerId || null
        delete out.managerId
    }
    // Remove fields Django Employee serializer doesn't accept
    delete out.role
    delete out.salary
    delete out.avatarUrl
    delete out.id
    // Django uses lowercase status choices (active, pre_joining, etc.)
    if (typeof out.status === "string") {
        out.status = out.status.toLowerCase()
    }
    return out
}

/** Save salary to local store (fire-and-forget). */
function saveSalary(employeeId: string, salary: number): void {
    fetch("/api/employees/salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, salary }),
    }).catch(() => { /* best-effort */ })
}

/** Fetch salary data from local store and return as id→salary map. */
async function fetchSalaryMap(): Promise<Map<string, number>> {
    const map = new Map<string, number>()
    try {
        const headers: Record<string, string> = { "Content-Type": "application/json" }
        const res = await fetch("/api/employees/salaries", { headers })
        if (res.ok) {
            const json = await res.json()
            const data = json.data || {}
            for (const [id, salary] of Object.entries(data)) {
                map.set(id, Number(salary) || 0)
            }
        }
    } catch { /* salary store unavailable */ }
    return map
}

export const EmployeeAPI = {
    fetchEmployees: async (
        page: number,
        limit: number,
        filters?: { search?: string; status?: string; departmentId?: string }
    ): Promise<PaginatedResponse<EmployeeApiData>> => {
        const params = new URLSearchParams({
            page: String(page),
            limit: String(limit),
        })
        if (filters?.search) params.set("search", filters.search)
        if (filters?.status) params.set("status", filters.status)
        if (filters?.departmentId) params.set("department", filters.departmentId)

        const [{ data }, salaryMap] = await Promise.all([
            api.get<EmployeeListResponse | Record<string, unknown>[]>(`/employees/?${params}`),
            fetchSalaryMap(),
        ])

        const mergeWithSalary = (r: Record<string, unknown>): EmployeeApiData => {
            const emp = enrichEmployee(r)
            const storedSalary = salaryMap.get(emp.id)
            if (storedSalary != null && storedSalary > 0) {
                emp.salary = storedSalary
            }
            return emp
        }

        // Django may return a flat array or a paginated envelope
        if (Array.isArray(data)) {
            // Flat array — do client-side pagination
            const start = (page - 1) * limit
            const sliced = data.slice(start, start + limit)
            return {
                results: sliced.map((r) => mergeWithSalary(r as Record<string, unknown>)),
                total: data.length,
                page,
                limit,
                totalPages: Math.ceil(data.length / limit) || 1,
            }
        }

        // Paginated envelope
        return {
            results: (data.results || []).map(mergeWithSalary),
            total: data.total ?? 0,
            page: data.page ?? page,
            limit: data.limit ?? limit,
            totalPages: data.totalPages ?? 1,
        }
    },

    getEmployee: async (id: string): Promise<EmployeeApiData> => {
        const [{ data }, salaryMap] = await Promise.all([
            api.get<Record<string, unknown>>(`/employees/${id}/`),
            fetchSalaryMap(),
        ])
        const emp = enrichEmployee(data)
        const storedSalary = salaryMap.get(emp.id)
        if (storedSalary != null && storedSalary > 0) {
            emp.salary = storedSalary
        }
        return emp
    },

    deleteEmployee: async (id: string): Promise<void> => {
        await api.delete(`/employees/${id}/`)
    },

    resetCredentials: async (id: string): Promise<CredentialsResponse> => {
        const headers: Record<string, string> = { "Content-Type": "application/json" }
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("access_token")
            if (token) headers["Authorization"] = `Bearer ${token}`
            const slug = localStorage.getItem("tenant_slug")
            if (slug) headers["X-Tenant-Slug"] = slug
        }
        const res = await fetch(`/api/employees/${id}/credentials`, { method: "POST", headers })
        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error?.detail || "Failed to reset credentials")
        }
        const json = await res.json()
        return json.data || json
    },

    upsertEmployee: async (isEdit: boolean, id: string | undefined, payload: unknown): Promise<EmployeeApiData> => {
        const rawPayload = payload as Record<string, unknown>
        const salary = Number(rawPayload.salary) || 0
        const djangoPayload = toDjangoPayload(rawPayload)

        if (isEdit && id) {
            const { data } = await api.put<Record<string, unknown>>(`/employees/${id}/`, djangoPayload)
            // Save salary to local store
            if (salary > 0) {
                saveSalary(id, salary)
            }
            const emp = enrichEmployee(data)
            emp.salary = salary
            return emp
        }
        // For new employees, use the local route that creates both User + Employee
        // Salary is included in payload for the create route to store
        const createPayload = { ...djangoPayload, salary }
        const headers: Record<string, string> = { "Content-Type": "application/json" }
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("access_token")
            if (token) headers["Authorization"] = `Bearer ${token}`
            const slug = localStorage.getItem("tenant_slug")
            if (slug) headers["X-Tenant-Slug"] = slug
        }
        const res = await fetch("/api/employees/create", {
            method: "POST",
            headers,
            body: JSON.stringify(createPayload),
        })
        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}))
            const detail = errJson.error?.detail || errJson.detail || "Failed to create employee"
            const error = new Error(Array.isArray(detail) ? detail.join(". ") : detail) as Error & { status: number; data: unknown }
            error.status = res.status
            error.data = errJson
            throw error
        }
        const json = await res.json()
        const empData = json.data || json
        return enrichEmployee(empData)
    },

    fetchManagers: async (): Promise<Array<{ id: string; employeeCode: string; firstName: string; lastName: string; email: string; designation: string }>> => {
        const headers: Record<string, string> = { "Content-Type": "application/json" }
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("access_token")
            if (token) headers["Authorization"] = `Bearer ${token}`
            const slug = localStorage.getItem("tenant_slug")
            if (slug) headers["X-Tenant-Slug"] = slug
        }
        const res = await fetch("/api/employees/managers", { headers })
        if (!res.ok) return []
        const json = await res.json()
        return json.data || json || []
    },
}
