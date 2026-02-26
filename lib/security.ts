import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { apiError, ApiErrorCode } from "@/lib/api-response"

export type Role = "ADMIN" | "EMPLOYEE"

export interface AuthContext {
    requestId: string
    userId: string
    organizationId: string
    role: Role
    name?: string | null
}

type AuthHandler = (req: Request, context: AuthContext) => Promise<NextResponse>

import { logger, logContext } from "@/lib/logger"
import { MetricsCollector } from "@/lib/metrics"

/**
 * withAuth: High-order function to wrap API routes with mandatory authentication,
 * RBAC checks, and organization context.
 */
export function withAuth(requiredRole: Role | Role[], handler: AuthHandler) {
    return async (req: Request) => {
        const requestId = crypto.randomUUID()
        const startTime = Date.now()
        const url = new URL(req.url)
        const path = url.pathname

        try {
            const session = await auth()
            if (!session?.user) {
                logger.warn("Unauthorized access attempt", { path, method: req.method, requestId })
                return apiError("Unauthorized", ApiErrorCode.UNAUTHORIZED, 401)
            }

            const { id: userId, organizationId, role, name } = session.user
            if (!organizationId) {
                return apiError("Organization account required", ApiErrorCode.FORBIDDEN, 403)
            }

            // RBAC Check
            const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
            if (!roles.includes(role as Role)) {
                logger.warn("Forbidden role access", { userId, role, requiredRole, path, requestId })
                return apiError(`Forbidden. ${roles.join("/")} access required.`, ApiErrorCode.FORBIDDEN, 403)
            }

            // Run within log context for downstream tracing
            return await logContext.run({ requestId, organizationId, userId }, async () => {
                logger.info("API Request Started", { path, method: req.method, userId, organizationId })

                const response = await handler(req, { requestId, userId, organizationId, role: role as Role, name })

                const duration = Date.now() - startTime

                // Background metrics recording
                MetricsCollector.recordRequest({
                    path,
                    method: req.method,
                    status: response.status,
                    latencyMs: duration,
                    organizationId
                }).catch(err => logger.error("Failed to record metrics", { err }))

                logger.info("API Request Completed", {
                    path,
                    method: req.method,
                    status: response.status,
                    latencyMs: duration
                })

                return response
            })
        } catch (error) {
            const duration = Date.now() - startTime
            logger.error("API Request Failed", {
                path,
                method: req.method,
                error: error instanceof Error ? error.message : "Unknown",
                latencyMs: duration
            })
            return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
        }
    }
}

/**
 * orgFilter: Helper to inject organizationId into Prisma query objects
 */
export function orgFilter(context: AuthContext, existingWhere: Record<string, unknown> = {}) {
    return {
        ...existingWhere,
        organizationId: context.organizationId,
    }
}
