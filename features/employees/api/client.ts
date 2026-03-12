import { EmployeeApiData } from "@/features/employees/types"

interface PaginatedResponse<T> {
    data: T[]
    total: number
    page: number
    limit: number
}

export const EmployeeAPI = {
    fetchEmployees: async (page: number, limit: number): Promise<PaginatedResponse<EmployeeApiData>> => {
        const res = await fetch(`/api/employees?page=${page}&limit=${limit}`)
        if (!res.ok) throw new Error("Failed to fetch employees")

        // Support both raw arrays and {data, total} structures securely
        const json = await res.json()
        if (Array.isArray(json)) {
            return { data: json, total: json.length, page, limit }
        }
        return json
    },

    deleteEmployee: async (id: string): Promise<void> => {
        const res = await fetch(`/api/employees/${id}`, { method: "DELETE" })
        if (!res.ok) throw new Error("Failed to delete employee")
    },

    resetCredentials: async (id: string): Promise<{ username: string; tempPassword: string }> => {
        const res = await fetch(`/api/employees/${id}/credentials`, { method: "POST" })
        if (!res.ok) throw new Error("Failed to reset credentials")
        const json = await res.json()
        return json.data
    },

    upsertEmployee: async (isEdit: boolean, id: string | undefined, data: any): Promise<any> => {
        const url = isEdit ? `/api/employees/${id}` : "/api/employees"
        const res = await fetch(url, {
            method: isEdit ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error?.message || err.details || "Operation failed")
        }
        const json = await res.json()
        return json.data
    }
}
