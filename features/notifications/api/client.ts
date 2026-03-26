import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  typeDisplay: string
  isRead: boolean
  link: string
  createdAt: string
}

export interface AdminAlert {
  id: string
  title: string
  message: string
  severity: string
  severityDisplay: string
  isResolved: boolean
  createdAt: string
}

export const NotificationAPI = {
  list: async (params?: string): Promise<PaginatedResponse<Notification>> => {
    const path = params ? `/notifications/?${params}` : "/notifications/"
    const { data } = await api.get<PaginatedResponse<Notification>>(path)
    return data
  },

  markRead: async (id: string): Promise<void> => {
    await api.put(`/notifications/${id}/read/`)
  },

  markAllRead: async (): Promise<void> => {
    await api.put("/notifications/read/")
  },

  listAlerts: async (): Promise<AdminAlert[]> => {
    const { data } = await api.get<AdminAlert[]>("/notifications/alerts/")
    return data
  },
}
