"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { PaperPlaneIcon, HeartFilledIcon, ReloadIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Avatar } from "@/components/ui/Avatar"
import { Spinner } from "@/components/ui/Spinner"
import { AnnouncementAPI } from "@/features/announcements/api/client"
import { EmployeeAPI } from "@/features/employees/api/client"

interface KudosData {
    id: string
    from: string
    to: string
    message: string
    time: string
    color: string
}

export function KudosWidget() {
    const [kudos, setKudos] = useState<KudosData[]>([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [message, setMessage] = useState("")
    const [selectedRecipient, setSelectedRecipient] = useState("")
    const [colleagues, setColleagues] = useState<{ id: string, name: string }[]>([])

    const fetchKudos = useCallback(async () => {
        try {
            const data = await AnnouncementAPI.listKudos()
            const list = Array.isArray(data) ? data : data.results || (data as any).data || []
            setKudos(list as unknown as KudosData[])
        } catch (error) {
            console.error("Failed to fetch kudos:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchColleagues = useCallback(async () => {
        try {
            const data = await EmployeeAPI.fetchEmployees(1, 100)
            const list = data.results || (data as any).data || []
            setColleagues(list.map((e: any) => ({
                id: e.id,
                name: `${e.firstName} ${e.lastName}`
            })))
        } catch (error) {
            console.error("Failed to fetch colleagues:", error)
        }
    }, [])

    useEffect(() => {
        fetchKudos()
        fetchColleagues()
        const interval = setInterval(fetchKudos, 60000)
        return () => clearInterval(interval)
    }, [fetchKudos, fetchColleagues])

    const handleSendKudos = async () => {
        if (!selectedRecipient || !message.trim()) return

        setSending(true)
        try {
            await AnnouncementAPI.createKudos({ toId: selectedRecipient, message })
            toast.success("Shoutout sent! 🎉")
            setMessage("")
            setSelectedRecipient("")
            fetchKudos()
        } catch (error: any) {
            toast.error(error.message || "Failed to send shoutout")
        } finally {
            setSending(false)
        }
    }

    return (
        <Card variant="glass" className="p-6 relative overflow-hidden group min-h-[400px]">
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <span className="text-[20px]">🎉</span>
                    <h3 className="text-md font-bold text-text">Peer Kudos</h3>
                </div>
                {loading && <Spinner size="sm" className="text-text-3" />}
            </div>

            <div className="relative z-10 mb-5">
                <div className="text-sm text-text-3 mb-2 uppercase tracking-wider font-semibold">Send Appreciation</div>
                <div className="space-y-2">
                    <select
                        value={selectedRecipient}
                        onChange={(e) => setSelectedRecipient(e.target.value)}
                        className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-base outline-none focus:border-accent transition-colors appearance-none"
                    >
                        <option value="">Select colleague...</option>
                        {colleagues.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendKudos()}
                            placeholder="Type a nice message..."
                            className="flex-1"
                        />
                        <Button
                            onClick={handleSendKudos}
                            disabled={sending || !selectedRecipient || !message.trim()}
                            size="icon"
                            variant="primary"
                            loading={sending}
                            leftIcon={!sending ? <PaperPlaneIcon className="w-4 h-4" /> : undefined}
                            className="w-9 h-9 shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform"
                        />
                    </div>
                </div>
            </div>

            <div className="relative z-10 space-y-3">
                <div className="text-sm text-text-3 mb-2 uppercase tracking-wider font-semibold">Recent Shoutouts</div>
                {loading ? (
                    Array(2).fill(0).map((_, i) => (
                        <div key={i} className="h-16 w-full bg-bg-2 rounded-xl animate-pulse" />
                    ))
                ) : kudos.length > 0 ? (
                    kudos.map((k, i) => (
                        <div key={k.id} className="flex gap-3 items-start animate-[fadeRow_0.3s_both]" style={{ animationDelay: `${i * 0.1}s` }}>
                            <Avatar name={k.from} size="sm" />
                            <div className="flex-1 bg-surface-2 p-3 rounded-r-xl rounded-bl-xl text-base border border-border relative">
                                <span className="font-bold text-text">{k.from} → {k.to}</span>
                                <p className="text-text-2 mt-0.5 leading-snug">{k.message}</p>
                                <span className="text-[10px] text-text-3 absolute right-2 top-2">{k.time}</span>
                                <div className="absolute -left-2 top-0 w-2 h-2 bg-surface-2 [clip-path:polygon(100%_0,0_0,100%_100%)]"></div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-sm text-text-3 py-4 text-center italic">
                        No shoutouts yet. Be the first! 🌟
                    </div>
                )}
            </div>

            <div className="absolute -right-6 -bottom-6 text-[100px] opacity-[0.03] rotate-[-15deg] pointer-events-none">
                <HeartFilledIcon />
            </div>
        </Card>
    )
}
