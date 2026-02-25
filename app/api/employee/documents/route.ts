import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { supabase } from "@/lib/supabase"
import { getSessionEmployee } from "@/lib/session-employee"

export async function POST(req: Request) {
    try {
        const employee = await getSessionEmployee()
        if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const formData = await req.formData()
        const file = formData.get("file") as File
        const docType = formData.get("docType") as string // "aadhaar" | "pan" | "bank_proof"

        if (!file) return NextResponse.json({ error: "File is required" }, { status: 400 })
        if (!docType) return NextResponse.json({ error: "Document type is required" }, { status: 400 })

        const allowedTypes = ["aadhaar", "pan", "bank_proof"]
        if (!allowedTypes.includes(docType)) {
            return NextResponse.json({ error: "Invalid document type" }, { status: 400 })
        }

        // Validate file type (PDF, JPG, PNG only)
        const allowedMimes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
        if (!allowedMimes.includes(file.type)) {
            return NextResponse.json({ error: "Only PDF, JPG, and PNG files are allowed" }, { status: 400 })
        }

        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "File size must be under 5MB" }, { status: 400 })
        }

        const titleMap: Record<string, string> = {
            aadhaar: "Aadhaar Card",
            pan: "PAN Card",
            bank_proof: "Bank Proof",
        }

        // Upload to Supabase Storage
        const fileExt = file.name.split(".").pop()
        const fileName = `${employee.id}/${docType}-${Date.now()}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("documents")
            .upload(fileName, file, {
                contentType: file.type,
                cacheControl: "3600",
                upsert: true,
            })

        if (uploadError) {
            console.error("[DOC_UPLOAD_ERROR]", uploadError)
            return NextResponse.json({ error: uploadError.message }, { status: 500 })
        }

        const { data: { publicUrl } } = supabase.storage
            .from("documents")
            .getPublicUrl(fileName)

        // Delete old document of same type if exists
        const existing = await prisma.document.findFirst({
            where: {
                employeeId: employee.id,
                title: titleMap[docType],
            }
        })
        if (existing) {
            await prisma.document.delete({ where: { id: existing.id } })
        }

        // Save to DB
        const doc = await prisma.document.create({
            data: {
                title: titleMap[docType],
                category: "IDENTIFICATION",
                url: publicUrl,
                size: `${(file.size / 1024).toFixed(0)} KB`,
                employeeId: employee.id,
            }
        })

        return NextResponse.json(doc, { status: 201 })
    } catch (error: any) {
        console.error("[DOC_UPLOAD_API_ERROR]", error?.message)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        const employee = await getSessionEmployee()
        if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const docs = await prisma.document.findMany({
            where: {
                employeeId: employee.id,
                title: { in: ["Aadhaar Card", "PAN Card", "Bank Proof"] },
            },
            orderBy: { uploadDate: "desc" },
        })

        // Map to a keyed object for easy frontend lookup
        const result: Record<string, any> = {}
        for (const doc of docs) {
            const key = doc.title === "Aadhaar Card" ? "aadhaar" : doc.title === "PAN Card" ? "pan" : "bank_proof"
            if (!result[key]) result[key] = doc
        }

        return NextResponse.json(result)
    } catch (error: any) {
        console.error("[DOC_GET_ERROR]", error?.message)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const employee = await getSessionEmployee()
        if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const docId = searchParams.get("id")
        if (!docId) return NextResponse.json({ error: "Document ID required" }, { status: 400 })

        const doc = await prisma.document.findFirst({
            where: { id: docId, employeeId: employee.id }
        })
        if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

        await prisma.document.delete({ where: { id: docId } })
        return NextResponse.json({ message: "Deleted" })
    } catch (error: any) {
        console.error("[DOC_DELETE_ERROR]", error?.message)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
