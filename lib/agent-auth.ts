import { logger } from "@/lib/logger"
import { apiError, ApiErrorCode } from "@/lib/api-response"
import { NextResponse } from "next/server"

const DJANGO_BASE = process.env.DJANGO_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export interface AgentContext {
    deviceId: string
    employeeId: string
    organizationId: string
}

type AgentHandler = (req: Request, ctx: AgentContext) => Promise<NextResponse | Response>

/**
 * withAgentAuth: wraps agent-facing API routes.
 * Authenticates via X-Agent-Key header against the Django agent device endpoint.
 */
export function withAgentAuth(handler: AgentHandler) {
    return async (req: Request) => {
        const apiKey = req.headers.get("x-agent-key")
        if (!apiKey) {
            return apiError("Missing X-Agent-Key header", ApiErrorCode.UNAUTHORIZED, 401)
        }

        try {
            // Validate agent API key via Django
            const response = await fetch(`${DJANGO_BASE}/api/v1/agents/devices/validate/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ api_key: apiKey }),
                signal: AbortSignal.timeout(5000),
            })

            if (!response.ok) {
                logger.warn("Invalid agent API key", { keyPrefix: apiKey.slice(0, 8) })
                return apiError("Invalid agent API key", ApiErrorCode.UNAUTHORIZED, 401)
            }

            const json = await response.json()
            const device = json.data ?? json

            if (device.status !== "ACTIVE") {
                return apiError(`Device is ${device.status}`, ApiErrorCode.FORBIDDEN, 403)
            }

            // Update lastHeartbeat in background (non-blocking)
            fetch(`${DJANGO_BASE}/api/v1/agents/devices/${device.id}/heartbeat/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: AbortSignal.timeout(5000),
            }).catch(() => {})

            return handler(req, {
                deviceId: device.id,
                employeeId: device.employee_id ?? device.employeeId,
                organizationId: device.organization_id ?? device.organizationId,
            })
        } catch (error: unknown) {
            logger.error("Agent auth error", { error: error instanceof Error ? error.message : "unknown" })
            return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
        }
    }
}
