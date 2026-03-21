import { NextResponse } from "next/server"

/**
 * Lightweight health check that bypasses middleware auth.
 * Used by Docker HEALTHCHECK and load balancers.
 */
export async function GET() {
    return NextResponse.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    })
}
