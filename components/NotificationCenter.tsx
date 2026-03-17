"use client"

import * as React from "react"
import { BellIcon, CheckIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import { NotificationAPI } from "@/features/notifications/api/client"
import { toast } from "sonner"
import { ReloadIcon } from "@radix-ui/react-icons"
import { Spinner } from "@/components/ui/Spinner"

export function NotificationCenter() {
    const [isOpen, setIsOpen] = React.useState(false)
    const [notifications, setNotifications] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(false)
    const unreadCount = notifications.filter(n => !n.isRead).length
    const dropdownRef = React.useRef<HTMLDivElement>(null)

    const fetchNotifications = React.useCallback(async () => {
        setLoading(true)
        try {
            const data = await NotificationAPI.list()
            setNotifications(data.results || (data as any).data || [])
        } catch {
            // Silently ignore — backend may not be running
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchNotifications()
        // Poll every minute
        const interval = setInterval(fetchNotifications, 60000)
        return () => clearInterval(interval)
    }, [fetchNotifications])

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const markAllRead = async () => {
        try {
            await NotificationAPI.markAllRead()
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
            toast.success("All notifications marked as read")
        } catch (error) {
            toast.error("Failed to mark read")
        }
    }

    const markRead = async (id: string, isAlreadyRead: boolean) => {
        if (isAlreadyRead) return
        try {
            await NotificationAPI.markRead(id)
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
        } catch (error) {
            console.error("Failed to mark read")
        }
    }

    const formatTime = (date: string) => {
        const diff = Date.now() - new Date(date).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 60) return `${mins}m ago`
        const hours = Math.floor(mins / 60)
        if (hours < 24) return `${hours}h ago`
        return `${Math.floor(hours / 24)}d ago`
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-[38px] h-[38px] rounded-[10px] bg-bg border border-[#00000014] flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-white hover:border-[#00000021] hover:-translate-y-[1px] hover:shadow-sm group dark:border-border dark:bg-surface dark:hover:bg-bg-3"
            >
                <BellIcon className="w-[15px] h-[15px] text-text-2" />
                {unreadCount > 0 && (
                    <span className="absolute top-[7px] right-[7px] w-[7px] h-[7px] bg-danger rounded-full border-2 border-white animate-[pulse-dot_2s_infinite] dark:border-surface" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-[48px] w-[320px] bg-surface border border-border rounded-xl shadow-2xl z-50 animate-[scaleIn_0.2s_both] flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-border flex items-center justify-between bg-surface-2 backdrop-blur-md">
                        <div className="text-base font-bold text-text">Notifications</div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-xs text-accent hover:underline font-medium"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto min-h-[100px]">
                        {loading && notifications.length === 0 ? (
                            <div className="p-8 text-center"><Spinner className="text-accent mx-auto w-5 h-5" /></div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-base text-text-3">
                                No notifications
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => markRead(n.id, n.isRead)}
                                    className={cn(
                                        "p-3 border-b border-border last:border-0 hover:bg-bg-2 transition-colors cursor-pointer flex gap-3",
                                        !n.isRead ? "bg-[rgba(0,122,255,0.03)]" : ""
                                    )}
                                >
                                    <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", !n.isRead ? "bg-accent" : "bg-transparent")} />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div className="text-base font-semibold text-text">{n.title}</div>
                                            <div className="text-[10px] text-text-3 whitespace-nowrap ml-2">{formatTime(n.createdAt)}</div>
                                        </div>
                                        <div className="text-sm text-text-3 mt-0.5 leading-snug">{n.description}</div>
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
