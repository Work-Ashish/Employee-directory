/**
 * Server-only functional role resolution.
 * These functions access the database and must NOT be imported by client components.
 */
import "server-only"

import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"
import { Module, getModulesForRole, type Role } from "@/lib/permissions"

const CACHE_TTL = 300 // 5 minutes

/** Convert Map<string, Set<string>> to plain object for caching/API */
export function capabilitiesToRecord(caps: Map<string, Set<string>>): Record<string, string[]> {
    const result: Record<string, string[]> = {}
    for (const [mod, actions] of caps) {
        result[mod] = Array.from(actions)
    }
    return result
}

/**
 * Resolve all functional capabilities for an employee.
 * Walks up the parent role chain (max 5 levels) to inherit capabilities.
 * Results are cached in Redis with a 5-minute TTL.
 * Returns Map<module, Set<action>>
 */
export async function resolveEmployeeCapabilities(employeeId: string): Promise<Map<string, Set<string>>> {
    // Check Redis cache first
    const cacheKey = `func_caps:${employeeId}`
    try {
        const cached = await redis.get(cacheKey) as Record<string, string[]> | null
        if (cached && typeof cached === "object") {
            const map = new Map<string, Set<string>>()
            for (const [mod, actions] of Object.entries(cached)) {
                map.set(mod, new Set(actions))
            }
            return map
        }
    } catch { /* cache miss — continue to DB */ }

    const assignments = await prisma.employeeFunctionalRole.findMany({
        where: { employeeId },
        include: {
            functionalRole: {
                include: { capabilities: true },
            },
        },
    })

    const capabilities = new Map<string, Set<string>>()
    const visitedRoles = new Set<string>()

    async function walkHierarchy(roleId: string, depth: number) {
        if (depth > 5 || visitedRoles.has(roleId)) return
        visitedRoles.add(roleId)

        const role = await prisma.functionalRole.findUnique({
            where: { id: roleId },
            include: { capabilities: true },
        })
        if (!role || !role.isActive) return

        for (const cap of role.capabilities) {
            if (!capabilities.has(cap.module)) {
                capabilities.set(cap.module, new Set())
            }
            const actionSet = capabilities.get(cap.module)!
            for (const action of cap.actions) {
                actionSet.add(action)
            }
        }

        if (role.parentRoleId) {
            await walkHierarchy(role.parentRoleId, depth + 1)
        }
    }

    for (const assignment of assignments) {
        const role = assignment.functionalRole
        if (!role.isActive) continue

        for (const cap of role.capabilities) {
            if (!capabilities.has(cap.module)) {
                capabilities.set(cap.module, new Set())
            }
            const actionSet = capabilities.get(cap.module)!
            for (const action of cap.actions) {
                actionSet.add(action)
            }
        }
        visitedRoles.add(role.id)

        if (role.parentRoleId) {
            await walkHierarchy(role.parentRoleId, 1)
        }
    }

    // Cache the resolved capabilities in Redis
    try {
        await redis.set(cacheKey, capabilitiesToRecord(capabilities), { ex: CACHE_TTL })
    } catch { /* non-critical cache write failure */ }

    return capabilities
}

/** Invalidate cached capabilities for an employee (call after role assignment changes) */
export async function invalidateCapabilitiesCache(employeeId: string): Promise<void> {
    try {
        await redis.set(`func_caps:${employeeId}`, null, { ex: 1 })
    } catch { /* non-critical */ }
}

/** Check if an employee has a specific functional capability */
export async function hasFunctionalPermission(employeeId: string, module: string, action: string): Promise<boolean> {
    const capabilities = await resolveEmployeeCapabilities(employeeId)
    return capabilities.get(module)?.has(action) ?? false
}

/** Get all modules an employee can access (system role + functional roles) */
export async function getEffectiveModules(role: Role, employeeId?: string): Promise<Module[]> {
    const systemModules = new Set(getModulesForRole(role))

    if (employeeId) {
        const funcCaps = await resolveEmployeeCapabilities(employeeId)
        for (const [mod, actions] of funcCaps) {
            if (actions.size > 0 && Object.values(Module).includes(mod as Module)) {
                systemModules.add(mod as Module)
            }
        }
    }

    return Array.from(systemModules)
}
