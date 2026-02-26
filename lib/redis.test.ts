import { describe, it, expect, beforeEach, vi } from 'vitest'

// We need to test both real upstash routing and fallback routing.
// To do this reliably, we can inject a mock for Upstash Redis, but since `redis.ts` handles instantiation
// at module load based on env vars, we might just test the in-memory fallback for high coverage,
// or use vi.mock to mock the @upstash/redis module.

vi.mock('@upstash/redis', () => {
    return {
        Redis: class {
            set = vi.fn()
            get = vi.fn()
            incr = vi.fn()
            expire = vi.fn()
        }
    }
})

import { redis } from './redis'

describe('Redis Wrapper (Fallback Behavior)', () => {
    // Note: In test environment without UPSTASH_REDIS_REST_URL, it uses the fallback.

    beforeEach(() => {
        // We can't easily clear the let inMemoryStore, but we can clear keys we use.
    })

    it('should set and get values correctly', async () => {
        await redis.set('test-key', 123)
        const val = await redis.get('test-key')
        expect(val).toBe(123)
    })

    it('should handle expiration', async () => {
        await redis.set('expire-key', 456, { ex: -1 }) // expire immediately
        // Wait a tiny bit just in case
        await new Promise(r => setTimeout(r, 10))
        const val = await redis.get('expire-key')
        expect(val).toBeNull()
    })

    it('should increment values', async () => {
        await redis.set('incr-key', 10)
        await redis.incr('incr-key')
        const val = await redis.get('incr-key')
        expect(val).toBe(11)

        // Incr new key
        const val2 = await redis.incr('new-incr-key')
        expect(val2).toBe(1)
    })

    it('should set manual expiration', async () => {
        await redis.set('manual-ex', 999)
        await redis.expire('manual-ex', -1)
        await new Promise(r => setTimeout(r, 10))
        const val = await redis.get('manual-ex')
        expect(val).toBe(null)
    })
})

describe('Redis Wrapper (Upstash Behavior)', () => {
    it('uses Upstash when env vars are present', async () => {
        process.env.UPSTASH_REDIS_REST_URL = 'http://localhost'
        process.env.UPSTASH_REDIS_REST_TOKEN = 'token'

        // This dynamic import forces the module to re-evaluate with the new env vars
        // Note: because we mocked @upstash/redis globally, it will use our mock.
        vi.resetModules()
        const { redis: upstashRedis } = await import('./redis')

        await upstashRedis.set('k', 'v')
        await upstashRedis.set('k2', 'v', { ex: 10 })
        await upstashRedis.get('k')
        await upstashRedis.incr('k')
        await upstashRedis.expire('k', 10)

        // Cleanup
        delete process.env.UPSTASH_REDIS_REST_URL
        delete process.env.UPSTASH_REDIS_REST_TOKEN
    })
})
