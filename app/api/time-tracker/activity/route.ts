import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionEmployee } from "@/lib/session-employee"

export async function POST(req: Request) {
    try {
        const employee = await getSessionEmployee()
        if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { appName, windowTitle, url, domain, category } = await req.json()

        const session = await prisma.timeSession.findFirst({
            where: { employeeId: employee.id, status: { in: ["ACTIVE", "BREAK"] } }
        })
        if (!session) {
            return NextResponse.json({ error: "No active session" }, { status: 404 })
        }

        // Close the previous activity if same session
        const lastActivity = await prisma.activityLog.findFirst({
            where: { sessionId: session.id, endedAt: null },
            orderBy: { startedAt: "desc" }
        })

        if (lastActivity) {
            const durationSec = Math.floor((Date.now() - new Date(lastActivity.startedAt).getTime()) / 1000)
            await prisma.activityLog.update({
                where: { id: lastActivity.id },
                data: { endedAt: new Date(), durationSec }
            })
        }

        // Skip creating a duplicate if same app+url
        if (lastActivity && lastActivity.appName === appName && lastActivity.url === url) {
            // Reopen the same activity instead
            const reopened = await prisma.activityLog.update({
                where: { id: lastActivity.id },
                data: { endedAt: null, durationSec: 0 }
            })
            return NextResponse.json(reopened)
        }

        const activity = await prisma.activityLog.create({
            data: {
                sessionId: session.id,
                appName: appName || "Unknown",
                windowTitle,
                url,
                domain,
                category: category || "OTHER",
            }
        })

        return NextResponse.json(activity, { status: 201 })
    } catch (error: any) {
        console.error("[TIME_TRACKER_ACTIVITY]", error?.message)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
