import * as React from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { PageHeader } from "@/components/ui/PageHeader"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Spinner } from "@/components/ui/Spinner"
import { Card } from "@/components/ui/Card"
import { Select } from "@/components/ui/Select"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { ResignationAPI } from "@/features/resignations/api/client"

const resignationSchema = z.object({
    reason: z.string().min(1, "Reason is required"),
    lastWorkingDate: z.string().min(1, "Last working date is required"),
    additionalDetails: z.string().optional(),
    noticePeriodWilling: z.string().min(1, "Please select an option"),
    exitInterview: z.boolean().optional(),
    feedback: z.string().optional(),
})

type ResignationFormData = z.infer<typeof resignationSchema>

type Resignation = {
    id: string
    reason: string
    lastWorkingDate: string
    status: string
    statusDisplay: string
}

export function EmployeeResignationView({ employeeId }: { employeeId: string }) {
    const [myResignation, setMyResignation] = React.useState<Resignation | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [showConfirm, setShowConfirm] = React.useState(false)
    const [pendingData, setPendingData] = React.useState<ResignationFormData | null>(null)
    const [submitting, setSubmitting] = React.useState(false)

    const { register, handleSubmit, watch, formState: { errors } } = useForm<ResignationFormData>({
        resolver: zodResolver(resignationSchema),
        defaultValues: {
            noticePeriodWilling: "",
            exitInterview: false,
        }
    })

    const watchReason = watch("reason")
    const watchLastDay = watch("lastWorkingDate")

    const fetchMyResignation = React.useCallback(async () => {
        try {
            const data = await ResignationAPI.list(`employeeId=${employeeId}`)
            const first = data.results?.[0] as any
            setMyResignation(first ? {
                id: first.id,
                reason: first.reason || "",
                lastWorkingDate: first.lastWorkingDate || "",
                status: first.status || "PENDING",
                statusDisplay: first.statusDisplay || first.status || "",
            } : null)
        } catch {
            toast.error("Failed to load records")
        } finally {
            setIsLoading(false)
        }
    }, [employeeId])

    React.useEffect(() => {
        fetchMyResignation()
    }, [fetchMyResignation])

    const onFormSubmit: SubmitHandler<ResignationFormData> = (data) => {
        setPendingData(data)
        setShowConfirm(true)
    }

    const handleConfirmSubmit = async () => {
        if (!pendingData) return
        setSubmitting(true)
        try {
            const parts = [pendingData.reason]
            if (pendingData.additionalDetails?.trim()) {
                parts.push(`Details: ${pendingData.additionalDetails.trim()}`)
            }
            if (pendingData.noticePeriodWilling === "no") {
                parts.push("Notice Period: Requesting early release")
            }
            if (pendingData.exitInterview) {
                parts.push("Exit Interview: Requested")
            }
            if (pendingData.feedback?.trim()) {
                parts.push(`Feedback: ${pendingData.feedback.trim()}`)
            }

            await ResignationAPI.create({
                reason: parts.join(" | "),
                lastWorkingDate: pendingData.lastWorkingDate,
                employeeId,
            })
            toast.success("Resignation filed successfully")
            setShowConfirm(false)
            setPendingData(null)
            fetchMyResignation()
        } catch {
            toast.error("An error occurred")
        } finally {
            setSubmitting(false)
        }
    }

    const getStatusBadgeVariant = (status: string): "info" | "warning" | "success" | "danger" => {
        switch (status) {
            case 'PENDING': return "warning"
            case 'APPROVED': return "info"
            case 'REJECTED': return "danger"
            default: return "success"
        }
    }

    if (isLoading) return (
        <div className="p-10 flex justify-center">
            <Spinner size="lg" />
        </div>
    )

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Resignation Request"
                description="Submit your resignation and monitor the transition process"
            />

            {myResignation ? (
                <Card variant="glass" className="p-8 space-y-6 border-border">
                    <div className="flex items-center justify-between">
                        <div className="text-[18px] font-bold">Current Status</div>
                        <Badge variant={getStatusBadgeVariant(myResignation.status)} size="lg">
                            {myResignation.statusDisplay || myResignation.status}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-6 border-t border-border">
                        <div>
                            <div className="text-sm font-bold text-text-3 uppercase mb-1">Reason for Resignation</div>
                            <div className="text-[15px] font-medium">{myResignation.reason.split(" | ")[0]}</div>
                        </div>
                        <div>
                            <div className="text-sm font-bold text-text-3 uppercase mb-1">Requested Last Working Day</div>
                            <div className="text-[15px] font-mono font-bold text-accent">{myResignation.lastWorkingDate ? format(new Date(myResignation.lastWorkingDate), "MMMM d, yyyy") : "—"}</div>
                        </div>
                    </div>

                    <div className="bg-bg-2 p-4 rounded-lg flex items-center gap-3">
                        <span className="text-xl">ℹ️</span>
                        <p className="text-sm text-text-2 leading-relaxed">
                            {myResignation.status === 'PENDING' && "Your request is currently being reviewed by HR and your manager. You can expect a response within 48 hours."}
                            {myResignation.status === 'APPROVED' && "Your resignation has been accepted. You are currently serving your notice period. Please ensure all handover tasks are completed."}
                            {myResignation.status === 'REJECTED' && "Your resignation request was declined. Please contact HR for more details."}
                            {myResignation.status === 'WITHDRAWN' && "You have withdrawn your resignation request."}
                        </p>
                    </div>
                </Card>
            ) : (
                <Card variant="glass" className="p-8 border-border">
                    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6 max-w-2xl mx-auto">
                        <Select
                            label="Reason for Leaving *"
                            {...register('reason')}
                            error={errors.reason?.message}
                        >
                            <option value="">Select a reason...</option>
                            <option value="Better Opportunity">Better Opportunity</option>
                            <option value="Career Growth">Career Growth</option>
                            <option value="Personal Reasons">Personal Reasons</option>
                            <option value="Health Reasons">Health Reasons</option>
                            <option value="Higher Studies">Higher Studies</option>
                            <option value="Work-Life Balance">Work-Life Balance</option>
                            <option value="Relocation">Relocation</option>
                            <option value="Compensation">Compensation</option>
                            <option value="Management Issues">Management Issues</option>
                            <option value="Other">Other</option>
                        </Select>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-text">Additional Details</label>
                            <textarea
                                {...register('additionalDetails')}
                                rows={3}
                                placeholder="Please share any additional context about your decision..."
                                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors resize-none text-text placeholder:text-text-4"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Input
                                label="Expected Last Working Day *"
                                type="date"
                                {...register('lastWorkingDate')}
                                min={format(new Date(), "yyyy-MM-dd")}
                                error={errors.lastWorkingDate?.message}
                            />
                            <p className="text-xs text-text-3">Note: Please choose a date that complies with your notice period agreement.</p>
                        </div>

                        <Select
                            label="Willing to Serve Full Notice Period? *"
                            {...register('noticePeriodWilling')}
                            error={errors.noticePeriodWilling?.message}
                        >
                            <option value="">Select...</option>
                            <option value="yes">Yes, I will serve the full notice period</option>
                            <option value="no">No, I am requesting early release</option>
                            <option value="negotiable">Negotiable based on discussion</option>
                        </Select>

                        <div className="flex items-start gap-3 p-4 bg-bg-2 rounded-lg border border-border">
                            <input
                                type="checkbox"
                                id="exitInterview"
                                {...register('exitInterview')}
                                className="mt-0.5 w-4 h-4 rounded accent-accent"
                            />
                            <label htmlFor="exitInterview" className="text-sm text-text-2 cursor-pointer leading-relaxed">
                                I would like to request an exit interview with HR to share my experience and feedback.
                            </label>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-text">Feedback for the Organization <span className="text-text-4 font-normal">(Optional & Confidential)</span></label>
                            <textarea
                                {...register('feedback')}
                                rows={3}
                                placeholder="Any suggestions or feedback you'd like to share with the organization..."
                                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors resize-none text-text placeholder:text-text-4"
                            />
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                variant="danger"
                                className="w-full py-3 shadow-lg"
                            >
                                Submit Resignation Request
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Confirmation Consent Modal */}
            <Modal
                isOpen={showConfirm}
                onClose={() => { setShowConfirm(false); setPendingData(null) }}
                title="Confirm Resignation Submission"
            >
                <div className="space-y-5">
                    <div className="flex items-center gap-3 p-4 bg-danger/10 border border-danger/20 rounded-xl">
                        <span className="text-2xl">⚠️</span>
                        <p className="text-sm text-text-2 leading-relaxed">
                            You are about to submit a formal resignation request. This action will notify HR and your reporting manager immediately.
                        </p>
                    </div>

                    {pendingData && (
                        <div className="space-y-3 p-4 bg-bg-2 rounded-xl border border-border">
                            <div className="text-xs font-bold text-text-3 uppercase tracking-wider">Review Your Submission</div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-text-3 font-medium">Reason:</span>
                                    <p className="font-semibold text-text">{pendingData.reason}</p>
                                </div>
                                <div>
                                    <span className="text-text-3 font-medium">Last Working Day:</span>
                                    <p className="font-semibold text-text font-mono">{pendingData.lastWorkingDate ? format(new Date(pendingData.lastWorkingDate + "T00:00:00"), "MMMM d, yyyy") : "-"}</p>
                                </div>
                                <div>
                                    <span className="text-text-3 font-medium">Notice Period:</span>
                                    <p className="font-semibold text-text">
                                        {pendingData.noticePeriodWilling === "yes" ? "Will serve full notice" : pendingData.noticePeriodWilling === "no" ? "Requesting early release" : "Negotiable"}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-text-3 font-medium">Exit Interview:</span>
                                    <p className="font-semibold text-text">{pendingData.exitInterview ? "Requested" : "Not requested"}</p>
                                </div>
                            </div>
                            {pendingData.additionalDetails?.trim() && (
                                <div className="text-sm pt-2 border-t border-border">
                                    <span className="text-text-3 font-medium">Details:</span>
                                    <p className="text-text mt-0.5">{pendingData.additionalDetails}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="text-sm text-text-2 leading-relaxed">
                        By confirming, you acknowledge that:
                    </div>
                    <ul className="text-sm text-text-2 space-y-1.5 list-disc pl-5">
                        <li>This request will be formally recorded and cannot be undone without HR approval.</li>
                        <li>You are expected to fulfill your notice period obligations as per company policy.</li>
                        <li>All company assets and access will be revoked upon completion of the exit process.</li>
                    </ul>

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="ghost"
                            className="flex-1"
                            onClick={() => { setShowConfirm(false); setPendingData(null) }}
                            disabled={submitting}
                        >
                            Go Back
                        </Button>
                        <Button
                            variant="danger"
                            className="flex-1 shadow-lg"
                            onClick={handleConfirmSubmit}
                            loading={submitting}
                        >
                            I Confirm — Submit Resignation
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
