"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  getMe,
  login as authLogin,
  logout as authLogout,
  isAuthenticated,
  type AuthUser,
  type LoginPayload,
} from "@/lib/django-auth"
import type { Role } from "@/lib/permissions"
import { api } from "@/lib/api-client"

// Map Django role slugs to EMS Pro role enum
const ROLE_MAP: Record<string, Role> = {
  admin: "CEO",
  ceo: "CEO",
  hr_manager: "HR",
  recruiter: "HR",
  payroll_admin: "PAYROLL",
  team_lead: "TEAM_LEAD",
  employee: "EMPLOYEE",
  viewer: "EMPLOYEE",
  interviewer: "EMPLOYEE",
  hiring_manager: "HR",
}

interface User {
  id: string
  name: string
  email: string
  role: Role
  avatar?: string
  employeeId?: string
  tenantSlug?: string
  mustChangePassword?: boolean
  functionalCapabilities?: Record<string, string[]>
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  // Fetch functional capabilities from server
  const fetchCapabilities = React.useCallback(async (): Promise<Record<string, string[]> | undefined> => {
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return undefined
      const { data } = await api.get<{ capabilities?: Record<string, string[]> }>('/roles/capabilities/')
      return data.capabilities || undefined
    } catch { /* non-critical */ }
    return undefined
  }, [])

  // Convert Django AuthUser to our internal User object
  const mapUser = React.useCallback((authUser: AuthUser, roleSlug?: string, capabilities?: Record<string, string[]>): User => {
    const role = ROLE_MAP[roleSlug || "employee"] || "EMPLOYEE"
    return {
      id: authUser.id,
      name: `${authUser.firstName} ${authUser.lastName}`.trim() || authUser.email,
      email: authUser.email,
      role,
      avatar: authUser.avatar || undefined,
      employeeId: authUser.employeeId || undefined,
      tenantSlug: authUser.tenantSlug,
      mustChangePassword: authUser.mustChangePassword,
      functionalCapabilities: capabilities,
    }
  }, [])

  // Load user on mount if token exists
  React.useEffect(() => {
    let cancelled = false
    async function loadUser() {
      if (!isAuthenticated()) {
        setIsLoading(false)
        return
      }
      try {
        const [authUser, capabilities] = await Promise.all([getMe(), fetchCapabilities()])
        if (!cancelled) {
          const roleSlug = authUser.isTenantAdmin ? "admin" : "employee"
          setUser(mapUser(authUser, roleSlug, capabilities))
        }
      } catch {
        // Token expired or invalid
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadUser()
    return () => { cancelled = true }
  }, [mapUser])

  // Route protection
  React.useEffect(() => {
    if (isLoading) return
    const isLoginPage = pathname === "/login"
    if (!user && !isLoginPage) {
      router.push("/login")
    } else if (user && isLoginPage) {
      router.push("/")
    }
  }, [user, isLoading, pathname, router])

  const login = async (payload: LoginPayload) => {
    const result = await authLogin(payload)
    const [authUser, capabilities] = await Promise.all([getMe(), fetchCapabilities()])
    const roleSlug = (result.user as Record<string, unknown>)?.role_slug as string | undefined
    setUser(mapUser(authUser, roleSlug || (authUser.isTenantAdmin ? "admin" : "employee"), capabilities))
  }

  const logout = async () => {
    await authLogout()
    setUser(null)
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
