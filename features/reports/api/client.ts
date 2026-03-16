import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface SavedReport {
  id: string
  name: string
  type: string
  typeDisplay?: string
  entityType?: string
  config: Record<string, unknown>
  createdBy?: string | null
  createdByName?: string | null
  createdAt: string
  updatedAt?: string
}

export const ReportAPI = {
  list: async (params?: string): Promise<PaginatedResponse<SavedReport>> => {
    const path = params ? `/reports/?${params}` : "/reports/"
    const { data } = await api.get<PaginatedResponse<SavedReport>>(path)
    return data
  },

  get: async (id: string): Promise<SavedReport> => {
    const { data } = await api.get<SavedReport>(`/reports/${id}/`)
    return data
  },

  create: async (payload: Record<string, unknown>): Promise<SavedReport> => {
    const { data } = await api.post<SavedReport>("/reports/", payload)
    return data
  },

  update: async (id: string, payload: Record<string, unknown>): Promise<SavedReport> => {
    const { data } = await api.put<SavedReport>(`/reports/${id}/`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/reports/${id}/`)
  },

  generate: async (payload: Record<string, unknown>): Promise<unknown> => {
    const { data } = await api.post<unknown>("/reports/generate/", payload)
    return data
  },
}
