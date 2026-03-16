"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { LockClosedIcon, CheckIcon } from "@radix-ui/react-icons"
import { motion } from "framer-motion"

export default function ChangePasswordPage() {
    const { user } = useAuth()
    const router = useRouter()

    const [newPassword, setNewPassword] = React.useState("")
    const [confirmPassword, setConfirmPassword] = React.useState("")
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState("")
    const [success, setSuccess] = React.useState(false)

    // If user doesn't require password change, redirect home
    React.useEffect(() => {
        if (user && !user.mustChangePassword && !success) {
            router.replace("/")
        }
    }, [user, success, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters")
            return
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        setLoading(true)
        try {
            const res = await fetch("/api/user/password", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword, isFirstLogin: true }),
            })

            if (res.ok) {
                setSuccess(true)
                // User state will refresh on dashboard load via getMe()
                setTimeout(() => router.replace("/"), 2000)
            } else {
                const data = await res.json()
                setError(data.error || "Failed to update password")
            }
        } catch {
            setError("Something went wrong. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1831] font-['Inter',sans-serif]">
            {/* Animated background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#209680] blur-[150px] opacity-20 rounded-full" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#136f86] blur-[150px] opacity-20 rounded-full" />
            </div>

            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="relative z-10 w-full max-w-[400px] bg-[#0d162a] rounded-[16px] shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="bg-[#44ceb3] py-[18px] px-8 text-center">
                    <h1 className="text-[16px] font-semibold text-[#18362f] tracking-wide uppercase">
                        Set New Password
                    </h1>
                </div>

                <div className="p-7">
                    {success ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center space-y-4 py-4"
                        >
                            <div className="w-14 h-14 rounded-full bg-[#44ceb3]/20 border border-[#44ceb3]/40 flex items-center justify-center mx-auto">
                                <CheckIcon className="w-7 h-7 text-[#44ceb3]" />
                            </div>
                            <p className="text-[#e2e8f0] font-semibold">Password updated successfully!</p>
                            <p className="text-[#64748b] text-[13px]">Redirecting you to the dashboard…</p>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <p className="text-[13px] text-[#64748b] text-center -mt-1 mb-2">
                                Welcome! Please set a new password to continue.
                            </p>

                            {/* New Password */}
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pt-2 pointer-events-none text-gray-400">
                                    <LockClosedIcon className="w-[18px] h-[18px] ml-1" />
                                </div>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-transparent border-b border-[#364259] py-[10px] pl-9 text-[14px] text-[#e2e8f0] focus:border-[#44ceb3] focus:outline-none transition-all placeholder:text-[#64748b]"
                                    placeholder="New Password (min. 8 chars)"
                                    required
                                    minLength={8}
                                />
                            </div>

                            {/* Confirm Password */}
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pt-2 pointer-events-none text-gray-400">
                                    <LockClosedIcon className="w-[18px] h-[18px] ml-1" />
                                </div>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-transparent border-b border-[#364259] py-[10px] pl-9 text-[14px] text-[#e2e8f0] focus:border-[#44ceb3] focus:outline-none transition-all placeholder:text-[#64748b]"
                                    placeholder="Confirm New Password"
                                    required
                                />
                            </div>

                            {/* Password strength hints */}
                            <ul className="text-[11px] text-[#475569] space-y-0.5 -mt-2">
                                <li className={newPassword.length >= 8 ? "text-[#44ceb3]" : ""}>
                                    {newPassword.length >= 8 ? "✓" : "○"} At least 8 characters
                                </li>
                                <li className={newPassword === confirmPassword && newPassword.length > 0 ? "text-[#44ceb3]" : ""}>
                                    {newPassword === confirmPassword && newPassword.length > 0 ? "✓" : "○"} Passwords match
                                </li>
                            </ul>

                            {error && (
                                <div className="text-red-400 text-[13px] text-center">{error}</div>
                            )}

                            <div className="mt-4 flex justify-center">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full max-w-[180px] py-[8px] bg-[#2a8e7e] hover:bg-[#32a896] text-white font-medium text-[14px] rounded-md tracking-wide transition-all duration-300 disabled:opacity-50"
                                >
                                    {loading ? "UPDATING..." : "SET PASSWORD"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
