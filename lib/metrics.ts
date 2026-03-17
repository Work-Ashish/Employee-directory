import { redis } from './redis'
import { logger } from './logger'

const DJANGO_BASE = process.env.DJANGO_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export interface ApiMetrics {
    path: string
    method: string
    status: number
    latencyMs: number
    organizationId?: string
}

export class MetricsCollector {
    private static readonly PREFIX = 'metrics:v2'

    /**
     * Records a single API request performance data
     */
    static async recordRequest(metrics: ApiMetrics) {
        const { path, status, latencyMs, organizationId } = metrics
        const date = new Date().toISOString().split('T')[0] // Daily buckets
        const baseKey = `${this.PREFIX}:${date}`

        try {
            // 1. Total hits
            await redis.incr(`${baseKey}:total_hits`)

            // 2. Status distribution
            const statusType = Math.floor(status / 100) + 'xx'
            await redis.incr(`${baseKey}:status:${statusType}`)

            // 3. Path specific hits
            await redis.incr(`${baseKey}:path:${path}:hits`)

            // 4. Latency tracking (Sum and Count for average)
            await redis.incr(`${baseKey}:latency_count`)
            const currentSum = await redis.get(`${baseKey}:latency_sum`) || 0
            await redis.set(`${baseKey}:latency_sum`, Number(currentSum) + latencyMs)

            // 5. Organization level errors & Alerting
            if (status >= 500 && organizationId) {
                const orgErrorKey = `${baseKey}:org:${organizationId}:errors`
                const count = await redis.incr(orgErrorKey)

                // Alerting Threshold: 5 internal errors in 24h
                if (count >= 5) {
                    const alertInhibitedKey = `${baseKey}:org:${organizationId}:alert_inhibited`
                    const isInhibited = await redis.get(alertInhibitedKey)

                    if (!isInhibited) {
                        try {
                            // Post alert to Django admin alerts endpoint
                            await fetch(`${DJANGO_BASE}/api/v1/admin/alerts/`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    organization_id: organizationId,
                                    severity: "HIGH",
                                    reason: `Critical API Failure Spike: ${count} errors of type 5xx detected in organization ${organizationId} on ${date}.`,
                                }),
                                signal: AbortSignal.timeout(5000),
                            })
                            // Inhibiting frequent alerts (e.g., once every 4 hours)
                            await redis.set(alertInhibitedKey, true, { ex: 14400 })
                            logger.info("System alert generated for error spike", { organizationId, errorCount: count })
                        } catch (pErr) {
                            logger.error("Failed to generate AdminAlert", { pErr: pErr instanceof Error ? pErr.message : String(pErr) })
                        }
                    }
                }

                // Set expiry to 24h if new
                if (count === 1) await redis.expire(orgErrorKey, 86400)
            }

            // 6. Latency Alerts
            if (latencyMs > 5000 && organizationId) {
                logger.warn("Slow request detected", { path, latencyMs, organizationId })
            }
        } catch (error) {
            // Fail silently to not block API responses
            logger.error("[METRICS_COLLECTOR_ERROR]", { error: error instanceof Error ? error.message : String(error) })
        }
    }

    /**
     * Retrieves aggregated metrics for a specific date
     */
    static async getDailyStats(date: string) {
        const baseKey = `${this.PREFIX}:${date}`

        const [total, s2xx, s4xx, s5xx, latSum, latCount] = await Promise.all([
            redis.get(`${baseKey}:total_hits`),
            redis.get(`${baseKey}:status:2xx`),
            redis.get(`${baseKey}:status:4xx`),
            redis.get(`${baseKey}:status:5xx`),
            redis.get(`${baseKey}:latency_sum`),
            redis.get(`${baseKey}:latency_count`),
        ])

        return {
            totalHits: Number(total || 0),
            statusDistribution: {
                "2xx": Number(s2xx || 0),
                "4xx": Number(s4xx || 0),
                "5xx": Number(s5xx || 0),
            },
            averageLatency: latCount ? Number(latSum || 0) / Number(latCount) : 0
        }
    }
}
