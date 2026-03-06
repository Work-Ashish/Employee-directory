"use client"

import { useAuth } from "@/context/AuthContext"
import { AdminAttendanceView } from "@/components/attendance/AdminAttendanceView"
import { EmployeeAttendanceView } from "@/components/attendance/EmployeeAttendanceView"
import { hasPermission, Module, Action } from "@/lib/permissions"

export default function Attendance() {
    const { user } = useAuth()

    if (!hasPermission(user?.role ?? '', Module.ATTENDANCE, Action.UPDATE)) {
        return <EmployeeAttendanceView />
    }

    return <AdminAttendanceView />
}
