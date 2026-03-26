"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { canAccessModule, hasAdminScope, Module } from "@/lib/permissions"
import { extractArray } from "@/lib/utils"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { Spinner } from "@/components/ui/Spinner"
import { Dialog, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/Dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { MagnifyingGlassIcon, PaperPlaneIcon, ChatBubbleIcon } from "@radix-ui/react-icons"
import { FeedbackAPI } from "@/features/feedback/api/client"
import { EmployeeAPI } from "@/features/employees/api/client"

interface Employee {
    id: string
    firstName: string
    lastName: string
    avatarUrl?: string | null
    designation?: string
    department?: { name: string }
}

interface Feedback {
    id: string
    content: string
    rating: number
    isAnonymous: boolean
    period: string
    createdAt: string
    fromEmployeeId: string | null
    toEmployeeId: string
    fromEmployeeName: string | null
    toEmployeeName: string | null
    type: string
}

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
    const [hover, setHover] = React.useState(0)
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    disabled={readonly}
                    onClick={() => onChange?.(star)}
                    onMouseEnter={() => !readonly && setHover(star)}
                    onMouseLeave={() => !readonly && setHover(0)}
                    className={cn(
                        "text-lg transition-colors",
                        readonly ? "cursor-default" : "cursor-pointer",
                        (hover || value) >= star ? "text-warning" : "text-text-4"
                    )}
                >
                    ★
                </button>
            ))}
        </div>
    )
}

function getCurrentQuarter(): string {
    const now = new Date()
    const q = Math.ceil((now.getMonth() + 1) / 3)
    return `${now.getFullYear()}-Q${q}`
}

