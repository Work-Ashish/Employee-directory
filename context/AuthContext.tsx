"use client"

import * as React from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"

type UserRole = "ADMIN" | "EMPLOYEE"

interface User {
    id: string
    name: string
    email: string
    role: UserRole
    avatar?: string
}

interface AuthContextType {
    user: User | null
    isLoading: boolean
    logout: () => void
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()
    const router = useRouter()
    const pathname = usePathname()

    const isLoading = status === "loading"

    // Map NextAuth session to our internal user object
    const user = React.useMemo(() => {
        if (!session?.user) return null

        return {
            id: session.user.id || "",
            name: session.user.name || "",
            email: session.user.email || "",
            role: (session.user.role as UserRole) || "EMPLOYEE",
            avatar: session.user.avatar || session.user.image || undefined
        }
    }, [session])

    // Protect routes - although middleware usually handles this, 
    // we keep it here to match the previous logic and handle loops
    React.useEffect(() => {
        if (isLoading) return

        const isLoginPage = pathname === "/login"
        const isAuthCallback = pathname.startsWith("/api/auth")

        if (isAuthCallback) return

        if (!user && !isLoginPage) {
            router.push("/login")
        } else if (user && isLoginPage) {
            router.push("/")
        }
    }, [user, isLoading, pathname, router])

    const logout = async () => {
        await signOut({ callbackUrl: "/login" })
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = React.useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
