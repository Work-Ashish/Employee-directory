"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format } from "date-fns"
import { Modal } from "@/components/ui/Modal"
import { PageHeader } from "@/components/ui/PageHeader"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Spinner } from "@/components/ui/Spinner"
import { Card, CardContent } from "@/components/ui/Card"
import { TrainingAPI } from "@/features/training/api/client"
import { api } from "@/lib/api-client"

type Training = {
    id: string
    name: string
    type: string
    description: string | null
    status: string
    progress: number
    dueDate: string | null
    videoUrl: string | null
}

export function EmployeeTrainingView({ employeeId }: { employeeId: string }) {
    const [trainings, setTrainings] = React.useState<Training[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [selectedTraining, setSelectedTraining] = React.useState<Training | null>(null)

    const fetchTrainings = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const data = await TrainingAPI.list()
            const rawResult = (data as any)?.results || data
            const raw = Array.isArray(rawResult) ? rawResult : []
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
            const mapped: Training[] = (Array.isArray(raw) ? raw : []).map((t: any) => ({
                id: t.id,
                name: t.title || t.name || "",
                type: t.type || "TECHNICAL",
                description: t.description || "",
                status: REVERSE_STATUS[t.status] || t.status || "HIGH",
                progress: t.status === "COMPLETED" || t.status === "LOW" ? 100 : 0,
                dueDate: t.startDate || t.dueDate || null,
                videoUrl: t.videoUrl || null,
            }))
            setTrainings(mapped)
        } catch {
            toast.error("Failed to load courses")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchTrainings()
    }, [fetchTrainings])

    const markAsCompleted = async (trainingId: string) => {
        try {
            await api.post('/training/enroll/', { trainingId, employeeId, completed: true, score: 100 })
            toast.success("Course marked as completed!")
            fetchTrainings()
            setSelectedTraining(null)
        } catch {
            toast.error("An error occurred")
        }
    }

    const getYouTubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
        const match = url.match(regExp)
        return (match && match[2].length === 11) ? match[2] : null
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'SECURITY': return { grad: "from-[#ef4444] to-[#b91c1c]", icon: "🔒", bg: "bg-red-50" }
            case 'COMPLIANCE': return { grad: "from-[#10b981] to-[#047857]", icon: "🤝", bg: "bg-emerald-50" }
            case 'TECHNICAL': return { grad: "from-[#3b82f6] to-[#1d4ed8]", icon: "⚛️", bg: "bg-blue-50" }
            case 'SOFT_SKILLS': return { grad: "from-[#8b5cf6] to-[#6d28d9]", icon: "✨", bg: "bg-violet-50" }
            case 'LEADERSHIP': return { grad: "from-[#f59e0b] to-[#b45309]", icon: "👑", bg: "bg-amber-50" }
            default: return { grad: "from-gray-400 to-gray-600", icon: "📚", bg: "bg-gray-100" }
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

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="My Learning"
                description="Access your courses and track progress"
            />

            <div className="grid grid-cols-[2fr_1fr] gap-5">
                <div className="flex flex-col gap-5">
                    <div className="glass p-6 bg-gradient-to-br from-[#10b981] to-[#059669] text-white relative overflow-hidden">
                        <div className="relative z-10 flex flex-col items-start gap-4">
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider bg-white/20 inline-block px-2 py-1 rounded mb-2">Recommended</div>
                                <h2 className="text-[20px] font-bold mb-1">Advanced Leadership Skills</h2>
                                <p className="text-base text-white/90 max-w-[400px]">Prepare for your next role with this comprehensive leadership track.</p>
                            </div>
                        </div>
                        <div className="absolute right-[20px] bottom-[10px] text-[100px] opacity-20 rotate-[-12]">🚀</div>
                    </div>

                    <div>
                        <div className="text-[15px] font-bold text-text mb-[14px]">My Active Courses</div>
                        <div className="flex flex-col gap-3">
                            {!isLoading ? trainings.map((t, i) => {
                                const { grad, icon, bg } = getTypeColor(t.type)
                                return (
                                    <div key={t.id} className="glass p-[18px] flex items-center gap-4 group transition-all duration-200 hover:-translate-y-[2px] hover:shadow-md">
                                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0", bg)}>
                                            {icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="text-md font-bold text-text">{t.name}</h3>
                                                <Badge variant={getStatusBadgeVariant(t.status)} size="sm">
                                                    {t.status === 'CRITICAL' ? 'Critical' : t.status === 'HIGH' ? 'High Priority' : t.status === 'LOW' ? 'Low Priority' : t.status.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                            <div className="text-sm text-text-3 mb-2 flex items-center gap-[10px]">
                                                <span>{t.type}</span>
                                                {t.dueDate && (
                                                    <>
                                                        <span className="w-[3px] h-[3px] bg-text-3 rounded-full" />
                                                        <span>Due: {format(new Date(t.dueDate), "MMM d, yyyy")}</span>
                                                    </>
                                                )}
                                                {t.videoUrl && <span className="text-xs text-danger font-bold italic">● Includes Video</span>}
                                            </div>
                                            <div className="w-full h-[6px] bg-bg-2 rounded-[3px] overflow-hidden">
                                                <div className={cn("h-full rounded-[3px] bg-gradient-to-r", grad)} style={{ width: `${t.progress}%` }} />
                                            </div>
                                        </div>
                                        <Button
                                            variant="secondary"
                                            onClick={() => setSelectedTraining(t)}
                                        >
                                            {t.status === 'COMPLETED' ? 'Review' : 'Start'}
                                        </Button>
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
                                <span>🏆</span> My Achievements
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-surface-2 rounded-xl border border-border flex flex-col items-center text-center">
                                    <div className="text-2xl mb-1">🥇</div>
                                    <div className="text-sm font-bold">Fast Learner</div>
                                </div>
                                <div className="p-3 bg-surface-2 rounded-xl border border-border flex flex-col items-center text-center">
                                    <div className="text-2xl mb-1">🔥</div>
                                    <div className="text-sm font-bold">3 Day Streak</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Modal
                isOpen={!!selectedTraining}
                onClose={() => setSelectedTraining(null)}
                title={selectedTraining?.name || ""}
                className="max-w-4xl"
            >
                {selectedTraining && (
                    <div className="space-y-6">
                        {selectedTraining.videoUrl ? (
                            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-2xl relative group">
                                {getYouTubeId(selectedTraining.videoUrl) ? (
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={`https://www.youtube.com/embed/${getYouTubeId(selectedTraining.videoUrl)}?autoplay=1`}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="absolute inset-0"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-white/60 p-10">
                                        <div className="text-4xl mb-4">📹</div>
                                        <p className="text-md">Video player unavailable</p>
                                        <a href={selectedTraining.videoUrl} target="_blank" className="text-accent underline mt-2">Open Video in New Tab</a>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-20 bg-bg-2 rounded-xl flex flex-col items-center justify-center text-center">
                                <div className="text-4xl mb-4">📖</div>
                                <p className="text-[15px] font-medium">This course focuses on reading materials and practical exercises.</p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <h3 className="text-base font-bold">Course Description</h3>
                            <p className="text-md text-text-3 leading-relaxed">{selectedTraining.description || "No description provided for this course."}</p>
                        </div>

                        <div className="flex justify-between items-center pt-6 border-t border-border">
                            <Button
                                variant="secondary"
                                onClick={() => setSelectedTraining(null)}
                            >
                                Close
                            </Button>
                            {selectedTraining.status !== 'COMPLETED' && (
                                <Button
                                    variant="success"
                                    className="shadow-lg"
                                    onClick={() => markAsCompleted(selectedTraining.id)}
                                >
                                    Mark as Completed ✓
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
