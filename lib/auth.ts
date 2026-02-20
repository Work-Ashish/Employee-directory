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
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                })

                if (!user || !user.hashedPassword) {
                    return null
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password as string,
                    user.hashedPassword
                )

                if (!isPasswordValid) {
                    return null
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                }
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            // Auto-create user on first Google sign-in
            if (account?.provider === "google" && user.email) {
                const existing = await prisma.user.findUnique({
                    where: { email: user.email },
                })
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
        async jwt({ token, user, account }) {
            if (user) {
                token.role = user.role
                token.avatar = user.avatar
            }
            // Fetch role from DB for Google sign-in (since Google provider doesn't return role)
            if (account?.provider === "google" && token.email) {
                const dbUser = await prisma.user.findUnique({
                    where: { email: token.email },
                })
                if (dbUser) {
                    token.sub = dbUser.id
                    token.role = dbUser.role
                    token.avatar = dbUser.avatar || token.picture
                }
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub ?? ""
                session.user.role = token.role ?? "EMPLOYEE"
                session.user.avatar = token.avatar
            }
            return session
        },
    },
})

