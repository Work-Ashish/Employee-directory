import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/security"
import { apiSuccess, apiError, ApiErrorCode } from "@/lib/api-response"
import { documentSchema } from "@/lib/schemas"
import { Module, Action, hasPermission } from "@/lib/permissions"
import { indexDocument } from "@/lib/search-index"

// GET /api/documents – List documents (scoped by role and organization)
export const GET = withAuth({ module: Module.DOCUMENTS, action: Action.VIEW }, async (req, ctx) => {
    try {
        const isAdmin = hasPermission(ctx.role, Module.DOCUMENTS, Action.DELETE)

        let where: any = { organizationId: ctx.organizationId }

        if (!isAdmin) {
            // Employee: only their own documents + public documents
            const employee = await prisma.employee.findFirst({
                where: { userId: ctx.userId, organizationId: ctx.organizationId },
                select: { id: true },
            })
            if (!employee) {
                return apiError("No employee profile linked", ApiErrorCode.BAD_REQUEST, 400)
            }
            where = {
                ...where,
                OR: [
                    { employeeId: employee.id },
                    { isPublic: true },
                ],
            }
        }

        const documents = await prisma.document.findMany({
            where,
            include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
            orderBy: { uploadDate: "desc" },
        })
        return apiSuccess(documents)
    } catch (error) {
        console.error("[DOCUMENTS_GET]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})

// POST /api/documents – Upload document metadata
export const POST = withAuth({ module: Module.DOCUMENTS, action: Action.CREATE }, async (req, ctx) => {
    try {
        const isAdmin = hasPermission(ctx.role, Module.DOCUMENTS, Action.DELETE)
        const body = await req.json()

        // Bulk mode: admin only
        if (Array.isArray(body.employeeIds) && body.employeeIds.length > 0) {
            if (!isAdmin) {
                return apiError("Only admins can bulk-assign documents", ApiErrorCode.FORBIDDEN, 403)
            }
            const parseResult = documentSchema.omit({ employeeId: true }).safeParse(body)
            if (!parseResult.success) {
                return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, parseResult.error.format())
            }
            const data = parseResult.data

            const docs = await Promise.all(
                body.employeeIds.map((empId: string) =>
                    prisma.document.create({
                        data: {
                            title: data.title,
                            category: data.category,
                            url: data.url,
                            size: data.size || null,
                            isPublic: data.isPublic ?? false,
                            employeeId: empId,
                            organizationId: ctx.organizationId,
                        },
                        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
                    })
                )
            )
            for (const doc of docs) { indexDocument(doc.id).catch(() => {}) }
            return apiSuccess(docs, undefined, 201)
        }

        const singleParse = documentSchema.safeParse(body)
        if (!singleParse.success) {
            return apiError("Validation Error", ApiErrorCode.VALIDATION_ERROR, 400, singleParse.error.format())
        }

        // Single document
        let employeeId = singleParse.data.employeeId || null
        if (!isAdmin) {
            const employee = await prisma.employee.findFirst({
                where: { userId: ctx.userId, organizationId: ctx.organizationId },
                select: { id: true },
            })
            if (!employee) {
                return apiError("No employee profile linked", ApiErrorCode.BAD_REQUEST, 400)
            }
            employeeId = employee.id // Force to own ID
        }

        const document = await prisma.document.create({
            data: {
                title: singleParse.data.title,
                category: singleParse.data.category,
                url: singleParse.data.url,
                size: singleParse.data.size || null,
                isPublic: singleParse.data.isPublic ?? false,
                employeeId,
                organizationId: ctx.organizationId,
            },
            include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
        })

        indexDocument(document.id).catch(() => {})

        return apiSuccess(document, undefined, 201)
    } catch (error) {
        console.error("[DOCUMENTS_POST]", error)
        return apiError("Internal Server Error", ApiErrorCode.INTERNAL_ERROR, 500)
    }
})
