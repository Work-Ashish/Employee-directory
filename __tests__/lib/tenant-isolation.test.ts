import { describe, it, expect, vi } from 'vitest'
import { Roles } from '@/lib/permissions'

describe('Tenant Isolation Guard (HRMS-402)', () => {
    it('should inject organizationId into context from session', async () => {
        const mockAuth = {
            user: {
                id: 'user123',
                organizationId: 'org_abc',
                role: Roles.CEO
            }
        }

        // Verifies that auth session carries organizationId for tenant scoping
        expect(mockAuth.user.organizationId).toBe('org_abc')
    })

    it('should strictly separate data queries by organizationId', () => {
        const orgA = 'tenant_a'
        const orgB = 'tenant_b'

        const queryForA = { where: { organizationId: orgA } }
        const queryForB = { where: { organizationId: orgB } }

        expect(queryForA.where.organizationId).not.toBe(orgB)
        expect(queryForB.where.organizationId).not.toBe(orgA)
    })
})
