import { expect, test, describe, beforeEach, vi } from 'vitest'

/**
 * Employee API routes are now Django proxies (Sprint 13).
 * Business logic tests live in Django (apps.employees.tests).
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

import { GET, POST } from '@/app/api/employees/route'

describe('Employee API Routes (Django Proxy)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockProxyToDjango.mockResolvedValue(
            new Response(JSON.stringify({ data: [] }), { status: 200 })
        )
    })

    test('GET proxies to Django /employees/', async () => {
        const req = new Request('http://localhost:3000/api/employees?page=1&limit=10')
        await GET(req)

        expect(mockProxyToDjango).toHaveBeenCalledTimes(1)
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/employees/')
    })

    test('POST proxies to Django /employees/', async () => {
        const req = new Request('http://localhost:3000/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName: 'Alice', lastName: 'Wonder' }),
        })
        await POST(req)

        expect(mockProxyToDjango).toHaveBeenCalledTimes(1)
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/employees/')
    })

    test('GET returns Django response as-is', async () => {
        const djangoBody = { data: [{ id: 1, name: 'John' }], meta: { total: 1 } }
        mockProxyToDjango.mockResolvedValue(
            new Response(JSON.stringify(djangoBody), { status: 200 })
        )

        const req = new Request('http://localhost:3000/api/employees')
        const res = await GET(req)
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.data).toEqual([{ id: 1, name: 'John' }])
    })

    test('POST relays Django error status', async () => {
        mockProxyToDjango.mockResolvedValue(
            new Response(JSON.stringify({ error: 'Validation failed' }), { status: 400 })
        )

        const req = new Request('http://localhost:3000/api/employees', {
            method: 'POST',
            body: JSON.stringify({}),
        })
        const res = await POST(req)

        expect(res.status).toBe(400)
    })
})
