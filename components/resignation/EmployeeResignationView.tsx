import * as React from "react"
import { cn } from "@/lib/utils"
import { toast, Toaster } from "react-hot-toast"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"

const resignationSchema = z.object({
    reason: z.string().min(1, "Reason is required"),
    lastDay: z.string().min(1, "Last day is required"),
})

type ResignationFormData = z.infer<typeof resignationSchema>

type Resignation = {
    id: string
    reason: string
    lastDay: string
    status: string
}

export function EmployeeResignationView({ employeeId }: { employeeId: string }) {
    const [myResignation, setMyResignation] = React.useState<Resignation | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResignationFormData>({
        resolver: zodResolver(resignationSchema)
    })

    const fetchMyResignation = React.useCallback(async () => {
        try {
            const res = await fetch(`/api/resignations?employeeId=${employeeId}`)
            if (res.ok) {
                const data = await res.json()
                setMyResignation(data[0] || null)
            }
        } catch {
            toast.error("Failed to load records")
        } finally {
            setIsLoading(false)
        }
    }, [employeeId])

    React.useEffect(() => {
        fetchMyResignation()
    }, [fetchMyResignation])

    const onSubmit: SubmitHandler<ResignationFormData> = async (data) => {
        try {
            const res = await fetch('/api/resignations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, employeeId })
            })
            if (res.ok) {
                toast.success("Resignation filed successfully")
                fetchMyResignation()
            } else {
                toast.error("Failed to file resignation")
            }
        } catch {
            toast.error("An error occurred")
        }
    }

    if (isLoading) return <div className="p-10 text-center">Loading...</div>

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <Toaster position="top-right" />

            <div className="mb-6">
                <h1 className="text-[26px] font-extrabold text-[var(--text)]">Resignation Request</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-1">Submit your resignation and monitor the transition process</p>
            </div>

            {myResignation ? (
                <div className="glass p-8 space-y-6 border-[var(--border)]">
                    <div className="flex items-center justify-between">
                        <div className="text-[18px] font-bold">Current Status</div>
                        <span className={cn("px-4 py-1.5 rounded-full text-[13px] font-bold border",
                            myResignation.status === 'UNDER_REVIEW' ? "bg-[var(--blue-dim)] text-[var(--accent)] border-[var(--accent)]/20" :
                                myResignation.status === 'NOTICE_PERIOD' ? "bg-[var(--amber-dim)] text-[var(--amber)] border-[var(--amber)]/20" :
                                    "bg-[var(--green-dim)] text-[#1a9140] border-[#1a9140]/20"
                        )}>
                            {myResignation.status.replace('_', ' ')}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-6 border-t border-[var(--border)]">
                        <div>
                            <div className="text-[12px] font-bold text-[var(--text3)] uppercase mb-1">Reason for Resignation</div>
                            <div className="text-[15px] font-medium">{myResignation.reason}</div>
                        </div>
                        <div>
                            <div className="text-[12px] font-bold text-[var(--text3)] uppercase mb-1">Requested Last Working Day</div>
                            <div className="text-[15px] font-mono font-bold text-[var(--accent)]">{format(new Date(myResignation.lastDay), "MMMM d, yyyy")}</div>
                        </div>
                    </div>

                    <div className="bg-[var(--bg2)] p-4 rounded-lg flex items-center gap-3">
                        <span className="text-xl">ℹ️</span>
                        <p className="text-[12.5px] text-[var(--text2)] leading-relaxed">
                            {myResignation.status === 'UNDER_REVIEW' && "Your request is currently being reviewed by HR and your manager. You can expect a response within 48 hours."}
                            {myResignation.status === 'NOTICE_PERIOD' && "Your resignation has been accepted. You are currently serving your notice period. Please ensure all handover tasks are completed."}
                            {myResignation.status === 'PROCESSED' && "Your exit process has been completed successfully. We wish you all the best for your future endeavors."}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="glass p-8 border-[var(--border)]">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
                        <div className="space-y-2">
                            <label className="text-[13px] font-bold text-[var(--text2)]">Reason for Leaving *</label>
                            <select
                                {...register('reason')}
                                className="w-full p-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--accent)] text-[14px]"
                            >
                                <option value="">Select a reason...</option>
                                <option value="Better Opportunity">Better Opportunity</option>
                                <option value="Career Growth">Career Growth</option>
                                <option value="Personal Reasons">Personal Reasons</option>
                                <option value="Health Reasons">Health Reasons</option>
                                <option value="higher Studies">Higher Studies</option>
                                <option value="Work-Life Balance">Work-Life Balance</option>
                            </select>
                            {errors.reason && <p className="text-[11px] text-[var(--red)]">{errors.reason.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[13px] font-bold text-[var(--text2)]">Expected Last Working Day *</label>
                            <input
                                type="date"
                                {...register('lastDay')}
                                min={format(new Date(), "yyyy-MM-dd")}
                                className="w-full p-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--accent)] text-[14px]"
                            />
                            {errors.lastDay && <p className="text-[11px] text-[var(--red)]">{errors.lastDay.message}</p>}
                            <p className="text-[11px] text-[var(--text3)]">Note: Please choose a date that complies with your notice period agreement.</p>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-[var(--red)] text-white font-bold rounded-lg shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {isSubmitting ? "Submitting..." : "Submit Resignation Request"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}
