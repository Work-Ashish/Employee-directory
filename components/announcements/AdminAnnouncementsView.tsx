"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { toast, Toaster } from "react-hot-toast"
import { format } from "date-fns"
import { PlusIcon, TrashIcon, Pencil2Icon, DrawingPinFilledIcon, DrawingPinIcon } from "@radix-ui/react-icons"
import { Modal } from "@/components/ui/Modal"
import { GoogleCalendarWidget } from "./GoogleCalendarWidget"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const announcementSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    category: z.enum(["EVENT", "POLICY", "MEETING", "SYSTEM", "GENERAL"]),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
    isPinned: z.boolean().default(false),
})

type AnnouncementFormData = z.infer<typeof announcementSchema>

type Announcement = {
    id: string
    title: string
    content: string
    author: string
    category: string
    priority: string
    isPinned: boolean
    createdAt: string
    updatedAt: string
}


export function AdminAnnouncementsView() {
    const [announcements, setAnnouncements] = React.useState<Announcement[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [editingId, setEditingId] = React.useState<string | null>(null)

    const form = useForm<AnnouncementFormData>({
        resolver: zodResolver(announcementSchema) as any,
        defaultValues: {
            title: "",
            content: "",
            category: "GENERAL",
            priority: "MEDIUM",
            isPinned: false,
        }
    })

    const fetchAnnouncements = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const res = await fetch('/api/announcements')
            if (res.ok) {
                setAnnouncements(await res.json())
            }
        } catch {
            toast.error("Failed to load announcements")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchAnnouncements()
    }, [fetchAnnouncements])

    const onSubmit = async (data: AnnouncementFormData) => {
        try {
            const method = editingId ? 'PUT' : 'POST'
            const body = editingId ? { ...data, id: editingId } : data
            const res = await fetch('/api/announcements', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (res.ok) {
                toast.success(editingId ? "Announcement updated" : "Announcement created")
                setIsModalOpen(false)
                setEditingId(null)
                form.reset()
                fetchAnnouncements()
            } else {
                const err = await res.json()
                toast.error(err.error || "Operation failed")
            }
        } catch (error) {
            console.error("Submit error:", error)
            toast.error("An error occurred")
        }
    }

    const deleteAnnouncement = async (id: string) => {
        if (!confirm("Are you sure?")) return
        try {
            const res = await fetch(`/api/announcements?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success("Announcement deleted")
                fetchAnnouncements()
            } else {
                toast.error("Deletion failed")
            }
        } catch {
            toast.error("An error occurred")
        }
    }

    const togglePin = async (ann: Announcement) => {
        try {
            const res = await fetch('/api/announcements', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...ann, isPinned: !ann.isPinned })
            })
            if (res.ok) {
                toast.success(ann.isPinned ? "Unpinned" : "Pinned")
                fetchAnnouncements()
            }
        } catch {
            toast.error("Failed to update pinning")
        }
    }

    const openEdit = (ann: Announcement) => {
        setEditingId(ann.id)
        form.reset({
            title: ann.title,
            content: ann.content,
            category: ann.category as any,
            priority: ann.priority as any,
            isPinned: ann.isPinned,
        })
        setIsModalOpen(true)
    }

    const getCategoryDetails = (cat: string) => {
        switch (cat) {
            case 'EVENT': return { icon: "🎉", color: "from-[#f59e0b] to-[#d97706]" }
            case 'POLICY': return { icon: "🏥", color: "from-[#10b981] to-[#059669]" }
            case 'MEETING': return { icon: "📢", color: "from-[#3b82f6] to-[#1d4ed8]" }
            case 'SYSTEM': return { icon: "🛠️", color: "from-[#64748b] to-[#475569]" }
            case 'GENERAL': return { icon: "📝", color: "from-[#8b5cf6] to-[#6d28d9]" }
            default: return { icon: "📢", color: "from-gray-400 to-gray-600" }
        }
    }

    const getPriorityStyles = (prio: string) => {
        switch (prio) {
            case 'LOW': return "bg-[var(--blue-dim)] text-[#0a7ea4]"
            case 'MEDIUM': return "bg-[var(--amber-dim)] text-[#b86c00]"
            case 'HIGH': return "bg-[var(--red-dim)] text-[var(--red)]"
            default: return "bg-gray-100 text-gray-500"
        }
    }

    const pinnedAnnouncements = announcements.filter(a => a.isPinned)
    const otherAnnouncements = announcements.filter(a => !a.isPinned)

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <Toaster position="top-right" />
            <div className="flex items-center justify-between mb-[26px]">
                <div>
                    <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Announcements</h1>
                    <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Stay updated with company news and events</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null)
                        form.reset()
                        setIsModalOpen(true)
                    }}
                    className="flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
                >
                    <PlusIcon className="w-4 h-4" /> New Announcement
                </button>
            </div>

            <div className="grid grid-cols-[1fr_350px] gap-[20px]">
                <div className="flex flex-col gap-[16px]">
                    {isLoading ? (
                        <div className="p-10 text-center text-[var(--text3)]">Loading announcements...</div>
                    ) : announcements.length === 0 ? (
                        <div className="p-10 text-center text-[var(--text3)] glass">No announcements yet. Create one to get started!</div>
                    ) : (
                        announcements.map((ann, i) => {
                            const { icon, color } = getCategoryDetails(ann.category)
                            return (
                                <div key={ann.id} className="glass p-[22px] group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200 animate-[fadeRow_0.4s_both]" style={{ animationDelay: `${i * 0.1}s` }}>
                                    <div className="flex justify-between items-start mb-[12px]">
                                        <div className="flex items-center gap-[12px]">
                                            <div className={cn("w-[42px] h-[42px] rounded-[12px] flex items-center justify-center text-[20px] shrink-0 bg-gradient-to-br text-white shadow-sm", color)}>
                                                {icon}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-[16px] font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{ann.title}</h3>
                                                    {ann.isPinned && <DrawingPinFilledIcon className="w-3.5 h-3.5 text-[var(--amber)]" />}
                                                </div>
                                                <div className="text-[12px] text-[var(--text3)] flex items-center gap-[6px] mt-[1px]">
                                                    <span>{ann.author}</span>
                                                    <span className="w-[3px] h-[3px] bg-[var(--text3)] rounded-full" />
                                                    <span>{format(new Date(ann.createdAt), "MMM d, yyyy")}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-[11px] font-bold px-[8px] py-[2px] rounded-[10px] uppercase tracking-[0.5px]", getPriorityStyles(ann.priority))}>
                                                {ann.priority}
                                            </span>
                                            <button onClick={() => togglePin(ann)} className="p-1.5 hover:bg-[var(--bg2)] rounded transition-colors" title={ann.isPinned ? "Unpin" : "Pin"}>
                                                {ann.isPinned ? <DrawingPinFilledIcon className="w-3.5 h-3.5 text-[var(--amber)]" /> : <DrawingPinIcon className="w-3.5 h-3.5 text-[var(--text3)]" />}
                                            </button>
                                            <button onClick={() => openEdit(ann)} className="p-1.5 hover:bg-[var(--bg2)] rounded transition-colors"><Pencil2Icon className="w-3.5 h-3.5 text-[var(--text3)]" /></button>
                                            <button onClick={() => deleteAnnouncement(ann.id)} className="p-1.5 hover:bg-[var(--red-dim)] rounded transition-colors"><TrashIcon className="w-3.5 h-3.5 text-[var(--red)]" /></button>
                                        </div>
                                    </div>
                                    <p className="text-[13.5px] text-[var(--text2)] leading-[1.5] mb-[12px] pl-[54px]">{ann.content}</p>
                                </div>
                            )
                        })
                    )}
                </div>

                <div className="flex flex-col gap-[20px]">
                    <div className="glass p-[22px] bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] text-white">
                        <div className="text-[14px] font-bold mb-[12px] flex items-center gap-2">
                            <span>📌</span> Pinned
                        </div>
                        {pinnedAnnouncements.length > 0 ? pinnedAnnouncements.map(ann => (
                            <div key={ann.id} className="p-[14px] bg-white/10 rounded-[12px] backdrop-blur-sm border border-white/10 mb-[10px] last:mb-0">
                                <div className="text-[11px] font-bold text-[var(--amber)] uppercase tracking-[0.5px] mb-[4px]">{ann.priority}</div>
                                <div className="text-[14px] font-bold mb-[6px]">{ann.title}</div>
                                <p className="text-[12px] text-white/70 leading-[1.4] line-clamp-2">{ann.content}</p>
                            </div>
                        )) : (
                            <div className="text-[12px] text-white/50 italic py-4 text-center">No pinned announcements</div>
                        )}
                        <button
                            onClick={() => {
                                setEditingId(null)
                                form.reset()
                                setIsModalOpen(true)
                            }}
                            className="w-full py-[8px] bg-white text-black rounded-[8px] text-[13px] font-bold mt-[12px] hover:bg-white/90 transition-colors"
                        >
                            + New Announcement
                        </button>
                    </div>

                    <GoogleCalendarWidget />
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Edit Announcement" : "New Announcement"}
            >
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-[var(--text2)]">Title *</label>
                        <input
                            {...form.register('title')}
                            className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            placeholder="e.g. Office Relocation"
                        />
                        {form.formState.errors.title && <p className="text-[11px] text-[var(--red)]">{form.formState.errors.title.message as string}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Category *</label>
                            <select
                                {...form.register('category')}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            >
                                <option value="GENERAL">General</option>
                                <option value="EVENT">Event</option>
                                <option value="POLICY">Policy</option>
                                <option value="MEETING">Meeting</option>
                                <option value="SYSTEM">System</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Priority *</label>
                            <select
                                {...form.register('priority')}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 py-1">
                        <input type="checkbox" {...form.register('isPinned')} id="isPinned" className="w-3.5 h-3.5" />
                        <label htmlFor="isPinned" className="text-[13px] font-medium text-[var(--text)] cursor-pointer">Pin to sidebar</label>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-[var(--text2)]">Content *</label>
                        <textarea
                            {...form.register('content')}
                            rows={4}
                            className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] resize-none"
                            placeholder="Type your announcement here..."
                        />
                        {form.formState.errors.content && <p className="text-[11px] text-[var(--red)]">{form.formState.errors.content.message as string}</p>}
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
                            {form.formState.isSubmitting ? "Saving..." : "Save Announcement"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
