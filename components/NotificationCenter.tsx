"use client"

import * as React from "react"
import { BellIcon, CheckIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const initialNotifications = [
    { id: 1, title: "Leave Approved", desc: "Your sick leave for Oct 24 is approved", time: "2h ago", read: false },
    { id: 2, title: "Payslip Available", desc: "Salary slip for September 2026 is ready", time: "1d ago", read: false },
    { id: 3, title: "Kudos Received", desc: "Sarah thanked you for helping with deployment", time: "2d ago", read: true },
    { id: 4, title: "Meeting Reminder", desc: "Quarterly Review starts in 15 mins", time: "3d ago", read: true },
]

export function NotificationCenter() {
    const [isOpen, setIsOpen] = React.useState(false)
    const [notifications, setNotifications] = React.useState(initialNotifications)
    const unreadCount = notifications.filter(n => !n.read).length
    const dropdownRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        toast.success("All notifications marked as read")
    }

    const markRead = (id: number) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-[38px] h-[38px] rounded-[10px] bg-[var(--bg)] border border-[#00000014] flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-white hover:border-[#00000021] hover:-translate-y-[1px] hover:shadow-sm group dark:border-[var(--border)] dark:bg-[var(--surface)] dark:hover:bg-[var(--bg3)]"
            >
                <BellIcon className="w-[15px] h-[15px] text-[var(--text2)]" />
                {unreadCount > 0 && (
                    <span className="absolute top-[7px] right-[7px] w-[7px] h-[7px] bg-[var(--red)] rounded-full border-2 border-white animate-[pulse-dot_2s_infinite] dark:border-[var(--surface)]" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-[48px] w-[320px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl z-50 animate-[scaleIn_0.2s_both] flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface2)] backdrop-blur-md">
                        <div className="text-[13px] font-bold text-[var(--text)]">Notifications</div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-[11px] text-[var(--accent)] hover:underline font-medium"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-[13px] text-[var(--text3)]">
                                No notifications
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => markRead(n.id)}
                                    className={cn(
                                        "p-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg2)] transition-colors cursor-pointer flex gap-3",
                                        !n.read ? "bg-[rgba(0,122,255,0.03)]" : ""
                                    )}
                                >
                                    <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", !n.read ? "bg-[var(--accent)]" : "bg-transparent")} />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div className="text-[13px] font-semibold text-[var(--text)]">{n.title}</div>
                                            <div className="text-[10px] text-[var(--text3)] whitespace-nowrap ml-2">{n.time}</div>
                                        </div>
                                        <div className="text-[12px] text-[var(--text3)] mt-0.5 leading-snug">{n.desc}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
