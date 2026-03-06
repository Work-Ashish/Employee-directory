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
import { Card, CardContent } from "@/components/ui/Card"
import { Select } from "@/components/ui/Select"
import { Input } from "@/components/ui/Input"

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
                const resJson = await res.json()
                const data = resJson.data || resJson
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

    const getStatusBadgeVariant = (status: string): "info" | "warning" | "success" => {
        switch (status) {
            case 'UNDER_REVIEW': return "info"
            case 'NOTICE_PERIOD': return "warning"
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
                            {myResignation.status.replace('_', ' ')}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-6 border-t border-border">
                        <div>
                            <div className="text-sm font-bold text-text-3 uppercase mb-1">Reason for Resignation</div>
                            <div className="text-[15px] font-medium">{myResignation.reason}</div>
                        </div>
                        <div>
                            <div className="text-sm font-bold text-text-3 uppercase mb-1">Requested Last Working Day</div>
                            <div className="text-[15px] font-mono font-bold text-accent">{format(new Date(myResignation.lastDay), "MMMM d, yyyy")}</div>
                        </div>
                    </div>

                    <div className="bg-bg-2 p-4 rounded-lg flex items-center gap-3">
                        <span className="text-xl">ℹ️</span>
                        <p className="text-sm text-text-2 leading-relaxed">
                            {myResignation.status === 'UNDER_REVIEW' && "Your request is currently being reviewed by HR and your manager. You can expect a response within 48 hours."}
                            {myResignation.status === 'NOTICE_PERIOD' && "Your resignation has been accepted. You are currently serving your notice period. Please ensure all handover tasks are completed."}
                            {myResignation.status === 'PROCESSED' && "Your exit process has been completed successfully. We wish you all the best for your future endeavors."}
                        </p>
                    </div>
                </Card>
            ) : (
                <Card variant="glass" className="p-8 border-border">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
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
                            <option value="higher Studies">Higher Studies</option>
                            <option value="Work-Life Balance">Work-Life Balance</option>
                        </Select>

                        <div className="flex flex-col gap-1.5">
                            <Input
                                label="Expected Last Working Day *"
                                type="date"
                                {...register('lastDay')}
                                min={format(new Date(), "yyyy-MM-dd")}
                                error={errors.lastDay?.message}
                            />
                            <p className="text-xs text-text-3">Note: Please choose a date that complies with your notice period agreement.</p>
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                variant="danger"
                                className="w-full py-3 shadow-lg"
                                loading={isSubmitting}
                            >
                                Submit Resignation Request
                            </Button>
                        </div>
                    </form>
                </Card>
            )}
        </div>
    )
}
