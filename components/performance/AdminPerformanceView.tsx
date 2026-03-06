import * as React from "react"
import { cn, extractArray } from "@/lib/utils"
import { PlusIcon } from "@radix-ui/react-icons"
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { StatCard } from "@/components/ui/StatCard"
import { PageHeader } from "@/components/ui/PageHeader"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { format } from "date-fns"

const reviewSchema = z.object({
    employeeId: z.string().min(1, "Employee is required"),
    rating: z.number().min(1).max(5),
    progress: z.number().min(0).max(100),
    comments: z.string().min(1, "Comments are required"),
    reviewDate: z.string().min(1, "Review date is required"),
    status: z.enum(["EXCELLENT", "GOOD", "AVERAGE", "POOR", "PENDING"]),
})

type ReviewFormData = z.infer<typeof reviewSchema>

type Employee = {
    id: string
    firstName: string
    lastName: string
    department: { name: string }
}

type PerformanceReview = {
    id: string
    rating: number
    progress: number
    comments: string
    reviewDate: string
    status: string
    employeeId: string
    employee: {
        firstName: string
        lastName: string
        department: { name: string }
    }
}

function getStatusBadge(status: string) {
    switch (status) {
        case "EXCELLENT": return <Badge variant="success">{status}</Badge>
        case "GOOD": return <Badge variant="default">{status}</Badge>
        case "AVERAGE": return <Badge variant="warning">{status}</Badge>
        case "POOR": return <Badge variant="danger">{status}</Badge>
        default: return <Badge variant="neutral">{status}</Badge>
    }
}

export function AdminPerformanceView() {
    const [reviews, setReviews] = React.useState<PerformanceReview[]>([])
    const [employees, setEmployees] = React.useState<Employee[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [isModalOpen, setIsModalOpen] = React.useState(false)

    const form = useForm<ReviewFormData>({
        resolver: zodResolver(reviewSchema),
        defaultValues: {
            employeeId: "",
            rating: 5,
            progress: 100,
            comments: "",
            reviewDate: format(new Date(), "yyyy-MM-dd"),
            status: "PENDING",
        }
    })

    const fetchAll = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const [revRes, empRes] = await Promise.all([
                fetch("/api/performance"),
                fetch("/api/employees?limit=100")
            ])
            if (revRes.ok && empRes.ok) {
                setReviews(extractArray<PerformanceReview>(await revRes.json()))
                setEmployees(extractArray<Employee>(await empRes.json()))
            }
        } catch (_error) {
            toast.error("Failed to load data")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => { fetchAll() }, [fetchAll])

    const onSubmit: SubmitHandler<ReviewFormData> = async (data) => {
        try {
            const res = await fetch("/api/performance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            })
            if (res.ok) {
                toast.success("Review created successfully")
                setIsModalOpen(false)
                fetchAll()
                form.reset()
            } else {
                toast.error("Failed to create review")
            }
        } catch (_error) {
            toast.error("An error occurred")
        }
    }

    const stats = React.useMemo(() => {
        if (reviews.length === 0) return { avg: 0, top: 0, pending: 0, progress: 0 }
        const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        const top = reviews.filter(r => r.rating >= 4.5).length
        const pending = reviews.filter(r => r.status === "PENDING").length
        const progress = reviews.reduce((sum, r) => sum + r.progress, 0) / reviews.length
        return { avg: avg.toFixed(1), top, pending, progress: Math.round(progress) }
    }, [reviews])

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="Performance Management"
                description="Track and evaluate employee performance metrics"
                actions={
                    <Button onClick={() => setIsModalOpen(true)} leftIcon={<PlusIcon className="w-4 h-4" />}>
                        Create Review
                    </Button>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Avg Score" value={stats.avg} icon={<span className="text-lg">⭐</span>} />
                <StatCard label="Top Performers" value={stats.top} icon={<span className="text-lg">🏆</span>} />
                <StatCard label="Reviews Pending" value={stats.pending} icon={<span className="text-lg">📋</span>} />
                <StatCard label="Avg Progress" value={`${stats.progress}%`} icon={<span className="text-lg">🎯</span>} />
            </div>

            {/* Table */}
            <Card>
                <CardHeader className="border-b border-border">
                    <CardTitle>Performance Reviews</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-surface-2">
                                {["Employee", "Department", "Rating", "Progress", "Review Date", "Status"].map((h) => (
                                    <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {!isLoading ? reviews.map((rev) => (
                                <tr key={rev.id} className="group hover:bg-accent/[0.03] transition-colors border-b border-border/30 last:border-0">
                                    <td className="px-4 py-3.5 text-base text-text">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={`${rev.employee.firstName} ${rev.employee.lastName}`} size="sm" />
                                            <span className="font-semibold">{rev.employee.firstName} {rev.employee.lastName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <Badge variant="default" size="sm">{rev.employee.department?.name || "Unassigned"}</Badge>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-1">
                                            <span className="text-warning tracking-wider">{"★".repeat(Math.floor(rev.rating))}</span>
                                            <span className="text-text-4 tracking-wider">{"★".repeat(5 - Math.floor(rev.rating))}</span>
                                            <span className="text-sm text-text-3 ml-2 font-mono">{rev.rating.toFixed(1)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-20 h-1.5 bg-bg-2 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full bg-gradient-to-r from-accent to-info transition-all duration-500" style={{ width: `${rev.progress}%` }} />
                                            </div>
                                            <span className="text-xs font-bold font-mono text-text-3">{rev.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-sm text-text-3 font-mono">{format(new Date(rev.reviewDate), "MMM d, yyyy")}</td>
                                    <td className="px-4 py-3.5">{getStatusBadge(rev.status)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="p-10 text-center text-text-3">Loading reviews...</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Create Review Dialog */}
            <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg">
                <DialogHeader>
                    <DialogTitle>Create Performance Review</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <DialogBody className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-text-2">Employee *</label>
                                <select {...form.register("employeeId")} className="input-base">
                                    <option value="">Select Employee...</option>
                                    {employees.map((e) => (
                                        <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                                    ))}
                                </select>
                            </div>
                            <Input label="Review Date *" type="date" {...form.register("reviewDate")} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Rating (1-5) *" type="number" step="0.1" {...form.register("rating", { valueAsNumber: true })} />
                            <Input label="Progress % *" type="number" {...form.register("progress", { valueAsNumber: true })} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-text-2">Status</label>
                            <select {...form.register("status")} className="input-base">
                                <option value="PENDING">Pending</option>
                                <option value="EXCELLENT">Excellent</option>
                                <option value="GOOD">Good</option>
                                <option value="AVERAGE">Average</option>
                                <option value="POOR">Poor</option>
                            </select>
                        </div>
                        <Textarea label="Comments *" {...form.register("comments")} placeholder="Provide detailed feedback..." rows={3} />
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" loading={form.formState.isSubmitting}>Save Review</Button>
                    </DialogFooter>
                </form>
            </Dialog>
        </div>
    )
}
