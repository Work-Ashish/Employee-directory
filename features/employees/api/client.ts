import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"
import { EmployeeApiData } from "@/features/employees/types"

interface EmployeeListResponse {
    results: EmployeeApiData[]
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
        if (filters?.departmentId) params.set("department_id", filters.departmentId)

        const { data } = await api.get<EmployeeListResponse>(`/employees/?${params}`)
        return {
            results: data.results,
            total: data.total,
            page: data.page,
            limit: data.limit,
            totalPages: data.totalPages,
        }
    },

    getEmployee: async (id: string): Promise<EmployeeApiData> => {
        const { data } = await api.get<EmployeeApiData>(`/employees/${id}/`)
        return data
    },

    deleteEmployee: async (id: string): Promise<void> => {
        await api.delete(`/employees/${id}/`)
    },

    resetCredentials: async (id: string): Promise<CredentialsResponse> => {
        const { data } = await api.post<CredentialsResponse>(`/employees/${id}/credentials/`)
        return data
    },

    upsertEmployee: async (isEdit: boolean, id: string | undefined, payload: unknown): Promise<EmployeeApiData> => {
        if (isEdit && id) {
            const { data } = await api.put<EmployeeApiData>(`/employees/${id}/`, payload)
            return data
        }
        const { data } = await api.post<EmployeeApiData>("/employees/", payload)
        return data
    },

    fetchManagers: async (): Promise<Array<{ id: string; employeeCode: string; firstName: string; lastName: string; email: string; designation: string }>> => {
        const { data } = await api.get<Array<{ id: string; employeeCode: string; firstName: string; lastName: string; email: string; designation: string }>>("/employees/managers/")
        return data
    },
}
