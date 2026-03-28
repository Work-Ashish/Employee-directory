"use client"

import * as React from "react"

import { useAuth } from "@/context/AuthContext"
import { AdminAttendanceView } from "@/components/attendance/AdminAttendanceView"
import { EmployeeAttendanceView } from "@/components/attendance/EmployeeAttendanceView"
import { Module, canAccessModule, hasAdminScope } from "@/lib/permissions"
import { useRouter } from "next/navigation"

export default function Attendance() {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    React.useEffect(() => { if (!isLoading && user && !canAccessModule(user.role, Module.ATTENDANCE)) router.push("/") }, [user, isLoading, router])


    if (!hasAdminScope(user?.role ?? '', Module.ATTENDANCE)) {
        return <EmployeeAttendanceView />
    }

    return <AdminAttendanceView />
}
