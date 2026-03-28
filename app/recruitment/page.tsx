"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { canAccessModule, Module } from "@/lib/permissions"

export default function RecruitmentPage() {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    React.useEffect(() => { if (!isLoading && user && !canAccessModule(user.role, Module.RECRUITMENT)) router.push("/") }, [user, isLoading, router])

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold">Recruitment</h1>
            <p className="text-text-3 mt-2">Coming soon.</p>
        </div>
    )
}
