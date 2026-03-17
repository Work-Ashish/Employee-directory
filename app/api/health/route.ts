import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

const DJANGO_URL = process.env.DJANGO_BACKEND_URL || "http://localhost:8000"

export async function GET() {
    try {
        // Test Django backend connectivity instead of direct Prisma DB check
        const res = await fetch(`${DJANGO_URL}/api/v1/health/`, {
            method: "GET",
            signal: AbortSignal.timeout(5000),
        })

        const djangoHealthy = res.ok

        return apiSuccess({
            status: djangoHealthy ? "healthy" : "degraded",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: djangoHealthy ? "connected" : "unknown",
            django: djangoHealthy ? "connected" : "unreachable",
        })
    } catch (error) {
        console.error("[HEALTH_CHECK]", error)
        return apiError("unhealthy", ApiErrorCode.INTERNAL_ERROR, 503, {
            database: "unknown",
            django: "unreachable",
            timestamp: new Date().toISOString()
        })
    }
}
