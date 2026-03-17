/**
 * DEPRECATED: Legacy auth route stub.
 *
 * Auth has been migrated to Django SimpleJWT (Sprint 12).
 * NextAuthProvider has been removed (Sprint 14).
 * This file returns minimal JSON responses for any stale client-side
 * requests to /api/auth/* endpoints. Safe to delete when confident
 * no client code references these paths.
 */
import { NextResponse } from "next/server"

export const runtime = "nodejs"

function handleAuth(req: Request) {
    const url = new URL(req.url)
    const path = url.pathname

    // SessionProvider calls /api/auth/session — return empty session JSON
    if (path.endsWith("/session")) {
        return NextResponse.json({})
    }

    // CSRF token endpoint
    if (path.endsWith("/csrf")) {
        return NextResponse.json({ csrfToken: "" })
    }

    // Providers endpoint
    if (path.endsWith("/providers")) {
        return NextResponse.json({})
    }

    // All other auth routes redirect to login
    return NextResponse.redirect(new URL("/login", req.url), { status: 302 })
}

export const GET = handleAuth
export const POST = handleAuth
