import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface Feedback {
  id: string
  fromEmployee: string
  fromEmployeeName: string
  toEmployee: string | null
  toEmployeeName: string | null
  type: string
  typeDisplay: string
  rating: number
  content: string
  isAnonymous: boolean
  createdAt: string
}

export const FeedbackAPI = {
  list: async (params?: string): Promise<PaginatedResponse<Feedback>> => {
    const path = params ? `/feedback/?${params}` : "/feedback/"
    const { data } = await api.get<PaginatedResponse<Feedback>>(path)
    return data
  },

  get: async (id: string): Promise<Feedback> => {
    const { data } = await api.get<Feedback>(`/feedback/${id}/`)
    return data
  },

  create: async (payload: Record<string, unknown>): Promise<Feedback> => {
    const { data } = await api.post<Feedback>("/feedback/", payload)
    return data
  },
}
