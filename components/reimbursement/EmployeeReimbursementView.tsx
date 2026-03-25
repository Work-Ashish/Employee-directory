"use client"

import * as React from "react"
import { cn, extractArray } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { format } from "date-fns"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/Dialog"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { Spinner } from "@/components/ui/Spinner"
import { ReimbursementAPI } from "@/features/reimbursements/api/client"
import { api } from "@/lib/api-client"
import { confirmDanger, confirmAction, showSuccess } from "@/lib/swal"

const reimbursementSchema = z.object({
    category: z.string().min(1, "Category is required"),
    amount: z.number().positive("Amount must be positive"),
    description: z.string().min(5, "Description must be at least 5 characters"),
    receiptUrl: z.string().optional(),
    expenseDate: z.string().min(1, "Expense date is required"),
})

type ReimbursementFormData = z.infer<typeof reimbursementSchema>

type Reimbursement = {
    id: string
    category: string
    amount: number
    description: string
    receiptUrl: string | null
    expenseDate: string
    status: string
    rejectionNote: string | null
    createdAt: string
}

const CATEGORY_LABELS: Record<string, string> = {
    TRAVEL: "Travel",
    MEALS: "Meals",
    OFFICE_SUPPLIES: "Office Supplies",
    MEDICAL: "Medical",
    TRAINING_EXPENSE: "Training",
    CONFERENCE: "Conference",
    RELOCATION: "Relocation",
    OTHER: "Other",
}

const CATEGORY_OPTIONS = [
    { value: "", label: "Select category..." },
    { value: "TRAVEL", label: "Travel" },
    { value: "MEALS", label: "Meals & Food" },
    { value: "OFFICE_SUPPLIES", label: "Office Supplies" },
    { value: "MEDICAL", label: "Medical" },
    { value: "TRAINING_EXPENSE", label: "Training / Certification" },
    { value: "CONFERENCE", label: "Conference / Event" },
    { value: "RELOCATION", label: "Relocation" },
    { value: "OTHER", label: "Other" },
]

function getStatusBadge(status: string) {
    switch (status) {
        case "APPROVED": return <Badge variant="success" dot>{status}</Badge>
        case "REJECTED": return <Badge variant="danger" dot>{status}</Badge>
        case "PAID": return <Badge variant="info" dot>{status}</Badge>
        default: return <Badge variant="warning" dot>PENDING</Badge>
    }
}

