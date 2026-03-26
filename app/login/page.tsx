"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"
import { EnvelopeClosedIcon, LockClosedIcon, CheckIcon } from "@radix-ui/react-icons"
import { motion } from "framer-motion"

export default function LoginPage() {
    const router = useRouter()
    const { login } = useAuth()
    const [tenantSlug, setTenantSlug] = React.useState("")
    const [email, setEmail] = React.useState("")
    const [password, setPassword] = React.useState("")

    // Pre-fill org slug from localStorage (set during onboarding)
    React.useEffect(() => {
        try {
            const savedSlug = localStorage.getItem("tenant_slug")
            if (savedSlug && !tenantSlug) setTenantSlug(savedSlug)
        } catch { /* non-critical */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState("")
    const [rememberMe, setRememberMe] = React.useState(true)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)
        try {
            await login({
                tenantSlug: tenantSlug.trim(),
                email: email.trim(),
                password,
            })
            router.push("/")
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Login failed"
            setError(message.includes("Invalid") ? "Invalid credentials" : message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 w-full h-full flex items-center justify-center overflow-hidden font-['Inter',sans-serif]">

            {/* Background Image / Motion UI */}
            <div className="absolute inset-0 pointer-events-none bg-[#0a1831] overflow-hidden">
                {/* Animated Gradient Background */}
                <motion.div
                    animate={{
                        scale: [1, 1.05, 1],
                        opacity: [0.7, 1, 0.7]
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0"
                >
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#209680] blur-[150px] opacity-30 rounded-full" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#136f86] blur-[150px] opacity-30 rounded-full" />
                </motion.div>

                {/* Floating Network SVG Layer 1 */}
                <motion.svg
                    animate={{
                        x: [0, -30, 0],
                        y: [0, -20, 0]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-[10%] -left-[10%] w-[120%] h-[120%] opacity-20" xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Layer 1: Large connection lines */}
                    <g stroke="#3cdbaf" strokeWidth="0.5" fill="none">
                        <line x1="10%" y1="10%" x2="40%" y2="30%" />
                        <line x1="40%" y1="30%" x2="20%" y2="60%" />
                        <line x1="20%" y1="60%" x2="60%" y2="80%" />
                        <line x1="60%" y1="80%" x2="80%" y2="40%" />
                        <line x1="80%" y1="40%" x2="95%" y2="20%" />
                        <line x1="40%" y1="30%" x2="80%" y2="40%" />
                        <line x1="10%" y1="10%" x2="20%" y2="60%" />
                        <line x1="70%" y1="80%" x2="90%" y2="90%" />
                        <line x1="5%" y1="80%" x2="20%" y2="90%" />
                        <line x1="90%" y1="50%" x2="95%" y2="80%" />
                        <line x1="10%" y1="30%" x2="5%" y2="50%" />
                    </g>
                </motion.svg>

                {/* Floating Network SVG Layer 2 (Opposite direction, faster) */}
                <motion.svg
                    animate={{
                        x: [0, 20, 0],
                        y: [0, 30, 0]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-[10%] -left-[10%] w-[120%] h-[120%] opacity-30" xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <pattern id="nodes-skewed" x="0" y="0" width="300" height="250" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
                            <circle cx="50" cy="50" r="1.5" fill="#3cdbaf" />
                            <circle cx="200" cy="80" r="2" fill="#3cdbaf" />
                            <circle cx="100" cy="180" r="1" fill="#3cdbaf" />
                            <circle cx="250" cy="220" r="2.5" fill="#3cdbaf" />
                            <line x1="50" y1="50" x2="200" y2="80" stroke="#3cdbaf" strokeWidth="0.3" />
                            <line x1="200" y1="80" x2="100" y2="180" stroke="#3cdbaf" strokeWidth="0.3" />
                            <line x1="100" y1="180" x2="50" y2="50" stroke="#3cdbaf" strokeWidth="0.3" />
                            <path d="M50 50 L250 220 L200 80 Z" fill="rgba(60,219,175,0.01)" />
                            <path d="M100 180 L250 220 L200 80 Z" fill="rgba(60,219,175,0.02)" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#nodes-skewed)" />
                </motion.svg>

                {/* Floating Tech Particles */}
                {[
                    { left: "10%", top: "20%", duration: 7, delay: 0 },
                    { left: "80%", top: "10%", duration: 6, delay: 2 },
                    { left: "40%", top: "70%", duration: 8, delay: 1 },
                    { left: "90%", top: "60%", duration: 5, delay: 3 },
                    { left: "20%", top: "80%", duration: 9, delay: 4 },
                    { left: "60%", top: "30%", duration: 7, delay: 2 },
                    { left: "70%", top: "85%", duration: 6, delay: 1 },
                    { left: "30%", top: "40%", duration: 8, delay: 5 },
                ].map((particle, i) => (
                    <motion.div
                        key={`particle-${i}`}
                        className="absolute w-1 h-1 bg-[#3cdbaf] rounded-full shadow-[0_0_8px_#3cdbaf]"
                        style={{ left: particle.left, top: particle.top }}
                        animate={{
                            y: [0, -80, 0],
                            x: [0, (i % 2 === 0 ? 30 : -30), 0],
                            opacity: [0.2, 0.8, 0.2],
                            scale: [1, 1.5, 1]
                        }}
                        transition={{
                            duration: particle.duration,
                            repeat: Infinity,
                            delay: particle.delay,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </div>

            {/* Login Card */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="relative z-10 w-full max-w-[360px] shadow-2xl rounded-[16px] overflow-hidden bg-[#0d162a]"
            >
                {/* Header */}
                <div className="bg-[#44ceb3] py-[18px] px-8 text-center">
                    <h1 className="text-[16px] font-semibold text-[#18362f] tracking-wide uppercase">
                        Customer Login
                    </h1>
                </div>

                {/* Body */}
                <div className="p-7">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Tenant Slug Field */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pt-2 pointer-events-none text-gray-400">
                                <svg className="w-[18px] h-[18px] ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={tenantSlug}
                                onChange={(e) => setTenantSlug(e.target.value)}
                                className="w-full bg-transparent border-b border-[#364259] py-[10px] pl-9 text-[14px] text-[#e2e8f0] focus:border-[#44ceb3] focus:outline-none transition-all placeholder:text-[#64748b]"
                                placeholder="Organization ID"
                                required
                                autoComplete="organization"
                            />
                        </div>

                        {/* Email Field */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pt-2 pointer-events-none text-gray-400">
                                <EnvelopeClosedIcon className="w-[18px] h-[18px] ml-1" />
                            </div>
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-transparent border-b border-[#364259] py-[10px] pl-9 text-[14px] text-[#e2e8f0] focus:border-[#44ceb3] focus:outline-none transition-all placeholder:text-[#64748b]"
                                placeholder="Employee ID or Email"
                                required
                                autoComplete="username"
                            />
                        </div>

                        {/* Password Field */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pt-2 pointer-events-none text-gray-400">
                                <LockClosedIcon className="w-[18px] h-[18px] ml-1" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-transparent border-b border-[#364259] py-[10px] pl-9 text-[14px] text-[#e2e8f0] focus:border-[#44ceb3] focus:outline-none transition-all placeholder:text-[#64748b]"
                                placeholder="Password"
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        {error && <div className="text-red-400 text-sm text-center">{error}</div>}

                        {/* Options */}
                        <div className="flex items-center justify-between text-[12px] pt-1">
                            <label
                                onClick={() => setRememberMe(!rememberMe)}
                                className="flex items-center gap-2 cursor-pointer text-[#64748b] group select-none"
                            >
                                <div className={cn(
                                    "w-3.5 h-3.5 rounded-[2px] flex items-center justify-center border transition-all",
                                    rememberMe ? 'bg-[#44ceb3] border-[#44ceb3]' : 'bg-transparent border-[#475569]'
                                )}>
                                    {rememberMe && <CheckIcon className="w-2.5 h-2.5 text-[#18362f]" />}
                                </div>
                                <span className="group-hover:text-[#cbd5e1] transition-colors">Remember me</span>
                            </label>

                            <a href="#" className="flex-1 text-right text-[#64748b] hover:text-[#cbd5e1] italic transition-colors">
                                Forgot Password?
                            </a>
                        </div>

                        {/* Login Button */}
                        <div className="mt-6 pt-4 pb-2 flex justify-center">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full max-w-[150px] py-[8px] bg-[#2a8e7e] hover:bg-[#32a896] text-white font-medium text-[14px] rounded-md tracking-wide transition-all duration-300 disabled:opacity-50"
                            >
                                {loading ? "PROCESSING..." : "LOGIN"}
                            </button>
                        </div>

                        {/* Sign Up Link */}
                        <div className="mt-4 text-center">
                            <p className="text-[12px] text-[#64748b]">
                                Don&apos;t have an account?{" "}
                                <a
                                    href="/signup"
                                    onClick={(e) => { e.preventDefault(); router.push("/signup") }}
                                    className="text-[#44ceb3] hover:text-[#5be0c4] font-medium transition-colors"
                                >
                                    Sign Up
                                </a>
                            </p>
                        </div>

                        <div className="flex justify-center -mb-2 pb-1">
                            <div className="w-1 h-1 rounded-full bg-[#41ccb1]/40"></div>
                        </div>
                    </form>
                </div>

                {/* Dev quick-fill helper – hover top-right corner */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="absolute top-0 right-0 opacity-0 hover:opacity-100 p-2 text-[10px] text-white/50 bg-black/50 rounded-bl-lg transition-opacity pointer-events-auto">
                        <div className="cursor-pointer hover:text-white" onClick={() => { setTenantSlug("demo"); setEmail("admin@emspro.com"); setPassword("admin123!") }}>Admin</div>
                        <div className="cursor-pointer hover:text-white" onClick={() => { setTenantSlug("demo"); setEmail("user@emspro.com"); setPassword("user123!") }}>User</div>
                    </div>
                )}
            </motion.div>
        </div>
    )
}
