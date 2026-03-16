import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface TimeSession {
  id: string
  employee: string
  employeeName: string
  startTime: string
  endTime: string | null
  status: string
  statusDisplay: string
  totalBreakMinutes: number
  createdAt: string
}

export interface BreakEntry {
  id: string
  session: string
  startTime: string
  endTime: string | null
  type: string
  typeDisplay: string
}

export interface ActivityLog {
  id: string
  session: string
  app: string
  title: string
  duration: number
  category: string
  createdAt: string
}

export interface TimeTrackerStatus {
  activeSession: TimeSession | null
  activeBreak: BreakEntry | null
  todayTotal: number
}

export const TimeTrackerAPI = {
  list: async (params?: string): Promise<PaginatedResponse<TimeSession>> => {
    const path = params ? `/time-tracker/?${params}` : "/time-tracker/"
    const { data } = await api.get<PaginatedResponse<TimeSession>>(path)
    return data
  },

  checkIn: async (): Promise<TimeSession> => {
    const { data } = await api.post<TimeSession>("/time-tracker/check-in/")
    return data
  },

  checkOut: async (): Promise<TimeSession> => {
    const { data } = await api.post<TimeSession>("/time-tracker/check-out/")
    return data
  },

  startBreak: async (type?: string): Promise<BreakEntry> => {
    const { data } = await api.post<BreakEntry>("/time-tracker/break/", { action: "start", type: type || "SHORT" })
    return data
  },

  endBreak: async (): Promise<BreakEntry> => {
    const { data } = await api.post<BreakEntry>("/time-tracker/break/", { action: "end" })
    return data
  },

  activity: async (params?: string): Promise<PaginatedResponse<ActivityLog>> => {
    const path = params ? `/time-tracker/activity/?${params}` : "/time-tracker/activity/"
    const { data } = await api.get<PaginatedResponse<ActivityLog>>(path)
    return data
  },

  status: async (): Promise<TimeTrackerStatus> => {
    const { data } = await api.get<TimeTrackerStatus>("/time-tracker/status/")
    return data
  },
}
