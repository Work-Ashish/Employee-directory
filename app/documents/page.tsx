"use client"

import * as React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Module, canAccessModule, hasAdminScope } from "@/lib/permissions"

export default function DocumentsRedirect() {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    React.useEffect(() => { if (!isLoading && user && !canAccessModule(user.role, Module.DOCUMENTS)) router.push("/") }, [user, isLoading, router])

    const router = useRouter()

    useEffect(() => {
        const role = user?.role ?? ""
        if (hasAdminScope(role, Module.DOCUMENTS)) {
            router.replace("/admin/documents")
        } else {
            router.replace("/employee/documents")
        }
    }, [user, router])

    return null
}
