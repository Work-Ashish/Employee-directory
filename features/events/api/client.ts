import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface CalendarEvent {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  isAllDay: boolean
  type: string
  typeDisplay: string
  createdBy: string | null
  createdByName: string | null
  attendeeIds: string[]
  createdAt: string
  updatedAt: string
}

export const EventAPI = {
  list: async (params?: string): Promise<PaginatedResponse<CalendarEvent>> => {
    const path = params ? `/events/?${params}` : "/events/"
    const { data } = await api.get<PaginatedResponse<CalendarEvent>>(path)
    return data
  },

  get: async (id: string): Promise<CalendarEvent> => {
    const { data } = await api.get<CalendarEvent>(`/events/${id}/`)
    return data
  },

  create: async (payload: Record<string, unknown>): Promise<CalendarEvent> => {
    const { data } = await api.post<CalendarEvent>("/events/", payload)
    return data
  },

  update: async (id: string, payload: Record<string, unknown>): Promise<CalendarEvent> => {
    const { data } = await api.put<CalendarEvent>(`/events/${id}/`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/events/${id}/`)
  },
}
