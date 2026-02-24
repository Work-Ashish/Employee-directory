"use client"

import { useAuth } from "@/context/AuthContext"
import { AdminPFView } from "@/components/pf/AdminPFView"
import { EmployeePFView } from "@/components/pf/EmployeePFView"

export default function ProvidentFund() {
    const { user } = useAuth()

    if (user?.role === 'EMPLOYEE') {
        return <EmployeePFView />
    }

    return <AdminPFView />
}
