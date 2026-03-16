import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface Training {
  id: string
  title: string
  description: string
  instructor: string
  startDate: string
  endDate: string
  maxParticipants: number
  status: string
  statusDisplay: string
  department: string | null
  departmentName: string | null
  enrollmentCount: number
  createdAt: string
  updatedAt: string
}

export interface TrainingEnrollment {
  id: string
  training: string
  employee: string
  employeeName: string
  status: string
  statusDisplay: string
  completedAt: string | null
  createdAt: string
}

export const TrainingAPI = {
  list: async (params?: string): Promise<PaginatedResponse<Training>> => {
    const path = params ? `/training/?${params}` : "/training/"
    const { data } = await api.get<PaginatedResponse<Training>>(path)
    return data
  },

  get: async (id: string): Promise<Training & { enrollments: TrainingEnrollment[] }> => {
    const { data } = await api.get<Training & { enrollments: TrainingEnrollment[] }>(`/training/${id}/`)
    return data
  },

  create: async (payload: Record<string, unknown>): Promise<Training> => {
    const { data } = await api.post<Training>("/training/", payload)
    return data
  },

  update: async (id: string, payload: Record<string, unknown>): Promise<Training> => {
    const { data } = await api.put<Training>(`/training/${id}/`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/training/${id}/`)
  },

  enroll: async (trainingId: string, payload?: Record<string, unknown>): Promise<TrainingEnrollment> => {
    const { data } = await api.post<TrainingEnrollment>(`/training/${trainingId}/enroll/`, payload)
    return data
  },

  unenroll: async (trainingId: string): Promise<void> => {
    await api.delete(`/training/${trainingId}/enroll/`)
  },
}
