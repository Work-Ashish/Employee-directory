"use client"

import * as React from "react"
import { extractArray, cn } from "@/lib/utils"
import { EmployeeAPI } from "@/features/employees/api/client"
import { TrainingAPI } from "@/features/training/api/client"
import { toast } from "sonner"
import { format } from "date-fns"
import { PlusIcon, TrashIcon, Pencil2Icon } from "@radix-ui/react-icons"
import { Modal } from "@/components/ui/Modal"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { PageHeader } from "@/components/ui/PageHeader"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Spinner } from "@/components/ui/Spinner"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"
import { Card, CardContent } from "@/components/ui/Card"
import { confirmDanger, confirmAction, showSuccess } from "@/lib/swal"

const trainingSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["TECHNICAL", "COMPLIANCE", "SECURITY", "SOFT_SKILLS", "LEADERSHIP"]),
    description: z.string().optional(),
    status: z.enum(["CRITICAL", "HIGH", "LOW"]).default("HIGH"),
    dueDate: z.string().optional(),
    videoUrl: z.string().optional(),
    assignToAll: z.boolean().default(false),
    assignedEmployeeIds: z.array(z.string()).default([]),
})

type TrainingFormData = z.infer<typeof trainingSchema>

type Training = {
    id: string
    name: string
    type: string
    description: string | null
    status: string
    progress: number
    dueDate: string | null
    participants: number
    enrolledCount: number
    videoUrl: string | null
    enrollments: any[]
}

function LearnerRow({ name, courses, score, rank }: any) {
    return (
        <div className="flex items-center gap-3 pb-[10px] border-b border-border last:border-0 last:pb-0">
            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0",
                rank === 1 ? "bg-[#eab308]" : (rank === 2 ? "bg-[#94a3b8]" : "bg-[#b45309]")
            )}>
                {rank}
            </div>
            <div className="flex-1">
                <div className="text-base font-semibold text-text">{name}</div>
                <div className="text-xs text-text-3">{courses} courses completed</div>
            </div>
            <div className="text-base font-mono font-bold text-success">
                {score}
            </div>
        </div>
    )
}

