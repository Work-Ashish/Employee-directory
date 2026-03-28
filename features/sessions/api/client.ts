import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface UserSession {
  id: string
  user: string
  userEmail: string
  ipAddress: string | null
  userAgent: string
  lastActivity: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const SessionAPI = {
  list: async (params?: string): Promise<PaginatedResponse<UserSession>> => {
    const path = params ? `/sessions/?${params}` : "/sessions/"
    const { data } = await api.get<PaginatedResponse<UserSession>>(path)
    return data
  },

  terminate: async (id: string): Promise<void> => {
    await api.delete(`/sessions/${id}/`)
  },
}
