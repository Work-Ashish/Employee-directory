"use client"

import { useAuth } from "@/context/AuthContext"
import { AdminLeaveView } from "@/components/leave/AdminLeaveView"
import { EmployeeLeaveView } from "@/components/leave/EmployeeLeaveView"

export default function Leave() {
    const { user } = useAuth()

    if (user?.role === 'EMPLOYEE') {
        return <EmployeeLeaveView />
    }

    return <AdminLeaveView />
}
