/**
 * Server-only functional role resolution.
 * These functions access the database and must NOT be imported by client components.
 */
import "server-only"

import { prisma } from "@/lib/prisma"
import { Module, getModulesForRole, type Role } from "@/lib/permissions"

/**
 * Resolve all functional capabilities for an employee.
 * Walks up the parent role chain (max 5 levels) to inherit capabilities.
 * Returns Map<module, Set<action>>
 */
export async function resolveEmployeeCapabilities(employeeId: string): Promise<Map<string, Set<string>>> {
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

    return capabilities
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
