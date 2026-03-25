"use client"

import * as React from "react"
import { cn, extractArray } from "@/lib/utils"
import { PaperPlaneIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"
import { Avatar } from "@/components/ui/Avatar"
import { Button } from "@/components/ui/Button"
import { Spinner } from "@/components/ui/Spinner"
import { hasPermission, Module, Action } from "@/lib/permissions"
import { useAuth } from "@/context/AuthContext"
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

interface Employee {
    id: string
    firstName: string
    lastName: string
}

export function KudosSidebarWidget() {
    const { user } = useAuth()
    const [kudos, setKudos] = React.useState<KudosData[]>([])
    const [employees, setEmployees] = React.useState<Employee[]>([])
    const [loading, setLoading] = React.useState(true)
    const [sending, setSending] = React.useState(false)
    const [toId, setToId] = React.useState("")
    const [message, setMessage] = React.useState("")
    const [showForm, setShowForm] = React.useState(false)

    const canCreate = hasPermission(user?.role ?? "", Module.FEEDBACK, Action.CREATE)

    const fetchData = React.useCallback(async () => {
        try {
            setLoading(true)
            // Fetch independently so one failure doesn't block the other
            const [kudosResult, empResult] = await Promise.allSettled([
                AnnouncementAPI.listKudos(),
                EmployeeAPI.fetchEmployees(1, 200),
            ])

            if (kudosResult.status === "fulfilled") {
                const rawKudos = (kudosResult.value as any)?.results || extractArray<any>(kudosResult.value)
                setKudos(rawKudos.map((k: any) => ({
                    id: k.id,
                    from: k.fromEmployeeName || k.from || "Unknown",
                    to: k.toEmployeeName || k.to || "Unknown",
                    message: k.message || "",
                    time: k.createdAt || k.time || "",
                    color: k.color || "",
                })))
            }

            if (empResult.status === "fulfilled") {
                setEmployees((empResult.value as any)?.results || extractArray<Employee>(empResult.value))
            }
        } catch {
            console.error("Failed to fetch kudos")
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => { fetchData() }, [fetchData])

    const handleSend = async () => {
        if (!toId || message.trim().length < 2) {
            toast.error("Select a recipient and write a message")
            return
        }
        setSending(true)
        try {
            await AnnouncementAPI.createKudos({ toEmployeeId: toId, message })
            toast.success("Kudos sent!")
            setToId("")
            setMessage("")
            setShowForm(false)
            fetchData()
        } catch (error: any) {
            toast.error(error.message || "Failed to send kudos")
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="glass p-[22px]">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🏆</span>
                    <span className="text-base font-bold text-text">Kudos</span>
                </div>
                <div className="flex items-center gap-2">
                    {loading && <Spinner size="sm" />}
                    {canCreate && !showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="text-[10px] text-accent hover:underline font-semibold"
                        >
                            + Give Kudos
                        </button>
                    )}
                </div>
            </div>

            {/* Send Kudos Form */}
            {showForm && canCreate && (
                <div className="mb-4 p-3 bg-bg-2 rounded-xl border border-border space-y-2">
                    <select
                        value={toId}
                        onChange={e => setToId(e.target.value)}
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
                    >
                        <option value="">Select employee...</option>
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                                {emp.firstName} {emp.lastName}
                            </option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSend()}
                            placeholder="Great work on..."
                            maxLength={200}
                            className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:border-accent text-text placeholder:text-text-4"
                        />
                        <Button
                            size="icon"
                            onClick={handleSend}
                            disabled={sending || !toId || message.trim().length < 2}
                            loading={sending}
                            leftIcon={!sending ? <PaperPlaneIcon className="w-3.5 h-3.5" /> : undefined}
                            className="w-8 h-8 shrink-0"
                        />
                    </div>
                    <button
                        onClick={() => { setShowForm(false); setToId(""); setMessage("") }}
                        className="text-[10px] text-text-3 hover:text-text font-medium"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Recent Kudos */}
            <div className="space-y-3">
                {loading ? (
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-[48px] bg-bg-2 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : kudos.length === 0 ? (
                    <div className="text-xs text-text-3 italic py-6 text-center">
                        No kudos yet. Be the first to appreciate a colleague!
                    </div>
                ) : (
                    kudos.slice(0, 5).map((k, i) => (
                        <div
                            key={k.id}
                            className="flex items-start gap-2.5 animate-[fadeRow_0.3s_both]"
                            style={{ animationDelay: `${i * 0.08}s` }}
                        >
                            <Avatar name={k.from} size="xs" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs">
                                    <span className="font-bold text-text">{k.from}</span>
                                    <span className="text-text-3"> → </span>
                                    <span className="font-bold text-accent">{k.to}</span>
                                </div>
                                <p className="text-[11px] text-text-2 leading-snug line-clamp-2 mt-0.5">{k.message}</p>
                                <span className="text-[9px] text-text-4">{k.time}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
