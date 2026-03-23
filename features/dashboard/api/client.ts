export interface DashboardStats {
    stats: {
        totalEmployees: number
        activeEmployees: number
        onLeaveEmployees: number
        monthlyPayroll: number
        attritionRate: number
    }
    deptSplit: Array<{ name: string; count: number; value: number; color: string }>
    hiringTrend: Array<{ month: string; hires: number; details: Array<{ name: string; role: string }> }>
    salaryRanges: Array<{ range: string; count: number }>
    recentHires: Array<{ name: string; initials: string; role: string; date: string; dept: string; color: string }>
    avgSalary: number
}

export interface LoginStats {
    activeTodayCount: number
    recentLogins: Array<{ name: string; lastLoginAt: string; employee?: { designation?: string; department?: { name?: string } } }>
    totalSessions: number
    activeSessions: number
    loginsLast7Days: number
}

function getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("access_token")
        if (token) headers["Authorization"] = `Bearer ${token}`
        const slug = localStorage.getItem("tenant_slug")
        if (slug) headers["X-Tenant-Slug"] = slug
    }
    return headers
}

export const DashboardAPI = {
    getStats: async (): Promise<DashboardStats> => {
        const res = await fetch("/api/dashboard", { headers: getHeaders() })
        if (!res.ok) throw new Error("Failed to fetch dashboard stats")
        const json = await res.json()
        return json.data || json
    },

    getLogins: async (): Promise<LoginStats> => {
        const res = await fetch("/api/dashboard/logins", { headers: getHeaders() })
        if (!res.ok) throw new Error("Failed to fetch login stats")
        const json = await res.json()
        return json.data || json
    },
}
