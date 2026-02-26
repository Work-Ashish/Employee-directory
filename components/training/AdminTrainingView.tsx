"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { toast, Toaster } from "react-hot-toast"
import { format } from "date-fns"
import { PlusIcon, TrashIcon, Pencil2Icon } from "@radix-ui/react-icons"
import { Modal } from "@/components/ui/Modal"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const trainingSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["TECHNICAL", "COMPLIANCE", "SECURITY", "SOFT_SKILLS", "LEADERSHIP"]),
    description: z.string().optional(),
    status: z.enum(["UPCOMING", "IN_PROGRESS", "COMPLETED"]).default("UPCOMING"),
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
    videoUrl: string | null
    enrollments: any[]
}

function LearnerRow({ name, courses, score, rank }: any) {
    return (
        <div className="flex items-center gap-[12px] pb-[10px] border-b border-[var(--border)] last:border-0 last:pb-0">
            <div className={cn("w-[24px] h-[24px] rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0",
                rank === 1 ? "bg-[#eab308]" : (rank === 2 ? "bg-[#94a3b8]" : "bg-[#b45309]")
            )}>
                {rank}
            </div>
            <div className="flex-1">
                <div className="text-[13px] font-semibold text-[var(--text)]">{name}</div>
                <div className="text-[11px] text-[var(--text3)]">{courses} courses completed</div>
            </div>
            <div className="text-[13px] font-mono font-bold text-[var(--green)]">
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

    const form = useForm<TrainingFormData>({
        resolver: zodResolver(trainingSchema) as any,
        defaultValues: {
            name: "",
            type: "TECHNICAL",
            description: "",
            status: "UPCOMING",
            dueDate: format(new Date(), "yyyy-MM-dd"),
            videoUrl: "",
            assignToAll: false,
            assignedEmployeeIds: [],
        }
    })

    const fetchEmployees = React.useCallback(async () => {
        try {
            const res = await fetch('/api/employees?limit=100')
            if (res.ok) {
                const json = await res.json()
                setEmployees(Array.isArray(json) ? json : json.data || [])
            }
        } catch { console.error("Failed to load employees") }
    }, [])

    const fetchTrainings = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const res = await fetch('/api/training')
            if (res.ok) {
                setTrainings(await res.json())
            }
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
            const method = editingId ? 'PUT' : 'POST'
            const body = editingId ? { ...data, id: editingId } : data
            const res = await fetch('/api/training', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (res.ok) {
                toast.success(editingId ? "Course updated" : "Course created")
                setIsModalOpen(false)
                setEditingId(null)
                form.reset()
                fetchTrainings()
            } else {
                const err = await res.json()
                toast.error(err.error || "Operation failed")
            }
        } catch (error) {
            console.error("Submit error:", error)
            toast.error("An error occurred")
        }
    }

    const onInvalid = (errors: any) => {
        console.error("Validation errors:", errors)
        toast.error("Please check the form for errors")
    }

    const deleteTraining = async (id: string) => {
        if (!confirm("Are you sure? This will delete all enrollments too.")) return
        try {
            const res = await fetch(`/api/training?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success("Training deleted")
                fetchTrainings()
            } else {
                toast.error("Deletion failed")
            }
        } catch {
            toast.error("An error occurred")
        }
    }

    const openEdit = (t: Training) => {
        setEditingId(t.id)
        form.reset({
            name: t.name,
            type: t.type as any,
            description: t.description || "",
            status: t.status as any,
            dueDate: t.dueDate ? format(new Date(t.dueDate), "yyyy-MM-dd") : "",
            videoUrl: t.videoUrl || "",
            assignToAll: false,
            assignedEmployeeIds: t.enrollments?.map((e: any) => e.employeeId) || [],
        })
        setIsModalOpen(true)
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'SECURITY': return "from-[#ef4444] to-[#b91c1c] text-[#ef4444] bg-[rgba(239,68,68,0.1)] icon-🔒"
            case 'COMPLIANCE': return "from-[#10b981] to-[#047857] text-[#10b981] bg-[rgba(16,185,129,0.1)] icon-🤝"
            case 'TECHNICAL': return "from-[#3b82f6] to-[#1d4ed8] text-[#3b82f6] bg-[rgba(59,130,246,0.1)] icon-⚛️"
            case 'SOFT_SKILLS': return "from-[#8b5cf6] to-[#6d28d9] text-[#8b5cf6] bg-[rgba(139,92,246,0.1)] icon-✨"
            case 'LEADERSHIP': return "from-[#f59e0b] to-[#b45309] text-[#f59e0b] bg-[rgba(245,158,11,0.1)] icon-👑"
            default: return "from-gray-400 to-gray-600 text-gray-500 bg-gray-100 icon-📚"
        }
    }

    // Dynamic Analytics Calculations
    const totalEnrollments = React.useMemo(() =>
        trainings.reduce((sum, t) => sum + (t.enrollments?.length || 0), 0)
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
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <Toaster position="top-right" />
            <div className="flex items-center justify-between mb-[26px]">
                <div>
                    <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Learning & Development</h1>
                    <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Assign and track employee training modules</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null)
                        form.reset()
                        setIsModalOpen(true)
                    }}
                    className="flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
                >
                    <PlusIcon className="w-4 h-4" /> Create Course
                </button>
            </div>

            <div className="grid grid-cols-[2fr_1fr] gap-[20px]">
                <div className="flex flex-col gap-[20px]">
                    <div className="glass p-[24px] bg-gradient-to-br from-[#007aff] to-[#5856d6] text-white relative overflow-hidden">
                        <div className="relative z-10 flex flex-col items-start gap-4">
                            <div>
                                <h2 className="text-[20px] font-bold mb-1">Training Hub</h2>
                                <p className="text-[13.5px] text-white/80 max-w-[400px]">Manage mandatory compliance and skill-building modules for your entire organization.</p>
                            </div>
                        </div>
                        <div className="absolute right-[-20px] top-[-20px] w-[200px] h-[200px] bg-white/10 rounded-full blur-[40px]" />
                        <div className="absolute right-[40px] bottom-[20px] text-[80px] opacity-20 rotate-12">🎓</div>
                    </div>

                    <div>
                        <div className="text-[15px] font-bold text-[var(--text)] mb-[14px]">Active Courses</div>
                        <div className="flex flex-col gap-[12px]">
                            {!isLoading ? trainings.map((t, i) => {
                                const [grad, text, bg, icon] = getTypeColor(t.type).split(' ')
                                return (
                                    <div key={t.id} className="glass p-[18px] flex items-center gap-[16px] group transition-all duration-200 hover:-translate-y-[2px] hover:shadow-md animate-[fadeRow_0.4s_both]" style={{ animationDelay: `${i * 0.1}s` }}>
                                        <div className={cn("w-[48px] h-[48px] rounded-[12px] flex items-center justify-center text-[24px] shrink-0", bg)}>
                                            {icon.split('-')[1]}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="text-[14px] font-bold text-[var(--text)]">{t.name}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("text-[11px] font-bold px-[8px] py-[2px] rounded-[10px] uppercase tracking-[0.5px]",
                                                        t.status === 'COMPLETED' ? "bg-[var(--green-dim)] text-[#1a9140]" : (t.status === 'IN_PROGRESS' ? "bg-[var(--amber-dim)] text-[#b86c00]" : "bg-[var(--blue-dim)] text-[#0a7ea4]")
                                                    )}>
                                                        {t.status.replace('_', ' ')}
                                                    </span>
                                                    <button onClick={() => openEdit(t)} className="p-1 hover:bg-[var(--bg2)] rounded"><Pencil2Icon className="w-3.5 h-3.5 text-[var(--text3)]" /></button>
                                                    <button onClick={() => deleteTraining(t.id)} className="p-1 hover:bg-[var(--red-dim)] rounded"><TrashIcon className="w-3.5 h-3.5 text-[var(--red)]" /></button>
                                                </div>
                                            </div>
                                            <div className="text-[12px] text-[var(--text3)] mb-[8px] flex items-center gap-[10px]">
                                                <span>{t.type}</span>
                                                {t.dueDate && (
                                                    <>
                                                        <span className="w-[3px] h-[3px] bg-[var(--text3)] rounded-full" />
                                                        <span>Due: {format(new Date(t.dueDate), "MMM d, yyyy")}</span>
                                                    </>
                                                )}
                                                <span className="w-[3px] h-[3px] bg-[var(--text3)] rounded-full" />
                                                <span>👥 {t.enrollments?.length || 0} enrolled</span>
                                                {t.videoUrl && <span className="text-[11px] text-[var(--red)] font-bold">● Live Video</span>}
                                            </div>
                                            <div className="w-full h-[6px] bg-[var(--bg2)] rounded-[3px] overflow-hidden">
                                                <div className={cn("h-full rounded-[3px] bg-gradient-to-r", grad)} style={{ width: `${t.progress}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                )
                            }) : (
                                <div className="p-10 text-center text-[var(--text3)]">Loading courses...</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-[20px]">
                    <div className="glass p-[22px]">
                        <div className="text-[13.5px] font-bold text-[var(--text)] mb-[16px] flex items-center gap-2">
                            <span>📊</span> Analytics
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[12px]">
                                <span className="text-[var(--text3)]">Total Enrollments</span>
                                <span className="text-[var(--accent)] font-bold">{totalEnrollments}</span>
                            </div>
                            <div className="flex justify-between items-center text-[12px]">
                                <span className="text-[var(--text3)]">Avg. Score</span>
                                <span className="font-bold">{avgScore}/100</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass p-[22px] flex-1">
                        <div className="text-[13.5px] font-bold text-[var(--text)] mb-[16px] flex items-center gap-2">
                            <span>🏆</span> Rewards Center
                        </div>
                        <div className="flex flex-col gap-[12px]">
                            {topPerformers.length > 0 ? topPerformers.map((p, i) => (
                                <LearnerRow key={p.name} name={p.name} courses={p.completed} score={p.avgScore} rank={i + 1} />
                            )) : (
                                <div className="text-[11px] text-[var(--text3)] italic py-4 text-center">No results yet</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Edit Training Course" : "Create New Course"}
            >
                <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-[var(--text2)]">Course Name *</label>
                        <input
                            {...form.register('name')}
                            className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            placeholder="e.g. Advanced Cybersecurity"
                        />
                        {form.formState.errors.name && <p className="text-[11px] text-[var(--red)]">{String(form.formState.errors.name.message)}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Category *</label>
                            <select
                                {...form.register('type')}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            >
                                <option value="TECHNICAL">Technical</option>
                                <option value="COMPLIANCE">Compliance</option>
                                <option value="SECURITY">Security</option>
                                <option value="SOFT_SKILLS">Soft Skills</option>
                                <option value="LEADERSHIP">Leadership</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Due Date</label>
                            <input
                                type="date"
                                {...form.register('dueDate')}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Status *</label>
                            <select
                                {...form.register('status')}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            >
                                <option value="UPCOMING">Upcoming</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)] flex justify-between">
                                <span>Video URL / Upload</span>
                                <span className="text-[10px] text-[var(--text3)]">Upload max 100MB</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    {...form.register('videoUrl')}
                                    className="flex-1 p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                                    placeholder="YouTube URL or Uploaded Link"
                                />
                                <label className="shrink-0 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-md text-[12px] font-semibold cursor-pointer hover:bg-[var(--bg2)] transition-colors">
                                    📁 Upload
                                    <input type="file" className="hidden" accept="video/*" onChange={handleVideoUpload} />
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1 p-3 bg-[var(--surface2)] rounded-lg border border-[var(--border)]">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[12px] font-bold text-[var(--text2)] uppercase tracking-wider">Assign To</label>
                            <label className="flex items-center gap-2 text-[12px] font-bold cursor-pointer text-[var(--accent)]">
                                <input type="checkbox" {...form.register('assignToAll')} className="w-3.5 h-3.5" />
                                Assign to All Employees
                            </label>
                        </div>

                        {!form.watch('assignToAll') && (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                                    {employees.map(emp => (
                                        <label key={emp.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-[var(--bg2)] cursor-pointer border border-transparent hover:border-[var(--border)] transition-all">
                                            <input
                                                type="checkbox"
                                                value={emp.id}
                                                {...form.register('assignedEmployeeIds')}
                                                className="w-3.5 h-3.5"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-semibold text-[var(--text)] leading-tight">{emp.firstName} {emp.lastName}</span>
                                                <span className="text-[10px] text-[var(--text3)] uppercase tracking-tight">{emp.designation}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                <div className="text-[10px] text-[var(--text3)] italic">
                                    {form.watch('assignedEmployeeIds')?.length || 0} employees selected
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-[var(--text2)]">Description</label>
                        <textarea
                            {...form.register('description')}
                            rows={2}
                            className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] resize-none"
                            placeholder="Provide details about the course..."
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-[13px] font-semibold bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg2)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.formState.isSubmitting}
                            className="px-4 py-2 text-[13px] font-semibold text-white bg-[var(--accent)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {form.formState.isSubmitting ? "Saving..." : "Save Course"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
