"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { AdminResignationView } from "@/components/resignation/AdminResignationView"
import { EmployeeResignationView } from "@/components/resignation/EmployeeResignationView"

export default function ResignationPage() {
    const { user, isLoading } = useAuth()

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>
    }

    if (!user) {
        return <div className="p-10 text-center">Unauthorized. Please sign in.</div>
    }

    return (
        <div className="p-6">
            {user.role === "admin" ? (
                <AdminResignationView />
            ) : (
                <EmployeeResignationView employeeId={user.id} />
            )}
        </div>
    )
}
