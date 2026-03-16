"use client"

import { useState, useEffect } from "react"
import { SessionAPI } from "@/features/sessions/api/client"
import { toast } from "sonner"
import { ReloadIcon, LockClosedIcon, PersonIcon, DesktopIcon, DiscIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"
import { Button } from "@/components/ui/Button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Spinner } from "@/components/ui/Spinner"

type Session = import("@/features/sessions/api/client").UserSession

export function SessionManager() {
    const [sessions, setSessions] = useState<Session[]>([])
    const [loading, setLoading] = useState(true)
    const [revoking, setRevoking] = useState<string | null>(null)

    const fetchSessions = async () => {
        try {
            const data = await SessionAPI.list()
            setSessions(data.results || (data as any).data || [])
        } catch (error) {
            toast.error("Failed to fetch sessions")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSessions()
        const interval = setInterval(fetchSessions, 30000)
        return () => clearInterval(interval)
    }, [])

    const handleRevoke = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to revoke the session for ${name}? User will be logged out immediately.`)) return

        setRevoking(id)
        try {
            await SessionAPI.terminate(id)
            toast.success(`Session for ${name} revoked`)
            fetchSessions()
        } catch (error: any) {
            toast.error(error.message || "Failed to revoke session")
        } finally {
            setRevoking(null)
        }
    }

    return (
        <Card variant="glass" className="p-6 animate-page-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold text-text">Active Sessions</h2>
                    <p className="text-sm text-text-3">Monitor and manage connected devices/sessions across the organization</p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setLoading(true); fetchSessions() }}
                >
                    <ReloadIcon className={loading ? "animate-spin" : ""} />
                </Button>
            </div>

            <div className="space-y-3">
                {loading && sessions.length === 0 ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-16 w-full bg-surface rounded-xl animate-pulse" />
                    ))
                ) : sessions.length > 0 ? (
                    sessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-4 bg-surface-2 border border-border rounded-xl hover:border-accent/30 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-surface to-bg-2 flex items-center justify-center border border-border overflow-hidden">
                                    {session.avatar ? (
                                        <img src={session.avatar} alt={session.userName} className="w-full h-full object-cover" />
                                    ) : (
                                        <PersonIcon className="w-5 h-5 text-text-3" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-md font-bold text-text">{session.userName}</span>
                                        {session.isActive ? (
                                            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                        ) : (
                                            <Badge variant="danger" size="sm">Revoked</Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <div className="flex items-center gap-1 text-xs text-text-3">
                                            <DesktopIcon className="w-3 h-3" />
                                            <span className="max-w-[150px] truncate">{session.userAgent}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-text-3">
                                            <DiscIcon className="w-3 h-3" />
                                            <span>{session.ipAddress}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-xs font-bold text-text-2 uppercase tracking-tight">Last Active</div>
                                    <div className="text-sm text-text-3">{format(new Date(session.lastActive || session.lastActivity || session.createdAt), "MMM d, HH:mm")}</div>
                                </div>
                                <Button
                                    variant="danger"
                                    size="icon"
                                    onClick={() => handleRevoke(session.id, session.userName || "User")}
                                    disabled={session.isRevoked || revoking === session.id}
                                    title="Revoke Session"
                                >
                                    {revoking === session.id ? <Spinner size="sm" /> : <LockClosedIcon className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-text-3 italic">
                        No active sessions found.
                    </div>
                )}
            </div>
        </Card>
    )
}
