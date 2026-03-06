"use client"

import { SessionManager } from "@/components/admin/SessionManager"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { CheckCircledIcon, LockClosedIcon, PersonIcon, GlobeIcon } from "@radix-ui/react-icons"
import { canAccessModule, Module } from "@/lib/permissions"

export default function IdentityPage() {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && !canAccessModule(user?.role ?? "", Module.SETTINGS)) {
            router.push("/")
        }
    }, [user, isLoading, router])

    if (isLoading || !canAccessModule(user?.role ?? "", Module.SETTINGS)) return null

    return (
        <div className="space-y-8 animate-[pageIn_0.3s_ease-out]">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[28px] font-extrabold text-[var(--text)] tracking-tight">Enterprise Identity</h1>
                    <p className="text-[14px] text-[var(--text3)] mt-1">Manage authentication, SSO, SCIM, and active user sessions.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
                    <CheckCircledIcon className="w-4 h-4 text-green-500" />
                    <span className="text-[12px] font-bold text-green-600 uppercase">Security Hardened</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <SessionManager />

                    <div className="glass p-6">
                        <h3 className="text-[16px] font-bold text-[var(--text)] mb-4 flex items-center gap-2">
                            <LockClosedIcon />
                            SSO Configuration
                        </h3>
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold">G</div>
                                    <div>
                                        <div className="text-[14px] font-bold">Google Workspace</div>
                                        <div className="text-[12px] text-green-500">Connected</div>
                                    </div>
                                </div>
                                <button className="text-[12px] font-bold text-[var(--accent)] hover:underline">Configure</button>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold">A</div>
                                    <div>
                                        <div className="text-[14px] font-bold">Auth0 (OIDC)</div>
                                        <div className="text-[12px] text-[var(--text3)]">Draft Implementation</div>
                                    </div>
                                </div>
                                <button className="text-[12px] font-bold text-[var(--accent)] hover:underline">Setup</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass p-6">
                        <h3 className="text-[16px] font-bold text-[var(--text)] mb-4 flex items-center gap-2">
                            <GlobeIcon />
                            SCIM Provisioning
                        </h3>
                        <p className="text-[12px] text-[var(--text3)] mb-4 italic">Automate user onboarding and offboarding via Okta, Azure AD, or JumpCloud.</p>

                        <div className="space-y-3">
                            <div className="text-[11px] font-bold text-[var(--text3)] uppercase tracking-tight">Endpoint URL</div>
                            <div className="p-2 bg-[var(--surface)] border border-[var(--border)] rounded font-mono text-[11px] break-all">
                                {window.location.host}/api/scim/v2
                            </div>

                            <div className="text-[11px] font-bold text-[var(--text3)] uppercase tracking-tight mt-4">Security Token</div>
                            <div className="p-2 bg-[var(--surface)] border border-[var(--border)] rounded flex items-center justify-between">
                                <span className="font-mono text-[11px]">••••••••••••••••</span>
                                <button className="text-[10px] font-bold text-[var(--accent)] hover:underline">Reveal</button>
                            </div>
                            <p className="text-[10px] text-amber-500 mt-2">⚠️ Keep this token secure. It allows full user management.</p>
                        </div>
                    </div>

                    <div className="glass p-6 bg-gradient-to-br from-[var(--surface)] to-[var(--bg2)] border-l-4 border-l-[var(--accent)]">
                        <h3 className="text-[15px] font-bold text-[var(--text)] mb-2 flex items-center gap-2">
                            <PersonIcon />
                            RBAC Matrix
                        </h3>
                        <p className="text-[12px] text-[var(--text2)] leading-relaxed">
                            Granular roles are now active. You can assign users to <strong>HR Manager</strong>, <strong>Payroll Admin</strong>, or <strong>IT Admin</strong> for restricted access to sensitive modules.
                        </p>
                        <button className="mt-4 w-full py-2 bg-[var(--accent)] text-white font-bold text-[12px] rounded-lg shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-transform">
                            Edit Permission Matrix
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
