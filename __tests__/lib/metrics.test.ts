import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MetricsCollector } from '@/lib/metrics'
import { redis } from '@/lib/redis'

vi.mock('@/lib/redis', () => ({
    redis: {
        incr: vi.fn().mockResolvedValue(1),
        get: vi.fn(),
        set: vi.fn().mockResolvedValue('OK'),
        expire: vi.fn().mockResolvedValue(1),
    }
}))

// Mock global fetch for Django API calls
const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: { id: 'alert-1' } }),
})
vi.stubGlobal('fetch', mockFetch)

describe('MetricsCollector', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ data: { id: 'alert-1' } }),
        })
    })

    describe('recordRequest', () => {
        it('should record successfully for a 200 OK request', async () => {
            await MetricsCollector.recordRequest({
                path: '/api/test',
                method: 'GET',
                status: 200,
                latencyMs: 150
            })

            expect(redis.incr).toHaveBeenCalledWith(expect.stringContaining('total_hits'))
            expect(redis.incr).toHaveBeenCalledWith(expect.stringContaining('status:2xx'))
            expect(redis.incr).toHaveBeenCalledWith(expect.stringContaining('path:/api/test:hits'))
        })

        it('should create an admin alert via Django API when 5xx errors exceed threshold', async () => {
            // Mock redis to return count = 5 for triggering logic
            ;(redis.incr as any).mockImplementation((key: string) => {
                if (key.includes('errors')) return Promise.resolve(5)
                return Promise.resolve(1)
            })

            // Mock to ensure no existing alert inhibit
            ;(redis.get as any).mockResolvedValue(null)

            await MetricsCollector.recordRequest({
                path: '/api/critical',
                method: 'POST',
                status: 500,
                latencyMs: 200,
                organizationId: 'org-1'
            })

            // Verify Django API was called to create alert
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/admin/alerts/'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('org-1'),
                })
            )
            expect(redis.set).toHaveBeenCalledWith(expect.stringContaining('alert_inhibited'), true, { ex: 14400 })
        })

        it('should skip creating admin alert when inhibited', async () => {
            ;(redis.incr as any).mockResolvedValue(5)
            // Mock to return true for existing alert inhibit
            ;(redis.get as any).mockResolvedValue(true)

            await MetricsCollector.recordRequest({
                path: '/api/inhibited',
                method: 'GET',
                status: 500,
                latencyMs: 100,
                organizationId: 'org-2'
            })

            // Django alert API should NOT have been called
            expect(mockFetch).not.toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/admin/alerts/'),
                expect.anything()
            )
        })

        it('should log a warning for slow requests', async () => {
            await MetricsCollector.recordRequest({
                path: '/api/slow',
                method: 'GET',
                status: 200,
                latencyMs: 6000,
                organizationId: 'org-1'
            })
            expect(redis.incr).toHaveBeenCalled()
        })

        it('should fail silently on error', async () => {
            ;(redis.incr as any).mockRejectedValue(new Error('Redis is down'))
            // Should not throw
            await expect(MetricsCollector.recordRequest({
                path: '/api/fail',
                method: 'GET',
                status: 200,
                latencyMs: 100
            })).resolves.not.toThrow()
        })
    })

    describe('getDailyStats', () => {
        it('should aggregate metrics', async () => {
            ;(redis.get as any).mockImplementation((key: string) => {
                if (key.includes('total_hits')) return Promise.resolve('100')
                if (key.includes('status:2xx')) return Promise.resolve('90')
                if (key.includes('status:4xx')) return Promise.resolve('5')
                if (key.includes('status:5xx')) return Promise.resolve('5')
                if (key.includes('latency_sum')) return Promise.resolve('1500')
                if (key.includes('latency_count')) return Promise.resolve('100')
                return Promise.resolve(null)
            })

            const stats = await MetricsCollector.getDailyStats('2023-10-10')
            expect(stats.totalHits).toBe(100)
            expect(stats.statusDistribution['2xx']).toBe(90)
            expect(stats.averageLatency).toBe(15)
        })
    })
})
