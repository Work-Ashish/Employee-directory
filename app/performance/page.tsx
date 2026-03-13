"use client"

import { useAuth } from "@/context/AuthContext"
import { AdminPerformanceView } from "@/components/performance/AdminPerformanceView"
import { EmployeePerformanceView } from "@/components/performance/EmployeePerformanceView"
import { Roles } from "@/lib/permissions"

export default function PerformancePage() {
    const { user } = useAuth()
    const role = user?.role

    if (role === Roles.CEO || role === Roles.HR || role === Roles.TEAM_LEAD) {
        return <AdminPerformanceView />
    }

    return <EmployeePerformanceView />
}
