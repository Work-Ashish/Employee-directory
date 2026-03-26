import { Redis } from "@upstash/redis"

// We create a flexible Redis wrapper. 
// If Upstash credentials are provided, we use Upstash Redis (ideal for Vercel/Serverless).
// If they are missing, we gracefully fall back to an in-memory implementation to avoid crashing the local dev environment.

let redisClient: Redis | null = null

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

if (upstashUrl && upstashToken) {
    redisClient = new Redis({
        url: upstashUrl,
        token: upstashToken,
    })
    console.log("[Redis] Using Upstash Redis for distributed state.")
} else {
    console.warn("[Redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing. Falling back to in-memory mock Redis.")
}

// In-memory fallback
const inMemoryStore = new Map<string, { value: unknown; expiresAt: number }>()

// Periodically sweep expired keys from the in-memory fallback store
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now()
        for (const [key, entry] of inMemoryStore.entries()) {
            if (entry.expiresAt <= now) inMemoryStore.delete(key)
        }
    }, 60_000)
}

export const redis = {
    async set(key: string, value: unknown, config?: { ex?: number }) {
        if (redisClient) {
            if (config?.ex !== undefined) {
                return await redisClient.set(key, value, { ex: config.ex })
            }
            return await redisClient.set(key, value)
        }

        let expiresAt = Infinity
        if (config?.ex !== undefined) {
            expiresAt = Date.now() + config.ex * 1000
        }
        inMemoryStore.set(key, { value, expiresAt })
        return "OK"
    },

    async get(key: string): Promise<unknown> {
        if (redisClient) {
            return await redisClient.get(key)
        }

        const entry = inMemoryStore.get(key)
        if (!entry) return null
        if (Date.now() > entry.expiresAt) {
            inMemoryStore.delete(key)
            return null
        }
        return entry.value
    },

    async incr(key: string): Promise<number> {
        if (redisClient) {
            return await redisClient.incr(key)
        }

        const entry = inMemoryStore.get(key)
        if (entry && Date.now() > entry.expiresAt) {
            inMemoryStore.delete(key)
        }

        const current = inMemoryStore.get(key)
        const newValue = (current ? Number(current.value) || 0 : 0) + 1

        inMemoryStore.set(key, {
            value: newValue,
            expiresAt: current ? current.expiresAt : Infinity
        })
        return newValue
    },

    async expire(key: string, seconds: number) {
        if (redisClient) {
            return await redisClient.expire(key, seconds)
        }

        const entry = inMemoryStore.get(key)
        if (entry) {
            entry.expiresAt = Date.now() + seconds * 1000
            inMemoryStore.set(key, entry)
            return 1
        }
        return 0
    }
}
