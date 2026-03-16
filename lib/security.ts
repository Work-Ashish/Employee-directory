import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { apiError, ApiErrorCode } from "@/lib/api-response"
import { logger, logContext } from "@/lib/logger"
import { MetricsCollector } from "@/lib/metrics"
import { Role, Module, Action, hasPermission } from "@/lib/permissions"
import { hasFunctionalPermission } from "@/lib/permissions-server"

export type { Role }

export interface AuthContext {
    requestId: string
    userId: string
    organizationId: string
    role: Role
    employeeId?: string
    name?: string | null
    sessionToken?: string
    params: Record<string, string>
}

type AuthHandler = (req: Request, context: AuthContext) => Promise<NextResponse | Response>

// ── Auth requirement types ─────────────────────────────────

/** New permission-based auth: { module, action } */
interface PermissionRequirement {
    module: Module
    action: Action
}

/** Legacy role-based auth: string or string[] (for backwards compatibility) */
type LegacyRoleAuth = string | string[]

type AuthRequirement = PermissionRequirement | PermissionRequirement[] | LegacyRoleAuth

function isPermissionRequirement(req: unknown): req is PermissionRequirement {
    return typeof req === "object" && req !== null && "module" in req && "action" in req
}

function isPermissionArray(req: unknown): req is PermissionRequirement[] {
    return Array.isArray(req) && req.length > 0 && isPermissionRequirement(req[0])
}

function isLegacyAuth(req: AuthRequirement): req is LegacyRoleAuth {
    if (typeof req === "string") return true
    if (Array.isArray(req) && req.length > 0 && typeof req[0] === "string") return true
    return false
}

/**
 * withAuth: Higher-order function to wrap API routes with authentication,
 * RBAC/permission checks, and organization context.
 *
 * Supports both:
 *   - New: withAuth({ module: Module.EMPLOYEES, action: Action.CREATE }, handler)
 *   - Legacy: withAuth("CEO", handler) or withAuth(["CEO", "HR"], handler)
 */
export function withAuth(requirement: AuthRequirement, handler: AuthHandler) {
    return async (req: Request, routeContext?: { params?: Promise<Record<string, string>> | Record<string, string> }) => {
        const rawParams = routeContext?.params
        const params: Record<string, string> = rawParams && typeof (rawParams as any).then === 'function'
            ? await (rawParams as Promise<Record<string, string>>)
            : (rawParams as Record<string, string>) || {}
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

            const { id: userId, organizationId, role, name, sessionToken } = session.user as {
                id: string; organizationId: string | null | undefined; role: Role; name?: string | null; sessionToken?: string
            }
            if (!organizationId) {
                logger.error("Organization account missing in session", { userId, path, requestId })
                return apiError("Organization account required. Please log in again.", ApiErrorCode.FORBIDDEN, 403)
            }

            // Session Revocation Check
            if (sessionToken) {
                const dbSession = await prisma.userSession.findUnique({
                    where: { sessionToken }
                })
                if (!dbSession || dbSession.isRevoked) {
                    logger.warn("Revoked session attempt", { userId, path, requestId })
                    return apiError("Session has been revoked", ApiErrorCode.UNAUTHORIZED, 401)
                }
                // Update last active in background
                prisma.userSession.update({
                    where: { id: dbSession.id },
                    data: { lastActive: new Date() }
                }).catch(() => { })
            }

            // ── Resolve employeeId eagerly ───────────────────────
            let employeeId: string | undefined
            try {
                const emp = await prisma.employee.findFirst({
                    where: { userId, organizationId },
                    select: { id: true },
                })
                employeeId = emp?.id
            } catch {
                // Non-critical — some users (e.g. superadmin) may not have employee records
            }

            // ── Permission / RBAC Check ──────────────────────────
            if (isLegacyAuth(requirement)) {
                // Legacy path: check role inclusion
                const roles = Array.isArray(requirement) ? requirement : [requirement]
                if (!roles.includes(role)) {
                    logger.warn("Forbidden role access", { userId, role, requiredRoles: roles, path, requestId })
                    return apiError(
                        `Forbidden. Your role (${role}) does not have access to this resource.`,
                        ApiErrorCode.FORBIDDEN,
                        403
                    )
                }
            } else {
                // New permission path: check permission matrix, then fallback to functional roles
                const perms = isPermissionArray(requirement) ? requirement : [requirement as PermissionRequirement]
                const denied = perms.find(p => !hasPermission(role, p.module, p.action))
                if (denied) {
                    // Fallback: check functional role capabilities
                    if (employeeId) {
                        const hasFuncPerm = await hasFunctionalPermission(employeeId, denied.module, denied.action)
                        if (hasFuncPerm) {
                            // Functional role grants access — continue
                        } else {
                            logger.warn("Forbidden permission", {
                                userId, role, module: denied.module, action: denied.action, path, requestId
                            })
                            return apiError(
                                `Forbidden. Your role (${role}) does not have ${denied.action} permission on ${denied.module}.`,
                                ApiErrorCode.FORBIDDEN,
                                403
                            )
                        }
                    } else {
                        logger.warn("Forbidden permission", {
                            userId, role, module: denied.module, action: denied.action, path, requestId
                        })
                        return apiError(
                            `Forbidden. Your role (${role}) does not have ${denied.action} permission on ${denied.module}.`,
                            ApiErrorCode.FORBIDDEN,
                            403
                        )
                    }
                }
            }

            // ── Run handler within log context ───────────────────
            return await logContext.run({ requestId, organizationId, userId }, async () => {
                logger.info("API Request Started", { path, method: req.method, userId, organizationId })

                const response = await handler(req, {
                    requestId,
                    userId,
                    organizationId,
                    role: role as Role,
                    employeeId,
                    name,
                    sessionToken,
                    params,
                })

                const duration = Date.now() - startTime

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
