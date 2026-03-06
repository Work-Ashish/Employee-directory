"use client"

import { useAuth } from "@/context/AuthContext"
import { AdminTrainingView } from "@/components/training/AdminTrainingView"
import { EmployeeTrainingView } from "@/components/training/EmployeeTrainingView"
import { hasPermission, Module, Action } from "@/lib/permissions"

export default function Training() {
    const { user, isLoading } = useAuth()

    if (isLoading) {
        return <div className="p-10 text-center">Loading...</div>
    }

    if (!user) {
        return <div className="p-10 text-center">Please sign in to view training.</div>
    }

    if (!hasPermission(user.role, Module.TRAINING, Action.CREATE)) {
        return <EmployeeTrainingView employeeId={user.id} />
    }

    return <AdminTrainingView />
}
