"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { AdminDashboard } from "@/components/dashboard/AdminDashboard"
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard"

export default function Dashboard() {
  const { user, isLoading } = useAuth()

  // While loading auth state, we can show a skeleton or nothing
  if (isLoading) return null

  // Based on role, render key dashboard
  if (user?.role === 'employee') {
    return <EmployeeDashboard />
  }

  // Default to Admin dashboard (or if user is admin)
  return <AdminDashboard />
}
