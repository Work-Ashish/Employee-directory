import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

function flattenEmployee(emp: any) {
    if (!emp) return null
    const { profile, addressInfo, banking, ...rest } = emp
    return {
        ...rest,
        // Spread nested relations to maintain backward compatibility with UI
        ...(profile || {}),
        ...(addressInfo || {}),
        ...(banking || {}),
    }
}

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const includeRelations = {
            department: true,
            profile: true,
            addressInfo: true,
            banking: true,
            educations: { orderBy: { degree: 'asc' as const } },
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

        const organizationId = (session.user as any).organizationId
        let employee = await prisma.employee.findFirst({
            where: { userId: session.user.id, ...(organizationId ? { organizationId } : {}) },
            include: includeRelations
        })

        if (!employee && session.user.email && organizationId) {
            employee = await prisma.employee.findFirst({
                where: { email: session.user.email, organizationId },
                include: includeRelations
            })
        }

        if (!employee) {
            return NextResponse.json({ error: "Employee profile not found" }, { status: 404 })
        }

        return NextResponse.json(flattenEmployee(employee))
    } catch (error: any) {
        console.error("[EMPLOYEE_PROFILE_GET] Error:", error?.message || error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const organizationId = (session.user as any).organizationId
        let employee = await prisma.employee.findFirst({
            where: { userId: session.user.id, ...(organizationId ? { organizationId } : {}) },
        })

        if (!employee) {
            return NextResponse.json({ error: "Employee profile not found" }, { status: 404 })
        }

        const body = await req.json()

        // Root fields
        const rootFields = ['phone', 'avatarUrl', 'address']
        // Profile fields
        const profileFields = [
            'dateOfBirth', 'gender', 'bloodGroup', 'nationality', 'maritalStatus',
            'marriageDate', 'spouse', 'placeOfBirth', 'residentialStatus', 'fatherName',
            'religion', 'physicallyChallenged', 'internationalEmployee', 'hobby', 'caste',
            'height', 'weight', 'identificationMark', 'fatherDob', 'fatherBloodGroup',
            'fatherGender', 'fatherNationality', 'emergencyContactName', 'emergencyContactPhone',
            'emergencyContactRelation', 'passportNumber', 'passportExpiry', 'visaNumber', 'visaExpiry',
            'category', 'costCenter', 'division', 'grade', 'location', 'previousEmployment', 'previousCtc'
        ]
        // Address fields
        const addressFields = [
            'contactAddress', 'contactCity', 'contactState', 'contactPincode',
            'permanentAddress', 'permanentCity', 'permanentState', 'permanentPincode'
        ]
        // Banking fields
        const bankingFields = [
            'bankName', 'bankAccountNumber', 'bankBranch', 'ifscCode',
            'pfAccountNumber', 'aadhaarNumber', 'panNumber'
        ]

        const getSubset = (fields: string[]) => {
            const data: any = {}
            for (const f of fields) {
                if (body[f] !== undefined) data[f] = body[f]
            }
            return Object.keys(data).length > 0 ? data : undefined
        }

        // Coerce numeric fields
        if (body.previousCtc !== undefined) {
            body.previousCtc = body.previousCtc ? parseFloat(body.previousCtc) || null : null
        }

        const rootData = getSubset(rootFields) || {}
        const profileData = getSubset(profileFields)
        const addressData = getSubset(addressFields)
        const bankingData = getSubset(bankingFields)

        const updated = await prisma.employee.update({
            where: { id: employee.id },
            data: {
                ...rootData,
                ...(profileData ? { profile: { upsert: { create: profileData, update: profileData } } } : {}),
                ...(addressData ? { addressInfo: { upsert: { create: addressData, update: addressData } } } : {}),
                ...(bankingData ? { banking: { upsert: { create: bankingData, update: bankingData } } } : {})
            },
            include: {
                department: true,
                educations: { orderBy: { degree: 'asc' as const } },
                profile: true,
                addressInfo: true,
                banking: true
            }
        })

        return NextResponse.json(flattenEmployee(updated))
    } catch (error: any) {
        console.error("[EMPLOYEE_PROFILE_PUT] Error:", error?.message || error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
