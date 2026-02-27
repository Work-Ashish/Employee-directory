"use client"
import { useEffect } from "react"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("PAGE CRASH ERROR:", error)
    }, [error])

    return (
        <div className="flex items-center justify-center min-h-[60vh] p-8">
            <div className="text-center max-w-md">
                <div className="text-5xl mb-4">😓</div>
                <h2 className="text-xl font-bold text-[var(--text)] mb-2">
                    Something went wrong
                </h2>
                <p className="text-sm text-[var(--text3)] mb-4 leading-relaxed">
                    This page encountered an error. You can try reloading it, or
                    go back to the dashboard.
                </p>
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-left p-3 rounded-lg overflow-auto max-h-[150px] mb-6 font-mono">
                    {error.message || "Unknown error occurred"}
                </div>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => reset()}
                        className="px-5 py-2.5 bg-[var(--blue)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                        Try Again
                    </button>
                    <a
                        href="/"
                        className="px-5 py-2.5 bg-[var(--glass)] text-[var(--text)] rounded-lg text-sm font-semibold hover:opacity-80 transition-opacity border border-[var(--border)]"
                    >
                        Go to Dashboard
                    </a>
                </div>
            </div>
        </div>
    )
}
