import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionEmployee } from "@/lib/session-employee"

export async function POST(req: Request) {
    try {
        const employee = await getSessionEmployee()
        if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { action, reason } = await req.json() as { action: "start" | "end"; reason?: string }

        const session = await prisma.timeSession.findFirst({
            where: { employeeId: employee.id, status: { in: ["ACTIVE", "BREAK"] } }
        })
        if (!session) {
            return NextResponse.json({ error: "No active session" }, { status: 404 })
        }

        if (action === "start") {
            // Close any existing open break first
            await prisma.breakEntry.updateMany({
                where: { sessionId: session.id, endedAt: null },
                data: { endedAt: new Date() }
            })

            const breakEntry = await prisma.breakEntry.create({
                data: {
                    sessionId: session.id,
                    reason: reason || "break",
                }
            })

            await prisma.timeSession.update({
                where: { id: session.id },
                data: { status: "BREAK" }
            })

            return NextResponse.json(breakEntry, { status: 201 })
        } else {
            // End break
            const openBreak = await prisma.breakEntry.findFirst({
                where: { sessionId: session.id, endedAt: null }
            })
            if (openBreak) {
                await prisma.breakEntry.update({
                    where: { id: openBreak.id },
                    data: { endedAt: new Date() }
                })
            }

            await prisma.timeSession.update({
                where: { id: session.id },
                data: { status: "ACTIVE" }
            })

            return NextResponse.json({ message: "Break ended" })
        }
    } catch (error: any) {
        console.error("[TIME_TRACKER_BREAK]", error?.message)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
