"use client"

import { useAuth } from "@/context/AuthContext"
import { AdminPayrollView } from "@/components/payroll/AdminPayrollView"
import { EmployeePayrollView } from "@/components/payroll/EmployeePayrollView"

export default function Payroll() {
    const { user } = useAuth()

    if (user?.role === 'EMPLOYEE') {
        return <EmployeePayrollView />
    }

    return <AdminPayrollView />
}
