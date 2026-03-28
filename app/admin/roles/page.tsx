"use client"

import * as React from "react"

import { RoleManagement } from "@/components/admin/RoleManagement"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"

export default function RolesAdminPage() {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    React.useEffect(() => { if (!isLoading && user && user.role !== "CEO" && user.role !== "HR") router.push("/") }, [user, isLoading, router])

    return <RoleManagement />
}
