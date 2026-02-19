"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"

type UserRole = "admin" | "employee"

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
    login: (email: string) => Promise<boolean>
    logout: () => void
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = React.useState<User | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const router = useRouter()
    const pathname = usePathname()

    // Simulate session check on mount
    React.useEffect(() => {
        const storedUser = localStorage.getItem("ems_user")
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser))
            } catch (e) {
                console.error("Failed to parse stored user", e)
                localStorage.removeItem("ems_user")
            }
        }
        setIsLoading(false)
    }, [])

    // Protect routes
    React.useEffect(() => {
        if (isLoading) return

        const isLoginPage = pathname === "/login"

        if (!user && !isLoginPage) {
            router.push("/login")
        } else if (user && isLoginPage) {
            router.push("/")
        }
    }, [user, isLoading, pathname, router])

    const login = async (email: string): Promise<boolean> => {
        setIsLoading(true)
        // Validate mock credentials
        // Admin: admin@emspro.com
        // Employee: user@emspro.com
        // Password check is skipped for mock, effectively just checking email for role assignment

        await new Promise(resolve => setTimeout(resolve, 1000)) // Mock delay

        let loggedInUser: User | null = null

        if (email === "admin@emspro.com") {
            loggedInUser = {
                id: "1",
                name: "Admin User",
                email: "admin@emspro.com",
                role: "admin",
                avatar: "AD"
            }
        } else if (email === "user@emspro.com") {
            loggedInUser = {
                id: "2",
                name: "Sarah Employee",
                email: "user@emspro.com",
                role: "employee",
                avatar: "SE"
            }
        }

        if (loggedInUser) {
            setUser(loggedInUser)
            localStorage.setItem("ems_user", JSON.stringify(loggedInUser))
            setIsLoading(false)
            return true
        }

        setIsLoading(false)
        return false
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem("ems_user")
        router.push("/login")
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
