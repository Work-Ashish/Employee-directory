"use client"

import { ReportBuilder } from "@/components/admin/reports/ReportBuilder"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { BarChartIcon } from "@radix-ui/react-icons"
import { canAccessModule, Module } from "@/lib/permissions"
import { Spinner } from "@/components/ui/Spinner"
import { PageHeader } from "@/components/ui/PageHeader"

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
                <Spinner size="lg" className="text-accent" />
            </div>
        )
    }

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8">
            <PageHeader
                title="Reports & Analytics"
                description="Design, save, and export custom HR and Payroll reports."
                actions={
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
                        <BarChartIcon className="w-5 h-5 text-accent" />
                    </div>
                }
            />

            <ReportBuilder />
        </div>
    )
}
