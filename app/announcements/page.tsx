"use client"

import { useAuth } from "@/context/AuthContext"
import { AdminAnnouncementsView } from "@/components/announcements/AdminAnnouncementsView"
import { EmployeeAnnouncementsView } from "@/components/announcements/EmployeeAnnouncementsView"

export default function Announcements() {
    const { user } = useAuth()

    if (user?.role === 'EMPLOYEE') {
        return <EmployeeAnnouncementsView />
    }

    return <AdminAnnouncementsView />
}
