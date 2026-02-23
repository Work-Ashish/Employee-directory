import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function PUT(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { currentPassword, newPassword } = body

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: "Passwords required" }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        })

        if (!user || !user.hashedPassword) {
            return NextResponse.json({ error: "User not found or using social login" }, { status: 404 })
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.hashedPassword)
        if (!isPasswordValid) {
            return NextResponse.json({ error: "Invalid current password" }, { status: 400 })
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 12)

        await prisma.user.update({
            where: { id: session.user.id },
            data: { hashedPassword: hashedNewPassword }
        })

        return NextResponse.json({ message: "Password updated" })
    } catch (error) {
        console.error("[PASSWORD_PUT]", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
