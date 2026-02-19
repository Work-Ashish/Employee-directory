"use client"

import { useState, useEffect } from "react"
import { PlayIcon, StopIcon, PauseIcon, ResumeIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"

export function TimeTracker() {
    const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle')
    const [seconds, setSeconds] = useState(0)
    const [startTime, setStartTime] = useState<Date | null>(null)

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (status === 'running') {
            interval = setInterval(() => {
                setSeconds(prev => prev + 1)
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [status])

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const secs = totalSeconds % 60
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const handleCheckIn = () => {
        setStatus('running')
        setStartTime(new Date())
    }

    const handleCheckOut = () => {
        setStatus('idle')
        setSeconds(0)
        setStartTime(null)
    }

    const handleBreak = () => {
        setStatus(status === 'running' ? 'paused' : 'running')
    }

    return (
        <div className="glass p-6 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-[16px] font-bold text-[var(--text)] flex items-center gap-2">
                        ⏱️ Time Tracker
                    </h3>
                    <p className="text-[12px] text-[var(--text3)] mt-1">
                        {status === 'idle' ? 'Not checked in yet' : (
                            status === 'paused' ? 'On Break' : `Checked in at ${startTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        )}
                    </p>
                </div>
                <div className={cn("px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border",
                    status === 'running' ? "bg-[rgba(52,199,89,0.1)] text-[#1a9140] border-[rgba(52,199,89,0.2)]" :
                        (status === 'paused' ? "bg-[rgba(255,149,0,0.1)] text-[var(--amber)] border-[rgba(255,149,0,0.2)]" : "bg-[var(--bg2)] text-[var(--text3)] border-[var(--border)]")
                )}>
                    {status === 'idle' ? 'Offline' : (status === 'running' ? 'Active' : 'Paused')}
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="font-mono text-[32px] font-bold text-[var(--text)] tracking-tight">
                    {formatTime(seconds)}
                </div>

                <div className="flex gap-2">
                    {status === 'idle' ? (
                        <button
                            onClick={handleCheckIn}
                            className="bg-[var(--accent)] text-white px-4 py-2 rounded-lg text-[13px] font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform flex items-center gap-2"
                        >
                            <PlayIcon /> Check In
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleBreak}
                                className={cn("px-4 py-2 rounded-lg text-[13px] font-bold transition-colors flex items-center gap-2 border",
                                    status === 'paused' ? "bg-[rgba(52,199,89,0.1)] text-[#1a9140] border-[rgba(52,199,89,0.2)]" : "bg-[rgba(255,149,0,0.1)] text-[var(--amber)] border-[rgba(255,149,0,0.2)]"
                                )}
                            >
                                {status === 'paused' ? <><ResumeIcon /> Resume</> : <><PauseIcon /> Break</>}
                            </button>
                            <button
                                onClick={handleCheckOut}
                                className="bg-[rgba(255,59,48,0.1)] text-[var(--red)] border border-[rgba(255,59,48,0.2)] px-4 py-2 rounded-lg text-[13px] font-bold hover:bg-[rgba(255,59,48,0.2)] transition-colors flex items-center gap-2"
                            >
                                <StopIcon /> Check Out
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
