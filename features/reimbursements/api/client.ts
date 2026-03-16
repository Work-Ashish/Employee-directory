import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface Reimbursement {
  id: string
  employee: string
  employeeName: string
  amount: number
  category: string
  categoryDisplay: string
  description: string
  receiptUrl: string
  status: string
  statusDisplay: string
  approvedBy: string | null
  approvedByName: string | null
  createdAt: string
  updatedAt: string
}

export const ReimbursementAPI = {
  list: async (params?: string): Promise<PaginatedResponse<Reimbursement>> => {
    const path = params ? `/reimbursements/?${params}` : "/reimbursements/"
    const { data } = await api.get<PaginatedResponse<Reimbursement>>(path)
    return data
  },

  get: async (id: string): Promise<Reimbursement> => {
    const { data } = await api.get<Reimbursement>(`/reimbursements/${id}/`)
    return data
  },

  create: async (payload: Record<string, unknown>): Promise<Reimbursement> => {
    const { data } = await api.post<Reimbursement>("/reimbursements/", payload)
    return data
  },

  update: async (id: string, payload: Record<string, unknown>): Promise<Reimbursement> => {
    const { data } = await api.put<Reimbursement>(`/reimbursements/${id}/`, payload)
    return data
  },
}
