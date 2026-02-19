"use client"

import { useAuth } from "@/context/AuthContext"
import { AdminPerformanceView } from "@/components/performance/AdminPerformanceView"
import { EmployeePerformanceView } from "@/components/performance/EmployeePerformanceView"

export default function Performance() {
    const { user } = useAuth()

    if (user?.role === 'employee') {
        return <EmployeePerformanceView />
    }

    return <AdminPerformanceView />
}
