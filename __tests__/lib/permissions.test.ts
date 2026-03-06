import { describe, test, expect } from 'vitest'
import {
    hasPermission,
    canAccessModule,
    getModulesForRole,
    isValidRole,
    Module,
    Action,
    ROLES,
    PERMISSIONS,
    Roles,
    scopeEmployeeQuery,
    scopeEntityQuery,
} from '@/lib/permissions'

describe('Permission Matrix', () => {

    // ── Role Validation ──────────────────────────────────────
    test('ROLES contains exactly 5 roles', () => {
        expect(ROLES).toEqual(['CEO', 'HR', 'PAYROLL', 'TEAM_LEAD', 'EMPLOYEE'])
    })

    test('isValidRole accepts valid roles', () => {
        expect(isValidRole(Roles.CEO)).toBe(true)
        expect(isValidRole(Roles.HR)).toBe(true)
        expect(isValidRole(Roles.PAYROLL)).toBe(true)
        expect(isValidRole(Roles.TEAM_LEAD)).toBe(true)
        expect(isValidRole(Roles.EMPLOYEE)).toBe(true)
    })

    test('isValidRole rejects invalid roles', () => {
        expect(isValidRole('ADMIN')).toBe(false)
        expect(isValidRole('SUPERUSER')).toBe(false)
        expect(isValidRole('')).toBe(false)
    })

    // ── CEO ──────────────────────────────────────────────────
    test('CEO has full access to all modules', () => {
        for (const mod of Object.values(Module)) {
            expect(canAccessModule(Roles.CEO, mod)).toBe(true)
        }
    })

    test('CEO can CRUD employees', () => {
        expect(hasPermission(Roles.CEO, Module.EMPLOYEES, Action.VIEW)).toBe(true)
        expect(hasPermission(Roles.CEO, Module.EMPLOYEES, Action.CREATE)).toBe(true)
        expect(hasPermission(Roles.CEO, Module.EMPLOYEES, Action.UPDATE)).toBe(true)
        expect(hasPermission(Roles.CEO, Module.EMPLOYEES, Action.DELETE)).toBe(true)
        expect(hasPermission(Roles.CEO, Module.EMPLOYEES, Action.EXPORT)).toBe(true)
        expect(hasPermission(Roles.CEO, Module.EMPLOYEES, Action.IMPORT)).toBe(true)
    })

    test('CEO can manage settings', () => {
        expect(hasPermission(Roles.CEO, Module.SETTINGS, Action.VIEW)).toBe(true)
        expect(hasPermission(Roles.CEO, Module.SETTINGS, Action.UPDATE)).toBe(true)
    })

    // ── HR ───────────────────────────────────────────────────
    test('HR can CRUD employees but not payroll', () => {
        expect(hasPermission(Roles.HR, Module.EMPLOYEES, Action.VIEW)).toBe(true)
        expect(hasPermission(Roles.HR, Module.EMPLOYEES, Action.CREATE)).toBe(true)
        expect(hasPermission(Roles.HR, Module.EMPLOYEES, Action.UPDATE)).toBe(true)
        // HR can view payroll but cannot create/update/delete
        expect(hasPermission(Roles.HR, Module.PAYROLL, Action.VIEW)).toBe(true)
        expect(hasPermission(Roles.HR, Module.PAYROLL, Action.CREATE)).toBe(false)
        expect(hasPermission(Roles.HR, Module.PAYROLL, Action.UPDATE)).toBe(false)
        expect(hasPermission(Roles.HR, Module.PAYROLL, Action.DELETE)).toBe(false)
    })

    test('HR cannot access settings', () => {
        expect(canAccessModule(Roles.HR, Module.SETTINGS)).toBe(false)
    })

    test('HR can manage teams', () => {
        expect(hasPermission(Roles.HR, Module.TEAMS, Action.VIEW)).toBe(true)
        expect(hasPermission(Roles.HR, Module.TEAMS, Action.CREATE)).toBe(true)
        expect(hasPermission(Roles.HR, Module.TEAMS, Action.ASSIGN)).toBe(true)
    })

    // ── PAYROLL ──────────────────────────────────────────────
    test('PAYROLL has full access to payroll module', () => {
        expect(hasPermission(Roles.PAYROLL, Module.PAYROLL, Action.VIEW)).toBe(true)
        expect(hasPermission(Roles.PAYROLL, Module.PAYROLL, Action.CREATE)).toBe(true)
        expect(hasPermission(Roles.PAYROLL, Module.PAYROLL, Action.UPDATE)).toBe(true)
        expect(hasPermission(Roles.PAYROLL, Module.PAYROLL, Action.DELETE)).toBe(true)
        expect(hasPermission(Roles.PAYROLL, Module.PAYROLL, Action.EXPORT)).toBe(true)
    })

    test('PAYROLL cannot access employees or teams', () => {
        expect(canAccessModule(Roles.PAYROLL, Module.EMPLOYEES)).toBe(false)
        expect(canAccessModule(Roles.PAYROLL, Module.TEAMS)).toBe(false)
    })

    test('PAYROLL cannot access recruitment or settings', () => {
        expect(canAccessModule(Roles.PAYROLL, Module.RECRUITMENT)).toBe(false)
        expect(canAccessModule(Roles.PAYROLL, Module.SETTINGS)).toBe(false)
    })

    // ── TEAM_LEAD ────────────────────────────────────────────
    test('TEAM_LEAD can review performance', () => {
        expect(hasPermission(Roles.TEAM_LEAD, Module.PERFORMANCE, Action.VIEW)).toBe(true)
        expect(hasPermission(Roles.TEAM_LEAD, Module.PERFORMANCE, Action.CREATE)).toBe(true)
        expect(hasPermission(Roles.TEAM_LEAD, Module.PERFORMANCE, Action.REVIEW)).toBe(true)
    })

    test('TEAM_LEAD cannot create employees', () => {
        expect(hasPermission(Roles.TEAM_LEAD, Module.EMPLOYEES, Action.CREATE)).toBe(false)
        expect(hasPermission(Roles.TEAM_LEAD, Module.EMPLOYEES, Action.VIEW)).toBe(true)
    })

    test('TEAM_LEAD can manage tickets', () => {
        expect(hasPermission(Roles.TEAM_LEAD, Module.TICKETS, Action.VIEW)).toBe(true)
        expect(hasPermission(Roles.TEAM_LEAD, Module.TICKETS, Action.CREATE)).toBe(true)
        expect(hasPermission(Roles.TEAM_LEAD, Module.TICKETS, Action.UPDATE)).toBe(true)
    })

    // ── EMPLOYEE ─────────────────────────────────────────────
    test('EMPLOYEE can create feedback', () => {
        expect(hasPermission(Roles.EMPLOYEE, Module.FEEDBACK, Action.VIEW)).toBe(true)
        expect(hasPermission(Roles.EMPLOYEE, Module.FEEDBACK, Action.CREATE)).toBe(true)
    })

    test('EMPLOYEE can create leaves and attendance', () => {
        expect(hasPermission(Roles.EMPLOYEE, Module.LEAVES, Action.VIEW)).toBe(true)
        expect(hasPermission(Roles.EMPLOYEE, Module.LEAVES, Action.CREATE)).toBe(true)
        expect(hasPermission(Roles.EMPLOYEE, Module.ATTENDANCE, Action.VIEW)).toBe(true)
        expect(hasPermission(Roles.EMPLOYEE, Module.ATTENDANCE, Action.CREATE)).toBe(true)
    })

    test('EMPLOYEE cannot access employees module', () => {
        expect(canAccessModule(Roles.EMPLOYEE, Module.EMPLOYEES)).toBe(false)
    })

    test('EMPLOYEE cannot access reports', () => {
        expect(canAccessModule(Roles.EMPLOYEE, Module.REPORTS)).toBe(false)
    })

    test('EMPLOYEE can submit resignation', () => {
        expect(hasPermission(Roles.EMPLOYEE, Module.RESIGNATION, Action.VIEW)).toBe(true)
        expect(hasPermission(Roles.EMPLOYEE, Module.RESIGNATION, Action.CREATE)).toBe(true)
        expect(hasPermission(Roles.EMPLOYEE, Module.RESIGNATION, Action.UPDATE)).toBe(false)
    })

    // ── getModulesForRole ────────────────────────────────────
    test('getModulesForRole returns correct modules for PAYROLL', () => {
        const modules = getModulesForRole(Roles.PAYROLL)
        expect(modules).toContain(Module.PAYROLL)
        expect(modules).toContain(Module.DASHBOARD)
        expect(modules).not.toContain(Module.EMPLOYEES)
        expect(modules).not.toContain(Module.TEAMS)
    })

    test('getModulesForRole returns empty for unknown role', () => {
        expect(getModulesForRole('UNKNOWN')).toEqual([])
    })

    // ── canAccessModule ──────────────────────────────────────
    test('canAccessModule returns false for empty permission arrays', () => {
        // PAYROLL has empty array for EMPLOYEES
        expect(canAccessModule(Roles.PAYROLL, Module.EMPLOYEES)).toBe(false)
    })

    // ── Scope Functions ──────────────────────────────────────
    describe('scopeEmployeeQuery', () => {
        const orgId = 'org-1'

        test('CEO gets org-wide scope', () => {
            const scope = scopeEmployeeQuery({ role: Roles.CEO, organizationId: orgId }, Module.EMPLOYEES)
            expect(scope).toEqual({ organizationId: orgId })
        })

        test('HR gets all except CEO records for employees', () => {
            const scope = scopeEmployeeQuery({ role: Roles.HR, organizationId: orgId }, Module.EMPLOYEES)
            expect(scope).toEqual({ organizationId: orgId, user: { role: { not: Roles.CEO } } })
        })

        test('TEAM_LEAD gets own + direct reports', () => {
            const scope = scopeEmployeeQuery({ role: Roles.TEAM_LEAD, organizationId: orgId, employeeId: 'emp-1' }, Module.EMPLOYEES)
            expect(scope).toEqual({
                organizationId: orgId,
                OR: [{ id: 'emp-1' }, { managerId: 'emp-1' }],
            })
        })

        test('EMPLOYEE gets only own record', () => {
            const scope = scopeEmployeeQuery({ role: Roles.EMPLOYEE, organizationId: orgId, employeeId: 'emp-1' }, Module.EMPLOYEES)
            expect(scope).toEqual({ organizationId: orgId, id: 'emp-1' })
        })

        test('EMPLOYEE without employeeId gets blocked', () => {
            const scope = scopeEmployeeQuery({ role: Roles.EMPLOYEE, organizationId: orgId }, Module.EMPLOYEES)
            expect(scope).toEqual({ organizationId: orgId, id: '__NONE__' })
        })

        test('PAYROLL gets blocked for employees', () => {
            const scope = scopeEmployeeQuery({ role: Roles.PAYROLL, organizationId: orgId }, Module.EMPLOYEES)
            expect(scope).toEqual({ organizationId: orgId, id: '__NONE__' })
        })

        test('PAYROLL gets full scope for payroll module', () => {
            const scope = scopeEmployeeQuery({ role: Roles.PAYROLL, organizationId: orgId }, Module.PAYROLL)
            expect(scope).toEqual({ organizationId: orgId })
        })
    })

    describe('scopeEntityQuery', () => {
        const orgId = 'org-1'

        test('CEO gets org-wide scope', () => {
            const scope = scopeEntityQuery({ role: Roles.CEO, organizationId: orgId }, Module.PAYROLL)
            expect(scope).toEqual({ organizationId: orgId })
        })

        test('EMPLOYEE gets own records only', () => {
            const scope = scopeEntityQuery({ role: Roles.EMPLOYEE, organizationId: orgId, employeeId: 'emp-1' }, Module.PAYROLL)
            expect(scope).toEqual({ organizationId: orgId, employeeId: 'emp-1' })
        })

        test('TEAM_LEAD gets own + direct reports', () => {
            const scope = scopeEntityQuery({ role: Roles.TEAM_LEAD, organizationId: orgId, employeeId: 'emp-1' }, Module.ATTENDANCE)
            expect(scope).toEqual({
                organizationId: orgId,
                employee: { OR: [{ id: 'emp-1' }, { managerId: 'emp-1' }] },
            })
        })
    })
})
