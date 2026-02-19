"use client"

import { useAuth } from "@/context/AuthContext"
import { AdminTrainingView } from "@/components/training/AdminTrainingView"
import { EmployeeTrainingView } from "@/components/training/EmployeeTrainingView"

export default function Training() {
    const { user } = useAuth()

    if (user?.role === 'employee') {
        return <EmployeeTrainingView />
    }

    return <AdminTrainingView />
}
