import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// POST /api/training/enroll – Enroll in a training or update completion
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { trainingId, employeeId, completed, score } = body

        if (!trainingId || !employeeId) {
            return NextResponse.json({ error: "trainingId and employeeId required" }, { status: 400 })
        }

        const enrollment = await prisma.trainingEnrollment.upsert({
            where: {
                trainingId_employeeId: { trainingId, employeeId }
            },
            update: {
                completed: completed ?? undefined,
                score: score ?? undefined
            },
            create: {
                trainingId,
                employeeId,
                organizationId: session.user.organizationId,
                completed: completed ?? false,
                score: score ?? null
            }
        })

        return NextResponse.json(enrollment)
    } catch (error) {
        console.error("[TRAINING_ENROLL_POST]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
