"use client"

import * as React from "react"
import { NavContent } from "@/components/Sidebar"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { HamburgerMenuIcon, Cross1Icon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"

export function MobileSidebar() {
    const pathname = usePathname()
    const { user, logout } = useAuth()
    const [isOpen, setIsOpen] = React.useState(false)

    if (!user) return null

    return (
        <div className="md:hidden">
            {/* Hamburger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-4 left-4 z-50 p-2 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-sm text-[var(--text)] hover:bg-[var(--bg2)]"
            >
                <HamburgerMenuIcon className="w-5 h-5" />
            </button>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Drawer */}
            <div className={cn(
                "fixed inset-y-0 left-0 w-[280px] bg-[var(--bg)] border-r border-[var(--border)] z-[70] transition-transform duration-300 transform",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Close Button within Drawer */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 p-2 text-[var(--text3)] hover:text-[var(--text)]"
                >
                    <Cross1Icon />
                </button>

                {/* Reuse Navigation Content */}
                <NavContent
                    pathname={pathname}
                    user={user}
                    logout={logout}
                    onItemClick={() => setIsOpen(false)}
                />
            </div>
        </div>
    )
}
