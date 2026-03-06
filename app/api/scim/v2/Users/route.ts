import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { apiError, ApiErrorCode } from "@/lib/api-response"
import { Roles } from "@/lib/permissions"
import bcrypt from "bcryptjs"

// SCIM Authentication Helper
async function verifyScim(req: Request) {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) return null

    const token = authHeader.substring(7)
    const org = await prisma.organization.findFirst({
        where: { scimSecret: token }
    })
    return org
}

// GET /api/scim/v2/Users - List Users (SCIM)
export async function GET(req: Request) {
    const org = await verifyScim(req)
    if (!org) return new Response(JSON.stringify({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "Invalid SCIM Token", status: "401" }), { status: 401 })

    const { searchParams } = new URL(req.url)
    const startIndex = parseInt(searchParams.get("startIndex") || "1")
    const count = parseInt(searchParams.get("count") || "10")

    try {
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where: { organizationId: org.id },
                skip: startIndex - 1,
                take: count,
                include: { employee: true }
            }),
            prisma.user.count({ where: { organizationId: org.id } })
        ])

        const resources = users.map(u => ({
            schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
            id: u.id,
            userName: u.email,
            name: {
                formatted: u.name,
                familyName: u.employee?.lastName || "",
                givenName: u.employee?.firstName || ""
            },
            emails: [{ value: u.email, primary: true }],
            active: u.employee?.status === "ACTIVE",
            meta: {
                resourceType: "User",
                created: u.createdAt,
                lastModified: u.updatedAt,
                location: `${req.url}/${u.id}`
            }
        }))

        return NextResponse.json({
            schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
            totalResults: total,
            startIndex,
            itemsPerPage: resources.length,
            Resources: resources
        })
    } catch (error) {
        return new Response(JSON.stringify({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "Internal Error", status: "500" }), { status: 500 })
    }
}

// POST /api/scim/v2/Users - Create User (SCIM)
export async function POST(req: Request) {
    const org = await verifyScim(req)
    if (!org) return new Response(JSON.stringify({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "Invalid SCIM Token", status: "401" }), { status: 401 })

    try {
        const body = await req.json()
        const email = body.userName || body.emails?.[0]?.value

        if (!email) {
            return new Response(JSON.stringify({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "userName is required", status: "400" }), { status: 400 })
        }

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            return new Response(JSON.stringify({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "User already exists", status: "409" }), { status: 409 })
        }

        const firstName = body.name?.givenName || "New"
        const lastName = body.name?.familyName || "User"
        const password = crypto.randomUUID()
        const hashedPassword = await bcrypt.hash(password, 10)

        let department = await prisma.department.findFirst({ where: { organizationId: org.id } })
        if (!department) {
            department = await prisma.department.create({
                data: { name: "Provisioned", organizationId: org.id }
            })
        }

        const user = await prisma.user.create({
            data: {
                email,
                name: `${firstName} ${lastName}`,
                hashedPassword,
                organizationId: org.id,
                role: Roles.EMPLOYEE,
                mustChangePassword: true,
                employee: {
                    create: {
                        employeeCode: `SCIM-${Date.now().toString().slice(-4)}`,
                        firstName,
                        lastName,
                        email,
                        designation: "Provisioned via SCIM",
                        departmentId: department.id,
                        organizationId: org.id,
                        dateOfJoining: new Date(),
                        salary: 0,
                        status: body.active === false ? "TERMINATED" : "ACTIVE"
                    }
                }
            }
        })

        return NextResponse.json({
            schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
            id: user.id,
            userName: user.email,
            active: true,
            meta: {
                resourceType: "User",
                created: user.createdAt,
                lastModified: user.updatedAt,
                location: `${req.url}/${user.id}`
            }
        }, { status: 201 })
    } catch (error) {
        console.error("[SCIM_POST]", error)
        return new Response(JSON.stringify({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "Internal Error", status: "500" }), { status: 500 })
    }
}
