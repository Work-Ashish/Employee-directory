"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { canAccessModuleEffective, Module, hasPermission, Action } from "@/lib/permissions"
import type { Role } from "@/lib/permissions"
import { ExclamationTriangleIcon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/Button"
import Link from "next/link"

interface ProtectedPageProps {
    module: Module
    action?: Action
    children: React.ReactNode
}

/**
 * Wraps page content with a module-level access check.
 * Checks both system role and functional capabilities.
 * Shows an "Access Denied" message if the user lacks permission.
 */
export function ProtectedPage({ module, action, children }: ProtectedPageProps) {
    const { user, isLoading } = useAuth()

    if (isLoading) return null

    if (!user) return null // AuthProvider handles redirect to /login

    const role = user.role as Role

    // Check module access (system role OR functional capabilities)
    const hasModuleAccess = canAccessModuleEffective(role, module, user.functionalCapabilities)

    // If a specific action is required, also check that
    const hasActionAccess = action
        ? hasPermission(role, module, action) || (user.functionalCapabilities?.[module]?.includes(action) ?? false)
        : true

    if (!hasModuleAccess || !hasActionAccess) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4 max-w-md">
                    <div className="w-16 h-16 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center mx-auto">
                        <ExclamationTriangleIcon className="w-8 h-8 text-danger" />
                    </div>
                    <h1 className="text-xl font-bold text-text">Access Denied</h1>
                    <p className="text-sm text-text-3">
                        You don't have permission to access this page. Contact your administrator if you believe this is an error.
                    </p>
                    <Link href="/">
                        <Button variant="secondary">Back to Dashboard</Button>
                    </Link>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
