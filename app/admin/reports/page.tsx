"use client"

import { ReportBuilder } from "@/components/admin/reports/ReportBuilder"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { BarChartIcon, ReloadIcon, PlusIcon } from "@radix-ui/react-icons"
import { canAccessModule, Module } from "@/lib/permissions"

export default function AdminReportsPage() {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login")
        } else if (!isLoading && !canAccessModule(user?.role ?? "", Module.REPORTS)) {
            router.push("/")
        }
    }, [user, isLoading, router])

    if (isLoading || !user) {
        return (
            <div className="h-full flex items-center justify-center">
                <ReloadIcon className="w-6 h-6 animate-spin text-[var(--accent)]" />
            </div>
        )
    }

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/20">
                            <BarChartIcon className="w-5 h-5 text-[var(--accent)]" />
                        </div>
                        <h1 className="text-[28px] font-bold tracking-tight">Reports & Analytics</h1>
                    </div>
                    <p className="text-[14px] text-[var(--text3)]">Design, save, and export custom HR and Payroll reports.</p>
                </div>
            </div>

            <ReportBuilder />
        </div>
    )
}
