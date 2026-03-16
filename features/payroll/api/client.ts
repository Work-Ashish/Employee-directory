import { api } from "@/lib/api-client"
import type { PaginatedResponse } from "@/lib/api-client"

export interface PayrollRecord {
  id: string
  employee: string
  employeeName: string
  month: string
  basicSalary: string
  allowances: string
  arrears: string
  reimbursements: string
  pfDeduction: string
  tax: string
  otherDeductions: string
  loansAdvances: string
  netSalary: string
  status: string
  isFinalized: boolean
  pdfUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface PFRecord {
  id: string
  employee: string
  employeeName: string
  month: string
  accountNumber: string
  basicSalary: string
  employeeContribution: string
  employerContribution: string
  totalContribution: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface PayrollConfig {
  id: string
  regimeName: string
  pfPercentage: number
  standardDeduction: number
  healthCess: number
  isActive: boolean
  taxSlabs: Array<{ id: string; minIncome: number; maxIncome: number | null; taxRate: number; baseTax: number }>
}

export const PayrollAPI = {
  list: async (params?: string): Promise<PaginatedResponse<PayrollRecord>> => {
    const path = params ? `/payroll/?${params}` : "/payroll/"
    const { data } = await api.get<PaginatedResponse<PayrollRecord>>(path)
    return data
  },

  get: async (id: string): Promise<PayrollRecord> => {
    const { data } = await api.get<PayrollRecord>(`/payroll/${id}/`)
    return data
  },

  run: async (payload: Record<string, unknown>): Promise<PayrollRecord> => {
    const { data } = await api.post<PayrollRecord>("/payroll/run/", payload)
    return data
  },

  finalize: async (id: string): Promise<PayrollRecord> => {
    const { data } = await api.put<PayrollRecord>(`/payroll/${id}/`, { action: "FINALIZE" })
    return data
  },

  getConfig: async (): Promise<PayrollConfig | Record<string, never>> => {
    const { data } = await api.get<PayrollConfig | Record<string, never>>("/payroll/config/")
    return data
  },

  saveConfig: async (payload: Record<string, unknown>): Promise<PayrollConfig> => {
    const { data } = await api.post<PayrollConfig>("/payroll/config/", payload)
    return data
  },

  listPF: async (params?: string): Promise<PaginatedResponse<PFRecord>> => {
    const path = params ? `/payroll/pf/?${params}` : "/payroll/pf/"
    const { data } = await api.get<PaginatedResponse<PFRecord>>(path)
    return data
  },

  createPF: async (payload: Record<string, unknown>): Promise<PFRecord> => {
    const { data } = await api.post<PFRecord>("/payroll/pf/", payload)
    return data
  },
}
