"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AdminDashboard } from "@/components/dashboard/AdminDashboard"
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard"
import { Roles, type Role } from "@/lib/permissions"

export default function Dashboard() {
  const { user, isLoading } = useAuth()
  const { data: session } = useSession()
  const router = useRouter()

  // Redirect employees who must change their password on first login
  React.useEffect(() => {
    if (session?.user?.mustChangePassword) {
      router.replace("/change-password")
    }
  }, [session, router])

  if (isLoading) return null

  const role = user?.role as Role

  // CEO and HR get the full admin dashboard
  // PAYROLL and TEAM_LEAD get admin dashboard (components self-filter by role)
  // EMPLOYEE gets the employee dashboard
  switch (role) {
    case Roles.CEO:
    case Roles.HR:
    case Roles.PAYROLL:
    case Roles.TEAM_LEAD:
      return <AdminDashboard />
    case Roles.EMPLOYEE:
    default:
      return <EmployeeDashboard />
  }
}
