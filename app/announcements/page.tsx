"use client"

import { useAuth } from "@/context/AuthContext"
import { AdminAnnouncementsView } from "@/components/announcements/AdminAnnouncementsView"
import { EmployeeAnnouncementsView } from "@/components/announcements/EmployeeAnnouncementsView"
import { hasPermission, Module, Action } from "@/lib/permissions"

export default function Announcements() {
    const { user } = useAuth()

    if (!hasPermission(user?.role ?? '', Module.ANNOUNCEMENTS, Action.CREATE)) {
        return <EmployeeAnnouncementsView />
    }

    return <AdminAnnouncementsView />
}
