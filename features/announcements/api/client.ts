import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface Announcement {
  id: string
  title: string
  content: string
  priority: string
  priorityDisplay: string
  isActive: boolean
  expiresAt: string | null
  createdBy: string | null
  createdByName: string | null
  createdAt: string
  updatedAt: string
}

export interface Kudos {
  id: string
  fromEmployee: string
  fromEmployeeName?: string
  toEmployee: string
  toEmployeeName?: string
  from?: string
  to?: string
  message: string
  category?: string
  categoryDisplay?: string
  isPublic?: boolean
  time?: string
  color?: string
  createdAt: string
}

export const AnnouncementAPI = {
  list: async (params?: string): Promise<PaginatedResponse<Announcement>> => {
    const path = params ? `/announcements/?${params}` : "/announcements/"
    const { data } = await api.get<PaginatedResponse<Announcement>>(path)
    return data
  },

  get: async (id: string): Promise<Announcement> => {
    const { data } = await api.get<Announcement>(`/announcements/${id}/`)
    return data
  },

  create: async (payload: Record<string, unknown>): Promise<Announcement> => {
    const { data } = await api.post<Announcement>("/announcements/", payload)
    return data
  },

  update: async (id: string, payload: Record<string, unknown>): Promise<Announcement> => {
    const { data } = await api.put<Announcement>(`/announcements/${id}/`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/announcements/${id}/`)
  },

  listKudos: async (params?: string): Promise<PaginatedResponse<Kudos>> => {
    const path = params ? `/kudos/?${params}` : "/kudos/"
    const { data } = await api.get<PaginatedResponse<Kudos>>(path)
    return data
  },

  createKudos: async (payload: Record<string, unknown>): Promise<Kudos> => {
    const { data } = await api.post<Kudos>("/kudos/", payload)
    return data
  },

  deleteKudos: async (id: string): Promise<void> => {
    await api.delete(`/kudos/${id}/`)
  },
}
