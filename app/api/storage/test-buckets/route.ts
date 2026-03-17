import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getServerSession } from "@/lib/auth-server"

const BUCKETS_TO_TEST = ["avatars", "documents", "assets", "training", "receipts"]

export async function POST() {
    try {
        const session = await getServerSession()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const results: {
            bucket: string
            upload: boolean
            publicUrl: string | null
            download: boolean
            delete: boolean
            error?: string
        }[] = []

        for (const bucketName of BUCKETS_TO_TEST) {
            const testFileName = `_test_${Date.now()}.txt`
            const testContent = new Blob([`Test file for bucket: ${bucketName}`], { type: "text/plain" })
            let uploadOk = false
            let publicUrl: string | null = null
            let downloadOk = false
            let deleteOk = false
            let errorMsg: string | undefined

            try {
                // 1. Upload test file
                const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                    .from(bucketName)
                    .upload(testFileName, testContent, {
                        contentType: "text/plain",
                        upsert: true,
                    })

                if (uploadError) {
                    errorMsg = `Upload failed: ${uploadError.message}`
                    results.push({ bucket: bucketName, upload: false, publicUrl: null, download: false, delete: false, error: errorMsg })
                    continue
                }
                uploadOk = true

                // 2. Get public URL
                const { data: urlData } = supabaseAdmin.storage
                    .from(bucketName)
                    .getPublicUrl(testFileName)
                publicUrl = urlData.publicUrl

                // 3. Download test file
                const { data: downloadData, error: downloadError } = await supabaseAdmin.storage
                    .from(bucketName)
                    .download(testFileName)

                if (downloadError) {
                    errorMsg = `Download failed: ${downloadError.message}`
                } else {
                    downloadOk = true
                }

                // 4. Clean up - delete test file
                const { error: deleteError } = await supabaseAdmin.storage
                    .from(bucketName)
                    .remove([testFileName])

                if (deleteError) {
                    errorMsg = (errorMsg ? errorMsg + "; " : "") + `Delete failed: ${deleteError.message}`
                } else {
                    deleteOk = true
                }
            } catch (err: any) {
                errorMsg = err?.message || "Unknown error"
            }

            results.push({
                bucket: bucketName,
                upload: uploadOk,
                publicUrl,
                download: downloadOk,
                delete: deleteOk,
                error: errorMsg,
            })
        }

        const allPassed = results.every(r => r.upload && r.download && r.delete)

        return NextResponse.json({
            allPassed,
            summary: {
                total: results.length,
                passed: results.filter(r => r.upload && r.download && r.delete).length,
                failed: results.filter(r => !r.upload || !r.download || !r.delete).length,
            },
            results,
        })
    } catch (error: any) {
        console.error("[TEST_BUCKETS_ERROR]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
