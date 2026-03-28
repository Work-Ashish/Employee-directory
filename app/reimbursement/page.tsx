"use client"

import * as React from "react"

import { useAuth } from "@/context/AuthContext"
import { AdminReimbursementView } from "@/components/reimbursement/AdminReimbursementView"
import { EmployeeReimbursementView } from "@/components/reimbursement/EmployeeReimbursementView"
import { Module, canAccessModule, hasAdminScope } from "@/lib/permissions"
import { useRouter } from "next/navigation"

export default function Reimbursement() {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    React.useEffect(() => { if (!isLoading && user && !canAccessModule(user.role, Module.REIMBURSEMENT)) router.push("/") }, [user, isLoading, router])


    if (!hasAdminScope(user?.role ?? '', Module.REIMBURSEMENT)) {
        return <EmployeeReimbursementView />
    }

    return <AdminReimbursementView />
}
