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
import { DJANGO_ROLE_MAP, isModuleEnabled } from "@/lib/permissions"
import { api } from "@/lib/api-client"

interface User {
  id: string
  name: string
  email: string
  role: Role
  avatar?: string
  employeeId?: string
  tenantSlug?: string
  tenantId?: string
  isTenantAdmin?: boolean
  mustChangePassword?: boolean
  onboardingStatus?: string | null
  functionalCapabilities?: Record<string, string[]>
  /** Django permission codenames resolved from user's assigned roles */
  permissionCodenames?: string[]
  /** Tenant's enabled feature flags from Django */
  featureFlags?: Record<string, boolean>
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

/** Fetch user's permission codenames from Django RBAC */
async function fetchUserPermissions(): Promise<string[]> {
  try {
    const token = localStorage.getItem("access_token")
    if (!token) return []
    const { data } = await api.get<{ codename: string; name: string; module: string }[]>('/permissions/')
    if (Array.isArray(data)) {
      return data.map((p) => p.codename)
    }
  } catch { /* non-critical — permissions endpoint may not exist yet */ }
  return []
}

/**
 * Maps frontend module keys → Django feature codenames.
 * Must stay in sync with MODULE_FEATURE_FLAG in permissions.ts.
 */
const LOCAL_MODULE_TO_CODENAME: Record<string, string> = {
  employees: "employees",
  attendance: "attendance",
  leave: "leave",
  payroll: "payroll",
  performance: "performance",
  training: "training",
  announcements: "announcements",
  assets: "assets",
  documents: "documents",
  helpDesk: "help_desk",
  recruitment: "recruitment",
  resignation: "resignation",
  reports: "reports",
  teams: "teams",
  workflows: "workflows",
  calendar: "calendar",
  reimbursement: "reimbursement",
  aiChatbot: "ai_chatbot",
  feedback: "feedback",
}

/** Read the admin's onboarding feature config from localStorage */
function getLocalFeatureConfig(): Record<string, boolean> | null {
  try {
    const raw = localStorage.getItem("tenant_feature_config")
    if (!raw) return null
    const config = JSON.parse(raw) as Record<string, boolean>
    // Convert frontend keys to Django codenames
    const mapped: Record<string, boolean> = {}
    for (const [key, enabled] of Object.entries(config)) {
      const codename = LOCAL_MODULE_TO_CODENAME[key] || key
      mapped[codename] = enabled
    }
    return mapped
  } catch {
    return null
  }
}

/** Fetch tenant's feature flags from Django.
 *  Django returns an array of enabled features: [{codename, name, config}, ...].
 *  We convert it to Record<string, boolean> where each enabled codename → true.
 *  Falls back to localStorage config from onboarding if Django is unavailable. */
async function fetchFeatureFlags(): Promise<Record<string, boolean>> {
  const localConfig = getLocalFeatureConfig()

  try {
    const token = localStorage.getItem("access_token")
    if (!token) return localConfig || {}
    const { data } = await api.get<
      { codename: string; name: string; config?: Record<string, unknown> }[]
    >('/features/')
    // Django returns only enabled features as an array
    if (Array.isArray(data)) {
      const djangoMap: Record<string, boolean> = {}
      for (const f of data) {
        if (f.codename) djangoMap[f.codename] = true
      }
      // If we have local config (from onboarding), use it as the source of truth
      // because Django may not have been synced yet. Local config has explicit
      // true/false for each module; Django only returns enabled ones.
      if (localConfig) {
        // Merge: local config overrides Django defaults
        const allCodenames = new Set([
          ...Object.keys(djangoMap),
          ...Object.keys(localConfig),
        ])
        const merged: Record<string, boolean> = {}
        for (const codename of allCodenames) {
          // Local config takes precedence (admin explicitly toggled these)
          if (codename in localConfig) {
            merged[codename] = localConfig[codename]
          } else {
            merged[codename] = djangoMap[codename] ?? false
          }
        }
        return merged
      }
      return djangoMap
    }
    // Fallback: if response is already a map (future-proofing)
    if (data && typeof data === "object") return data as unknown as Record<string, boolean>
  } catch { /* non-critical — features endpoint may not exist yet */ }
  return localConfig || {}
}

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
  const mapUser = React.useCallback((
    authUser: AuthUser,
    roleSlug?: string,
    capabilities?: Record<string, string[]>,
    codenames?: string[],
    flags?: Record<string, boolean>
  ): User => {
    const role = DJANGO_ROLE_MAP[roleSlug || "employee"] || "EMPLOYEE"
    return {
      id: authUser.id,
      name: `${authUser.firstName} ${authUser.lastName}`.trim() || authUser.email,
      email: authUser.email,
      role,
      avatar: authUser.avatar || undefined,
      employeeId: authUser.employeeId || undefined,
      tenantSlug: authUser.tenantSlug,
      tenantId: authUser.tenantId,
      isTenantAdmin: authUser.isTenantAdmin,
      mustChangePassword: authUser.mustChangePassword,
      onboardingStatus: authUser.onboardingStatus,
      functionalCapabilities: capabilities,
      permissionCodenames: codenames,
      featureFlags: flags,
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
        const [authUser, capabilities, codenames, flags] = await Promise.all([
          getMe(),
          fetchCapabilities(),
          fetchUserPermissions(),
          fetchFeatureFlags(),
        ])
        if (!cancelled) {
          const roleSlug = authUser.isTenantAdmin ? "admin" : "employee"
          setUser(mapUser(authUser, roleSlug, capabilities, codenames, flags))
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
  }, [mapUser, fetchCapabilities])

  // Route protection + feature flag gating
  React.useEffect(() => {
    if (isLoading) return
    const isPublicPage = pathname === "/login" || pathname === "/signup"
    const isGatedPage = pathname === "/change-password" || pathname === "/onboarding"
    if (!user && !isPublicPage) {
      router.push("/login")
    } else if (user && pathname === "/login") {
      router.push("/")
    } else if (user && !isGatedPage && !isPublicPage && user.mustChangePassword) {
      router.push("/change-password")
    } else if (user && !isGatedPage && !isPublicPage && user.onboardingStatus && user.onboardingStatus !== "completed" && !user.isTenantAdmin) {
      router.push("/onboarding")
    } else if (user?.featureFlags && Object.keys(user.featureFlags).length > 0) {
      // Block navigation to disabled feature pages
      const ROUTE_MODULE_MAP: Record<string, string> = {
        "/employees": "EMPLOYEES", "/org-chart": "EMPLOYEES",
        "/attendance": "ATTENDANCE", "/leave": "LEAVES",
        "/payroll": "PAYROLL", "/reimbursement": "REIMBURSEMENT",
        "/performance": "PERFORMANCE", "/training": "TRAINING",
        "/feedback": "FEEDBACK", "/recruitment": "RECRUITMENT",
        "/resignation": "RESIGNATION", "/announcements": "ANNOUNCEMENTS",
        "/help-desk": "TICKETS", "/documents": "DOCUMENTS",
        "/admin/documents": "DOCUMENTS", "/employee/documents": "DOCUMENTS",
        "/admin/assets": "ASSETS", "/employee/assets": "ASSETS",
        "/teams": "TEAMS", "/reports": "REPORTS", "/admin/reports": "REPORTS",
        "/admin/workflows": "WORKFLOWS", "/calendar": "CALENDAR",
      }
      const module = ROUTE_MODULE_MAP[pathname]
      if (module && !isModuleEnabled(module, user.featureFlags)) {
        router.push("/")
      }
    }
  }, [user, isLoading, pathname, router])

  const login = async (payload: LoginPayload) => {
    const result = await authLogin(payload)
    const [authUser, capabilities, codenames, flags] = await Promise.all([
      getMe(),
      fetchCapabilities(),
      fetchUserPermissions(),
      fetchFeatureFlags(),
    ])
    const roleSlug = (result.user as Record<string, unknown>)?.roleSlug as string | undefined
    setUser(mapUser(
      authUser,
      roleSlug || (authUser.isTenantAdmin ? "admin" : "employee"),
      capabilities,
      codenames,
      flags
    ))
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
