import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        console.log("[EMPLOYEE_PROFILE_GET] Looking up employee for userId:", session.user.id, "email:", session.user.email)

        // Try finding by userId first, then fall back to email
        let employee = await prisma.employee.findFirst({
            where: { userId: session.user.id },
            include: {
                department: true,
                educations: { orderBy: { degree: 'asc' } },
                documents: {
                    select: { id: true, title: true, category: true, url: true, uploadDate: true }
                },
                assets: {
                    select: { id: true, name: true, type: true, serialNumber: true, status: true, assignedDate: true, image: true }
                },
                manager: {
                    select: { firstName: true, lastName: true, designation: true }
                }
            }
        })

        // Fallback: match by email if userId isn't linked
        if (!employee && session.user.email) {
            employee = await prisma.employee.findFirst({
                where: { email: session.user.email },
                include: {
                    department: true,
                    educations: { orderBy: { degree: 'asc' } },
                    documents: {
                        select: { id: true, title: true, category: true, url: true, uploadDate: true }
                    },
                    assets: {
                        select: { id: true, name: true, type: true, serialNumber: true, status: true, assignedDate: true, image: true }
                    },
                    manager: {
                        select: { firstName: true, lastName: true, designation: true }
                    }
                }
            })

            // Auto-link if found by email
            if (employee && !employee.userId) {
                await prisma.employee.update({
                    where: { id: employee.id },
                    data: { userId: session.user.id }
                })
                console.log("[EMPLOYEE_PROFILE_GET] Auto-linked employee", employee.id, "to user", session.user.id)
            }
        }

        if (!employee) {
            return NextResponse.json({ error: "Employee profile not found" }, { status: 404 })
        }

        return NextResponse.json(employee)
    } catch (error: any) {
        console.error("[EMPLOYEE_PROFILE_GET] Error:", error?.message || error)
        return NextResponse.json({ error: "Internal Server Error", details: error?.message }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Find by userId or email
        let employee = await prisma.employee.findFirst({
            where: { userId: session.user.id },
        })
        if (!employee && session.user.email) {
            employee = await prisma.employee.findFirst({
                where: { email: session.user.email },
            })
        }

        if (!employee) {
            return NextResponse.json({ error: "Employee profile not found" }, { status: 404 })
        }

        const body = await req.json()

        const allowedFields = [
            'phone', 'dateOfBirth', 'gender', 'bloodGroup', 'nationality', 'maritalStatus',
            'marriageDate', 'spouse', 'placeOfBirth', 'residentialStatus', 'fatherName',
            'religion', 'physicallyChallenged', 'internationalEmployee', 'hobby', 'caste',
            'height', 'weight', 'identificationMark',
            'contactAddress', 'contactCity', 'contactState', 'contactPincode',
            'permanentAddress', 'permanentCity', 'permanentState', 'permanentPincode',
            'bankName', 'bankAccountNumber', 'bankBranch', 'ifscCode',
            'pfAccountNumber', 'aadhaarNumber', 'panNumber',
            'fatherDob', 'fatherBloodGroup', 'fatherGender', 'fatherNationality',
            'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation',
            'passportNumber', 'passportExpiry', 'visaNumber', 'visaExpiry',
            'avatarUrl',
        ]

        const updateData: any = {}
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field]
            }
        }

        const updated = await prisma.employee.update({
            where: { id: employee.id },
            data: updateData,
            include: {
                department: true,
                educations: true,
            }
        })

        return NextResponse.json(updated)
    } catch (error: any) {
        console.error("[EMPLOYEE_PROFILE_PUT] Error:", error?.message || error)
        return NextResponse.json({ error: "Internal Server Error", details: error?.message }, { status: 500 })
    }
}
