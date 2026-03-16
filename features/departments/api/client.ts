import { api } from "@/lib/api-client"

export interface Department {
  id: string
  name: string
  color: string
  employeeCount?: number
}

export const DepartmentAPI = {
  list: async (): Promise<Department[]> => {
    const { data } = await api.get<Department[]>("/departments/")
    return data
  },

  create: async (payload: { name: string; color: string }): Promise<Department> => {
    const { data } = await api.post<Department>("/departments/", payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/departments/${id}/`)
  },
}
