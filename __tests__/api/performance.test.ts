import { expect, test, describe, beforeEach, vi } from 'vitest'

/**
 * Performance API routes are now Django proxies (Sprint 13).
 * Business logic tests live in Django (apps.performance.tests).
 * These tests verify the proxy wiring is correct.
 */

const mockProxyToDjango = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ data: [] }), { status: 200 })
)
vi.mock('@/lib/django-proxy', () => ({
    proxyToDjango: (...args: unknown[]) => mockProxyToDjango(...args),
}))
vi.mock('@/lib/route-deprecation', () => ({
    deprecatedRoute: vi.fn(),
}))

import { GET, POST } from '@/app/api/performance/route'

describe('Performance API Routes (Django Proxy)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockProxyToDjango.mockResolvedValue(
            new Response(JSON.stringify({ data: [] }), { status: 200 })
        )
    })

    test('GET proxies to Django /performance/', async () => {
        const req = new Request('http://localhost:3000/api/performance?period=2026-03')
        await GET(req)

        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/performance/')
    })

    test('POST proxies to Django /performance/', async () => {
        const req = new Request('http://localhost:3000/api/performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: 'emp-1', rating: 4 }),
        })
        await POST(req)

        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/performance/')
    })

    test('relays Django 201 response for created reviews', async () => {
        const body = { data: { id: 'rev-1', rating: 4, status: 'COMPLETED' } }
        mockProxyToDjango.mockResolvedValue(
            new Response(JSON.stringify(body), { status: 201 })
        )

        const req = new Request('http://localhost:3000/api/performance', {
            method: 'POST',
            body: JSON.stringify({ employeeId: 'emp-1', rating: 4 }),
        })
        const res = await POST(req)

        expect(res.status).toBe(201)
        const json = await res.json()
        expect(json.data.id).toBe('rev-1')
    })

    test('relays Django 403 for unauthorized access', async () => {
        mockProxyToDjango.mockResolvedValue(
            new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
        )

        const req = new Request('http://localhost:3000/api/performance')
        const res = await GET(req)

        expect(res.status).toBe(403)
    })
})
