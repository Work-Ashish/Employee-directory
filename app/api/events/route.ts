import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { eventSchema } from "@/lib/schemas"

// GET /api/events – List calendar events (scoped)
export const GET = withAuth({ module: Module.ANNOUNCEMENTS, action: Action.VIEW }, async (req, ctx) => {
    try {
        const events = await prisma.calendarEvent.findMany({
            where: { organizationId: ctx.organizationId },
            orderBy: { start: "asc" },
            take: 200,
        })

        const res = apiSuccess(events)
        res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=300")
        return res
    } catch (error) {
        console.error("[EVENTS_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/events – Create a calendar event
export const POST = withAuth({ module: Module.ANNOUNCEMENTS, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = eventSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        const event = await prisma.calendarEvent.create({
            data: {
                title: parsed.data.title,
                start: parsed.data.start,
                end: parsed.data.end,
                allDay: parsed.data.allDay,
                type: parsed.data.type,
                organizationId: ctx.organizationId,
            },
        })

        return apiSuccess(event, undefined, 201)
    } catch (error) {
        console.error("[EVENTS_POST]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// DELETE /api/events – Delete an event
export const DELETE = withAuth({ module: Module.ANNOUNCEMENTS, action: Action.DELETE }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")
        if (!id) {
            return apiError("ID required", ApiErrorCode.BAD_REQUEST, 400)
        }

        const result = await prisma.calendarEvent.deleteMany({
            where: { id, organizationId: ctx.organizationId }
        })

        if (result.count === 0) {
            return apiError("Event not found", ApiErrorCode.NOT_FOUND, 404)
        }

        return apiSuccess({ message: "Deleted" })
    } catch (error) {
        console.error("[EVENTS_DELETE]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
