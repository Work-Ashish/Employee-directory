"use client"

import { useState, useEffect, useCallback } from "react"
import { cn, extractArray } from "@/lib/utils"
import { TicketAPI } from "@/features/tickets/api/client"
import { PlusIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons"
import { PageHeader } from "@/components/ui/PageHeader"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Card, CardContent, CardTitle } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"
import { Spinner } from "@/components/ui/Spinner"
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/Dialog"
import { toast } from "sonner"
import { format } from "date-fns"
import { useAuth } from "@/context/AuthContext"
import { Roles } from "@/lib/permissions"

type Ticket = {
    id: string
    ticketCode: string
    subject: string
    description: string | null
    category: string
    priority: string
    status: string
    createdAt: string
    employee?: {
        id: string
        firstName: string
        lastName: string
        employeeCode: string
    }
}

const categoryOptions = [
    { value: "", label: "Select category..." },
    { value: "IT_SUPPORT", label: "IT Support" },
    { value: "HR", label: "HR & Compliance" },
    { value: "PAYROLL", label: "Payroll & Finance" },
    { value: "FACILITIES", label: "Facilities" },
    { value: "OTHER", label: "Other" },
]

const priorityOptions = [
    { value: "LOW", label: "Low" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HIGH", label: "High" },
]

const statusFilterOptions = [
    { value: "", label: "All Tickets" },
    { value: "OPEN", label: "Open" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "RESOLVED", label: "Resolved" },
    { value: "CLOSED", label: "Closed" },
]

const CATEGORY_ICONS: Record<string, string> = {
    IT_SUPPORT: "💻",
    HR: "👥",
    PAYROLL: "💰",
    FACILITIES: "🏢",
    OTHER: "📋",
}

function getStatusVariant(status: string) {
    switch (status) {
        case "OPEN": return "warning" as const
        case "IN_PROGRESS": return "info" as const
        case "RESOLVED": return "success" as const
        case "CLOSED": return "neutral" as const
        default: return "neutral" as const
    }
}

function getPriorityVariant(priority: string) {
    switch (priority) {
        case "HIGH": return "danger" as const
        case "MEDIUM": return "warning" as const
        case "LOW": return "neutral" as const
        default: return "neutral" as const
    }
}

export default function HelpDesk() {
    const { user } = useAuth()
    const isAdmin = user?.role === Roles.CEO || user?.role === Roles.HR

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form state
    const [formSubject, setFormSubject] = useState("")
    const [formCategory, setFormCategory] = useState("")
    const [formPriority, setFormPriority] = useState("MEDIUM")
    const [formDescription, setFormDescription] = useState("")

    const fetchTickets = useCallback(async () => {
        try {
            setIsLoading(true)
            const params = new URLSearchParams()
            if (statusFilter) params.set("status", statusFilter)
            const paramStr = params.toString()
            const data = await TicketAPI.list(paramStr || undefined)
            setTickets(extractArray<Ticket>(data))
        } catch {
            toast.error("Failed to load tickets")
        } finally {
            setIsLoading(false)
        }
    }, [statusFilter])

    useEffect(() => { fetchTickets() }, [fetchTickets])

    const resetForm = () => {
        setFormSubject("")
        setFormCategory("")
        setFormPriority("MEDIUM")
        setFormDescription("")
    }

    const handleCreateTicket = async () => {
        if (!formSubject.trim()) {
            toast.error("Subject is required")
            return
        }
        if (!formCategory) {
            toast.error("Please select a category")
            return
        }

        try {
            setIsSubmitting(true)
            await TicketAPI.create({
                subject: formSubject.trim(),
                category: formCategory,
                priority: formPriority,
                description: formDescription.trim() || null,
            })
            toast.success("Ticket created successfully")
            setIsCreateModalOpen(false)
            resetForm()
            fetchTickets()
        } catch (error: any) {
            toast.error(error.message || "Failed to create ticket")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleStatusUpdate = async (ticketId: string, newStatus: string) => {
        try {
            await TicketAPI.update(ticketId, { status: newStatus })
            toast.success("Ticket updated")
            fetchTickets()
        } catch (error: any) {
            toast.error(error.message || "Failed to update ticket")
        }
    }

    // Stats
    const stats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === "OPEN").length,
        inProgress: tickets.filter(t => t.status === "IN_PROGRESS").length,
        resolved: tickets.filter(t => t.status === "RESOLVED" || t.status === "CLOSED").length,
    }

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="Help Desk"
                description="Submit and track support requests"
                actions={
                    <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<PlusIcon className="w-4 h-4" />}>
                        New Ticket
                    </Button>
                }
            />

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card variant="glass" className="p-4">
                    <div className="text-xs font-semibold text-text-3 uppercase tracking-wider">Total</div>
                    <div className="text-2xl font-extrabold text-text mt-1">{stats.total}</div>
                </Card>
                <Card variant="glass" className="p-4">
                    <div className="text-xs font-semibold text-text-3 uppercase tracking-wider">Open</div>
                    <div className="text-2xl font-extrabold text-warning mt-1">{stats.open}</div>
                </Card>
                <Card variant="glass" className="p-4">
                    <div className="text-xs font-semibold text-text-3 uppercase tracking-wider">In Progress</div>
                    <div className="text-2xl font-extrabold text-accent mt-1">{stats.inProgress}</div>
                </Card>
                <Card variant="glass" className="p-4">
                    <div className="text-xs font-semibold text-text-3 uppercase tracking-wider">Resolved</div>
                    <div className="text-2xl font-extrabold text-success mt-1">{stats.resolved}</div>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-5">
                {/* Ticket List */}
                <div className="space-y-4">
                    {/* Filter */}
                    <div className="flex items-center gap-3">
                        <Select
                            options={statusFilterOptions}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            wrapperClassName="w-48"
                        />
                        <span className="text-xs text-text-3">
                            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Spinner size="lg" />
                        </div>
                    ) : tickets.length === 0 ? (
                        <Card variant="glass" className="p-12 text-center">
                            <div className="text-4xl mb-3">🎫</div>
                            <div className="text-sm font-semibold text-text-2 mb-1">No tickets found</div>
                            <p className="text-xs text-text-3">
                                {statusFilter ? "Try changing the filter or " : ""}Create a new ticket to get started.
                            </p>
                        </Card>
                    ) : (
                        tickets.map((t) => (
                            <Card key={t.id} variant="glass" className="p-5 flex items-center justify-between group transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-bg-2 flex items-center justify-center text-xl shrink-0">
                                        {CATEGORY_ICONS[t.category] || "📋"}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-bold text-text">{t.subject}</span>
                                            <Badge variant={getPriorityVariant(t.priority)} size="sm" className="uppercase tracking-wider">
                                                {t.priority}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-text-3 flex items-center gap-2 flex-wrap">
                                            <span className="font-mono">{t.ticketCode}</span>
                                            <span className="w-1 h-1 rounded-full bg-text-4" />
                                            <span>{categoryOptions.find(c => c.value === t.category)?.label || t.category}</span>
                                            <span className="w-1 h-1 rounded-full bg-text-4" />
                                            <span>{format(new Date(t.createdAt), "MMM d, yyyy")}</span>
                                            {t.employee && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-text-4" />
                                                    <span>{t.employee.firstName} {t.employee.lastName}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant={getStatusVariant(t.status)} dot>
                                        {t.status.replace("_", " ")}
                                    </Badge>
                                    {isAdmin ? (
                                        /* CEO/HR can approve (resolve) or reject (close) any ticket */
                                        <>
                                            {(t.status === "OPEN" || t.status === "IN_PROGRESS") && (
                                                <button
                                                    onClick={() => handleStatusUpdate(t.id, "RESOLVED")}
                                                    className="text-xs font-semibold text-success hover:underline transition-colors"
                                                >
                                                    Approve
                                                </button>
                                            )}
                                            {(t.status === "OPEN" || t.status === "IN_PROGRESS") && (
                                                <button
                                                    onClick={() => handleStatusUpdate(t.id, "CLOSED")}
                                                    className="text-xs font-semibold text-danger hover:underline transition-colors"
                                                >
                                                    Reject
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        /* Employees can only track their own ticket status */
                                        t.status === "RESOLVED" && (
                                            <span className="text-xs text-success font-medium">Approved</span>
                                        )
                                    )}
                                </div>
                            </Card>
                        ))
                    )}
                </div>

                {/* Right Sidebar — Contact Directory */}
                <div className="space-y-5">
                    {/* Contact Details */}
                    <Card variant="glass" className="p-5">
                        <CardTitle className="text-sm mb-4 flex items-center gap-2">
                            <span>📞</span> Contact Directory
                        </CardTitle>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-bg-2/50 rounded-lg">
                                <span className="text-lg">☎️</span>
                                <div>
                                    <div className="text-[11px] uppercase tracking-wider text-text-3 font-semibold">Telephone</div>
                                    <a href="tel:08062449800" className="text-sm font-bold text-accent font-mono hover:underline">08062449800</a>
                                </div>
                            </div>
                            <div className="space-y-2.5 pt-1">
                                {[
                                    { label: "GM: Accounts & Finance", number: "6366551012" },
                                    { label: "HR & Compliance", number: "9342205615" },
                                    { label: "Payroll Processing", number: "6366551013" },
                                    { label: "Founder's Office", number: "7411515553" },
                                ].map((contact) => (
                                    <div key={contact.number} className="flex items-center justify-between px-1">
                                        <span className="text-xs font-medium text-text-2">{contact.label}</span>
                                        <a href={`tel:${contact.number}`} className="text-xs font-bold text-accent font-mono hover:underline">
                                            {contact.number}
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    {/* Email Directory */}
                    <Card variant="glass" className="p-5">
                        <CardTitle className="text-sm mb-4 flex items-center gap-2">
                            <span>✉️</span> Email Directory
                        </CardTitle>
                        <div className="space-y-3">
                            <div>
                                <div className="text-[11px] uppercase tracking-wider text-text-3 font-semibold mb-1.5 px-1">General</div>
                                <a href="mailto:sales@msourceone.com" className="flex items-center gap-2 px-3 py-2 bg-bg-2/50 rounded-lg text-sm text-accent font-medium hover:bg-accent/5 transition-colors">
                                    sales@msourceone.com
                                </a>
                            </div>
                            <div>
                                <div className="text-[11px] uppercase tracking-wider text-text-3 font-semibold mb-1.5 px-1">HR Related</div>
                                <a href="mailto:hr@sourceone.ai" className="flex items-center gap-2 px-3 py-2 bg-bg-2/50 rounded-lg text-sm text-accent font-medium hover:bg-accent/5 transition-colors">
                                    hr@sourceone.ai
                                </a>
                            </div>
                            <div>
                                <div className="text-[11px] uppercase tracking-wider text-text-3 font-semibold mb-1.5 px-1">Careers</div>
                                <div className="space-y-1.5">
                                    <a href="mailto:careers@sourceone.ai" className="flex items-center gap-2 px-3 py-2 bg-bg-2/50 rounded-lg text-sm text-accent font-medium hover:bg-accent/5 transition-colors">
                                        careers@sourceone.ai
                                    </a>
                                    <a href="mailto:careers@msourceone.com" className="flex items-center gap-2 px-3 py-2 bg-bg-2/50 rounded-lg text-sm text-accent font-medium hover:bg-accent/5 transition-colors">
                                        careers@msourceone.com
                                    </a>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Create Ticket Dialog */}
            <Dialog open={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); resetForm() }}>
                <DialogHeader>
                    <DialogTitle>Create New Ticket</DialogTitle>
                    <DialogDescription>Describe your issue and we'll route it to the right team.</DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-4">
                    <Input
                        label="Subject *"
                        placeholder="Brief summary of the issue"
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Category *"
                            options={categoryOptions}
                            value={formCategory}
                            onChange={(e) => setFormCategory(e.target.value)}
                        />
                        <Select
                            label="Priority"
                            options={priorityOptions}
                            value={formPriority}
                            onChange={(e) => setFormPriority(e.target.value)}
                        />
                    </div>
                    <Textarea
                        label="Description"
                        placeholder="Detailed explanation of the issue..."
                        className="h-24"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                    />
                </DialogBody>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => { setIsCreateModalOpen(false); resetForm() }}>Cancel</Button>
                    <Button onClick={handleCreateTicket} loading={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Submit Ticket"}
                    </Button>
                </DialogFooter>
            </Dialog>
        </div>
    )
}
