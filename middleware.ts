import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that don't require authentication
const publicRoutes = [
    "/login",
    "/api/auth",
    "/api/health",
]

// Routes that require ADMIN role
const adminRoutes = [
    "/admin",
    "/api/admin",
    "/api/employees",
    "/api/departments",
    "/api/assets",
    "/api/payroll",
    "/api/pf",
    "/api/recruitment",
    "/api/organization",
]

function addSecurityHeaders(response: NextResponse) {
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("X-XSS-Protection", "1; mode=block")
    response.headers.set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()"
    )
    return response
}

// Parse the NextAuth.js session token cookie to get role info.
// The JWT is a JWE token — we decode the payload portion to read claims.
// Full verification happens at the route level via auth().
function getSessionFromCookie(req: NextRequest): { role?: string } | null {
    // NextAuth v5 uses these cookie names
    const cookieName =
        process.env.NODE_ENV === "production"
            ? "__Secure-authjs.session-token"
            : "authjs.session-token"

    const token = req.cookies.get(cookieName)?.value
    if (!token) return null

    // Token exists = user is authenticated (route-level auth() will fully verify)
    // Try to extract role from the JWT payload (middle segment)
    try {
        const parts = token.split(".")
        if (parts.length >= 2) {
            // Standard JWT — decode the payload
            const payload = JSON.parse(atob(parts[1]))
            return { role: payload.role }
        }
    } catch {
        // JWE token (encrypted) — we can't decode it here but we know user is logged in
    }

    // Token exists but we can't read role — treat as authenticated non-admin
    return { role: undefined }
}

export default function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl

    // Always add security headers
    const response = NextResponse.next()

    // Allow public routes
    if (publicRoutes.some((route) => pathname.startsWith(route))) {
        return addSecurityHeaders(response)
    }

    // Allow static files and Next.js internals
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon") ||
        pathname.includes(".")
    ) {
        return response
    }

    // Check session cookie (Edge-compatible — no Node.js modules)
    const session = getSessionFromCookie(req)

    // Redirect unauthenticated users to login
    if (!session) {
        if (pathname.startsWith("/api/")) {
            return addSecurityHeaders(
                NextResponse.json(
                    { error: "Unauthorized" },
                    { status: 401 }
                )
            )
        }
        const loginUrl = new URL("/login", req.url)
        loginUrl.searchParams.set("callbackUrl", pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Check admin routes — only enforce if we can read the role
    if (adminRoutes.some((route) => pathname.startsWith(route))) {
        if (session.role && session.role !== "ADMIN") {
            if (pathname.startsWith("/api/")) {
                return addSecurityHeaders(
                    NextResponse.json(
                        { error: "Forbidden. Admin access required." },
                        { status: 403 }
                    )
                )
            }
            return NextResponse.redirect(new URL("/", req.url))
        }
        // If role is undefined (JWE token), let the request through —
        // route-level auth() will do the full RBAC check
    }

    return addSecurityHeaders(response)
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
}
