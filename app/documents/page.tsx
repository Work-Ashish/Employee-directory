"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { hasAdminScope, Module } from "@/lib/permissions"

export default function DocumentsRedirect() {
    const { user } = useAuth()
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
