import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { Module, Action, hasPermission } from "@/lib/permissions"

// GET /api/documents/:id — scoped by role
export const GET = withAuth({ module: Module.DOCUMENTS, action: Action.VIEW }, async (_req, ctx) => {
    try {
        const { id } = await ctx.params

        const document = await prisma.document.findUnique({
            where: { id },
            include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, userId: true } } },
        })
        if (!document) {
            return apiError("Document not found", ApiErrorCode.NOT_FOUND, 404)
        }

        // Non-admin: can only view own documents or public documents
        if (!hasPermission(ctx.role, Module.DOCUMENTS, Action.DELETE)) {
            if (!document.isPublic && document.employee?.userId !== ctx.userId) {
                return apiError("Forbidden", ApiErrorCode.FORBIDDEN, 403)
            }
        }

        return apiSuccess(document)
    } catch (error) {
        console.error("[DOCUMENT_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// PUT /api/documents/:id
export const PUT = withAuth({ module: Module.DOCUMENTS, action: Action.UPDATE }, async (req, ctx) => {
    try {
        const { id } = await ctx.params
        const body = await req.json()

        const existing = await prisma.document.findUnique({ where: { id } })
        if (!existing) {
            return apiError("Document not found", ApiErrorCode.NOT_FOUND, 404)
        }

        const document = await prisma.document.update({
            where: { id },
            data: {
                title: body.title,
                category: body.category,
                url: body.url,
                size: body.size ?? null,
                isPublic: body.isPublic ?? false,
                employeeId: body.employeeId ?? null,
            },
            include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
        })

        return apiSuccess(document)
    } catch (error) {
        console.error("[DOCUMENT_PUT]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// DELETE /api/documents/:id
export const DELETE = withAuth({ module: Module.DOCUMENTS, action: Action.DELETE }, async (_req, ctx) => {
    try {
        const { id } = await ctx.params

        const existing = await prisma.document.findUnique({ where: { id } })
        if (!existing) {
            return apiError("Document not found", ApiErrorCode.NOT_FOUND, 404)
        }

        await prisma.document.delete({ where: { id } })

        return apiSuccess({ message: "Document deleted" })
    } catch (error) {
        console.error("[DOCUMENT_DELETE]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
