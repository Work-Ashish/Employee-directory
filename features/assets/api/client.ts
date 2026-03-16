import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface Asset {
  id: string
  name: string
  type: string
  typeDisplay?: string
  serialNumber: string
  assignedTo: string | { id: string; firstName: string; lastName: string; employeeCode: string } | null
  assignedToId?: string | null
  assignedToName?: string | null
  status: string
  statusDisplay?: string
  purchaseDate: string | null
  value: number
  notes?: string
  image?: string | null
  assignedDate?: string | null
  createdAt: string
  updatedAt: string
}

export const AssetAPI = {
  list: async (params?: string): Promise<PaginatedResponse<Asset>> => {
    const path = params ? `/assets/?${params}` : "/assets/"
    const { data } = await api.get<PaginatedResponse<Asset>>(path)
    return data
  },

  get: async (id: string): Promise<Asset> => {
    const { data } = await api.get<Asset>(`/assets/${id}/`)
    return data
  },

  create: async (payload: Record<string, unknown>): Promise<Asset> => {
    const { data } = await api.post<Asset>("/assets/", payload)
    return data
  },

  update: async (id: string, payload: Record<string, unknown>): Promise<Asset> => {
    const { data } = await api.put<Asset>(`/assets/${id}/`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/assets/${id}/`)
  },
}
