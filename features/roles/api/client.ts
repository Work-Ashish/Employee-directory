import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface FunctionalRole {
  id: string
  name: string
  slug: string
  description: string
  isSystem: boolean
  userCount: number
  permissionCount: number
  createdAt: string
  updatedAt: string
}

export interface Permission {
  codename: string
  name: string
  module: string
}

export const RoleAPI = {
  list: async (params?: string): Promise<PaginatedResponse<FunctionalRole>> => {
    const path = params ? `/rbac/roles/?${params}` : "/rbac/roles/"
    const { data } = await api.get<PaginatedResponse<FunctionalRole>>(path)
    return data
  },

  get: async (id: string): Promise<FunctionalRole> => {
    const { data } = await api.get<FunctionalRole>(`/rbac/roles/${id}/`)
    return data
  },

  create: async (payload: Record<string, unknown>): Promise<FunctionalRole> => {
    const { data } = await api.post<FunctionalRole>("/rbac/roles/", payload)
    return data
  },

  update: async (id: string, payload: Record<string, unknown>): Promise<FunctionalRole> => {
    const { data } = await api.put<FunctionalRole>(`/rbac/roles/${id}/`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/rbac/roles/${id}/`)
  },

  capabilities: async (): Promise<Permission[]> => {
    const { data } = await api.get<Permission[]>("/permissions/")
    return data
  },
}
