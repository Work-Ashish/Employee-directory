import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface Document {
  id: string
  title: string
  fileUrl: string
  url: string
  fileType: string
  size: number | string | null
  uploadedBy: string | null
  uploadedByName?: string | null
  category: string
  categoryDisplay?: string
  isPublic: boolean
  uploadDate: string
  employeeId?: string | null
  employee?: { id: string; firstName: string; lastName: string } | null
  createdAt: string
  updatedAt: string
}

export const DocumentAPI = {
  list: async (params?: string): Promise<PaginatedResponse<Document>> => {
    const path = params ? `/documents/?${params}` : "/documents/"
    const { data } = await api.get<PaginatedResponse<Document>>(path)
    return data
  },

  get: async (id: string): Promise<Document> => {
    const { data } = await api.get<Document>(`/documents/${id}/`)
    return data
  },

  create: async (payload: Record<string, unknown>): Promise<Document> => {
    const { data } = await api.post<Document>("/documents/", payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}/`)
  },
}
