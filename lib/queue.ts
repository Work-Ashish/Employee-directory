import { redis } from "./redis"
import crypto from "node:crypto"

export interface JobPayload {
    id: string
    type: "ATTENDANCE_IMPORT" | "PF_IMPORT" | "EMPLOYEE_IMPORT" | "WEBHOOK_DELIVERY" | "AGENT_REPORT_GENERATE" | "AGENT_AGGREGATE"
    data: unknown
    createdAt: number
    attempts: number
    maxRetries: number
}

const QUEUE_KEY = "EMS:JOB_QUEUE"
const DLQ_KEY = "EMS:DLQ"

export const queue = {
    /**
     * Enqueues a single job payload onto the Redis list securely.
     */
    async enqueue(type: JobPayload["type"], data: unknown): Promise<string> {
        const id = `job_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
        const payload: JobPayload = {
            id,
            type,
            data,
            createdAt: Date.now(),
            attempts: 0,
            maxRetries: 3
        }

        // Pushing to the end of the list (FIFO queue)
        // If redisClient is available (Upstash), this uses LPUSH.
        // Wait, our `lib/redis` wrapper only supports set/get/incr/expire.
        return await this._fallbackLpush(payload)
    },

    /**
     * Fallback List manipulation using raw Redis methods or in-memory arrays since `lib/redis` is minimal.
     * We will map a dynamic index to act as a list.
     */
    async _fallbackLpush(payload: JobPayload) {
        // Since `lib/redis` didn't implement lpush/rpop, let's implement a safe Redis-based queue
        // We increment a "head_index", then SET that key.
        const head = await redis.incr(`${QUEUE_KEY}:HEAD`)
        await redis.set(`${QUEUE_KEY}:ITEM:${head}`, JSON.stringify(payload))
        return payload.id
    },

    /**
     * Dequeues (pops) the oldest job payload from the queue.
     */
    async dequeue(): Promise<JobPayload | null> {
        // We increment a "tail_index" to find the oldest unread job.
        // Atomic dequeue: increment tail first to claim a slot
        const tail = await redis.incr(QUEUE_KEY + ":TAIL_INCR")

        const headIncrStr = (await redis.get(QUEUE_KEY + ":HEAD")) as string | null
        const head = parseInt(headIncrStr || "0", 10)

        if (tail > head) {
            return null // Queue is empty
        }

        const itemStr = (await redis.get(QUEUE_KEY + ":ITEM:" + tail)) as string | null
        if (!itemStr) {
            return null
        }

        // Cleanup the item key
        await redis.set(QUEUE_KEY + ":ITEM:" + tail, "", { ex: 1 })

        try {
            return JSON.parse(itemStr) as JobPayload
        } catch {
            return null
        }
    },

    /**
     * Re-enqueues a failed job with an incremented attempt counter.
     * If attempts have reached maxRetries, the job is moved to the DLQ instead.
     * @returns true if re-enqueued, false if moved to DLQ
     */
    async requeueWithRetry(job: JobPayload): Promise<boolean> {
        const updated: JobPayload = { ...job, attempts: (job.attempts ?? 0) + 1 }

        if (updated.attempts >= (updated.maxRetries ?? 3)) {
            await this.moveToDLQ(updated)
            return false
        }

        await this._fallbackLpush(updated)
        return true
    },

    /**
     * Moves a job to the dead-letter queue for later inspection.
     */
    async moveToDLQ(job: JobPayload): Promise<void> {
        const index = await redis.incr(`${DLQ_KEY}:HEAD`)
        await redis.set(`${DLQ_KEY}:ITEM:${index}`, JSON.stringify(job))
    },

    /**
     * Returns the number of items currently in the dead-letter queue.
     */
    async getDLQSize(): Promise<number> {
        const headStr = (await redis.get(`${DLQ_KEY}:HEAD`)) as string | null
        return parseInt(headStr || "0", 10)
    },

    /**
     * Returns up to `limit` items from the DLQ for inspection (most recent first).
     * Does NOT remove items from the DLQ.
     */
    async peekDLQ(limit = 10): Promise<JobPayload[]> {
        const head = await this.getDLQSize()
        if (head === 0) return []

        const start = Math.max(1, head - limit + 1)
        const results: JobPayload[] = []

        for (let i = head; i >= start; i--) {
            const itemStr = (await redis.get(`${DLQ_KEY}:ITEM:${i}`)) as string | null
            if (!itemStr) continue
            try {
                results.push(JSON.parse(itemStr) as JobPayload)
            } catch {
                // skip malformed entries
            }
        }

        return results
    }
}
