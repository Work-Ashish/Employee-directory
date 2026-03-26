import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { withAuth, type AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

const REQUIRED_BUCKETS = [
    { name: "avatars", public: true },
    { name: "documents", public: true },
    { name: "assets", public: true },
    { name: "training", public: true },
    { name: "receipts", public: true },
]

async function handlePOST(_req: Request, _context: AuthContext) {
    try {
        const results: { bucket: string; status: string; error?: string }[] = []

        // List existing buckets
        const { data: existingBuckets, error: listError } = await supabaseAdmin.storage.listBuckets()
        if (listError) {
            return NextResponse.json({
                error: `Failed to list buckets: ${listError.message}`
            }, { status: 500 })
        }

        const existingNames = new Set((existingBuckets || []).map(b => b.name))

        for (const bucket of REQUIRED_BUCKETS) {
            if (existingNames.has(bucket.name)) {
                results.push({ bucket: bucket.name, status: "already_exists" })
                continue
            }

            const { error } = await supabaseAdmin.storage.createBucket(bucket.name, {
                public: bucket.public,
                fileSizeLimit: 10 * 1024 * 1024, // 10MB
            })

            if (error) {
                results.push({ bucket: bucket.name, status: "error", error: error.message })
            } else {
                results.push({ bucket: bucket.name, status: "created" })
            }
        }

        return NextResponse.json({
            message: "Bucket initialization complete",
            results,
            existingBuckets: Array.from(existingNames),
        })
    } catch (error: any) {
        console.error("[INIT_BUCKETS_ERROR]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// GET - Check status of all required buckets
async function handleGET(_req: Request, _context: AuthContext) {
    try {
        const { data: existingBuckets, error } = await supabaseAdmin.storage.listBuckets()
        if (error) {
            return NextResponse.json({
                error: `Failed to list buckets: ${error.message}`
            }, { status: 500 })
        }

        const existingNames = new Set((existingBuckets || []).map(b => b.name))
        const bucketStatus = REQUIRED_BUCKETS.map(b => ({
            name: b.name,
            required: true,
            exists: existingNames.has(b.name),
            config: existingBuckets?.find(eb => eb.name === b.name) || null,
        }))

        const allReady = bucketStatus.every(b => b.exists)

        return NextResponse.json({
            allReady,
            buckets: bucketStatus,
            extra: (existingBuckets || [])
                .filter(b => !REQUIRED_BUCKETS.some(rb => rb.name === b.name))
                .map(b => b.name),
        })
    } catch (error: any) {
        console.error("[CHECK_BUCKETS_ERROR]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export const POST = withAuth({ module: Module.SETTINGS, action: Action.CREATE }, handlePOST)
export const GET = withAuth({ module: Module.SETTINGS, action: Action.VIEW }, handleGET)
