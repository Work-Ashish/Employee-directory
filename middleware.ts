import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { redis } from "@/lib/redis"

// K11: Distributed fixed-window rate limiter (Redis-backed)

// Per-IP: 60 req / 60s (DoS protection)
const IP_RATE_LIMIT_WINDOW = 60
const IP_RATE_LIMIT_MAX = 60

// Per-user: 1000 req / 3600s (matches Django's throttle: 1000/hour)
const USER_RATE_LIMIT_WINDOW = 3600
const USER_RATE_LIMIT_MAX = 1000

async function isIpRateLimited(ip: string): Promise<boolean> {
    if (ip === "127.0.0.1" || ip === "::1" || ip.includes("localhost")) {
        return false
    }

    const currentWindow = Math.floor(Date.now() / (IP_RATE_LIMIT_WINDOW * 1000))
    const key = `ratelimit:ip:${ip}:${currentWindow}`

    try {
        const count = await redis.incr(key)
        if (count === 1) {
            await redis.expire(key, IP_RATE_LIMIT_WINDOW + 10)
        }
        return count > IP_RATE_LIMIT_MAX
    } catch (e) {
        console.warn("[Rate Limiting Error]", e)
        return false
    }
}

async function isUserRateLimited(userId: string): Promise<boolean> {
    const currentWindow = Math.floor(Date.now() / (USER_RATE_LIMIT_WINDOW * 1000))
    const key = `ratelimit:user:${userId}:${currentWindow}`

    try {
        const count = await redis.incr(key)
        if (count === 1) {
            await redis.expire(key, USER_RATE_LIMIT_WINDOW + 10)
        }
        return count > USER_RATE_LIMIT_MAX
    } catch (e) {
        console.warn("[User Rate Limiting Error]", e)
        return false
    }
}

/** Extract user ID from JWT without verification (for rate limiting only) */
function extractUserIdFromJwt(authHeader: string | null): string | null {
    if (!authHeader?.startsWith("Bearer ")) return null
    try {
        const token = authHeader.slice(7)
        const parts = token.split(".")
        if (parts.length !== 3) return null
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")))
        return payload.user_id || payload.sub || null
    } catch {
        return null
    }
}

// Routes that don't require authentication
const publicRoutes = [
    "/login",
    "/signup",
    "/api/auth",
    "/api/health",
    "/api/raw-health",
]

function isPublicRoute(pathname: string): boolean {
    return publicRoutes.some(route => pathname === route || pathname.startsWith(route + "/"))
}

// NOTE: Admin route enforcement removed — RBAC is handled at route level by withAuth()
// All role/permission checks happen server-side in each API handler.

function addSecurityHeaders(response: NextResponse) {
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("X-XSS-Protection", "1; mode=block")
    response.headers.set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()"
    )
    response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
    )
    return response
}

// Auth is handled client-side by AuthProvider (Django JWT in localStorage) and
// server-side by getServerSession() in API routes (via withAuth).
// Middleware handles: route protection (JWT presence check), rate limiting, security headers.

export default async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl

    // Skip auth check for public routes, static assets, and API routes
    // (API routes are protected by withAuth() in each handler)
    if (!isPublicRoute(pathname) && !pathname.startsWith("/api/") && !pathname.startsWith("/_next")) {
        // Server-side route protection: check for JWT in Authorization header or cookie
        const authHeader = req.headers.get("authorization")
        const hasHeaderToken = authHeader?.startsWith("Bearer ")
        const hasCookieToken = req.cookies.has("access_token")

        if (!hasHeaderToken && !hasCookieToken) {
            const loginUrl = new URL("/login", req.url)
            loginUrl.searchParams.set("callbackUrl", pathname)
            return addSecurityHeaders(NextResponse.redirect(loginUrl))
        }
    }

    // Always add security headers
    const response = NextResponse.next()

    // K11: Rate limiting for API routes
    if (pathname.startsWith("/api/")) {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown"

        // Per-IP rate limit (DoS protection)
        if (await isIpRateLimited(ip)) {
            return addSecurityHeaders(
                NextResponse.json(
                    { error: "Too many requests. Please slow down." },
                    { status: 429, headers: { "Retry-After": "60" } }
                )
            )
        }

        // Per-user rate limit (matches Django 1000/hr throttle)
        const userId = extractUserIdFromJwt(req.headers.get("authorization"))
        if (userId && await isUserRateLimited(userId)) {
            return addSecurityHeaders(
                NextResponse.json(
                    { error: "Rate limit exceeded. Please try again later.", detail: "User throttle: 1000 requests per hour." },
                    { status: 429, headers: { "Retry-After": "300" } }
                )
            )
        }
    }

    return addSecurityHeaders(response)
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
}
