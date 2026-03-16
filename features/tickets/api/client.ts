import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface Ticket {
  id: string
  subject: string
  description: string
  category: string
  categoryDisplay: string
  priority: string
  priorityDisplay: string
  status: string
  statusDisplay: string
  assignedTo: string | null
  assignedToName: string | null
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

export const TicketAPI = {
  list: async (params?: string): Promise<PaginatedResponse<Ticket>> => {
    const path = params ? `/tickets/?${params}` : "/tickets/"
    const { data } = await api.get<PaginatedResponse<Ticket>>(path)
    return data
  },

  get: async (id: string): Promise<Ticket> => {
    const { data } = await api.get<Ticket>(`/tickets/${id}/`)
    return data
  },

  create: async (payload: Record<string, unknown>): Promise<Ticket> => {
    const { data } = await api.post<Ticket>("/tickets/", payload)
    return data
  },

  update: async (id: string, payload: Record<string, unknown>): Promise<Ticket> => {
    const { data } = await api.put<Ticket>(`/tickets/${id}/`, payload)
    return data
  },
}
