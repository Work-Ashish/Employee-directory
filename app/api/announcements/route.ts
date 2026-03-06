import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { announcementSchema } from "@/lib/schemas"

// GET /api/announcements – List announcements (scoped)
export const GET = withAuth({ module: Module.ANNOUNCEMENTS, action: Action.VIEW }, async (req, ctx) => {
    try {
        const announcements = await prisma.announcement.findMany({
            where: { organizationId: ctx.organizationId },
            orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
            take: 100,
        })

        const res = apiSuccess(announcements)
        res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=300")
        return res
    } catch (error) {
        console.error("[ANNOUNCEMENTS_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/announcements – Create an announcement
export const POST = withAuth({ module: Module.ANNOUNCEMENTS, action: Action.CREATE }, async (req, ctx) => {
    try {
        const body = await req.json()
        const parsed = announcementSchema.safeParse(body)
        if (!parsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format())
        }

        const announcement = await prisma.announcement.create({
            data: {
                title: parsed.data.title,
                content: parsed.data.content,
                author: parsed.data.author || "Admin",
                category: parsed.data.category,
                priority: parsed.data.priority,
                isPinned: parsed.data.isPinned,
                organizationId: ctx.organizationId,
            },
        })

        return apiSuccess(announcement, undefined, 201)
    } catch (error) {
        console.error("[ANNOUNCEMENTS_POST]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// DELETE /api/announcements – Delete an announcement
export const DELETE = withAuth({ module: Module.ANNOUNCEMENTS, action: Action.DELETE }, async (req, ctx) => {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")
        if (!id) {
            return apiError("ID required", ApiErrorCode.BAD_REQUEST, 400)
        }

        const result = await prisma.announcement.deleteMany({
            where: { id, organizationId: ctx.organizationId }
        })

        if (result.count === 0) {
            return apiError("Announcement not found", ApiErrorCode.NOT_FOUND, 404)
        }

        return apiSuccess({ message: "Deleted" })
    } catch (error) {
        console.error("[ANNOUNCEMENTS_DELETE]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// PUT /api/announcements – Update an announcement
export const status = withAuth({ module: Module.ANNOUNCEMENTS, action: Action.UPDATE }, async (req, ctx) => {
    // Note: Renovating to use PUT export correctly
    try {
        const body = await req.json()
        const { id, ...data } = body

        if (!id) {
            return apiError("ID required", ApiErrorCode.BAD_REQUEST, 400)
        }

        const partialParsed = announcementSchema.partial().safeParse(data)
        if (!partialParsed.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, partialParsed.error.format())
        }

        const result = await prisma.announcement.updateMany({
            where: { id, organizationId: ctx.organizationId },
            data: {
                title: partialParsed.data.title,
                content: partialParsed.data.content,
                category: partialParsed.data.category,
                priority: partialParsed.data.priority,
                isPinned: partialParsed.data.isPinned,
            },
        })

        if (result.count === 0) {
            return apiError("Announcement not found", ApiErrorCode.NOT_FOUND, 404)
        }

        const updated = await prisma.announcement.findUnique({ where: { id } })
        return apiSuccess(updated)
    } catch (error) {
        console.error("[ANNOUNCEMENTS_PUT]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

export const PUT = status // Re-export as PUT
