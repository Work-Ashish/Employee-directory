import { describe, it, expect, vi, beforeEach } from 'vitest'
import { orgFilter, withAuth, AuthContext } from './security'
import { auth } from './auth'
import { NextResponse } from 'next/server'

vi.mock('./auth', () => ({
    auth: vi.fn()
}))

vi.mock('./metrics', () => ({
    MetricsCollector: {
        recordRequest: vi.fn().mockResolvedValue(true)
    }
}))

describe('Security Utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('orgFilter', () => {
        it('should inject organizationId into an empty where clause', () => {
            const context: AuthContext = {
                requestId: 'req-1',
                userId: 'user-1',
                organizationId: 'org-1',
                role: 'ADMIN'
            }
            const result = orgFilter(context)
            expect(result.organizationId).toBe('org-1')
        })

        it('should preserve existing where conditions', () => {
            const context: AuthContext = {
                requestId: 'req-2',
                userId: 'user-2',
                organizationId: 'org-2',
                role: 'EMPLOYEE'
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
            ; (auth as any).mockResolvedValue(null)
            const handler = async () => NextResponse.json({ ok: true })
            const wrapped = withAuth('ADMIN', handler)

            const res = await wrapped(mockReq)
            expect(res.status).toBe(401)
            const json = await res.json()
            expect(json.error.code).toBe('UNAUTHORIZED')
        })

        it('should return 403 if no organizationId', async () => {
            ; (auth as any).mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } }) // missing org
            const handler = async () => NextResponse.json({ ok: true })
            const wrapped = withAuth('ADMIN', handler)

            const res = await wrapped(mockReq)
            expect(res.status).toBe(403)
            const json = await res.json()
            expect(json.error.code).toBe('FORBIDDEN')
        })

        it('should return 403 if role is forbidden', async () => {
            ; (auth as any).mockResolvedValue({ user: { id: 'u1', role: 'EMPLOYEE', organizationId: 'org-1' } })
            const handler = async () => NextResponse.json({ ok: true })
            const wrapped = withAuth('ADMIN', handler)

            const res = await wrapped(mockReq)
            expect(res.status).toBe(403)
            const json = await res.json()
            expect(json.error.message).toContain('ADMIN access required')
        })

        it('should succeed on happy path', async () => {
            ; (auth as any).mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', organizationId: 'org-1' } })
            const handler = async () => NextResponse.json({ ok: true }, { status: 200 })
            const wrapped = withAuth('ADMIN', handler)

            const res = await wrapped(mockReq)
            expect(res.status).toBe(200)
            const json = await res.json()
            expect(json.ok).toBe(true)
        })

        it('should handle internal handler errors gracefully', async () => {
            ; (auth as any).mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', organizationId: 'org-1' } })
            const handler = async () => { throw new Error('Simulated failure') }
            const wrapped = withAuth('ADMIN', handler)

            const res = await wrapped(mockReq)
            expect(res.status).toBe(500)
            const json = await res.json()
            expect(json.error.code).toBe('INTERNAL_ERROR')
        })
    })
})
