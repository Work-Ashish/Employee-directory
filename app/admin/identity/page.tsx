"use client"

import { SessionManager } from "@/components/admin/SessionManager"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { CheckCircledIcon, LockClosedIcon, PersonIcon, GlobeIcon } from "@radix-ui/react-icons"
import { canAccessModule, Module } from "@/lib/permissions"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardContent, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"

export default function IdentityPage() {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    const [host, setHost] = useState('')

    useEffect(() => {
        setHost(window.location.host)
    }, [])

    useEffect(() => {
        if (!isLoading && !canAccessModule(user?.role ?? "", Module.SETTINGS)) {
            router.push("/")
        }
    }, [user, isLoading, router])

    if (isLoading || !canAccessModule(user?.role ?? "", Module.SETTINGS)) return null

    return (
        <div className="space-y-8 animate-page-in">
            <PageHeader
                title="Enterprise Identity"
                description="Manage authentication, SSO, SCIM, and active user sessions."
                actions={
                    <Badge variant="success" size="lg" dot>
                        Security Hardened
                    </Badge>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <SessionManager />

                    <Card variant="glass">
                        <CardContent>
                            <CardTitle className="mb-4 flex items-center gap-2">
                                <LockClosedIcon />
                                SSO Configuration
                            </CardTitle>
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold">G</div>
                                        <div>
                                            <div className="text-md font-bold">Google Workspace</div>
                                            <div className="text-sm text-green-500">Connected</div>
                                        </div>
                                    </div>
                                    <Button variant="link" size="sm">Configure</Button>
                                </div>
                                <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold">A</div>
                                        <div>
                                            <div className="text-md font-bold">Auth0 (OIDC)</div>
                                            <div className="text-sm text-text-3">Draft Implementation</div>
                                        </div>
                                    </div>
                                    <Button variant="link" size="sm">Setup</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card variant="glass">
                        <CardContent>
                            <CardTitle className="mb-4 flex items-center gap-2">
                                <GlobeIcon />
                                SCIM Provisioning
                            </CardTitle>
                            <p className="text-sm text-text-3 mb-4 italic">Automate user onboarding and offboarding via Okta, Azure AD, or JumpCloud.</p>

                            <div className="space-y-3">
                                <div className="text-xs font-bold text-text-3 uppercase tracking-tight">Endpoint URL</div>
                                <div className="p-2 bg-surface border border-border rounded font-mono text-xs break-all">
                                    {host}/api/scim/v2
                                </div>

                                <div className="text-xs font-bold text-text-3 uppercase tracking-tight mt-4">Security Token</div>
                                <div className="p-2 bg-surface border border-border rounded flex items-center justify-between">
                                    <span className="font-mono text-xs">••••••••••••••••</span>
                                    <Button variant="link" size="sm">Reveal</Button>
                                </div>
                                <p className="text-[10px] text-amber-500 mt-2">⚠️ Keep this token secure. It allows full user management.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-surface to-bg-2 border-l-4 border-l-accent">
                        <CardContent>
                            <CardTitle className="mb-2 flex items-center gap-2 text-[15px]">
                                <PersonIcon />
                                RBAC Matrix
                            </CardTitle>
                            <p className="text-sm text-text-2 leading-relaxed">
                                Granular roles are now active. You can assign users to <strong>HR Manager</strong>, <strong>Payroll Admin</strong>, or <strong>IT Admin</strong> for restricted access to sensitive modules.
                            </p>
                            <Button className="mt-4 w-full shadow-lg shadow-blue-500/20">
                                Edit Permission Matrix
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
