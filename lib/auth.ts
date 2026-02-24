import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
    session: { strategy: "jwt" },
    pages: {
        signIn: "/login",
    },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Employee ID or Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const login = (credentials.email as string).trim()

                // Support login by email OR by employeeCode
                let user = await prisma.user.findUnique({ where: { email: login } })

                if (!user) {
                    // Try looking up by employeeCode → find linked user
                    const employee = await prisma.employee.findUnique({
                        where: { employeeCode: login },
                        include: { user: true },
                    })
                    if (employee?.user) user = employee.user
                }

                if (!user || !user.hashedPassword) return null

                const isPasswordValid = await bcrypt.compare(
                    credentials.password as string,
                    user.hashedPassword
                )
                if (!isPasswordValid) return null

                // Update lastLoginAt
                try {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { lastLoginAt: new Date() },
                    })
                } catch (error) {
                    console.error("Failed to update lastLoginAt:", error)
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                    mustChangePassword: user.mustChangePassword,
                }
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            // Auto-create user on first Google sign-in
            if (account?.provider === "google" && user.email) {
                const existing = await prisma.user.findUnique({ where: { email: user.email } })
                if (!existing) {
                    await prisma.user.create({
                        data: {
                            name: user.name || "Google User",
                            email: user.email,
                            hashedPassword: "",
                            role: "EMPLOYEE",
                            avatar: user.image || null,
                        },
                    })
                }
            }
            return true
        },
        async jwt({ token, user, account, trigger, session }) {
            if (user) {
                token.role = user.role
                token.avatar = user.avatar
                token.mustChangePassword = (user as any).mustChangePassword ?? false
            }

            // Handle session updates (e.g. after password change)
            if (trigger === "update" && session) {
                if (session.mustChangePassword !== undefined) {
                    token.mustChangePassword = session.mustChangePassword
                }
                if (session.name) token.name = session.name
                if (session.avatar) token.avatar = session.avatar
            }

            // Fetch role from DB for Google sign-in
            if (account?.provider === "google" && token.email) {
                const dbUser = await prisma.user.findUnique({ where: { email: token.email } })
                if (dbUser) {
                    token.sub = dbUser.id
                    token.role = dbUser.role
                    token.avatar = dbUser.avatar || token.picture
                    token.mustChangePassword = dbUser.mustChangePassword
                    // Update lastLoginAt for Google logins
                    await prisma.user.update({
                        where: { id: dbUser.id },
                        data: { lastLoginAt: new Date() },
                    })
                }
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub ?? ""
                session.user.role = token.role ?? "EMPLOYEE"
                session.user.avatar = token.avatar
                session.user.mustChangePassword = (token.mustChangePassword as boolean) ?? false
            }
            return session
        },
    },
})
