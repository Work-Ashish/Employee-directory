"use client"

import { useAuth } from "@/context/AuthContext"
import { AdminAttendanceView } from "@/components/attendance/AdminAttendanceView"
import { EmployeeAttendanceView } from "@/components/attendance/EmployeeAttendanceView"
import { hasAdminScope, Module } from "@/lib/permissions"

export default function Attendance() {
    const { user } = useAuth()

    if (!hasAdminScope(user?.role ?? '', Module.ATTENDANCE)) {
        return <EmployeeAttendanceView />
    }

    return <AdminAttendanceView />
}
