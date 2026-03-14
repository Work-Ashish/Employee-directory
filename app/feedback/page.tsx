"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { canAccessModule, Module } from "@/lib/permissions"
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
    fromEmployee: { id: string; firstName: string; lastName: string; avatarUrl?: string | null } | null
    toEmployee: { id: string; firstName: string; lastName: string; avatarUrl?: string | null }
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
            const fbRes = await fetch("/api/feedback")
            if (fbRes.ok) {
                const json = await fbRes.json()
                setFeedbackList(extractArray<Feedback>(json))
                setIsAdmin(json.meta?.isAdmin === true)
                // Employee list is returned in meta from the feedback API
                if (json.meta?.employees) {
                    setEmployees(json.meta.employees)
                }
            }
        } catch {
            toast.error("Failed to load feedback")
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => { fetchData() }, [fetchData])

    const myEmployeeId = React.useMemo(() => {
        if (!user) return null
        const me = employees.find(e =>
            `${e.firstName} ${e.lastName}`.toLowerCase() === user.name?.toLowerCase()
        )
        return me?.id || null
    }, [user, employees])

    const filteredFeedback = React.useMemo(() => {
        if (isAdmin && tab === "all") return feedbackList
        if (tab === "received") return feedbackList.filter(f => f.toEmployeeId === myEmployeeId)
        if (tab === "sent") return feedbackList.filter(f => f.fromEmployeeId === myEmployeeId)
        return feedbackList
    }, [feedbackList, tab, myEmployeeId, isAdmin])

    const receivedCount = React.useMemo(() => feedbackList.filter(f => f.toEmployeeId === myEmployeeId).length, [feedbackList, myEmployeeId])
    const sentCount = React.useMemo(() => feedbackList.filter(f => f.fromEmployeeId === myEmployeeId).length, [feedbackList, myEmployeeId])

    const filteredEmployees = React.useMemo(() => {
        if (!empSearch.trim()) return employees
        const q = empSearch.toLowerCase()
        return employees.filter(e =>
            `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
            (e.designation || "").toLowerCase().includes(q) ||
            (e.department?.name || "").toLowerCase().includes(q)
        )
    }, [employees, empSearch])

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
        if (!period) { toast.error("Period is required"); return }

        setSubmitting(true)
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ toEmployeeId, content, rating, isAnonymous, period }),
            })
            if (res.ok) {
                toast.success("Feedback submitted successfully")
                setShowCreate(false)
                resetForm()
                fetchData()
            } else {
                const err = await res.json().catch(() => null)
                toast.error(err?.error?.message || err?.message || "Failed to submit feedback")
            }
        } catch {
            toast.error("An error occurred")
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
                        <button
                            key={fb.id}
                            onClick={() => setViewFeedback(fb)}
                            className="w-full text-left"
                        >
                            <Card className="p-4 hover:border-accent/30 transition-all group">
                                <div className="flex items-start gap-3">
                                    <Avatar
                                        name={
                                            tab === "sent"
                                                ? `${fb.toEmployee.firstName} ${fb.toEmployee.lastName}`
                                                : fb.fromEmployee
                                                    ? `${fb.fromEmployee.firstName} ${fb.fromEmployee.lastName}`
                                                    : "Anonymous"
                                        }
                                        src={tab === "sent" ? fb.toEmployee.avatarUrl || undefined : fb.fromEmployee?.avatarUrl || undefined}
                                        size="sm"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                {tab === "sent" ? (
                                                    <span className="text-sm font-semibold text-text">
                                                        To: {fb.toEmployee.firstName} {fb.toEmployee.lastName}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm font-semibold text-text">
                                                        {fb.fromEmployee
                                                            ? `${fb.fromEmployee.firstName} ${fb.fromEmployee.lastName}`
                                                            : "Anonymous"}
                                                    </span>
                                                )}
                                                {isAdmin && tab === "all" && (
                                                    <span className="text-xs text-text-4">
                                                        {fb.fromEmployee ? `${fb.fromEmployee.firstName}` : "Anon"} → {fb.toEmployee.firstName}
                                                    </span>
                                                )}
                                                <Badge variant="neutral" size="sm">{fb.period}</Badge>
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
                        </button>
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

                        {/* Period */}
                        <div>
                            <label className="block text-sm font-medium text-text mb-1.5">Period</label>
                            <input
                                type="text"
                                value={period}
                                onChange={e => setPeriod(e.target.value)}
                                placeholder="e.g. 2026-Q1"
                                className="w-full px-3 py-2 text-sm bg-bg-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-text placeholder:text-text-4"
                            />
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
                                    <Badge variant="neutral">{viewFeedback.period}</Badge>
                                    {viewFeedback.isAnonymous && <Badge variant="warning">Anonymous</Badge>}
                                </div>
                                <StarRating value={viewFeedback.rating} readonly />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-bg-2 rounded-lg p-3">
                                    <div className="text-xs text-text-3 mb-1">From</div>
                                    <div className="flex items-center gap-2">
                                        <Avatar
                                            name={viewFeedback.fromEmployee ? `${viewFeedback.fromEmployee.firstName} ${viewFeedback.fromEmployee.lastName}` : "Anonymous"}
                                            src={viewFeedback.fromEmployee?.avatarUrl || undefined}
                                            size="xs"
                                        />
                                        <span className="text-sm font-medium text-text">
                                            {viewFeedback.fromEmployee
                                                ? `${viewFeedback.fromEmployee.firstName} ${viewFeedback.fromEmployee.lastName}`
                                                : "Anonymous"}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-bg-2 rounded-lg p-3">
                                    <div className="text-xs text-text-3 mb-1">To</div>
                                    <div className="flex items-center gap-2">
                                        <Avatar
                                            name={`${viewFeedback.toEmployee.firstName} ${viewFeedback.toEmployee.lastName}`}
                                            src={viewFeedback.toEmployee?.avatarUrl || undefined}
                                            size="xs"
                                        />
                                        <span className="text-sm font-medium text-text">
                                            {viewFeedback.toEmployee.firstName} {viewFeedback.toEmployee.lastName}
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
