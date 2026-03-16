import { api } from "@/lib/api-client"

export interface DashboardStats {
  totalEmployees: number
  totalDepartments: number
  statusCounts: Record<string, number>
  departmentSplit: Array<{ id: string; name: string; color: string; employeeCount: number }>
  recentHires: Array<{ id: string; firstName: string; lastName: string; designation: string; createdAt: string }>
  salaryStats: { averageSalary: number } | null
}

export interface LoginStats {
  totalSessions: number
  activeSessions: number
  loginsLast7Days: number
}

export const DashboardAPI = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get<DashboardStats>("/dashboard/")
    return data
  },

  getLogins: async (): Promise<LoginStats> => {
    const { data } = await api.get<LoginStats>("/dashboard/logins/")
    return data
  },
}
