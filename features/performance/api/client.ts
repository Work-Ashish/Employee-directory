import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface PerformanceReview {
  id: string
  employee: string
  employeeName: string
  reviewer: string | null
  reviewerName: string | null
  template: string | null
  period: string
  overallScore: number | null
  strengths: string
  improvements: string
  goals: string
  status: string
  statusDisplay: string
  createdAt: string
  updatedAt: string
}

export interface PerformanceTemplate {
  id: string
  name: string
  description: string
  criteria: unknown[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PerformanceMetrics {
  id: string
  employee: string
  period: string
  taskCompletionRate: number
  attendanceScore: number
  collaborationScore: number
  qualityScore: number
  overallScore: number
  createdAt: string
}

export const PerformanceAPI = {
  listReviews: async (params?: string): Promise<PaginatedResponse<PerformanceReview>> => {
    const path = params ? `/performance/reviews/?${params}` : "/performance/reviews/"
    const { data } = await api.get<PaginatedResponse<PerformanceReview>>(path)
    return data
  },

  getReview: async (id: string): Promise<PerformanceReview> => {
    const { data } = await api.get<PerformanceReview>(`/performance/reviews/${id}/`)
    return data
  },

  createReview: async (payload: Record<string, unknown>): Promise<PerformanceReview> => {
    const { data } = await api.post<PerformanceReview>("/performance/reviews/", payload)
    return data
  },

  updateReview: async (id: string, payload: Record<string, unknown>): Promise<PerformanceReview> => {
    const { data } = await api.put<PerformanceReview>(`/performance/reviews/${id}/`, payload)
    return data
  },

  listTemplates: async (): Promise<PerformanceTemplate[]> => {
    const { data } = await api.get<PerformanceTemplate[]>("/performance/templates/")
    return data
  },

  getTemplate: async (id: string): Promise<PerformanceTemplate> => {
    const { data } = await api.get<PerformanceTemplate>(`/performance/templates/${id}/`)
    return data
  },

  createTemplate: async (payload: Record<string, unknown>): Promise<PerformanceTemplate> => {
    const { data } = await api.post<PerformanceTemplate>("/performance/templates/", payload)
    return data
  },

  updateTemplate: async (id: string, payload: Record<string, unknown>): Promise<PerformanceTemplate> => {
    const { data } = await api.put<PerformanceTemplate>(`/performance/templates/${id}/`, payload)
    return data
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/performance/templates/${id}/`)
  },

  getMetrics: async (params?: string): Promise<PerformanceMetrics[]> => {
    const path = params ? `/performance/metrics/?${params}` : "/performance/metrics/"
    const { data } = await api.get<PerformanceMetrics[]>(path)
    return data
  },
}
