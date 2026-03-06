"use client"

import { useAuth } from "@/context/AuthContext"
import { AdminPayrollView } from "@/components/payroll/AdminPayrollView"
import { EmployeePayrollView } from "@/components/payroll/EmployeePayrollView"
import { hasPermission, Module, Action } from "@/lib/permissions"

export default function Payroll() {
    const { user } = useAuth()

    if (!hasPermission(user?.role ?? '', Module.PAYROLL, Action.CREATE)) {
        return <EmployeePayrollView />
    }

    return <AdminPayrollView />
}
