"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { PlayIcon, StopIcon, PauseIcon, ResumeIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Card } from "@/components/ui/Card"
import { Spinner } from "@/components/ui/Spinner"

/* ─── Constants ─── */
const HEARTBEAT_INTERVAL = 300_000 // 5 minutes (K4: reduced from 60s to avoid DB overload at scale)
const IDLE_TIMEOUT = 300_000       // 5 minutes (client-side)

const BREAK_REASONS = ["Lunch", "Tea / Coffee", "Personal", "Meeting", "Other"]

/* ─── Types ─── */
interface SessionState {
    id: string
    checkIn: string
    status: "ACTIVE" | "BREAK" | "COMPLETED"
    elapsedSec: number
    isOnBreak: boolean
    lastActivity: "ACTIVE" | "IDLE" | "BREAK"
}

interface TodaySummary {
    totalWork: number
    totalBreak: number
    totalIdle: number
    sessions: number
}

/* ─── Helpers ─── */
const fmtDuration = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    return `${h}h ${m.toString().padStart(2, "0")}m`
}

export function TimeTracker() {
    // ─── State ───
    const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle')
    const [seconds, setSeconds] = useState(0)
    const [checkInTime, setCheckInTime] = useState<Date | null>(null)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null)
    const [showBreakMenu, setShowBreakMenu] = useState(false)
    const [activityStatus, setActivityStatus] = useState<"ACTIVE" | "IDLE" | "BREAK">("ACTIVE")

    // ─── Activity counter refs ───
    const mouseClicksRef = useRef(0)
    const keystrokesRef = useRef(0)
    const lastActivityRef = useRef(Date.now())
    const heartbeatRef = useRef<NodeJS.Timeout | null>(null)

    // ─── Restore session on mount ───
    useEffect(() => {
        fetch("/api/time-tracker/status")
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!data) return
                if (data.active) {
                    const s = data.session as SessionState
                    setSessionId(s.id)
                    setCheckInTime(new Date(s.checkIn))
                    setSeconds(s.elapsedSec)
                    setStatus(s.isOnBreak ? "paused" : "running")
                    setActivityStatus(s.lastActivity)
                } else if (data.todaySummary) {
                    setTodaySummary(data.todaySummary)
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    // ─── Timer tick ───
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (status === 'running') {
            interval = setInterval(() => setSeconds(prev => prev + 1), 1000)
        }
        return () => clearInterval(interval)
    }, [status])

    // ─── Activity listeners ───
    useEffect(() => {
        if (status !== 'running') return

        const onMouse = () => { mouseClicksRef.current++; lastActivityRef.current = Date.now() }
        const onKey = () => { keystrokesRef.current++; lastActivityRef.current = Date.now() }
        const onMove = () => { lastActivityRef.current = Date.now() }

        window.addEventListener("click", onMouse)
        window.addEventListener("keydown", onKey)
        window.addEventListener("mousemove", onMove)

        return () => {
            window.removeEventListener("click", onMouse)
            window.removeEventListener("keydown", onKey)
            window.removeEventListener("mousemove", onMove)
        }
    }, [status])

    // ─── Heartbeat ───
    useEffect(() => {
        if (status !== 'running') {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current)
            return
        }

        heartbeatRef.current = setInterval(async () => {
            const clicks = mouseClicksRef.current
            const keys = keystrokesRef.current
            mouseClicksRef.current = 0
            keystrokesRef.current = 0

            try {
                const res = await fetch("/api/time-tracker/heartbeat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ mouseClicks: clicks, keystrokes: keys })
                })
                if (res.ok) {
                    const data = await res.json()
                    setActivityStatus(data.status)
                }
            } catch { }
        }, HEARTBEAT_INTERVAL)

        return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current) }
    }, [status])

    // ─── Idle detection (client-side prompt) ───
    useEffect(() => {
        if (status !== 'running') return

        const idleCheck = setInterval(() => {
            if (Date.now() - lastActivityRef.current > IDLE_TIMEOUT) {
                setActivityStatus("IDLE")
            }
        }, 30_000)

        return () => clearInterval(idleCheck)
    }, [status])

    // ─── Handlers ───
    const handleCheckIn = async () => {
        try {
            const res = await fetch("/api/time-tracker/check-in", { method: "POST" })
            if (!res.ok) {
                const err = await res.json()
                if (res.status === 409 && err.session) {
                    // Already checked in — restore that session
                    setSessionId(err.session.id)
                    setCheckInTime(new Date(err.session.checkIn))
                    const elapsed = Math.floor((Date.now() - new Date(err.session.checkIn).getTime()) / 1000)
                    setSeconds(elapsed)
                    setStatus("running")
                    toast.info("Restored your existing session")
                    return
                }
                throw new Error(err.error)
            }
            const session = await res.json()
            setSessionId(session.id)
            setCheckInTime(new Date(session.checkIn))
            setSeconds(0)
            setStatus("running")
            setActivityStatus("ACTIVE")
            lastActivityRef.current = Date.now()
            toast.success("Checked in!")
        } catch (e: any) {
            toast.error(e.message || "Failed to check in")
        }
    }

    const handleCheckOut = async () => {
        try {
            const res = await fetch("/api/time-tracker/check-out", { method: "POST" })
            if (!res.ok) throw new Error()
            const result = await res.json()
            setStatus("idle")
            setSeconds(0)
            setSessionId(null)
            setCheckInTime(null)
            setShowBreakMenu(false)
            setTodaySummary({
                totalWork: result.totalWork,
                totalBreak: result.totalBreak,
                totalIdle: result.totalIdle,
                sessions: 1,
            })
            toast.success(`Checked out — Worked ${fmtDuration(result.totalWork)}`)
        } catch {
            toast.error("Failed to check out")
        }
    }

    const handleBreak = async (reason?: string) => {
        const action = status === 'running' ? 'start' : 'end'
        try {
            const res = await fetch("/api/time-tracker/break", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, reason })
            })
            if (!res.ok) throw new Error()
            setStatus(action === 'start' ? 'paused' : 'running')
            setActivityStatus(action === 'start' ? 'BREAK' : 'ACTIVE')
            setShowBreakMenu(false)
            if (action === 'start') toast("Break started", { icon: "☕" })
            else toast.success("Break ended — back to work!")
        } catch {
            toast.error("Failed to toggle break")
        }
    }

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const secs = totalSeconds % 60
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const statusColor = activityStatus === "ACTIVE" ? "52,199,89" : activityStatus === "IDLE" ? "255,149,0" : "255,59,48"
    const statusLabel = status === 'idle' ? 'Offline' : status === 'paused' ? 'On Break' : (activityStatus === "IDLE" ? "Idle" : "Active")

    if (loading) {
        return (
            <Card variant="glass" className="p-6">
                <div className="animate-pulse flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-border" />
                    <div className="h-4 w-32 bg-border rounded" />
                </div>
            </Card>
        )
    }

    return (
        <Card variant="glass" className="p-6 relative">
            {/* Ambient glow when active */}
            {status === 'running' && (
                <div className="absolute inset-0 pointer-events-none" style={{
                    background: `radial-gradient(ellipse at top right, rgba(${statusColor}, 0.06) 0%, transparent 60%)`
                }} />
            )}

            {/* Header */}
            <div className="flex justify-between items-start mb-4 relative">
                <div>
                    <h3 className="text-lg font-bold text-text flex items-center gap-2">
                        ⏱️ Time Tracker
                    </h3>
                    <p className="text-sm text-text-3 mt-1">
                        {status === 'idle' ? 'Not checked in yet' : (
                            status === 'paused' ? '☕ On Break' : `Checked in at ${checkInTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        )}
                    </p>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2">
                    {status !== 'idle' && (
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: `rgb(${statusColor})` }} />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: `rgb(${statusColor})` }} />
                        </span>
                    )}
                    <Badge
                        variant={
                            status === 'running' && activityStatus === "ACTIVE" ? "success" :
                            status === 'running' && activityStatus === "IDLE" ? "warning" :
                            status === 'paused' ? "danger" :
                            "neutral"
                        }
                        className="uppercase tracking-wider font-bold"
                    >
                        {statusLabel}
                    </Badge>
                </div>
            </div>

            {/* Timer + Buttons */}
            <div className="flex items-center justify-between relative">
                <div className="font-mono text-[32px] font-bold text-text tracking-tight tabular-nums">
                    {formatTime(seconds)}
                </div>

                <div className="flex gap-2 relative">
                    {status === 'idle' ? (
                        <Button
                            onClick={handleCheckIn}
                            variant="primary"
                            leftIcon={<PlayIcon />}
                            className="shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform"
                        >
                            Check In
                        </Button>
                    ) : (
                        <>
                            {/* Break button with dropdown */}
                            <div className="relative">
                                <Button
                                    onClick={() => {
                                        if (status === 'paused') handleBreak()
                                        else setShowBreakMenu(!showBreakMenu)
                                    }}
                                    variant={status === 'paused' ? "success" : "danger"}
                                    leftIcon={status === 'paused' ? <ResumeIcon /> : <PauseIcon />}
                                    className={cn(
                                        status === 'paused'
                                            ? "bg-success/10 text-success border-success/20"
                                            : "bg-warning/10 text-warning border-warning/20"
                                    )}
                                >
                                    {status === 'paused' ? 'Resume' : 'Break'}
                                </Button>

                                {/* Break reason dropdown */}
                                {showBreakMenu && status === 'running' && (
                                    <div className="absolute top-full mt-2 right-0 rounded-xl shadow-2xl z-50 py-1 w-44" style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        {BREAK_REASONS.map(reason => (
                                            <button
                                                key={reason}
                                                onClick={() => handleBreak(reason)}
                                                className="w-full px-4 py-2.5 text-left text-base text-white/90 hover:bg-white/5 transition-colors flex items-center gap-2"
                                            >
                                                <span>{reason === "Lunch" ? "🍽️" : reason === "Tea / Coffee" ? "☕" : reason === "Personal" ? "🏠" : reason === "Meeting" ? "📞" : "📝"}</span>
                                                {reason}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Button
                                onClick={handleCheckOut}
                                variant="danger"
                                leftIcon={<StopIcon />}
                            >
                                Check Out
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Today's Summary */}
            {(status !== 'idle' || todaySummary) && (
                <div className="mt-4 pt-3 border-t border-border flex items-center gap-6 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-success" />
                        <span className="text-text-3 uppercase tracking-wider">Worked</span>
                        <span className="text-text font-bold">{fmtDuration(todaySummary?.totalWork || seconds)}</span>
                    </div>
                    {(todaySummary?.totalBreak || 0) > 0 && (
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-warning" />
                            <span className="text-text-3 uppercase tracking-wider">Break</span>
                            <span className="text-text font-bold">{fmtDuration(todaySummary?.totalBreak || 0)}</span>
                        </div>
                    )}
                    {(todaySummary?.totalIdle || 0) > 0 && (
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-text-4" />
                            <span className="text-text-3 uppercase tracking-wider">Idle</span>
                            <span className="text-text font-bold">{fmtDuration(todaySummary?.totalIdle || 0)}</span>
                        </div>
                    )}
                </div>
            )}
        </Card>
    )
}
