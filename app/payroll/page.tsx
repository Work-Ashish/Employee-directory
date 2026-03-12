"use client"

import { useAuth } from "@/context/AuthContext"
import { AdminPayrollView } from "@/components/payroll/AdminPayrollView"
import { EmployeePayrollView } from "@/components/payroll/EmployeePayrollView"
import { hasAdminScope, Module } from "@/lib/permissions"

export default function Payroll() {
    const { user } = useAuth()

    if (!hasAdminScope(user?.role ?? '', Module.PAYROLL)) {
        return <EmployeePayrollView />
    }

    return <AdminPayrollView />
}
