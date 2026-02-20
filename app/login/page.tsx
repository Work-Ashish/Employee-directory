"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { signIn } from "next-auth/react"
import { ReloadIcon, PersonIcon } from "@radix-ui/react-icons"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export default function LoginPage() {
    const { login } = useAuth()
    const [email, setEmail] = React.useState("admin@emspro.com")
    const [password, setPassword] = React.useState("admin")
    const [loading, setLoading] = React.useState(false)
    const [googleLoading, setGoogleLoading] = React.useState(false)
    const [error, setError] = React.useState("")
    const [rememberMe, setRememberMe] = React.useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const success = await login(email)
            if (!success) {
                setError("Invalid credentials")
            }
        } catch (err) {
            setError("Login failed")
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true)
        try {
            await signIn("google", { callbackUrl: "/dashboard" })
        } catch {
            setError("Google sign-in failed")
            setGoogleLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 w-full h-full flex items-center justify-center overflow-hidden bg-[#020410] font-['Orbitron']">

            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#001533_0%,_#000000_100%)]" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.1] bg-[size:40px_40px]" />

                {/* Floating Particles */}
                <motion.div
                    animate={{ y: [0, -20, 0], opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 5, repeat: Infinity }}
                    className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-500 rounded-full blur-[2px]"
                />
                <motion.div
                    animate={{ y: [0, 30, 0], opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 7, repeat: Infinity }}
                    className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 bg-cyan-500 rounded-full blur-[2px]"
                />
            </div>

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-[600px] p-8"
            >
                {/* HUD Frame Container */}
                <div className="relative border-2 border-blue-500/30 bg-[#000914]/80 backdrop-blur-md p-10 clip-path-hud shadow-[0_0_50px_rgba(0,123,255,0.1)]">

                    {/* Decorative HUD Corners */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-sm shadow-[0_0_15px_#3b82f6]" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-sm shadow-[0_0_15px_#3b82f6]" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-sm shadow-[0_0_15px_#3b82f6]" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-sm shadow-[0_0_15px_#3b82f6]" />

                    {/* Top Decor */}
                    <div className="absolute top-[-2px] left-1/2 -translate-x-1/2 w-1/3 h-[4px] bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                    <div className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-1/3 h-[4px] bg-blue-500 shadow-[0_0_10px_#3b82f6]" />

                    {/* Header */}
                    <div className="text-center mb-12 relative">
                        <h1 className="text-[32px] font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-400 tracking-[4px] uppercase shadow-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                            Sign In
                        </h1>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                    </div>

                    <div className="flex gap-8">
                        {/* Profile Icon Box */}
                        <div className="hidden md:flex w-[140px] h-[140px] border border-blue-500/50 items-center justify-center bg-blue-500/5 relative group overflow-hidden">
                            <div className="absolute inset-0 border border-blue-400/20 scale-90" />
                            <img src="/logo.svg" alt="EMS Logo" className="w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(96,165,250,0.6)]" />

                            {/* Scanning Line Animation */}
                            <motion.div
                                animate={{ top: ['0%', '100%', '0%'] }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                className="absolute left-0 right-0 h-[2px] bg-blue-400/50 shadow-[0_0_10px_#60a5fa]"
                            />
                        </div>

                        {/* Form Fields */}
                        <form onSubmit={handleSubmit} className="flex-1 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[12px] text-blue-300 tracking-[2px] uppercase">User Name</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-transparent border-b border-blue-500/50 py-2 text-white font-[Outfit] tracking-wide focus:border-blue-400 focus:outline-none focus:shadow-[0_10px_20px_-10px_rgba(59,130,246,0.3)] transition-all placeholder:text-blue-500/30"
                                        placeholder="ENTER EMAIL"
                                    />
                                    <div className="absolute bottom-0 left-0 w-1 h-2 bg-blue-500" />
                                    <div className="absolute bottom-0 right-0 w-1 h-2 bg-blue-500" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[12px] text-blue-300 tracking-[2px] uppercase">Password</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-transparent border-b border-blue-500/50 py-2 text-white font-[Outfit] tracking-wide focus:border-blue-400 focus:outline-none focus:shadow-[0_10px_20px_-10px_rgba(59,130,246,0.3)] transition-all placeholder:text-blue-500/30"
                                        placeholder="ENTER PASSWORD"
                                    />
                                    <div className="absolute bottom-0 left-0 w-1 h-2 bg-blue-500" />
                                    <div className="absolute bottom-0 right-0 w-1 h-2 bg-blue-500" />
                                </div>
                            </div>

                            {error && <div className="text-red-400 text-[10px] tracking-widest uppercase text-right glow-red">{error}</div>}

                            <div className="flex justify-end items-center gap-2 pt-2">
                                <div
                                    className="w-4 h-4 border border-blue-500 cursor-pointer flex items-center justify-center transition-all bg-blue-900/20 hover:bg-blue-500/20"
                                    onClick={() => setRememberMe(!rememberMe)}
                                >
                                    {rememberMe && <div className="w-2 h-2 bg-blue-400 shadow-[0_0_5px_#60a5fa]" />}
                                </div>
                                <label
                                    className="text-[10px] text-blue-300 tracking-[2px] uppercase cursor-pointer select-none"
                                    onClick={() => setRememberMe(!rememberMe)}
                                >
                                    Remember Me
                                </label>
                            </div>
                        </form>
                    </div>

                    {/* Login Button */}
                    <div className="mt-12 flex justify-center">
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="relative group px-12 py-3 bg-transparent border border-blue-500 text-blue-400 tracking-[4px] uppercase font-bold text-[14px] hover:bg-blue-500 hover:text-white hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {loading ? "PROCESSING..." : "LOGIN"}
                            </span>
                            {/* Detailed button corners */}
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-blue-300 -translate-x-1 -translate-y-1 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-blue-300 translate-x-1 translate-y-1 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform" />
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="mt-6 flex items-center gap-4">
                        <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-blue-500/30" />
                        <span className="text-[10px] text-blue-500/50 tracking-[3px] uppercase">Or</span>
                        <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-blue-500/30" />
                    </div>

                    {/* Google Sign-In Button */}
                    <div className="mt-4 flex justify-center">
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={googleLoading}
                            className="relative group flex items-center gap-3 px-8 py-3 bg-transparent border border-blue-500/40 text-blue-300 tracking-[2px] uppercase font-semibold text-[12px] hover:bg-blue-500/10 hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span>{googleLoading ? "CONNECTING..." : "Sign in with Google"}</span>
                        </button>
                    </div>
                </div>

                {/* Footer Credentials */}
                <div className="mt-8 flex justify-center gap-8 text-[10px] text-blue-500/40 tracking-[2px] font-bold">
                    <span className="cursor-pointer hover:text-blue-400 transition-colors" onClick={() => { setEmail("admin@emspro.com"); setPassword("admin") }}>ADMIN_ACCESS</span>
                    <span>//</span>
                    <span className="cursor-pointer hover:text-blue-400 transition-colors" onClick={() => { setEmail("user@emspro.com"); setPassword("user") }}>USER_ACCESS</span>
                </div>
            </motion.div>
        </div>
    )
}
