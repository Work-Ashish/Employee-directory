import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface Resignation {
  id: string
  employee: string
  employeeName: string
  reason: string
  lastWorkingDate: string
  status: string
  statusDisplay: string
  approvedBy: string | null
  approvedByName: string | null
  submittedAt: string
  createdAt: string
  updatedAt: string
}

export const ResignationAPI = {
  list: async (params?: string): Promise<PaginatedResponse<Resignation>> => {
    const path = params ? `/resignations/?${params}` : "/resignations/"
    const { data } = await api.get<PaginatedResponse<Resignation>>(path)
    return data
  },

  get: async (id: string): Promise<Resignation> => {
    const { data } = await api.get<Resignation>(`/resignations/${id}/`)
    return data
  },

  create: async (payload: Record<string, unknown>): Promise<Resignation> => {
    const { data } = await api.post<Resignation>("/resignations/", payload)
    return data
  },

  update: async (id: string, payload: Record<string, unknown>): Promise<Resignation> => {
    const { data } = await api.put<Resignation>(`/resignations/${id}/`, payload)
    return data
  },
}
