import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface AttendanceRecord {
  id: string
  employee: string
  employeeName: string
  date: string
  checkIn: string | null
  checkOut: string | null
  workHours: number | null
  overtime: number
  isLate: boolean
  isEarlyExit: boolean
  status: string
  statusDisplay: string
  createdAt: string
  updatedAt: string
}

export const AttendanceAPI = {
  list: async (params?: string): Promise<PaginatedResponse<AttendanceRecord>> => {
    const path = params ? `/attendance/?${params}` : "/attendance/"
    const { data } = await api.get<PaginatedResponse<AttendanceRecord>>(path)
    return data
  },

  get: async (id: string): Promise<AttendanceRecord> => {
    const { data } = await api.get<AttendanceRecord>(`/attendance/${id}/`)
    return data
  },

  create: async (payload: Record<string, unknown>): Promise<AttendanceRecord> => {
    const { data } = await api.post<AttendanceRecord>("/attendance/", payload)
    return data
  },

  update: async (id: string, payload: Record<string, unknown>): Promise<AttendanceRecord> => {
    const { data } = await api.put<AttendanceRecord>(`/attendance/${id}/`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/attendance/${id}/`)
  },
}
