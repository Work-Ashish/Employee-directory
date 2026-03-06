"use client"

import { useAuth } from "@/context/AuthContext"
import { AdminPerformanceView } from "@/components/performance/AdminPerformanceView"
import { EmployeePerformanceView } from "@/components/performance/EmployeePerformanceView"
import { hasPermission, Module, Action } from "@/lib/permissions"

export default function PerformancePage() {
    const { user } = useAuth()

    if (!hasPermission(user?.role ?? '', Module.PERFORMANCE, Action.CREATE)) {
        return <EmployeePerformanceView />
    }

    return <AdminPerformanceView />
}