export function AdminTrainingView() {
    const [trainings, setTrainings] = React.useState<Training[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [editingId, setEditingId] = React.useState<string | null>(null)
    const [employees, setEmployees] = React.useState<any[]>([])
    const [employeeSearch, setEmployeeSearch] = React.useState("")

    const form = useForm<TrainingFormData>({
        resolver: zodResolver(trainingSchema) as any,
        defaultValues: {
            name: "",
            type: "TECHNICAL",
            description: "",
            status: "HIGH",
            dueDate: format(new Date(), "yyyy-MM-dd"),
            videoUrl: "",
            assignToAll: false,
            assignedEmployeeIds: [],
        }
    })

    const fetchEmployees = React.useCallback(async () => {
        try {
            const empData = await EmployeeAPI.fetchEmployees(1, 100)
            setEmployees(empData.results || [])
        } catch { console.error("Failed to load employees") }
    }, [])

    const fetchTrainings = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const data = await TrainingAPI.list()
            // Map Django Training fields to component's expected shape
            const REVERSE_STATUS: Record<string, string> = {
                ONGOING: "CRITICAL",
                UPCOMING: "HIGH",
                COMPLETED: "LOW",
                CANCELLED: "LOW",
                CRITICAL: "CRITICAL",
                HIGH: "HIGH",
                LOW: "LOW",
            }
            const items = (data as any)?.results || extractArray<any>(data)
            const mapped = items.map((t: any) => ({
                id: t.id,
                name: t.title || t.name || "",
                type: t.type || "TECHNICAL",
                description: t.description || "",
                status: REVERSE_STATUS[t.status] || t.status || "HIGH",
                progress: 0,
                dueDate: t.startDate || t.dueDate || null,
                participants: t.enrolledCount || t.maxParticipants || 0,
                enrolledCount: t.enrolledCount || 0,
                videoUrl: t.videoUrl || null,
                enrollments: t.enrollments || [],
            }))
            setTrainings(mapped)
        } catch {
            toast.error("Failed to load trainings")
        } finally {
            setIsLoading(false)
        }
    }, [])

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // 100MB limit for videos
        if (file.size > 100 * 1024 * 1024) {
            toast.error("Video size must be less than 100MB")
            return
        }

        const formData = new FormData()
        formData.append("file", file)
        formData.append("bucket", "training")

        try {
            toast.loading("Uploading video...", { id: "video-upload" })
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData
            })

            if (res.ok) {
                const { url } = await res.json()
                form.setValue("videoUrl", url)
                toast.success("Video uploaded", { id: "video-upload" })
            } else {
                toast.error("Upload failed", { id: "video-upload" })
            }
        } catch (error) {
            toast.error("An error occurred")
        }
    }

    React.useEffect(() => {
        fetchTrainings()
        fetchEmployees()
    }, [fetchTrainings, fetchEmployees])

    const onSubmit: any = async (data: any) => {
        try {
            // Map frontend form fields to Django Training model fields
            const STATUS_MAP: Record<string, string> = {
                CRITICAL: "ONGOING",
                HIGH: "UPCOMING",
                LOW: "COMPLETED",
            }
            const payload: Record<string, unknown> = {
                title: data.name,
                description: data.description || "",
                start_date: data.dueDate || new Date().toISOString().slice(0, 10),
                end_date: data.dueDate || new Date().toISOString().slice(0, 10),
                status: STATUS_MAP[data.status] || data.status,
                instructor: "",
            }
            if (data.videoUrl) payload.video_url = data.videoUrl

            if (editingId) {
                await TrainingAPI.update(editingId, payload)
            } else {
                const created = await TrainingAPI.create(payload)

                // Enroll employees after course creation
                if (created?.id) {
                    const employeeIds: string[] = data.assignToAll
                        ? employees.map((e: any) => e.id)
                        : (data.assignedEmployeeIds || [])

                    await Promise.allSettled(
                        employeeIds.map(empId =>
                            TrainingAPI.enroll(created.id, { employee_id: empId })
                        )
                    )
                }
            }
            toast.success(editingId ? "Course updated" : "Course created")
            setIsModalOpen(false)
            setEditingId(null)
            form.reset()
            fetchTrainings()
        } catch (error: any) {
            console.error("Submit error:", error)
            toast.error(error.message || "Operation failed")
        }
    }

    const onInvalid = (errors: any) => {
        console.error("Validation errors:", errors)
        toast.error("Please check the form for errors")
    }

    const deleteTraining = async (id: string) => {
        if (!await confirmDanger("Delete Training?", "This will permanently delete the training and all enrollments.")) return
        try {
            await TrainingAPI.delete(id)
            showSuccess("Training Deleted", "The training and all enrollments have been removed.")
            fetchTrainings()
        } catch (error: any) {
            toast.error(error.message || "Deletion failed")
        }
    }

    const openEdit = (t: Training) => {
        setEditingId(t.id)
        form.reset({
            name: t.name || "",
            type: (t.type || "TECHNICAL") as any,
            description: t.description || "",
            status: (t.status || "HIGH") as any,
            dueDate: t.dueDate ? format(new Date(t.dueDate), "yyyy-MM-dd") : "",
            videoUrl: t.videoUrl || "",
            assignToAll: false,
            assignedEmployeeIds: t.enrollments?.map((e: any) => e.employeeId) || [],
        })
        setIsModalOpen(true)
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'SECURITY': return { grad: "from-[#ef4444] to-[#b91c1c]", text: "text-[#ef4444]", bg: "bg-red-50", icon: "🔒" }
            case 'COMPLIANCE': return { grad: "from-[#10b981] to-[#047857]", text: "text-[#10b981]", bg: "bg-emerald-50", icon: "🤝" }
            case 'TECHNICAL': return { grad: "from-[#3b82f6] to-[#1d4ed8]", text: "text-[#3b82f6]", bg: "bg-blue-50", icon: "⚛️" }
            case 'SOFT_SKILLS': return { grad: "from-[#8b5cf6] to-[#6d28d9]", text: "text-[#8b5cf6]", bg: "bg-violet-50", icon: "✨" }
            case 'LEADERSHIP': return { grad: "from-[#f59e0b] to-[#b45309]", text: "text-[#f59e0b]", bg: "bg-amber-50", icon: "👑" }
            default: return { grad: "from-gray-400 to-gray-600", text: "text-gray-500", bg: "bg-gray-100", icon: "📚" }
        }
    }

    const getStatusBadgeVariant = (status: string): "success" | "warning" | "info" => {
        switch (status) {
            case 'CRITICAL': return "warning"
            case 'HIGH': return "info"
            case 'LOW': return "success"
            default: return "info"
        }
    }

    // Dynamic Analytics Calculations
    const totalEnrollments = React.useMemo(() =>
        trainings.reduce((sum, t) => sum + (t.enrolledCount || t.enrollments?.length || 0), 0)
        , [trainings])

    const avgScore = React.useMemo(() => {
        const scores = trainings.flatMap(t => t.enrollments?.map((e: any) => e.score).filter((s: any) => s !== null && s !== undefined) || [])
        if (scores.length === 0) return 0
        return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    }, [trainings])

    const topPerformers = React.useMemo(() => {
        const employeeStats: Record<string, { name: string, completed: number, totalScore: number, scoreCount: number }> = {}

        trainings.forEach(t => {
            t.enrollments?.forEach(e => {
                if (!e.employee) return
                const id = e.employeeId
                if (!employeeStats[id]) {
                    employeeStats[id] = {
                        name: `${e.employee.firstName} ${e.employee.lastName}`,
                        completed: 0,
                        totalScore: 0,
                        scoreCount: 0
                    }
                }
                if (e.completed) employeeStats[id].completed++
                if (e.score !== null && e.score !== undefined) {
                    employeeStats[id].totalScore += e.score
                    employeeStats[id].scoreCount++
                }
            })
        })

        return Object.values(employeeStats)
            .map(s => ({
                name: s.name,
                completed: s.completed,
                avgScore: s.scoreCount > 0 ? Math.round(s.totalScore / s.scoreCount) : 0
            }))
            .sort((a, b) => b.completed - a.completed || b.avgScore - a.avgScore)
            .slice(0, 5)
    }, [trainings])

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="Learning & Development"
                description="Assign and track employee training modules"
                actions={
                    <Button
                        onClick={() => {
                            setEditingId(null)
                            form.reset()
                            setIsModalOpen(true)
                        }}
                        leftIcon={<PlusIcon className="w-4 h-4" />}
                    >
                        Create Course
                    </Button>
                }
            />

            <div className="grid grid-cols-[2fr_1fr] gap-5">
                <div className="flex flex-col gap-5">
                    <div className="p-6 bg-gradient-to-br from-[#007aff] to-[#5856d6] text-white relative overflow-hidden rounded-xl shadow-sm">
                        <div className="relative z-10 flex flex-col items-start gap-4">
                            <div>
                                <h2 className="text-[20px] font-bold mb-1">Training Hub</h2>
                                <p className="text-base text-white/80 max-w-[400px]">Manage mandatory compliance and skill-building modules for your entire organization.</p>
                            </div>
                        </div>
                        <div className="absolute right-[-20px] top-[-20px] w-[200px] h-[200px] bg-white/10 rounded-full blur-[40px]" />
                        <div className="absolute right-[40px] bottom-[20px] text-[80px] opacity-20 rotate-12">🎓</div>
                    </div>

                    <div>
                        <div className="text-[15px] font-bold text-text mb-[14px]">Active Courses</div>
                        <div className="flex flex-col gap-3">
                            {!isLoading ? trainings.map((t, i) => {
                                const { grad, text, bg, icon } = getTypeColor(t.type)
                                return (
                                    <div key={t.id} className="glass p-[18px] flex items-center gap-4 group transition-all duration-200 hover:-translate-y-[2px] hover:shadow-md animate-[fadeRow_0.4s_both]" style={{ animationDelay: `${i * 0.1}s` }}>
                                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0", bg)}>
                                            {icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="text-md font-bold text-text">{t.name}</h3>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={getStatusBadgeVariant(t.status)} size="sm">
                                                        {t.status === 'CRITICAL' ? 'Critical' : t.status === 'HIGH' ? 'High Priority' : t.status === 'LOW' ? 'Low Priority' : t.status.replace('_', ' ')}
                                                    </Badge>
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                                                        <Pencil2Icon className="w-3.5 h-3.5 text-text-3" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => deleteTraining(t.id)}>
                                                        <TrashIcon className="w-3.5 h-3.5 text-danger" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="text-sm text-text-3 mb-2 flex items-center gap-[10px]">
                                                <span>{t.type}</span>
                                                {t.dueDate && (
                                                    <>
                                                        <span className="w-[3px] h-[3px] bg-text-3 rounded-full" />
                                                        <span>Due: {format(new Date(t.dueDate), "MMM d, yyyy")}</span>
                                                    </>
                                                )}
                                                <span className="w-[3px] h-[3px] bg-text-3 rounded-full" />
                                                <span>👥 {t.enrolledCount || t.enrollments?.length || 0} enrolled</span>
                                                {t.videoUrl && <span className="text-xs text-danger font-bold">● Live Video</span>}
                                            </div>
                                            <div className="w-full h-[6px] bg-bg-2 rounded-[3px] overflow-hidden">
                                                <div className={cn("h-full rounded-[3px] bg-gradient-to-r", grad)} style={{ width: `${t.progress}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                )
                            }) : (
                                <div className="p-10 flex justify-center">
                                    <Spinner size="lg" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-5">
                    <Card variant="glass">
                        <CardContent>
                            <div className="text-base font-bold text-text mb-4 flex items-center gap-2">
                                <span>📊</span> Analytics
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-text-3">Total Enrollments</span>
                                    <span className="text-accent font-bold">{totalEnrollments}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-text-3">Avg. Score</span>
                                    <span className="font-bold">{avgScore}/100</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card variant="glass" className="flex-1">
                        <CardContent>
                            <div className="text-base font-bold text-text mb-4 flex items-center gap-2">
                                <span>🏆</span> Rewards Center
                            </div>
                            <div className="flex flex-col gap-3">
                                {topPerformers.length > 0 ? topPerformers.map((p, i) => (
                                    <LearnerRow key={p.name} name={p.name} courses={p.completed} score={p.avgScore} rank={i + 1} />
                                )) : (
                                    <div className="text-xs text-text-3 italic py-4 text-center">No results yet</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Edit Training Course" : "Create New Course"}
            >
                <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
                    <Input
                        label="Course Name *"
                        {...form.register('name')}
                        placeholder="e.g. Advanced Cybersecurity"
                        error={form.formState.errors.name ? String(form.formState.errors.name.message) : undefined}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Category *"
                            {...form.register('type')}
                        >
                            <option value="TECHNICAL">Technical</option>
                            <option value="COMPLIANCE">Compliance</option>
                            <option value="SECURITY">Security</option>
                            <option value="SOFT_SKILLS">Soft Skills</option>
                            <option value="LEADERSHIP">Leadership</option>
                        </Select>
                        <Input
                            label="Due Date"
                            type="date"
                            {...form.register('dueDate')}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Status *"
                            {...form.register('status')}
                        >
                            <option value="CRITICAL">Critical</option>
                            <option value="HIGH">High Priority</option>
                            <option value="LOW">Low Priority</option>
                        </Select>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-text-2 flex justify-between">
                                <span>Video URL / Upload</span>
                                <span className="text-[10px] text-text-3">Upload max 100MB</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    {...form.register('videoUrl')}
                                    className="input-base flex-1"
                                    placeholder="YouTube URL or Uploaded Link"
                                />
                                <label className="shrink-0 px-3 py-2 bg-surface border border-border rounded-md text-sm font-semibold cursor-pointer hover:bg-bg-2 transition-colors">
                                    📁 Upload
                                    <input type="file" className="hidden" accept="video/*" onChange={handleVideoUpload} />
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1 p-3 bg-surface-2 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-bold text-text-2 uppercase tracking-wider">Assign To</label>
                            <label className="flex items-center gap-2 text-sm font-bold cursor-pointer text-accent">
                                <input type="checkbox" {...form.register('assignToAll')} className="w-3.5 h-3.5" />
                                Assign to All Employees
                            </label>
                        </div>

                        {!form.watch('assignToAll') && (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    placeholder="Search employees..."
                                    value={employeeSearch}
                                    onChange={(e) => setEmployeeSearch(e.target.value)}
                                    className="input-base w-full text-sm"
                                />
                                <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                                    {employees.filter(emp => {
                                        if (!employeeSearch.trim()) return true
                                        const q = employeeSearch.toLowerCase()
                                        return (
                                            `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
                                            (emp.designation || '').toLowerCase().includes(q)
                                        )
                                    }).map(emp => (
                                        <label key={emp.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-bg-2 cursor-pointer border border-transparent hover:border-border transition-all">
                                            <input
                                                type="checkbox"
                                                value={emp.id}
                                                {...form.register('assignedEmployeeIds')}
                                                className="w-3.5 h-3.5"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-text leading-tight">{emp.firstName} {emp.lastName}</span>
                                                <span className="text-[10px] text-text-3 uppercase tracking-tight">{emp.designation}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                <div className="text-[10px] text-text-3 italic">
                                    {form.watch('assignedEmployeeIds')?.length || 0} employees selected
                                </div>
                            </div>
                        )}
                    </div>

                    <Textarea
                        label="Description"
                        {...form.register('description')}
                        rows={2}
                        placeholder="Provide details about the course..."
                    />

                    <div className="flex justify-end gap-2 pt-4 border-t border-border">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            loading={form.formState.isSubmitting}
                        >
                            Save Course
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
