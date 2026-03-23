import { expect, test, describe, beforeEach, vi } from 'vitest'

/**
 * Source One Performance Module — Proxy Route Tests
 *
 * Tests all 9 new proxy routes: cycles, monthly, monthly/[id],
 * monthly/[id]/sign, appraisals, appraisals/[id], appraisals/eligibility,
 * pip, pip/[id].
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

// ── Cycles ────────────────────────────────────────────────────────────

import { GET as cyclesGET, POST as cyclesPOST } from '@/app/api/performance/cycles/route'

describe('Performance Cycles Proxy', () => {
    beforeEach(() => vi.clearAllMocks())

    test('GET proxies to Django /performance/cycles/', async () => {
        const req = new Request('http://localhost:3000/api/performance/cycles')
        await cyclesGET(req)
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/performance/cycles/')
    })

    test('GET forwards query params', async () => {
        const req = new Request('http://localhost:3000/api/performance/cycles?status=ACTIVE&page=2')
        await cyclesGET(req)
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/performance/cycles/')
    })

    test('POST proxies to Django /performance/cycles/', async () => {
        const req = new Request('http://localhost:3000/api/performance/cycles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cycleType: 'MONTHLY',
                periodLabel: 'March 2026',
                periodStart: '2026-03-01',
                periodEnd: '2026-03-31',
                financialYear: '2025-26',
            }),
        })
        await cyclesPOST(req)
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/performance/cycles/')
    })

    test('relays Django 201 for created cycle', async () => {
        const body = { data: { id: 'cyc-1', cycleType: 'MONTHLY', status: 'ACTIVE' } }
        mockProxyToDjango.mockResolvedValueOnce(
            new Response(JSON.stringify(body), { status: 201 })
        )
        const req = new Request('http://localhost:3000/api/performance/cycles', {
            method: 'POST',
            body: JSON.stringify({ cycleType: 'MONTHLY' }),
        })
        const res = await cyclesPOST(req)
        expect(res.status).toBe(201)
        const json = await res.json()
        expect(json.data.id).toBe('cyc-1')
    })
})

// ── Monthly Reviews (list/create) ─────────────────────────────────────

import { GET as monthlyGET, POST as monthlyPOST } from '@/app/api/performance/monthly/route'

describe('Performance Monthly Reviews Proxy', () => {
    beforeEach(() => vi.clearAllMocks())

    test('GET proxies to Django /performance/monthly/', async () => {
        const req = new Request('http://localhost:3000/api/performance/monthly')
        await monthlyGET(req)
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/performance/monthly/')
    })

    test('GET filters by month/year', async () => {
        const req = new Request('http://localhost:3000/api/performance/monthly?review_month=3&review_year=2026')
        await monthlyGET(req)
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/performance/monthly/')
    })

    test('POST creates a monthly review', async () => {
        const payload = {
            employee: 'emp-uuid-1',
            reviewMonth: 3,
            reviewYear: 2026,
            recruiterMetrics: [
                { serialNo: 1, metric: 'No. of demands worked upon', target: 10, achieved: 8, conversionPct: 80 },
            ],
            rating: 4,
        }
        const req = new Request('http://localhost:3000/api/performance/monthly', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        await monthlyPOST(req)
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/performance/monthly/')
    })

    test('relays Django 400 for invalid data', async () => {
        mockProxyToDjango.mockResolvedValueOnce(
            new Response(JSON.stringify({ error: 'review_month is required' }), { status: 400 })
        )
        const req = new Request('http://localhost:3000/api/performance/monthly', {
            method: 'POST',
            body: JSON.stringify({}),
        })
        const res = await monthlyPOST(req)
        expect(res.status).toBe(400)
    })
})

// ── Monthly Reviews (detail) ──────────────────────────────────────────

import {
    GET as monthlyDetailGET,
    PUT as monthlyDetailPUT,
} from '@/app/api/performance/monthly/[id]/route'

describe('Performance Monthly Review Detail Proxy', () => {
    beforeEach(() => vi.clearAllMocks())

    const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    const makeParams = () => Promise.resolve({ id })

    test('GET proxies to Django /performance/monthly/:id/', async () => {
        const req = new Request(`http://localhost:3000/api/performance/monthly/${id}`)
        await monthlyDetailGET(req, { params: makeParams() })
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, `/performance/monthly/${id}/`)
    })

    test('PUT updates a monthly review', async () => {
        const req = new Request(`http://localhost:3000/api/performance/monthly/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: 5, reviewerRemarks: 'Outstanding performance' }),
        })
        await monthlyDetailPUT(req, { params: makeParams() })
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, `/performance/monthly/${id}/`)
    })

    test('relays Django 404 for missing review', async () => {
        mockProxyToDjango.mockResolvedValueOnce(
            new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
        )
        const req = new Request(`http://localhost:3000/api/performance/monthly/${id}`)
        const res = await monthlyDetailGET(req, { params: makeParams() })
        expect(res.status).toBe(404)
    })
})

// ── Monthly Review Sign ───────────────────────────────────────────────

import { POST as monthlySignPOST } from '@/app/api/performance/monthly/[id]/sign/route'

describe('Performance Monthly Review Sign Proxy', () => {
    beforeEach(() => vi.clearAllMocks())

    const id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
    const makeParams = () => Promise.resolve({ id })

    test('POST proxies sign request for employee', async () => {
        const req = new Request(`http://localhost:3000/api/performance/monthly/${id}/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'employee' }),
        })
        await monthlySignPOST(req, { params: makeParams() })
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, `/performance/monthly/${id}/sign/`)
    })

    test('POST proxies sign request for manager', async () => {
        const req = new Request(`http://localhost:3000/api/performance/monthly/${id}/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'manager' }),
        })
        await monthlySignPOST(req, { params: makeParams() })
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, `/performance/monthly/${id}/sign/`)
    })

    test('POST proxies sign request for HR', async () => {
        const req = new Request(`http://localhost:3000/api/performance/monthly/${id}/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'hr' }),
        })
        await monthlySignPOST(req, { params: makeParams() })
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, `/performance/monthly/${id}/sign/`)
    })

    test('relays Django 200 with updated timestamps', async () => {
        const body = {
            data: {
                id,
                employeeSignedAt: '2026-03-21T10:00:00Z',
                status: 'EMPLOYEE_SIGNED',
            },
        }
        mockProxyToDjango.mockResolvedValueOnce(
            new Response(JSON.stringify(body), { status: 200 })
        )
        const req = new Request(`http://localhost:3000/api/performance/monthly/${id}/sign`, {
            method: 'POST',
            body: JSON.stringify({ role: 'employee' }),
        })
        const res = await monthlySignPOST(req, { params: makeParams() })
        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.data.employeeSignedAt).toBeTruthy()
    })
})

// ── Appraisals (list/create) ──────────────────────────────────────────

import { GET as appraisalsGET, POST as appraisalsPOST } from '@/app/api/performance/appraisals/route'

describe('Performance Appraisals Proxy', () => {
    beforeEach(() => vi.clearAllMocks())

    test('GET proxies to Django /performance/appraisals/', async () => {
        const req = new Request('http://localhost:3000/api/performance/appraisals')
        await appraisalsGET(req)
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/performance/appraisals/')
    })

    test('GET filters by review type', async () => {
        const req = new Request('http://localhost:3000/api/performance/appraisals?review_type=ANNUAL')
        await appraisalsGET(req)
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/performance/appraisals/')
    })

    test('POST creates an annual appraisal', async () => {
        const payload = {
            employee: 'emp-uuid-2',
            reviewType: 'ANNUAL',
            reviewPeriod: 'April 2025 - March 2026',
            financialYear: '2025-26',
            overallRating: 4,
        }
        const req = new Request('http://localhost:3000/api/performance/appraisals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        await appraisalsPOST(req)
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/performance/appraisals/')
    })

    test('POST creates a six-monthly appraisal', async () => {
        const payload = {
            employee: 'emp-uuid-3',
            reviewType: 'SIX_MONTHLY',
            reviewPeriod: 'April - September 2025',
            financialYear: '2025-26',
        }
        const req = new Request('http://localhost:3000/api/performance/appraisals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        await appraisalsPOST(req)
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/performance/appraisals/')
    })

    test('relays Django 403 for unauthorized access', async () => {
        mockProxyToDjango.mockResolvedValueOnce(
            new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
        )
        const req = new Request('http://localhost:3000/api/performance/appraisals')
        const res = await appraisalsGET(req)
        expect(res.status).toBe(403)
    })
})

// ── Appraisals (detail) ──────────────────────────────────────────────

import {
    GET as appraisalDetailGET,
    PUT as appraisalDetailPUT,
} from '@/app/api/performance/appraisals/[id]/route'

describe('Performance Appraisal Detail Proxy', () => {
    beforeEach(() => vi.clearAllMocks())

    const id = 'c3d4e5f6-a7b8-9012-cdef-123456789012'
    const makeParams = () => Promise.resolve({ id })

    test('GET proxies to Django /performance/appraisals/:id/', async () => {
        const req = new Request(`http://localhost:3000/api/performance/appraisals/${id}`)
        await appraisalDetailGET(req, { params: makeParams() })
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, `/performance/appraisals/${id}/`)
    })

    test('PUT updates an appraisal with competencies', async () => {
        const payload = {
            overallRating: 5,
            keyStrengths: 'Excellent recruiter performance',
            developmentAreas: 'Leadership skills',
            goalsNextPeriod: 'Mentor 2 junior recruiters',
            recruiterCompetencies: [
                { name: 'Sourcing & Pipeline Building', selfScore: 4, managerScore: 5 },
            ],
        }
        const req = new Request(`http://localhost:3000/api/performance/appraisals/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        await appraisalDetailPUT(req, { params: makeParams() })
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, `/performance/appraisals/${id}/`)
    })

    test('relays Django 404 for missing appraisal', async () => {
        mockProxyToDjango.mockResolvedValueOnce(
            new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
        )
        const req = new Request(`http://localhost:3000/api/performance/appraisals/${id}`)
        const res = await appraisalDetailGET(req, { params: makeParams() })
        expect(res.status).toBe(404)
    })
})

// ── Appraisals Eligibility ────────────────────────────────────────────

import { GET as eligibilityGET } from '@/app/api/performance/appraisals/eligibility/route'

describe('Performance Appraisal Eligibility Proxy', () => {
    beforeEach(() => vi.clearAllMocks())

    test('GET proxies eligibility check to Django', async () => {
        const req = new Request('http://localhost:3000/api/performance/appraisals/eligibility?financial_year=2025-26')
        await eligibilityGET(req)
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/performance/appraisals/eligibility/')
    })

    test('returns eligibility results', async () => {
        const body = {
            data: [
                { employeeId: 'emp-1', employeeName: 'John Doe', eligible: true, reason: 'Met all criteria' },
                { employeeId: 'emp-2', employeeName: 'Jane Smith', eligible: false, reason: 'Less than 4 months rated 4+' },
            ],
        }
        mockProxyToDjango.mockResolvedValueOnce(
            new Response(JSON.stringify(body), { status: 200 })
        )
        const req = new Request('http://localhost:3000/api/performance/appraisals/eligibility?financial_year=2025-26')
        const res = await eligibilityGET(req)
        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.data).toHaveLength(2)
        expect(json.data[0].eligible).toBe(true)
        expect(json.data[1].eligible).toBe(false)
    })
})

// ── PIPs (list/create) ────────────────────────────────────────────────

import { GET as pipGET, POST as pipPOST } from '@/app/api/performance/pip/route'

describe('Performance PIP Proxy', () => {
    beforeEach(() => vi.clearAllMocks())

    test('GET proxies to Django /performance/pip/', async () => {
        const req = new Request('http://localhost:3000/api/performance/pip')
        await pipGET(req)
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/performance/pip/')
    })

    test('GET filters by status', async () => {
        const req = new Request('http://localhost:3000/api/performance/pip?status=ACTIVE')
        await pipGET(req)
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/performance/pip/')
    })

    test('POST creates a 60-day PIP', async () => {
        const payload = {
            employee: 'emp-uuid-4',
            pipType: 'SIXTY_DAY',
            startDate: '2026-03-21',
            endDate: '2026-05-20',
            specificTargets: [
                { target: 'Achieve 5 placements per month', deadline: '2026-04-30' },
            ],
        }
        const req = new Request('http://localhost:3000/api/performance/pip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        await pipPOST(req)
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/performance/pip/')
    })

    test('POST creates a 90-day PIP', async () => {
        const payload = {
            employee: 'emp-uuid-5',
            pipType: 'NINETY_DAY',
            startDate: '2026-03-21',
            endDate: '2026-06-19',
            specificTargets: [
                { target: 'Improve client satisfaction to 85%+', deadline: '2026-06-01' },
            ],
        }
        const req = new Request('http://localhost:3000/api/performance/pip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        await pipPOST(req)
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, '/performance/pip/')
    })

    test('relays Django 201 for created PIP', async () => {
        const body = { data: { id: 'pip-1', pipType: 'SIXTY_DAY', status: 'ACTIVE' } }
        mockProxyToDjango.mockResolvedValueOnce(
            new Response(JSON.stringify(body), { status: 201 })
        )
        const req = new Request('http://localhost:3000/api/performance/pip', {
            method: 'POST',
            body: JSON.stringify({ employee: 'emp-1', pipType: 'SIXTY_DAY' }),
        })
        const res = await pipPOST(req)
        expect(res.status).toBe(201)
        const json = await res.json()
        expect(json.data.pipType).toBe('SIXTY_DAY')
    })
})

// ── PIP Detail ────────────────────────────────────────────────────────

import {
    GET as pipDetailGET,
    PUT as pipDetailPUT,
} from '@/app/api/performance/pip/[id]/route'

describe('Performance PIP Detail Proxy', () => {
    beforeEach(() => vi.clearAllMocks())

    const id = 'd4e5f6a7-b8c9-0123-def0-123456789abc'
    const makeParams = () => Promise.resolve({ id })

    test('GET proxies to Django /performance/pip/:id/', async () => {
        const req = new Request(`http://localhost:3000/api/performance/pip/${id}`)
        await pipDetailGET(req, { params: makeParams() })
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, `/performance/pip/${id}/`)
    })

    test('PUT updates PIP with weekly checkin', async () => {
        const payload = {
            weeklyCheckins: [
                { week: 1, date: '2026-03-28', notes: 'On track with targets', progressPct: 25 },
            ],
        }
        const req = new Request(`http://localhost:3000/api/performance/pip/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        await pipDetailPUT(req, { params: makeParams() })
        expect(mockProxyToDjango).toHaveBeenCalledWith(req, `/performance/pip/${id}/`)
    })

    test('PUT updates PIP status to completed', async () => {
        const body = { data: { id, status: 'COMPLETED', outcome: 'IMPROVED' } }
        mockProxyToDjango.mockResolvedValueOnce(
            new Response(JSON.stringify(body), { status: 200 })
        )
        const req = new Request(`http://localhost:3000/api/performance/pip/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'COMPLETED', outcome: 'IMPROVED' }),
        })
        const res = await pipDetailPUT(req, { params: makeParams() })
        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.data.outcome).toBe('IMPROVED')
    })

    test('relays Django 404 for missing PIP', async () => {
        mockProxyToDjango.mockResolvedValueOnce(
            new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
        )
        const req = new Request(`http://localhost:3000/api/performance/pip/${id}`)
        const res = await pipDetailGET(req, { params: makeParams() })
        expect(res.status).toBe(404)
    })
})

// ── Cross-cutting: Error propagation ──────────────────────────────────

describe('Source One Performance — Error Propagation', () => {
    beforeEach(() => vi.clearAllMocks())

    test('relays 500 from Django without modification', async () => {
        mockProxyToDjango.mockResolvedValueOnce(
            new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
        )
        const req = new Request('http://localhost:3000/api/performance/monthly')
        const res = await monthlyGET(req)
        expect(res.status).toBe(500)
    })

    test('relays 422 validation error', async () => {
        const errorBody = {
            error: 'Validation failed',
            details: { rating: ['Must be between 1 and 5'] },
        }
        mockProxyToDjango.mockResolvedValueOnce(
            new Response(JSON.stringify(errorBody), { status: 422 })
        )
        const req = new Request('http://localhost:3000/api/performance/monthly', {
            method: 'POST',
            body: JSON.stringify({ rating: 6 }),
        })
        const res = await monthlyPOST(req)
        expect(res.status).toBe(422)
        const json = await res.json()
        expect(json.details.rating).toBeDefined()
    })
})
