"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { AdminDashboard } from "@/components/dashboard/AdminDashboard"
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard"
import { TeamLeadDashboard } from "@/components/dashboard/TeamLeadDashboard"
import { Roles, type Role } from "@/lib/permissions"

export default function Dashboard() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // Redirect employees who must change their password or complete onboarding
  React.useEffect(() => {
    if (user?.mustChangePassword) {
      router.replace("/change-password")
    } else if (user?.onboardingStatus && user.onboardingStatus !== "completed" && !user.isTenantAdmin) {
      router.replace("/onboarding")
    }
  }, [user, router])

  if (isLoading) return null

  const role = user?.role as Role

  switch (role) {
    case Roles.CEO:
    case Roles.HR:
      return <AdminDashboard />
    case Roles.TEAM_LEAD:
      return <TeamLeadDashboard />
    default:
      return <EmployeeDashboard />
  }
}
