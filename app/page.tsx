"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AdminDashboard } from "@/components/dashboard/AdminDashboard"
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard"

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

  if (user?.role === 'EMPLOYEE') {
    return <EmployeeDashboard />
  }

  return <AdminDashboard />
}
