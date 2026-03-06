import NextAuth, { DefaultSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Auth0 from "next-auth/providers/auth0"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { Roles, type Role } from "@/lib/permissions"

export const { handlers, auth, signIn, signOut } = NextAuth({
    session: { strategy: "jwt" },
    trustHost: true,
    debug: true,
    pages: {
        signIn: "/login",
    },
    providers: [
        ...(process.env.GOOGLE_CLIENT_ID ? [Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        })] : []),
        ...(process.env.AUTH0_CLIENT_ID && process.env.AUTH0_ISSUER ? [Auth0({
            clientId: process.env.AUTH0_CLIENT_ID,
            clientSecret: process.env.AUTH0_CLIENT_SECRET ?? "",
            issuer: process.env.AUTH0_ISSUER,
        })] : []),
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Employee ID or Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                try {
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
                } catch (e) {
                    console.error("AUTHORIZE_ERROR_CAUGHT:", e);
                    throw e;
                }
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            // Auto-create user on first SSO sign-in (Google/Auth0)
            if ((account?.provider === "google" || account?.provider === "auth0") && user.email) {
                const existing = await prisma.user.findUnique({ where: { email: user.email } })
                if (!existing) {
                    const randomPassword = globalThis.crypto.randomUUID() + globalThis.crypto.randomUUID()
                    const hashedRandom = await bcrypt.hash(randomPassword, 10)

                    let org = await prisma.organization.findFirst()
                    if (!org) {
                        org = await prisma.organization.create({ data: { name: "Default Org", domain: "default.com" } })
                    }

                    await prisma.user.create({
                        data: {
                            name: user.name || "SSO User",
                            email: user.email,
                            hashedPassword: hashedRandom,
                            role: Roles.EMPLOYEE,
                            organizationId: org.id,
                            avatar: user.image || null,
                        },
                    })
                }
            }
            return true
        },
        async jwt({ token, user, account, trigger, session }) {
            try {
                if (user) {
                    const u = user as any
                    token.role = u.role
                    token.organizationId = u.organizationId
                    token.avatar = u.avatar
                    token.mustChangePassword = u.mustChangePassword ?? false
                    token.sub = u.id
                }

                if (account) {
                    token.accessToken = account.access_token
                    token.sessionToken = crypto.randomUUID() // Generate a custom session token for tracking
                }

                if (trigger === "update" && session) {
                    if (session.mustChangePassword !== undefined) token.mustChangePassword = session.mustChangePassword
                    if (session.name) token.name = session.name
                    if (session.avatar) token.avatar = session.avatar
                }

                // Session persistence (Week 9)
                if (token.sub && token.organizationId && token.sessionToken && (user || trigger === "signIn")) {
                    if ((prisma as any).userSession) {
                        try {
                            await (prisma as any).userSession.upsert({
                                where: { sessionToken: token.sessionToken as string },
                                update: { lastActive: new Date() },
                                create: {
                                    sessionToken: token.sessionToken as string,
                                    userId: token.sub as string,
                                    organizationId: token.organizationId as string,
                                    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                                    userAgent: null,
                                    ipAddress: null,
                                }
                            })
                        } catch (e) {
                            console.error("Failed to upsert userSession:", e)
                        }
                    }
                }

                return token
            } catch (e) {
                console.error("JWT_ERROR_CAUGHT:", e);
                throw e;
            }
        },
        async session({ session, token }) {
            if (session.user) {
                const u = session.user as any
                u.id = token.sub ?? ""
                u.role = token.role ?? Roles.EMPLOYEE
                u.organizationId = token.organizationId as string | null
                u.avatar = token.avatar
                u.mustChangePassword = (token.mustChangePassword as boolean) ?? false
                u.accessToken = token.accessToken as string
                u.sessionToken = token.sessionToken as string
            }
            return session
        },
    },
})

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role?: Role
            organizationId?: string | null
            avatar?: string | null
            mustChangePassword?: boolean
        } & DefaultSession["user"]
        accessToken?: string
    }

    interface User {
        role: Role
        organizationId?: string | null
        avatar?: string | null
        mustChangePassword?: boolean
    }
}