export default function FeedbackPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const [feedbackList, setFeedbackList] = React.useState<Feedback[]>([])
    const [employees, setEmployees] = React.useState<Employee[]>([])
    const [loading, setLoading] = React.useState(true)
    const [isAdmin, setIsAdmin] = React.useState(false)
    const [tab, setTab] = React.useState<"received" | "sent" | "all">("received")
    const [showCreate, setShowCreate] = React.useState(false)
    const [submitting, setSubmitting] = React.useState(false)
    const [viewFeedback, setViewFeedback] = React.useState<Feedback | null>(null)

    // Create form state
    const [toEmployeeId, setToEmployeeId] = React.useState("")
    const [content, setContent] = React.useState("")
    const [rating, setRating] = React.useState(0)
    const [isAnonymous, setIsAnonymous] = React.useState(false)
    const [period, setPeriod] = React.useState(getCurrentQuarter())
    const [empSearch, setEmpSearch] = React.useState("")

    React.useEffect(() => {
        if (!authLoading && !canAccessModule(user?.role ?? "", Module.FEEDBACK)) {
            router.push("/")
        }
    }, [user, authLoading, router])

    const fetchData = React.useCallback(async () => {
        try {
            setLoading(true)
            const [fbData, empData] = await Promise.all([
                FeedbackAPI.list(),
                EmployeeAPI.fetchEmployees(1, 500),
            ])
            const rawFb = (fbData as any)?.results || extractArray<any>(fbData)
            const mappedFb: Feedback[] = rawFb.map((f: any) => {
                // Django returns from_employee/to_employee as UUIDs, camelCased by api-client
                const fromId = f.fromEmployee || f.fromEmployeeId || null
                const toId = f.toEmployee || f.toEmployeeId || null
                return {
                    id: f.id,
                    content: f.content || "",
                    rating: f.rating || 0,
                    isAnonymous: f.isAnonymous || false,
                    period: f.period || "",
                    createdAt: f.createdAt || f.created_at || "",
                    fromEmployeeId: typeof fromId === 'string' ? fromId : null,
                    toEmployeeId: typeof toId === 'string' ? toId : "",
                    fromEmployeeName: f.fromEmployeeName || f.from_employee_name || (f.isAnonymous ? "Anonymous" : null),
                    toEmployeeName: f.toEmployeeName || f.to_employee_name || null,
                    type: f.type || "PEER",
                }
            })
            setFeedbackList(mappedFb)
            setIsAdmin(hasAdminScope(user?.role ?? "", Module.FEEDBACK))
            setEmployees(empData.results || extractArray<Employee>(empData))
        } catch {
            toast.error("Failed to load feedback")
        } finally {
            setLoading(false)
        }
    }, [user?.role])

    React.useEffect(() => { fetchData() }, [fetchData])

    const myEmployeeId = React.useMemo(() => {
        if (!user) return null
        // Prefer direct employeeId from auth context
        const directId = (user as any).employeeId
        if (directId) {
            const resolved = String(directId).trim()
            console.debug("[Feedback] myEmployeeId from auth context:", resolved)
            return resolved
        }
        // Fallback: match by name
        const me = employees.find(e =>
            `${e.firstName} ${e.lastName}`.toLowerCase() === user.name?.toLowerCase()
        )
        const fallbackId = me?.id ? String(me.id).trim() : null
        console.debug("[Feedback] myEmployeeId from name match:", fallbackId, "| user.name:", user.name)
        return fallbackId
    }, [user, employees])

    const filteredFeedback = React.useMemo(() => {
        if (isAdmin && tab === "all") return feedbackList
        const myId = myEmployeeId ? String(myEmployeeId).trim() : null
        if (tab === "received") {
            // Feedback where I am the recipient AND I am NOT the sender
            return feedbackList.filter(f => {
                const toId = f.toEmployeeId ? String(f.toEmployeeId).trim() : ""
                const fromId = f.fromEmployeeId ? String(f.fromEmployeeId).trim() : ""
                return toId === myId && fromId !== myId
            })
        }
        if (tab === "sent") {
            // Feedback where I am the sender
            return feedbackList.filter(f => {
                const fromId = f.fromEmployeeId ? String(f.fromEmployeeId).trim() : ""
                return fromId === myId
            })
        }
        return feedbackList
    }, [feedbackList, tab, myEmployeeId, isAdmin])

    const receivedCount = React.useMemo(() => {
        const myId = myEmployeeId ? String(myEmployeeId).trim() : null
        return feedbackList.filter(f => {
            const toId = f.toEmployeeId ? String(f.toEmployeeId).trim() : ""
            const fromId = f.fromEmployeeId ? String(f.fromEmployeeId).trim() : ""
            return toId === myId && fromId !== myId
        }).length
    }, [feedbackList, myEmployeeId])
    const sentCount = React.useMemo(() => {
        const myId = myEmployeeId ? String(myEmployeeId).trim() : null
        return feedbackList.filter(f => {
            const fromId = f.fromEmployeeId ? String(f.fromEmployeeId).trim() : ""
            return fromId === myId
        }).length
    }, [feedbackList, myEmployeeId])

    const filteredEmployees = React.useMemo(() => {
        // Exclude self from employee picker
        const others = employees.filter(e => e.id !== myEmployeeId)
        if (!empSearch.trim()) return others
        const q = empSearch.toLowerCase()
        return others.filter(e =>
            `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
            (e.designation || "").toLowerCase().includes(q) ||
            (e.department?.name || "").toLowerCase().includes(q)
        )
    }, [employees, empSearch, myEmployeeId])

    const resetForm = () => {
        setToEmployeeId("")
        setContent("")
        setRating(0)
        setIsAnonymous(false)
        setPeriod(getCurrentQuarter())
        setEmpSearch("")
    }

    const handleSubmit = async () => {
        if (!toEmployeeId) { toast.error("Select an employee"); return }
        if (rating === 0) { toast.error("Select a rating"); return }
        if (content.length < 10) { toast.error("Feedback must be at least 10 characters"); return }
        setSubmitting(true)
        try {
            await FeedbackAPI.create({
                toEmployeeId,
                content,
                rating,
                isAnonymous,
                type: isAnonymous ? "ANONYMOUS" : "PEER",
            })
            toast.success("Feedback submitted successfully")
            setShowCreate(false)
            resetForm()
            fetchData()
        } catch (error: any) {
            toast.error(error.message || "Failed to submit feedback")
        } finally {
            setSubmitting(false)
        }
    }

    if (authLoading || loading) return <div className="p-6 text-text-3 flex items-center gap-2"><Spinner /> Loading...</div>

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="Feedback"
                description="Give and receive feedback from colleagues"
                actions={
                    <Button onClick={() => { resetForm(); setShowCreate(true) }}>
                        Give Feedback
                    </Button>
                }
            />

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-bg-2 rounded-lg p-1 w-fit">
                <button
                    onClick={() => setTab("received")}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-all",
                        tab === "received" ? "bg-surface text-text shadow-sm" : "text-text-3 hover:text-text"
                    )}
                >
                    Received {receivedCount > 0 && <span className="ml-1.5 text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">{receivedCount}</span>}
                </button>
                <button
                    onClick={() => setTab("sent")}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-all",
                        tab === "sent" ? "bg-surface text-text shadow-sm" : "text-text-3 hover:text-text"
                    )}
                >
                    Sent {sentCount > 0 && <span className="ml-1.5 text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">{sentCount}</span>}
                </button>
                {isAdmin && (
                    <button
                        onClick={() => setTab("all")}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all",
                            tab === "all" ? "bg-surface text-text shadow-sm" : "text-text-3 hover:text-text"
                        )}
                    >
                        All <span className="ml-1.5 text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">{feedbackList.length}</span>
                    </button>
                )}
            </div>

            {/* Feedback List */}
            {filteredFeedback.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                        <ChatBubbleIcon className="w-7 h-7 text-blue-500" />
                    </div>
                    <p className="text-sm text-text-3 font-medium">
                        {tab === "received" ? "No feedback received yet" : tab === "sent" ? "You haven't sent any feedback yet" : "No feedback found"}
                    </p>
                    <Button variant="secondary" size="sm" onClick={() => { resetForm(); setShowCreate(true) }}>
                        Give Feedback
                    </Button>
                </div>
            ) : (
                <div className="grid gap-3">
                    {filteredFeedback.map(fb => (
                        <div
                            key={fb.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setViewFeedback(fb)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setViewFeedback(fb) }}
                            className="w-full text-left cursor-pointer"
                        >
                            <Card className="p-4 hover:border-accent/30 transition-all group">
                                <div className="flex items-start gap-3">
                                    <Avatar
                                        name={
                                            tab === "sent"
                                                ? (fb.toEmployeeName || "Unknown")
                                                : (fb.fromEmployeeName || "Anonymous")
                                        }
                                        size="sm"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                {tab === "sent" ? (
                                                    <span className="text-sm font-semibold text-text">
                                                        To: {fb.toEmployeeName || "Unknown"}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm font-semibold text-text">
                                                        {fb.fromEmployeeName || "Anonymous"}
                                                    </span>
                                                )}
                                                {isAdmin && tab === "all" && (
                                                    <span className="text-xs text-text-4">
                                                        {fb.fromEmployeeName || "Anon"} → {fb.toEmployeeName || "Unknown"}
                                                    </span>
                                                )}
                                                {fb.period ? <Badge variant="neutral" size="sm">{fb.period}</Badge> : <Badge variant="neutral" size="sm">{fb.type}</Badge>}
                                                {fb.isAnonymous && <Badge variant="warning" size="sm">Anonymous</Badge>}
                                            </div>
                                            <StarRating value={fb.rating} readonly />
                                        </div>
                                        <p className="text-sm text-text-2 line-clamp-2">{fb.content}</p>
                                        <div className="text-xs text-text-4 mt-1.5">
                                            {new Date(fb.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity self-center">
                                        View →
                                    </span>
                                </div>
                            </Card>
                        </div>
                    ))}
                </div>
            )}

            {/* Give Feedback Dialog */}
            <Dialog open={showCreate} onClose={() => setShowCreate(false)} size="lg">
                <DialogHeader>
                    <DialogTitle>Give Feedback</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <div className="space-y-5">
                        {/* Employee Picker */}
                        <div>
                            <label className="block text-sm font-medium text-text mb-1.5">To Employee</label>
                            <div className="relative mb-2">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-4" />
                                <input
                                    type="text"
                                    placeholder="Search employees..."
                                    value={empSearch}
                                    onChange={e => setEmpSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-bg-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-text placeholder:text-text-4"
                                />
                            </div>
                            <div className="max-h-40 overflow-y-auto border border-border rounded-lg bg-bg-2">
                                {filteredEmployees.length === 0 ? (
                                    <div className="text-center py-4 text-sm text-text-3">No employees found</div>
                                ) : (
                                    filteredEmployees.map(emp => (
                                        <button
                                            key={emp.id}
                                            type="button"
                                            onClick={() => { setToEmployeeId(emp.id); setEmpSearch("") }}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                                                toEmployeeId === emp.id ? "bg-accent/10" : "hover:bg-bg-2/80"
                                            )}
                                        >
                                            <Avatar name={`${emp.firstName} ${emp.lastName}`} src={emp.avatarUrl || undefined} size="xs" />
                                            <div className="flex-1 min-w-0">
                                                <div className={cn("text-sm truncate", toEmployeeId === emp.id ? "font-semibold text-accent" : "text-text")}>
                                                    {emp.firstName} {emp.lastName}
                                                </div>
                                                <div className="text-[11px] text-text-3 truncate">
                                                    {emp.designation || emp.department?.name || "Employee"}
                                                </div>
                                            </div>
                                            {toEmployeeId === emp.id && <span className="text-accent text-sm">✓</span>}
                                        </button>
                                    ))
                                )}
                            </div>
                            {toEmployeeId && (
                                <div className="mt-2 text-xs text-text-3">
                                    Selected: <span className="font-medium text-text">{employees.find(e => e.id === toEmployeeId)?.firstName} {employees.find(e => e.id === toEmployeeId)?.lastName}</span>
                                </div>
                            )}
                        </div>

                        {/* Rating */}
                        <div>
                            <label className="block text-sm font-medium text-text mb-1.5">Rating</label>
                            <StarRating value={rating} onChange={setRating} />
                        </div>

                        {/* Content */}
                        <div>
                            <label className="block text-sm font-medium text-text mb-1.5">Feedback</label>
                            <textarea
                                rows={4}
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="Write your feedback here (min 10 characters)..."
                                className="w-full px-3 py-2 text-sm bg-bg-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-text placeholder:text-text-4 resize-none"
                            />
                            <div className="text-xs text-text-4 mt-1">{content.length}/500</div>
                        </div>

                        {/* Anonymous Toggle */}
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={e => setIsAnonymous(e.target.checked)}
                                className="w-4 h-4 rounded border-border text-accent focus:ring-accent/30"
                            />
                            <div>
                                <span className="text-sm font-medium text-text">Submit anonymously</span>
                                <p className="text-xs text-text-3">Your name will be hidden from the recipient</p>
                            </div>
                        </label>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" onClick={() => setShowCreate(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit} disabled={submitting}>
                                {submitting ? <><Spinner /> Submitting...</> : <>
                                    <PaperPlaneIcon className="w-4 h-4 mr-1" />
                                    Submit Feedback
                                </>}
                            </Button>
                        </div>
                    </div>
                </DialogBody>
            </Dialog>

            {/* View Feedback Detail */}
            <Dialog open={!!viewFeedback} onClose={() => setViewFeedback(null)} size="lg">
                <DialogHeader>
                    <DialogTitle>Feedback Detail</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    {viewFeedback && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {viewFeedback.period ? <Badge variant="neutral">{viewFeedback.period}</Badge> : <Badge variant="neutral">{viewFeedback.type}</Badge>}
                                    {viewFeedback.isAnonymous && <Badge variant="warning">Anonymous</Badge>}
                                </div>
                                <StarRating value={viewFeedback.rating} readonly />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-bg-2 rounded-lg p-3">
                                    <div className="text-xs text-text-3 mb-1">From</div>
                                    <div className="flex items-center gap-2">
                                        <Avatar
                                            name={viewFeedback.fromEmployeeName || "Anonymous"}
                                            size="xs"
                                        />
                                        <span className="text-sm font-medium text-text">
                                            {viewFeedback.fromEmployeeName || "Anonymous"}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-bg-2 rounded-lg p-3">
                                    <div className="text-xs text-text-3 mb-1">To</div>
                                    <div className="flex items-center gap-2">
                                        <Avatar
                                            name={viewFeedback.toEmployeeName || "Unknown"}
                                            size="xs"
                                        />
                                        <span className="text-sm font-medium text-text">
                                            {viewFeedback.toEmployeeName || "Unknown"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="text-xs text-text-3 mb-1">Feedback</div>
                                <p className="text-sm text-text-2 leading-relaxed bg-bg-2 rounded-lg p-3">{viewFeedback.content}</p>
                            </div>

                            <div className="text-xs text-text-4">
                                Submitted on {new Date(viewFeedback.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                            </div>
                        </div>
                    )}
                </DialogBody>
            </Dialog>
        </div>
    )
}
