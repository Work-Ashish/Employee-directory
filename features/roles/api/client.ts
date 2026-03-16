import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface FunctionalRole {
  id: string
  name: string
  description: string
  isActive: boolean
  capabilities: string[]
  assignmentCount: number
  createdAt: string
  updatedAt: string
}

export interface Capability {
  resource: string
  actions: string[]
}

export const RoleAPI = {
  list: async (params?: string): Promise<PaginatedResponse<FunctionalRole>> => {
    const path = params ? `/roles/?${params}` : "/roles/"
    const { data } = await api.get<PaginatedResponse<FunctionalRole>>(path)
    return data
  },

  get: async (id: string): Promise<FunctionalRole> => {
    const { data } = await api.get<FunctionalRole>(`/roles/${id}/`)
    return data
  },

  create: async (payload: Record<string, unknown>): Promise<FunctionalRole> => {
    const { data } = await api.post<FunctionalRole>("/roles/", payload)
    return data
  },

  update: async (id: string, payload: Record<string, unknown>): Promise<FunctionalRole> => {
    const { data } = await api.put<FunctionalRole>(`/roles/${id}/`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/roles/${id}/`)
  },

  capabilities: async (): Promise<string[]> => {
    const { data } = await api.get<string[]>("/roles/capabilities/")
    return data
  },
}
