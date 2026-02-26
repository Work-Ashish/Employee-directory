import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import * as dotenv from 'dotenv'

// Load environment variables for scripts that import this file outside of Next.js
dotenv.config()

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

function createPrismaClient() {
    // Make sure we throw an error if DATABASE_URL is somehow missing
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        throw new Error("DATABASE_URL is not set!")
    }

    const pool = new Pool({
        connectionString,
        max: 3,                        // Limit per serverless instance (prevents pool exhaustion)
        idleTimeoutMillis: 10000,      // Release idle connections after 10s
        connectionTimeoutMillis: 5000, // Fail fast if pool is exhausted
    })
    const adapter = new PrismaPg(pool)

    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

