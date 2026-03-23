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

// ── Source One Types ────────────────────────────────────────────────

export interface ReviewCycle {
  id: string
  cycleType: string
  cycleTypeDisplay: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  financialYear: string
  status: string
  statusDisplay: string
  createdAt: string
  updatedAt: string
}

export interface MonthlyReviewMetric {
  serialNo: number
  metric: string
  target: number | null
  achieved: number | null
  conversionPct: number | null
}

export interface TeamLeadMetric {
  serialNo: number
  metric: string
  details: string
}

export interface MonthlyReviewData {
  id: string
  cycle: string | null
  employee: string
  employeeName: string
  reviewer: string | null
  reviewerName: string | null
  reportingManager: string | null
  managerName: string | null
  reviewMonth: number
  reviewYear: number
  recruiterMetrics: MonthlyReviewMetric[]
  teamLeadMetrics: TeamLeadMetric[]
  rating: number | null
  ratingCategory: string
  ratingCategoryDisplay: string
  scorePercentage: number | null
  reviewerRemarks: string
  strengthsObserved: string
  areasForImprovement: string
  actionItems: string
  appreciationOrAlert: string
  alertTypeDisplay: string
  employeeSignedAt: string | null
  managerSignedAt: string | null
  hrSignedAt: string | null
  status: string
  statusDisplay: string
  createdAt: string
  updatedAt: string
}

export interface AppraisalData {
  id: string
  cycle: string | null
  employee: string
  employeeName: string
  reportingManager: string | null
  managerName: string | null
  hrReviewer: string | null
  hrReviewerName: string | null
  reviewType: string
  reviewTypeDisplay: string
  reviewPeriod: string
  financialYear: string
  monthlySummary: Record<string, unknown>[]
  conversionKpis: Record<string, unknown>[]
  recruiterCompetencies: Record<string, unknown>[]
  teamLeadCompetencies: Record<string, unknown>[]
  selfAssessment: Record<string, unknown>
  overallRating: number | null
  finalRatingCategory: string
  keyStrengths: string
  developmentAreas: string
  goalsNextPeriod: string
  trainingRecommended: string
  promotionRecommendation: string
  salaryRevisionRecommendation: string
  outcomeDecision: string
  outcomeDisplay: string
  additionalHrRemarks: string
  employeeSignedAt: string | null
  managerSignedAt: string | null
  hrSignedAt: string | null
  isEligible: boolean
  eligibilityReason: string
  status: string
  statusDisplay: string
  createdAt: string
  updatedAt: string
}

export interface PIPData {
  id: string
  employee: string
  employeeName: string
  triggeredByMonthly: string | null
  triggeredByAppraisal: string | null
  pipType: string
  pipTypeDisplay: string
  startDate: string
  endDate: string
  specificTargets: Record<string, unknown>[]
  weeklyCheckins: Record<string, unknown>[]
  status: string
  statusDisplay: string
  outcome: string
  createdAt: string
  updatedAt: string
}

export interface EligibilityResult {
  employeeId: string
  employeeName: string
  eligible: boolean
  reason: string
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

  // ── Source One: Review Cycles ─────────────────────────────
  listCycles: async (params?: string): Promise<PaginatedResponse<ReviewCycle>> => {
    const path = params ? `/performance/cycles/?${params}` : "/performance/cycles/"
    const { data } = await api.get<PaginatedResponse<ReviewCycle>>(path)
    return data
  },
  createCycle: async (payload: Record<string, unknown>): Promise<ReviewCycle> => {
    const { data } = await api.post<ReviewCycle>("/performance/cycles/", payload)
    return data
  },

  // ── Source One: Monthly Reviews ───────────────────────────
  listMonthlyReviews: async (params?: string): Promise<PaginatedResponse<MonthlyReviewData>> => {
    const path = params ? `/performance/monthly/?${params}` : "/performance/monthly/"
    const { data } = await api.get<PaginatedResponse<MonthlyReviewData>>(path)
    return data
  },
  createMonthlyReview: async (payload: Record<string, unknown>): Promise<MonthlyReviewData> => {
    const { data } = await api.post<MonthlyReviewData>("/performance/monthly/", payload)
    return data
  },
  getMonthlyReview: async (id: string): Promise<MonthlyReviewData> => {
    const { data } = await api.get<MonthlyReviewData>(`/performance/monthly/${id}/`)
    return data
  },
  updateMonthlyReview: async (id: string, payload: Record<string, unknown>): Promise<MonthlyReviewData> => {
    const { data } = await api.put<MonthlyReviewData>(`/performance/monthly/${id}/`, payload)
    return data
  },
  signMonthlyReview: async (id: string, role: string): Promise<MonthlyReviewData> => {
    const { data } = await api.post<MonthlyReviewData>(`/performance/monthly/${id}/sign/`, { role })
    return data
  },

  // ── Source One: Appraisals ────────────────────────────────
  listAppraisals: async (params?: string): Promise<PaginatedResponse<AppraisalData>> => {
    const path = params ? `/performance/appraisals/?${params}` : "/performance/appraisals/"
    const { data } = await api.get<PaginatedResponse<AppraisalData>>(path)
    return data
  },
  createAppraisal: async (payload: Record<string, unknown>): Promise<AppraisalData> => {
    const { data } = await api.post<AppraisalData>("/performance/appraisals/", payload)
    return data
  },
  getAppraisal: async (id: string): Promise<AppraisalData> => {
    const { data } = await api.get<AppraisalData>(`/performance/appraisals/${id}/`)
    return data
  },
  updateAppraisal: async (id: string, payload: Record<string, unknown>): Promise<AppraisalData> => {
    const { data } = await api.put<AppraisalData>(`/performance/appraisals/${id}/`, payload)
    return data
  },
  checkEligibility: async (financialYear: string): Promise<EligibilityResult[]> => {
    const { data } = await api.get<EligibilityResult[]>(`/performance/appraisals/eligibility/?financial_year=${financialYear}`)
    return data
  },

  // ── Source One: PIPs ──────────────────────────────────────
  listPIPs: async (params?: string): Promise<PaginatedResponse<PIPData>> => {
    const path = params ? `/performance/pip/?${params}` : "/performance/pip/"
    const { data } = await api.get<PaginatedResponse<PIPData>>(path)
    return data
  },
  createPIP: async (payload: Record<string, unknown>): Promise<PIPData> => {
    const { data } = await api.post<PIPData>("/performance/pip/", payload)
    return data
  },
  updatePIP: async (id: string, payload: Record<string, unknown>): Promise<PIPData> => {
    const { data } = await api.put<PIPData>(`/performance/pip/${id}/`, payload)
    return data
  },
}
