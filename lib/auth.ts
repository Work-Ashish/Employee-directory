import NextAuth, { DefaultSession } from "next-auth"
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
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
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
                    organizationId: user.organizationId,
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
                    // Generate a random password so the field is never empty
                    const randomPassword = globalThis.crypto.randomUUID() + globalThis.crypto.randomUUID()
                    const hashedRandom = await bcrypt.hash(randomPassword, 10)

                    let org = await prisma.organization.findFirst()
                    if (!org) {
                        org = await prisma.organization.create({ data: { name: "Default Org", domain: "default.com" } })
                    }

                    await prisma.user.create({
                        data: {
                            name: user.name || "Google User",
                            email: user.email,
                            hashedPassword: hashedRandom,
                            role: "EMPLOYEE",
                            organizationId: org.id,
                            avatar: user.image || null,
                        },
                    })
                }
            }
            return true
        },
        async jwt({ token, user, account, trigger, session }) {
            // Define extended user type for type safety
            interface ExtendedUser {
                id?: string
                role?: string
                organizationId?: string
                avatar?: string | null
                mustChangePassword?: boolean
            }

            if (user) {
                const u = user as ExtendedUser
                token.role = u.role as "ADMIN" | "EMPLOYEE" | undefined
                token.organizationId = u.organizationId
                token.avatar = u.avatar
                token.mustChangePassword = u.mustChangePassword ?? false
            }

            if (account) {
                token.accessToken = account.access_token
                token.refreshToken = account.refresh_token
                token.expiresAt = account.expires_at
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
                    token.organizationId = dbUser.organizationId
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
                const u = session.user as any
                u.id = token.sub ?? ""
                u.role = token.role ?? "EMPLOYEE"
                u.organizationId = token.organizationId as string | null
                u.avatar = token.avatar
                u.mustChangePassword = (token.mustChangePassword as boolean) ?? false
                u.accessToken = token.accessToken as string
            }
            return session
        },
    },
})

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role?: string
            organizationId?: string | null
            avatar?: string | null
            mustChangePassword?: boolean
        } & DefaultSession["user"]
        accessToken?: string
    }

    interface User {
        organizationId?: string | null
        avatar?: string | null
        mustChangePassword?: boolean
    }
}
