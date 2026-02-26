"use client"

import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"

export function OnboardingCompanion() {
    const [loading, setLoading] = React.useState(true)
    const [message, setMessage] = React.useState<string | null>(null)

    React.useEffect(() => {
        const fetchOnboarding = async () => {
            try {
                const res = await fetch('/api/onboarding/agent')
                if (res.ok) {
                    const data = await res.json()
                    setMessage(data.message)
                }
            } catch (error) {
                console.error("Failed to fetch onboarding message:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchOnboarding()
    }, [])

    if (loading) {
        return (
            <div className="glass p-6 border-l-4 border-l-[var(--accent)] relative overflow-hidden mb-6">
                <div className="flex gap-4 items-start">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-3">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                </div>
            </div>
        )
    }

    if (!message) return null

    return (
        <div className="glass p-6 border-l-4 border-l-[var(--accent)] relative overflow-hidden mb-6 group">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-[var(--accent)] opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

            <div className="flex items-start gap-4 relative z-10">
                <div className="bg-gradient-to-br from-[var(--accent)] to-[var(--accent2)] w-10 h-10 rounded-full flex items-center justify-center text-white text-lg shadow-lg shrink-0">
                    👋
                </div>
                <div className="flex-1">
                    <h3 className="text-[16px] font-bold text-[var(--text)] mb-2 flex items-center justify-between">
                        Your AI Onboarding Guide
                        <span className="text-[10px] font-mono tracking-wider bg-[var(--accent3)]/20 text-[var(--accent)] px-2 py-0.5 rounded-full uppercase">
                            Beta
                        </span>
                    </h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-[13.5px] leading-relaxed text-[var(--text2)]">
                        <pre className="whitespace-pre-wrap font-sans font-medium">
                            {message}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    )
}
