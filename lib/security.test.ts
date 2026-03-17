import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only (imported transitively by auth-server and permissions-server)
vi.mock('server-only', () => ({}))

// Mock auth-server (Sprint 12 replacement for NextAuth auth())
// vi.hoisted() ensures the variable is available when vi.mock is hoisted
const { mockGetServerSession } = vi.hoisted(() => ({
    mockGetServerSession: vi.fn(),
}))
vi.mock('./auth-server', () => ({
    getServerSession: mockGetServerSession,
}))

// Mock permissions-server (imports server-only + prisma + redis)
vi.mock('./permissions-server', () => ({
    hasFunctionalPermission: vi.fn().mockResolvedValue(false),
    capabilitiesToRecord: vi.fn().mockReturnValue({}),
}))

vi.mock('./metrics', () => ({
    MetricsCollector: {
        recordRequest: vi.fn().mockResolvedValue(true)
    }
}))

vi.mock('./logger', () => ({
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
    logContext: {
        run: vi.fn((_ctx: unknown, fn: () => unknown) => fn()),
        getStore: vi.fn().mockReturnValue(undefined),
    },
}))

import { orgFilter, withAuth, AuthContext } from './security'
import { NextResponse } from 'next/server'
import { Roles } from '@/lib/permissions'

describe('Security Utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('orgFilter', () => {
        it('should inject organizationId into an empty where clause', () => {
            const mockAdminCtx: AuthContext = {
                requestId: 'req-1',
                userId: 'user-1',
                organizationId: 'org-1',
                role: Roles.CEO,
                params: {},
            }
            const result = orgFilter(mockAdminCtx)
            expect(result.organizationId).toBe('org-1')
        })

        it('should preserve existing where conditions', () => {
            const context: AuthContext = {
                requestId: 'req-2',
                userId: 'user-2',
                organizationId: 'org-2',
                role: Roles.EMPLOYEE,
                params: {},
            }
            const existing: Record<string, unknown> = { status: 'ACTIVE' }
            const result = orgFilter(context, existing)
            expect((result as any).status).toBe('ACTIVE')
            expect(result.organizationId).toBe('org-2')
        })
    })

    describe('withAuth', () => {
        const mockReq = new Request('http://localhost:3000/api/test')

        it('should return 401 if unauthenticated', async () => {
            mockGetServerSession.mockResolvedValue(null)
            const handler = async () => NextResponse.json({ ok: true })
            const wrapped = withAuth(Roles.CEO, handler)

            const res = await wrapped(mockReq)
            expect(res.status).toBe(401)
            const json = await res.json()
            expect(json.error.code).toBe('UNAUTHORIZED')
        })

        it('should return 403 if no organizationId', async () => {
            mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: Roles.CEO } }) // missing org
            const handler = async () => NextResponse.json({ ok: true })
            const wrapped = withAuth(Roles.CEO, handler)

            const res = await wrapped(mockReq)
            expect(res.status).toBe(403)
            const json = await res.json()
            expect(json.error.code).toBe('FORBIDDEN')
        })

        it('should return 403 if role is forbidden', async () => {
            mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: Roles.EMPLOYEE, organizationId: 'org-1' } })
            const handler = async () => NextResponse.json({ ok: true })
            const wrapped = withAuth(Roles.CEO, handler)

            const res = await wrapped(mockReq)
            expect(res.status).toBe(403)
            const json = await res.json()
            expect(json.error.code).toBe('FORBIDDEN')
            expect(json.error.message).toContain('does not have access')
        })

        it('should succeed on happy path', async () => {
            mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: Roles.CEO, organizationId: 'org-1' } })
            const handler = async () => NextResponse.json({ ok: true }, { status: 200 })
            const wrapped = withAuth(Roles.CEO, handler)

            const res = await wrapped(mockReq)
            expect(res.status).toBe(200)
            const json = await res.json()
            expect(json.ok).toBe(true)
        })

        it('should handle internal handler errors gracefully', async () => {
            mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: Roles.CEO, organizationId: 'org-1' } })
            const handler = async () => { throw new Error('Simulated failure') }
            const wrapped = withAuth(Roles.CEO, handler)

            const res = await wrapped(mockReq)
            expect(res.status).toBe(500)
            const json = await res.json()
            expect(json.error.code).toBe('INTERNAL_ERROR')
        })
    })
})
