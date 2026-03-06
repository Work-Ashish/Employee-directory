import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { MetricsCollector } from "@/lib/metrics"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"

export const GET = withAuth({ module: Module.SETTINGS, action: Action.VIEW }, async (req) => {
    try {
        const url = new URL(req.url)
        const dateParam = url.searchParams.get("date") || new Date().toISOString().split('T')[0]

        const stats = await MetricsCollector.getDailyStats(dateParam)

        return apiSuccess({
            date: dateParam,
            stats,
            system: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                timestamp: new Date().toISOString()
            }
        })
    } catch (error) {
        return apiError("Failed to fetch metrics", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
