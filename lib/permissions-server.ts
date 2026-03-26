/**
 * Server-only functional role resolution.
 * These functions access the Django RBAC API and must NOT be imported by client components.
 */
import "server-only"

import { redis } from "@/lib/redis"
import { Module, getModulesForRole, type Role } from "@/lib/permissions"

const DJANGO_BASE = process.env.DJANGO_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
const DJANGO_SERVICE_TOKEN = process.env.DJANGO_SERVICE_TOKEN || ""
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
 * Calls Django RBAC capabilities endpoint with Redis caching (5-minute TTL).
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
    } catch { /* cache miss — continue to API */ }

    // Call Django RBAC capabilities endpoint
    const capabilities = new Map<string, Set<string>>()
    try {
        const response = await fetch(`${DJANGO_BASE}/api/v1/rbac/capabilities/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Token ${DJANGO_SERVICE_TOKEN}` },
            body: JSON.stringify({ employee_id: employeeId }),
            signal: AbortSignal.timeout(5000),
        })

        if (response.ok) {
            const json = await response.json()
            const data = json.data ?? json

            // Expected shape: { "MODULE_NAME": ["action1", "action2"], ... }
            if (data && typeof data === "object") {
                for (const [mod, actions] of Object.entries(data)) {
                    if (Array.isArray(actions)) {
                        capabilities.set(mod, new Set(actions as string[]))
                    }
                }
            }
        }
    } catch {
        // API call failed — return empty capabilities
        return capabilities
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
    // Try Django check-permission endpoint directly (avoids full capabilities fetch)
    try {
        const response = await fetch(`${DJANGO_BASE}/api/v1/rbac/check-permission/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Token ${DJANGO_SERVICE_TOKEN}` },
            body: JSON.stringify({ employee_id: employeeId, module, action }),
            signal: AbortSignal.timeout(5000),
        })

        if (response.ok) {
            const json = await response.json()
            const data = json.data ?? json
            return data.has_permission === true
        }
    } catch {
        // Fallback: resolve from full capabilities
    }

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
