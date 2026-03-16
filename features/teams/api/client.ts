import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface Team {
  id: string
  name: string
  description?: string | null
  department?: string | null
  departmentName?: string | null
  leadId?: string
  lead: string | { id: string; firstName: string; lastName: string; avatarUrl?: string; designation?: string } | null
  leadName?: string | null
  members?: TeamMember[]
  memberCount?: number
  _count?: { members: number }
  createdAt: string
  updatedAt: string
}

export interface TeamMember {
  id: string
  team?: string
  employee: string | { id: string; firstName: string; lastName: string; avatarUrl?: string; designation: string; email?: string }
  employeeName?: string
  role?: string
  createdAt?: string
}

export interface OrgChartNode {
  id: string
  firstName: string
  lastName: string
  designation: string
  department: string
  avatarUrl: string | null
  reportingTo: string | null
  directReports: OrgChartNode[]
}

export const TeamAPI = {
  list: async (params?: string): Promise<PaginatedResponse<Team>> => {
    const path = params ? `/teams/?${params}` : "/teams/"
    const { data } = await api.get<PaginatedResponse<Team>>(path)
    return data
  },

  get: async (id: string): Promise<Team & { members: TeamMember[] }> => {
    const { data } = await api.get<Team & { members: TeamMember[] }>(`/teams/${id}/`)
    return data
  },

  create: async (payload: Record<string, unknown>): Promise<Team> => {
    const { data } = await api.post<Team>("/teams/", payload)
    return data
  },

  update: async (id: string, payload: Record<string, unknown>): Promise<Team> => {
    const { data } = await api.put<Team>(`/teams/${id}/`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/teams/${id}/`)
  },

  orgChart: async (): Promise<OrgChartNode[]> => {
    const { data } = await api.get<OrgChartNode[]>("/teams/org-chart/")
    return data
  },
}
