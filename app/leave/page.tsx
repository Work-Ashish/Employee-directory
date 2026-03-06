"use client"

import React, { Suspense } from "react"
import { useAuth } from "@/context/AuthContext"
import { AdminLeaveView } from "@/components/leave/AdminLeaveView"
import { EmployeeLeaveView } from "@/components/leave/EmployeeLeaveView"
import { hasPermission, Module, Action } from "@/lib/permissions"

function LeaveContent() {
    const { user } = useAuth()

    if (!hasPermission(user?.role ?? '', Module.LEAVES, Action.UPDATE)) {
        return <EmployeeLeaveView />
    }

    return <AdminLeaveView />
}

export default function Leave() {
    return (
        <Suspense fallback={<div>Loading leaves...</div>}>
            <LeaveContent />
        </Suspense>
    )
}