export function EmployeeReimbursementView() {
    const { user } = useAuth()
    const [records, setRecords] = React.useState<Reimbursement[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [submitting, setSubmitting] = React.useState(false)
    const [receiptFile, setReceiptFile] = React.useState<File | null>(null)
    const [uploadingReceipt, setUploadingReceipt] = React.useState(false)
    const [receiptPreview, setReceiptPreview] = React.useState<string | null>(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const form = useForm<ReimbursementFormData>({
        resolver: zodResolver(reimbursementSchema),
        defaultValues: {
            category: "",
            amount: 0,
            description: "",
            receiptUrl: "",
            expenseDate: format(new Date(), "yyyy-MM-dd"),
        },
    })

    const fetchRecords = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const data = await ReimbursementAPI.list()
            setRecords((data as any)?.results || extractArray<Reimbursement>(data))
        } catch {
            toast.error("Failed to load records")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => { fetchRecords() }, [fetchRecords])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const maxSize = 10 * 1024 * 1024
        if (file.size > maxSize) {
            toast.error("File too large. Maximum size is 10MB.")
            return
        }
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]
        if (!allowed.includes(file.type)) {
            toast.error("Only images (JPG, PNG, WebP, GIF) and PDF files are allowed.")
            return
        }
        setReceiptFile(file)
        if (file.type.startsWith("image/")) {
            setReceiptPreview(URL.createObjectURL(file))
        } else {
            setReceiptPreview(null)
        }
    }

    const uploadReceipt = async (): Promise<string | null> => {
        if (!receiptFile) return null
        setUploadingReceipt(true)
        try {
            const formData = new FormData()
            formData.append("file", receiptFile)
            formData.append("bucket", "receipts")
            const res = await fetch("/api/upload", { method: "POST", body: formData })
            if (res.ok) {
                const data = await res.json()
                return data.url
            }
            toast.error("Receipt upload failed")
            return null
        } catch {
            toast.error("Receipt upload failed")
            return null
        } finally {
            setUploadingReceipt(false)
        }
    }

    const onSubmit: SubmitHandler<ReimbursementFormData> = async (data) => {
        setSubmitting(true)
        try {
            let receiptUrl = data.receiptUrl || null
            if (receiptFile) {
                receiptUrl = await uploadReceipt()
            }
            await ReimbursementAPI.create({
                ...data,
                receiptUrl,
                expenseDate: new Date(data.expenseDate),
            })
            toast.success("Reimbursement request submitted")
            setIsModalOpen(false)
            form.reset()
            setReceiptFile(null)
            setReceiptPreview(null)
            fetchRecords()
        } catch (error: any) {
            toast.error(error.message || "Failed to submit request")
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!await confirmDanger("Delete Request?", "This pending reimbursement request will be removed.")) return
        try {
            await api.delete("/reimbursements/" + id + "/")
            showSuccess("Deleted", "Reimbursement request removed")
            fetchRecords()
        } catch (error: any) {
            toast.error(error.message || "Failed to delete")
        }
    }

    const totals = React.useMemo(() => {
        const pending = records.filter(r => r.status === "PENDING").reduce((s, r) => s + r.amount, 0)
        const approved = records.filter(r => r.status === "APPROVED" || r.status === "PAID").reduce((s, r) => s + r.amount, 0)
        return { pending, approved }
    }, [records])

    if (isLoading) return (
        <div className="p-10 flex justify-center"><Spinner size="lg" /></div>
    )

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="My Reimbursements"
                description="Submit and track your expense reimbursement requests"
                actions={
                    <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                        New Request
                    </Button>
                }
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-5 bg-gradient-to-br from-accent/10 to-transparent border-accent/20">
                    <div className="text-xs font-bold text-text-3 uppercase tracking-wider mb-1">Total Requests</div>
                    <div className="text-2xl font-black text-accent">{records.length}</div>
                </Card>
                <Card className="p-5 bg-gradient-to-br from-warning/10 to-transparent border-warning/20">
                    <div className="text-xs font-bold text-text-3 uppercase tracking-wider mb-1">Pending Amount</div>
                    <div className="text-2xl font-black text-warning">₹{totals.pending.toLocaleString()}</div>
                </Card>
                <Card className="p-5 bg-gradient-to-br from-success/10 to-transparent border-success/20">
                    <div className="text-xs font-bold text-text-3 uppercase tracking-wider mb-1">Approved / Paid</div>
                    <div className="text-2xl font-black text-success">₹{totals.approved.toLocaleString()}</div>
                </Card>
            </div>

            {/* Requests List */}
            {records.length === 0 ? (
                <Card className="p-8">
                    <EmptyState
                        icon={<span className="text-3xl">📋</span>}
                        title="No reimbursement requests"
                        description="Submit your first expense reimbursement request to get started."
                    />
                </Card>
            ) : (
                <div className="space-y-3">
                    {records.map((rec) => (
                        <Card key={rec.id} className="p-4 hover:border-accent/20 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge
                                            variant={rec.category === "MEDICAL" ? "danger" : rec.category === "TRAVEL" ? "info" : "neutral"}
                                            size="sm"
                                        >
                                            {CATEGORY_LABELS[rec.category] || rec.category}
                                        </Badge>
                                        {getStatusBadge(rec.status)}
                                        <span className="text-xs text-text-4">{format(new Date(rec.createdAt), "dd MMM yyyy")}</span>
                                    </div>
                                    <p className="text-sm text-text mt-1.5 font-medium">{rec.description}</p>
                                    <div className="text-xs text-text-3 mt-1">
                                        Expense Date: {format(new Date(rec.expenseDate), "dd MMM yyyy")}
                                        {rec.receiptUrl && <> · <a href={rec.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">View Receipt</a></>}
                                    </div>
                                    {rec.status === "REJECTED" && rec.rejectionNote && (
                                        <div className="mt-2 p-2 bg-danger/10 border border-danger/20 rounded-lg text-xs text-danger">
                                            Rejection Reason: {rec.rejectionNote}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-lg font-black text-accent font-mono">₹{rec.amount.toLocaleString()}</div>
                                    {rec.status === "PENDING" && (
                                        <Button size="sm" variant="ghost" className="mt-2 text-danger" onClick={() => handleDelete(rec.id)}>
                                            Delete
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* New Request Modal */}
            <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg">
                <DialogHeader>
                    <DialogTitle>New Reimbursement Request</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <form id="reimbursement-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Expense Category *"
                                options={CATEGORY_OPTIONS}
                                error={form.formState.errors.category?.message}
                                {...form.register("category")}
                            />
                            <Input
                                label="Amount (₹) *"
                                type="number"
                                placeholder="0"
                                error={form.formState.errors.amount?.message}
                                {...form.register("amount", { valueAsNumber: true })}
                            />
                        </div>

                        <Input
                            label="Expense Date *"
                            type="date"
                            max={format(new Date(), "yyyy-MM-dd")}
                            error={form.formState.errors.expenseDate?.message}
                            {...form.register("expenseDate")}
                        />

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-text">Description *</label>
                            <textarea
                                {...form.register("description")}
                                rows={3}
                                placeholder="Describe the expense (e.g., Client meeting dinner, Taxi to airport...)"
                                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors resize-none text-text placeholder:text-text-4"
                            />
                            {form.formState.errors.description && (
                                <p className="text-xs text-danger">{form.formState.errors.description.message}</p>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-text">Receipt (optional)</label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            {receiptFile ? (
                                <div className="flex items-center gap-3 p-3 bg-bg-2 border border-border rounded-lg">
                                    {receiptPreview ? (
                                        <img src={receiptPreview} alt="Receipt" className="w-12 h-12 object-cover rounded-md border border-border" />
                                    ) : (
                                        <div className="w-12 h-12 bg-accent/10 rounded-md flex items-center justify-center text-accent text-xs font-bold">PDF</div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text truncate">{receiptFile.name}</p>
                                        <p className="text-xs text-text-3">{(receiptFile.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setReceiptFile(null); setReceiptPreview(null); if (fileInputRef.current) fileInputRef.current.value = "" }}
                                        className="text-xs text-danger hover:underline font-semibold shrink-0"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full p-4 border-2 border-dashed border-border rounded-lg hover:border-accent/40 hover:bg-accent/5 transition-colors text-center group"
                                >
                                    <div className="text-2xl mb-1">📎</div>
                                    <p className="text-sm font-medium text-text-2 group-hover:text-accent transition-colors">Click to upload receipt</p>
                                    <p className="text-xs text-text-4 mt-0.5">JPG, PNG, WebP, GIF or PDF (max 10MB)</p>
                                </button>
                            )}
                        </div>
                    </form>
                </DialogBody>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" form="reimbursement-form" loading={submitting}>
                        Submit Request
                    </Button>
                </DialogFooter>
            </Dialog>
        </div>
    )
}
