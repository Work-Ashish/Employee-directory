import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
]

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const formData = await req.formData()
        const file = formData.get("file") as File
        const bucket = formData.get("bucket") as string

        if (!file || !bucket) {
            return NextResponse.json({ error: "File and bucket are required" }, { status: 400 })
        }

        // Validate bucket name against allowed buckets
        const allowedBuckets = ["avatars", "documents", "assets", "training"]
        if (!allowedBuckets.includes(bucket)) {
            return NextResponse.json({ error: "Invalid bucket name" }, { status: 400 })
        }

        // F13 FIX: Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
                { status: 413 }
            )
        }

        // F13 FIX: Validate MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: `File type '${file.type}' is not allowed.` },
                { status: 415 }
            )
        }

        // Create a unique filename using crypto-safe random
        const fileExt = file.name.split(".").pop()?.toLowerCase() || "bin"
        const fileName = `${crypto.randomUUID()}.${fileExt}`
        const filePath = `${fileName}`

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                contentType: file.type,
                cacheControl: "3600",
                upsert: false
            })

        if (error) {
            console.error("[UPLOAD_ERROR]", error)
            return NextResponse.json({ error: "Upload failed" }, { status: 500 })
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath)

        return NextResponse.json({
            url: publicUrl,
            path: data.path,
            name: file.name,
            size: file.size,
            type: file.type
        })

    } catch (error: any) {
        console.error("[UPLOAD_API_ERROR]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
