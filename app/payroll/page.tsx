"use client"

import * as React from "react"

import { useAuth } from "@/context/AuthContext"
import { AdminPayrollView } from "@/components/payroll/AdminPayrollView"
import { EmployeePayrollView } from "@/components/payroll/EmployeePayrollView"
import { Module, canAccessModule, hasAdminScope } from "@/lib/permissions"
import { useRouter } from "next/navigation"

export default function Payroll() {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    React.useEffect(() => { if (!isLoading && user && !canAccessModule(user.role, Module.PAYROLL)) router.push("/") }, [user, isLoading, router])


    if (!hasAdminScope(user?.role ?? '', Module.PAYROLL)) {
        return <EmployeePayrollView />
    }

    return <AdminPayrollView />
}
