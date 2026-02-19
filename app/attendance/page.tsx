"use client"

import { useAuth } from "@/context/AuthContext"
import { AdminAttendanceView } from "@/components/attendance/AdminAttendanceView"
import { EmployeeAttendanceView } from "@/components/attendance/EmployeeAttendanceView"

export default function Attendance() {
    const { user } = useAuth()

    if (user?.role === 'employee') {
        return <EmployeeAttendanceView />
    }

    return <AdminAttendanceView />
}
