import * as React from "react"
import { cn } from "@/lib/utils"
import { PlusIcon, StarFilledIcon } from "@radix-ui/react-icons"
import { Modal } from "@/components/ui/Modal"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast, Toaster } from "react-hot-toast"
import { format } from "date-fns"

// ----------------------------------------------------------------------------
// Zod Schema for Validation
// ----------------------------------------------------------------------------
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
                fetch('/api/performance'),
                fetch('/api/employees?limit=100')
            ])
            if (revRes.ok && empRes.ok) {
                setReviews(await revRes.json())
                const empJson = await empRes.json()
                setEmployees(Array.isArray(empJson) ? empJson : empJson.data || [])
            }
        } catch (_error) {
            toast.error("Failed to load data")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchAll()
    }, [fetchAll])

    const onSubmit: SubmitHandler<ReviewFormData> = async (data) => {
        try {
            const res = await fetch('/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
        const pending = reviews.filter(r => r.status === 'PENDING').length
        const progress = reviews.reduce((sum, r) => sum + r.progress, 0) / reviews.length
        return { avg: avg.toFixed(1), top, pending, progress: Math.round(progress) }
    }, [reviews])

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <Toaster position="top-right" />
            <div className="flex items-center justify-between mb-[26px]">
                <div>
                    <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Performance Management</h1>
                    <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Track and evaluate employee performance metrics</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
                >
                    <PlusIcon className="w-4 h-4" /> Create Review
                </button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-5">
                <div className="glass p-5 flex flex-col items-start gap-[10px] bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px]">Avg Score</div>
                    <div className="flex justify-between items-center w-full">
                        <div className="text-[40px] font-extrabold leading-[1] tracking-[-1px] text-[var(--accent)]">{stats.avg}</div>
                        <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[rgba(0,122,255,0.1)] shrink-0">⭐</div>
                    </div>
                </div>
                <div className="glass p-5 flex flex-col items-start gap-[10px] bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px]">Top Performers</div>
                    <div className="flex justify-between items-center w-full">
                        <div className="text-[40px] font-extrabold leading-[1] tracking-[-1px] text-[#1a9140]">{stats.top}</div>
                        <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[var(--green-dim)] shrink-0">🏆</div>
                    </div>
                </div>
                <div className="glass p-5 flex flex-col items-start gap-[10px] bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px]">Reviews Pending</div>
                    <div className="flex justify-between items-center w-full">
                        <div className="text-[40px] font-extrabold leading-[1] tracking-[-1px] text-[var(--amber)]">{stats.pending}</div>
                        <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[var(--amber-dim)] shrink-0">📋</div>
                    </div>
                </div>
                <div className="glass p-5 flex flex-col items-start gap-[10px] bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px]">Avg Progress</div>
                    <div className="flex justify-between items-center w-full">
                        <div className="text-[32px] font-extrabold leading-[1] tracking-[-1px] text-[#0a7ea4]">{stats.progress}%</div>
                        <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[var(--blue-dim)] shrink-0">🎯</div>
                    </div>
                </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                    <div className="text-[14px] font-bold flex items-center gap-[8px] text-[var(--text)]">📊 Performance Reviews</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                                {['Employee', 'Department', 'Rating', 'Progress', 'Review Date', 'Status'].map((h) => (
                                    <th key={h} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {!isLoading ? reviews.map((rev, i) => (
                                <tr key={rev.id} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0 grow-in">
                                    <td className="p-[13px_18px] text-[13.5px] text-[var(--text)]">
                                        <div className="flex items-center gap-[11px]">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 bg-gradient-to-br from-[#3395ff] to-[#007aff]">
                                                {rev.employee.firstName.charAt(0)}{rev.employee.lastName.charAt(0)}
                                            </div>
                                            <span className="font-semibold">{rev.employee.firstName} {rev.employee.lastName}</span>
                                        </div>
                                    </td>
                                    <td className="p-[13px_18px]">
                                        <span className="inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[11px] font-semibold bg-[rgba(0,122,255,0.08)] text-[var(--accent)] border border-[rgba(0,122,255,0.18)]">
                                            {rev.employee.department?.name || 'Unassigned'}
                                        </span>
                                    </td>
                                    <td className="p-[13px_18px]">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[var(--amber)] tracking-[1px]">{'★'.repeat(Math.floor(rev.rating))}</span>
                                            <span className="text-[var(--text3)] tracking-[1px]">{'★'.repeat(5 - Math.floor(rev.rating))}</span>
                                            <span className="text-[12px] text-[var(--text3)] ml-2 font-mono">{rev.rating.toFixed(1)}</span>
                                        </div>
                                    </td>
                                    <td className="p-[13px_18px]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-[80px] h-[5px] bg-[var(--bg2)] rounded-[3px] overflow-hidden">
                                                <div
                                                    className="h-full rounded-[3px] bg-gradient-to-r from-[var(--accent)] to-[var(--blue)] transition-all duration-500"
                                                    style={{ width: `${rev.progress}%` }}
                                                />
                                            </div>
                                            <span className="text-[11px] font-bold font-mono text-[var(--text3)]">{rev.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="p-[13px_18px] text-[13px] text-[var(--text3)] font-mono">{format(new Date(rev.reviewDate), "MMM d, yyyy")}</td>
                                    <td className="p-[13px_18px]">
                                        <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[11px] font-semibold border",
                                            rev.status === 'EXCELLENT' ? "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]" :
                                                rev.status === 'PENDING' ? "bg-[var(--amber-dim)] text-[#b86c00] border-[rgba(255,149,0,0.25)]" :
                                                    "bg-[var(--bg2)] text-[var(--text3)] border-[var(--border)]")
                                        }>
                                            {rev.status}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-[var(--text3)]">Loading reviews...</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Create Performance Review"
            >
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Employee *</label>
                            <select
                                {...form.register('employeeId')}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            >
                                <option value="">Select Employee...</option>
                                {employees.map((e) => (
                                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Review Date *</label>
                            <input
                                type="date"
                                {...form.register('reviewDate')}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Rating (1-5) *</label>
                            <input
                                type="number"
                                step="0.1"
                                {...form.register('rating', { valueAsNumber: true })}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Progress % *</label>
                            <input
                                type="number"
                                {...form.register('progress', { valueAsNumber: true })}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-[var(--text2)]">Status</label>
                        <select
                            {...form.register('status')}
                            className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                        >
                            <option value="PENDING">Pending</option>
                            <option value="EXCELLENT">Excellent</option>
                            <option value="GOOD">Good</option>
                            <option value="AVERAGE">Average</option>
                            <option value="POOR">Poor</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-[var(--text2)]">Comments *</label>
                        <textarea
                            {...form.register('comments')}
                            rows={3}
                            className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] resize-none"
                            placeholder="Provide detailed feedback..."
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-[var(--border)]">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-[13px] font-semibold bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg2)] text-[var(--text2)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.formState.isSubmitting}
                            className="px-4 py-2 text-[13px] font-semibold text-white bg-[var(--accent)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {form.formState.isSubmitting ? "Creating..." : "Save Review"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
