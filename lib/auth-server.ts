/**
 * Server-side authentication helper for Django SimpleJWT.
 * Replaces NextAuth's `auth()` function for server-side session resolution.
 *
 * Validates JWT tokens by calling Django's /auth/me/ endpoint.
 * Used by lib/security.ts (withAuth) and Next.js API routes.
 */
import "server-only"

import { headers } from "next/headers"
import type { Role } from "@/lib/permissions"
import { DJANGO_ROLE_MAP } from "@/lib/permissions"

const DJANGO_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export interface ServerSession {
  user: {
    id: string
    email: string
    name: string
    role: Role
    organizationId: string
    employeeId?: string
    tenantSlug?: string
    isTenantAdmin?: boolean
    mustChangePassword?: boolean
    avatar?: string | null
  }
}

/**
 * Validate a JWT access token against Django /auth/me/ and return a session.
 * This is the server-side equivalent of the client's `getMe()` in django-auth.ts.
 *
 * Token is read from the incoming request's Authorization header or cookies.
 * Returns null if the token is missing, expired, or invalid.
 */

// -- Session cache (30s TTL, per-process) --
const SESSION_CACHE_TTL = 30_000  // 30 seconds
const sessionCache = new Map<string, { session: ServerSession; expiresAt: number }>()

function getCachedSession(cacheKey: string): ServerSession | null {
  const entry = sessionCache.get(cacheKey)
  if (entry && Date.now() < entry.expiresAt) return entry.session
  if (entry) sessionCache.delete(cacheKey)
  return null
}

function setCachedSession(cacheKey: string, session: ServerSession): void {
  // Limit cache size to prevent memory leaks
  if (sessionCache.size > 500) {
    const oldest = sessionCache.keys().next().value
    if (oldest) sessionCache.delete(oldest)
  }
  sessionCache.set(cacheKey, { session, expiresAt: Date.now() + SESSION_CACHE_TTL })
}

export async function getServerSession(): Promise<ServerSession | null> {
  try {
    const headersList = await headers()
    const authHeader = headersList.get("authorization")
    let token: string | null = null

    // 1. Try Authorization header (API calls from frontend with Bearer token)
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7)
    }

    // 2. Fallback: try cookie (SSR pages / server components)
    if (!token) {
      const cookieHeader = headersList.get("cookie") || ""
      const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/)
      if (match) {
        token = decodeURIComponent(match[1])
      }
    }

    if (!token) return null

    // 2.5. Check cache
    const cacheKey = token.slice(-20)  // last 20 chars as key (safe, not the full token)
    const cached = getCachedSession(cacheKey)
    if (cached) return cached

    // 3. Read tenant slug from header or cookie
    let tenantSlug = headersList.get("x-tenant-slug")
    if (!tenantSlug) {
      const cookieHeader = headersList.get("cookie") || ""
      const slugMatch = cookieHeader.match(/(?:^|;\s*)tenant_slug=([^;]+)/)
      if (slugMatch) {
        tenantSlug = decodeURIComponent(slugMatch[1])
      }
    }

    // 4. Call Django /auth/me/ to validate token and get user data
    const fetchHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }
    if (tenantSlug) {
      fetchHeaders["X-Tenant-Slug"] = tenantSlug
    }

    const response = await fetch(`${DJANGO_BASE_URL}/api/v1/auth/me/`, {
      headers: fetchHeaders,
      // Short timeout to avoid blocking the request pipeline
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return null

    const json = await response.json()
    // Unwrap Django envelope: {"data":{...},"error":null,"meta":{}}
    const data = json.data !== undefined ? json.data : json

    // 5. Map Django user data to our ServerSession shape
    const djangoUser = snakeToCamelKeys(data) as Record<string, unknown>
    const isTenantAdmin = djangoUser.isTenantAdmin === true
    const roleSlug = isTenantAdmin ? "admin" : ((djangoUser.roleSlug as string) || "employee")
    const role: Role = DJANGO_ROLE_MAP[roleSlug] || "EMPLOYEE"

    const sessionResult: ServerSession = {
      user: {
        id: String(djangoUser.id || ""),
        email: String(djangoUser.email || ""),
        name: [djangoUser.firstName, djangoUser.lastName].filter(Boolean).join(" ") || String(djangoUser.email || ""),
        role,
        organizationId: String(djangoUser.tenantId || ""),
        employeeId: djangoUser.employeeId ? String(djangoUser.employeeId) : undefined,
        tenantSlug: djangoUser.tenantSlug ? String(djangoUser.tenantSlug) : tenantSlug || undefined,
        isTenantAdmin,
        mustChangePassword: djangoUser.mustChangePassword === true,
        avatar: djangoUser.avatar ? String(djangoUser.avatar) : null,
      },
    }
    setCachedSession(cacheKey, sessionResult)
    return sessionResult
  } catch (error) {
    // Network errors, timeouts, JSON parse errors — all treated as unauthenticated
    if (process.env.NODE_ENV === "development") {
      console.error("[auth-server] getServerSession error:", error)
    }
    return null
  }
}

// ── Internal helpers ──────────────────────────────────────

/** Convert snake_case keys to camelCase (shallow object transform for /me/ response) */
function snakeToCamelKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamelKeys)
  }
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      result[camelKey] = snakeToCamelKeys(value)
    }
    return result
  }
  return obj
}
