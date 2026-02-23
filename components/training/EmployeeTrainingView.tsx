"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { toast, Toaster } from "react-hot-toast"
import { format } from "date-fns"
import { Modal } from "@/components/ui/Modal"

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
            const res = await fetch('/api/training')
            if (res.ok) {
                setTrainings(await res.json())
            }
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
            const res = await fetch('/api/training/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trainingId, employeeId, completed: true, score: 100 })
            })
            if (res.ok) {
                toast.success("Course marked as completed!")
                fetchTrainings()
                setSelectedTraining(null)
            } else {
                toast.error("Failed to update status")
            }
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
            case 'SECURITY': return "from-[#ef4444] to-[#b91c1c] icon-🔒 bg-[rgba(239,68,68,0.1)]"
            case 'COMPLIANCE': return "from-[#10b981] to-[#047857] icon-🤝 bg-[rgba(16,185,129,0.1)]"
            case 'TECHNICAL': return "from-[#3b82f6] to-[#1d4ed8] icon-⚛️ bg-[rgba(59,130,246,0.1)]"
            case 'SOFT_SKILLS': return "from-[#8b5cf6] to-[#6d28d9] icon-✨ bg-[rgba(139,92,246,0.1)]"
            case 'LEADERSHIP': return "from-[#f59e0b] to-[#b45309] icon-👑 bg-[rgba(245,158,11,0.1)]"
            default: return "from-gray-400 to-gray-600 icon-📚 bg-gray-100"
        }
    }

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <Toaster position="top-right" />
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">My Learning</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Access your courses and track progress</p>
            </div>

            <div className="grid grid-cols-[2fr_1fr] gap-[20px]">
                <div className="flex flex-col gap-[20px]">
                    <div className="glass p-[24px] bg-gradient-to-br from-[#10b981] to-[#059669] text-white relative overflow-hidden">
                        <div className="relative z-10 flex flex-col items-start gap-4">
                            <div>
                                <div className="text-[11px] font-bold uppercase tracking-wider bg-white/20 inline-block px-2 py-1 rounded mb-2">Recommended</div>
                                <h2 className="text-[20px] font-bold mb-1">Advanced Leadership Skills</h2>
                                <p className="text-[13.5px] text-white/90 max-w-[400px]">Prepare for your next role with this comprehensive leadership track.</p>
                            </div>
                        </div>
                        <div className="absolute right-[20px] bottom-[10px] text-[100px] opacity-20 rotate-[-12]">🚀</div>
                    </div>

                    <div>
                        <div className="text-[15px] font-bold text-[var(--text)] mb-[14px]">My Active Courses</div>
                        <div className="flex flex-col gap-[12px]">
                            {!isLoading ? trainings.map((t, i) => {
                                const [grad, icon, bg] = getTypeColor(t.type).split(' ')
                                return (
                                    <div key={t.id} className="glass p-[18px] flex items-center gap-[16px] group transition-all duration-200 hover:-translate-y-[2px] hover:shadow-md">
                                        <div className={cn("w-[48px] h-[48px] rounded-[12px] flex items-center justify-center text-[24px] shrink-0", bg)}>
                                            {icon.split('-')[1]}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="text-[14px] font-bold text-[var(--text)]">{t.name}</h3>
                                                <span className={cn("text-[11px] font-bold px-[8px] py-[2px] rounded-[10px] uppercase tracking-[0.5px]",
                                                    t.status === 'COMPLETED' ? "bg-[var(--green-dim)] text-[#1a9140]" : "bg-[var(--blue-dim)] text-[#0a7ea4]"
                                                )}>
                                                    {t.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="text-[12px] text-[var(--text3)] mb-[8px] flex items-center gap-[10px]">
                                                <span>{t.type}</span>
                                                {t.dueDate && (
                                                    <>
                                                        <span className="w-[3px] h-[3px] bg-[var(--text3)] rounded-full" />
                                                        <span>Due: {format(new Date(t.dueDate), "MMM d, yyyy")}</span>
                                                    </>
                                                )}
                                                {t.videoUrl && <span className="text-[11px] text-[var(--red)] font-bold italic">● Includes Video</span>}
                                            </div>
                                            <div className="w-full h-[6px] bg-[var(--bg2)] rounded-[3px] overflow-hidden">
                                                <div className={cn("h-full rounded-[3px] bg-gradient-to-r", grad)} style={{ width: `${t.progress}%` }} />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedTraining(t)}
                                            className="px-4 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[13px] font-semibold hover:bg-[var(--bg)] transition-colors"
                                        >
                                            {t.status === 'COMPLETED' ? 'Review' : 'Start'}
                                        </button>
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
                            <span>🏆</span> My Achievements
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-[var(--surface2)] rounded-xl border border-[var(--border)] flex flex-col items-center text-center">
                                <div className="text-2xl mb-1">🥇</div>
                                <div className="text-[12px] font-bold">Fast Learner</div>
                            </div>
                            <div className="p-3 bg-[var(--surface2)] rounded-xl border border-[var(--border)] flex flex-col items-center text-center">
                                <div className="text-2xl mb-1">🔥</div>
                                <div className="text-[12px] font-bold">3 Day Streak</div>
                            </div>
                        </div>
                    </div>
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
                                        <p className="text-[14px]">Video player unavailable</p>
                                        <a href={selectedTraining.videoUrl} target="_blank" className="text-[var(--accent)] underline mt-2">Open Video in New Tab</a>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-20 bg-[var(--bg2)] rounded-xl flex flex-col items-center justify-center text-center">
                                <div className="text-4xl mb-4">📖</div>
                                <p className="text-[15px] font-medium">This course focuses on reading materials and practical exercises.</p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <h3 className="text-[16px] font-bold">Course Description</h3>
                            <p className="text-[14px] text-[var(--text3)] leading-relaxed">{selectedTraining.description || "No description provided for this course."}</p>
                        </div>

                        <div className="flex justify-between items-center pt-6 border-t border-[var(--border)]">
                            <button
                                onClick={() => setSelectedTraining(null)}
                                className="px-6 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[13px] font-bold hover:bg-[var(--bg2)] transition-colors"
                            >
                                Close
                            </button>
                            {selectedTraining.status !== 'COMPLETED' && (
                                <button
                                    onClick={() => markAsCompleted(selectedTraining.id)}
                                    className="px-6 py-2.5 bg-[var(--green)] text-white rounded-lg text-[13px] font-extrabold shadow-lg hover:opacity-90 transition-opacity"
                                >
                                    Mark as Completed ✓
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
