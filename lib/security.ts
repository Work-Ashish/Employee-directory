import { getServerSession } from "@/lib/auth-server"
import { NextResponse } from "next/server"
import { apiError, ApiErrorCode } from "@/lib/api-response"
import { logger, logContext } from "@/lib/logger"
import { MetricsCollector } from "@/lib/metrics"
import { Role, Module, Action, hasPermission, toCodename, isTenantAdmin } from "@/lib/permissions"
import { hasFunctionalPermission } from "@/lib/permissions-server"

export type { Role }

export interface AuthContext {
    requestId: string
    userId: string
    organizationId: string
    role: Role
    employeeId?: string
    name?: string | null
    /** @deprecated Session tokens are now managed by Django's token blacklist */
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
            const session = await getServerSession()
            if (!session?.user) {
                logger.warn("Unauthorized access attempt", { path, method: req.method, requestId })
                return apiError("Unauthorized", ApiErrorCode.UNAUTHORIZED, 401)
            }

            const { id: userId, organizationId, role, name } = session.user as {
                id: string; organizationId: string | null | undefined; role: Role; name?: string | null
            }
            if (!organizationId) {
                logger.error("Organization account missing in session", { userId, path, requestId })
                return apiError("Organization account required. Please log in again.", ApiErrorCode.FORBIDDEN, 403)
            }

            // Note: Session revocation is now handled by Django's token blacklist.
            // Django validates token validity on every /auth/me/ call in getServerSession().

            // employeeId is already available from the Django JWT claims
            // (resolved by getServerSession → Django /auth/me/)
            const employeeId = session.user.employeeId

            // ── Permission / RBAC Check ──────────────────────────
            // Tenant admins bypass all permission checks (matches Django is_tenant_admin)
            const skipPermCheck = isTenantAdmin(role) || (session.user as Record<string, unknown>).isTenantAdmin === true

            if (!skipPermCheck) {
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
                    // Permission path: check static matrix → Django codenames → functional roles
                    const perms = isPermissionArray(requirement) ? requirement : [requirement as PermissionRequirement]
                    const deniedPerms = perms.filter(p => !hasPermission(role, p.module, p.action))
                    if (deniedPerms.length > 0) {
                        // Fallback: check ALL denied perms against Django codenames / functional roles
                        const stillDenied: PermissionRequirement[] = []
                        for (const denied of deniedPerms) {
                            let codenameGranted = false
                            try {
                                if (employeeId) {
                                    codenameGranted = await hasFunctionalPermission(employeeId, denied.module, denied.action)
                                }
                            } catch {
                                // Non-critical
                            }
                            if (!codenameGranted) {
                                stillDenied.push(denied)
                            }
                        }

                        if (stillDenied.length > 0) {
                            const first = stillDenied[0]
                            const codename = toCodename(first.module, first.action)
                            logger.warn("Forbidden permission", {
                                userId, role, module: first.module, action: first.action, codename, path, requestId,
                                totalDenied: stillDenied.length,
                            })
                            return apiError(
                                `Forbidden. Your role (${role}) does not have ${first.action} permission on ${first.module}.`,
                                ApiErrorCode.FORBIDDEN,
                                403
                            )
                        }
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
 * orgFilter: Helper to inject organizationId into query filter objects.
 */
export function orgFilter(context: AuthContext, existingWhere: Record<string, unknown> = {}) {
    return {
        ...existingWhere,
        organizationId: context.organizationId,
    }
}
