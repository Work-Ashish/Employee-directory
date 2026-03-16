import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface LeaveRecord {
  id: string
  type: string
  typeDisplay: string
  startDate: string
  endDate: string
  reason: string
  status: string
  statusDisplay: string
  employee: string
  employeeName: string
  createdAt: string
  updatedAt: string
}

export const LeaveAPI = {
  list: async (params?: string): Promise<PaginatedResponse<LeaveRecord>> => {
    const path = params ? `/leaves/?${params}` : "/leaves/"
    const { data } = await api.get<PaginatedResponse<LeaveRecord>>(path)
    return data
  },

  get: async (id: string): Promise<LeaveRecord> => {
    const { data } = await api.get<LeaveRecord>(`/leaves/${id}/`)
    return data
  },

  create: async (payload: Record<string, unknown>): Promise<LeaveRecord> => {
    const { data } = await api.post<LeaveRecord>("/leaves/", payload)
    return data
  },

  update: async (id: string, payload: { status: string }): Promise<LeaveRecord> => {
    const { data } = await api.put<LeaveRecord>(`/leaves/${id}/`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/leaves/${id}/`)
  },
}
