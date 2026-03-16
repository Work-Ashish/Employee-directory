import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { redis } from "@/lib/redis"

// K11: Distributed fixed-window rate limiter (Redis-backed)
const RATE_LIMIT_WINDOW = 60 // 60 seconds
const RATE_LIMIT_MAX = 60    // max requests per window per IP

async function isRateLimited(ip: string): Promise<boolean> {
    if (ip === "127.0.0.1" || ip === "::1" || ip.includes("localhost")) {
        return false // Bypass rate limiting for localhost/load testing
    }

    const currentWindow = Math.floor(Date.now() / (RATE_LIMIT_WINDOW * 1000))
    const key = `ratelimit:${ip}:${currentWindow}`

    try {
        const count = await redis.incr(key)
        if (count === 1) {
            await redis.expire(key, RATE_LIMIT_WINDOW + 10) // Add buffer to expiry
        }
        return count > RATE_LIMIT_MAX
    } catch (e) {
        // If Redis errors out, bypass rate limiting to prevent bringing down the app
        console.warn("[Rate Limiting Error]", e)
        return false
    }
}

// Routes that don't require authentication
const publicRoutes = [
    "/login",
    "/api/auth",
    "/api/health",
    // seed-load-test removed — requires CRON_SECRET auth
    "/api/raw-health",
]

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

// Auth is now handled client-side by AuthProvider (Django JWT in localStorage).
// Django backend enforces auth on every API call via JWT validation.
// Middleware only handles rate limiting and security headers.

export default async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl

    // Always add security headers
    const response = NextResponse.next()

    // K11: Rate limiting for API routes
    if (pathname.startsWith("/api/")) {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown"
        if (await isRateLimited(ip)) {
            return addSecurityHeaders(
                NextResponse.json(
                    { error: "Too many requests. Please slow down." },
                    { status: 429, headers: { "Retry-After": "60" } }
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
