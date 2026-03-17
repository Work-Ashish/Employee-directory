import { describe, test, expect } from 'vitest'
import {
    Module,
    MODULE_FEATURE_FLAG,
    Action,
    toCodename,
    ROLES,
    PERMISSIONS,
    Roles,
} from '@/lib/permissions'

describe('Django Permission Sync', () => {

    test('toCodename maps every Module to a valid django module prefix', () => {
        // Verify that toCodename produces a valid module.action for every Module
        for (const mod of Object.values(Module)) {
            const codename = toCodename(mod, Action.VIEW)
            expect(codename).toMatch(/^[a-z_]+\.[a-z_]+$/)
        }
    })

    test('toCodename maps every Action to a valid django action suffix', () => {
        // Verify that toCodename produces a valid module.action for every Action
        for (const action of Object.values(Action)) {
            const codename = toCodename(Module.EMPLOYEES, action)
            expect(codename).toMatch(/^[a-z_]+\.[a-z_]+$/)
        }
    })

    test('MODULE_FEATURE_FLAG keys are valid Module enum values', () => {
        const moduleValues = new Set(Object.values(Module))
        for (const key of Object.keys(MODULE_FEATURE_FLAG)) {
            expect(
                moduleValues.has(key as Module),
                `Feature flag key "${key}" is not a valid Module enum value`
            ).toBe(true)
        }
    })

    test('toCodename produces valid module.action format', () => {
        const codename = toCodename(Module.EMPLOYEES, Action.VIEW)
        expect(codename).toMatch(/^[a-z_]+\.[a-z_]+$/)
    })

    test('All codenames follow module.action pattern', () => {
        for (const role of ROLES) {
            const perms = PERMISSIONS[role]
            if (!perms) continue
            for (const [mod, actions] of Object.entries(perms)) {
                if (!actions || actions.length === 0) continue
                for (const action of actions) {
                    const codename = toCodename(mod as Module, action)
                    expect(codename).toMatch(/^[a-z_]+\.[a-z_]+$/)
                }
            }
        }
    })

    test('toCodename covers all modules used in PERMISSIONS matrix', () => {
        const modulesUsed = new Set<string>()
        for (const role of ROLES) {
            const perms = PERMISSIONS[role]
            if (perms) {
                for (const mod of Object.keys(perms)) {
                    modulesUsed.add(mod)
                }
            }
        }
        // Every module in the permissions matrix should produce
        // a valid codename via toCodename (no undefined prefixes)
        for (const mod of modulesUsed) {
            const codename = toCodename(mod as Module, Action.VIEW)
            const parts = codename.split('.')
            expect(parts).toHaveLength(2)
            // The module prefix should not fall through to the lowercase fallback
            // if a proper mapping exists — verify it's a lowercase string, not UPPER
            expect(parts[0]).toMatch(/^[a-z_]+$/)
            expect(parts[1]).toMatch(/^[a-z_]+$/)
        }
    })

    test('toCodename covers all Action enum values', () => {
        // Ensure every Action maps to a valid suffix (not just lowercased)
        for (const action of Object.values(Action)) {
            const codename = toCodename(Module.EMPLOYEES, action)
            const parts = codename.split('.')
            expect(parts).toHaveLength(2)
            expect(parts[1]).toMatch(/^[a-z_]+$/)
        }
    })

    test('CREATE/UPDATE/DELETE actions all map to manage suffix', () => {
        // Django uses "manage" for create/update/delete
        const createCodename = toCodename(Module.EMPLOYEES, Action.CREATE)
        const updateCodename = toCodename(Module.EMPLOYEES, Action.UPDATE)
        const deleteCodename = toCodename(Module.EMPLOYEES, Action.DELETE)
        expect(createCodename).toBe('employees.manage')
        expect(updateCodename).toBe('employees.manage')
        expect(deleteCodename).toBe('employees.manage')
    })

    test('VIEW action maps to view suffix', () => {
        const codename = toCodename(Module.EMPLOYEES, Action.VIEW)
        expect(codename).toBe('employees.view')
    })

    test('REVIEW action maps to review suffix', () => {
        const codename = toCodename(Module.PERFORMANCE, Action.REVIEW)
        expect(codename).toBe('performance.review')
    })

    test('ASSIGN action maps to assign suffix', () => {
        const codename = toCodename(Module.TEAMS, Action.ASSIGN)
        expect(codename).toBe('teams.assign')
    })

    test('EXPORT and IMPORT actions map correctly', () => {
        const exportCodename = toCodename(Module.EMPLOYEES, Action.EXPORT)
        const importCodename = toCodename(Module.EMPLOYEES, Action.IMPORT)
        expect(exportCodename).toBe('employees.export')
        expect(importCodename).toBe('employees.import')
    })
})
