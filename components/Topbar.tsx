"use client"

import { useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MagnifyingGlassIcon, PersonIcon, GearIcon, ExitIcon } from '@radix-ui/react-icons'
import { ModeToggle } from './ModeToggle'
import { NotificationCenter } from './NotificationCenter'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

export function Topbar() {
    const { user, logout } = useAuth()
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const initials = user?.name
        ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
        : "?"

    const menuItems = [
        { label: "My Profile", icon: PersonIcon, onClick: () => { router.push("/profile"); setIsOpen(false) } },
        { label: "Settings", icon: GearIcon, onClick: () => { router.push("/settings"); setIsOpen(false) } },
    ]

    return (
        <div className="h-[60px] bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--border)] flex items-center px-[28px] gap-4 shrink-0 z-40 sticky top-0 transition-colors duration-300">
            <div className="flex-1 max-w-[380px] relative">
                <MagnifyingGlassIcon className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[var(--text4)] w-[14px] h-[14px]" />
                <input
                    type="text"
                    placeholder="Quick search employees, departments..."
                    className="w-full pl-[40px] pr-[16px] py-[9px] bg-[var(--bg)] border border-[var(--border)] rounded-[10px] text-[13px] text-[var(--text)] outline-none transition-all duration-200 focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:shadow-[0_0_0_3px_var(--glow)] placeholder-[var(--text4)]"
                />
            </div>

            <div className="ml-auto flex items-center gap-[14px]">
                <ModeToggle />
                <NotificationCenter />

                {/* Avatar with dropdown */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[var(--accent)] to-[#5856d6] flex items-center justify-center text-white text-[12px] font-bold cursor-pointer border-2 border-transparent transition-all duration-200 shadow-[0_2px_8px_var(--glow)] hover:border-[var(--accent)] hover:scale-105 overflow-hidden"
                    >
                        {user?.avatar ? (
                            <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                            initials
                        )}
                    </button>

                    {isOpen && (
                        <div className="absolute right-0 top-[48px] w-[240px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl z-50 animate-[scaleIn_0.2s_both] overflow-hidden">
                            {/* User info header */}
                            <div className="p-4 border-b border-[var(--border)] bg-[var(--surface2)]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#5856d6] flex items-center justify-center text-white text-[13px] font-bold shrink-0 overflow-hidden">
                                        {user?.avatar ? (
                                            <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            initials
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[13px] font-semibold text-[var(--text)] truncate">{user?.name || "User"}</div>
                                        <div className="text-[11px] text-[var(--text3)] truncate">{user?.email || ""}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Menu items */}
                            <div className="py-1.5">
                                {menuItems.map((item) => (
                                    <button
                                        key={item.label}
                                        onClick={item.onClick}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[var(--text2)] hover:bg-[var(--bg2)] transition-colors"
                                    >
                                        <item.icon className="w-4 h-4 text-[var(--text3)]" />
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            {/* Logout */}
                            <div className="border-t border-[var(--border)] py-1.5">
                                <button
                                    onClick={() => { logout(); setIsOpen(false) }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[var(--red)] hover:bg-[var(--bg2)] transition-colors"
                                >
                                    <ExitIcon className="w-4 h-4" />
                                    Log Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
