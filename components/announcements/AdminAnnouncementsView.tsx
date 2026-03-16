"use client"

import * as React from "react"
import { extractArray, cn } from "@/lib/utils"
import { toast } from "sonner"
import { format } from "date-fns"
import { PlusIcon, TrashIcon, Pencil2Icon, DrawingPinFilledIcon, DrawingPinIcon } from "@radix-ui/react-icons"
import { Modal } from "@/components/ui/Modal"
import { AnnouncementAPI } from "@/features/announcements/api/client"
import { GoogleCalendarWidget } from "./GoogleCalendarWidget"
import { KudosSidebarWidget } from "./KudosSidebarWidget"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { PageHeader } from "@/components/ui/PageHeader"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Spinner } from "@/components/ui/Spinner"
import { EmptyState } from "@/components/ui/EmptyState"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"

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
            const data = await AnnouncementAPI.list()
            setAnnouncements(extractArray<Announcement>(data))
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
            if (editingId) {
                await AnnouncementAPI.update(editingId, data)
            } else {
                await AnnouncementAPI.create(data)
            }
            toast.success(editingId ? "Announcement updated" : "Announcement created")
            setIsModalOpen(false)
            setEditingId(null)
            form.reset()
            fetchAnnouncements()
        } catch (error: any) {
            console.error("Submit error:", error)
            toast.error(error.message || "Operation failed")
        }
    }

    const deleteAnnouncement = async (id: string) => {
        if (!confirm("Are you sure?")) return
        try {
            await AnnouncementAPI.delete(id)
            toast.success("Announcement deleted")
            fetchAnnouncements()
        } catch (error: any) {
            toast.error(error.message || "Deletion failed")
        }
    }

    const togglePin = async (ann: Announcement) => {
        try {
            await AnnouncementAPI.update(ann.id, { ...ann, isPinned: !ann.isPinned })
            toast.success(ann.isPinned ? "Unpinned" : "Pinned")
            fetchAnnouncements()
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

    const getPriorityBadgeVariant = (prio: string): "info" | "warning" | "danger" | "neutral" => {
        switch (prio) {
            case 'LOW': return "info"
            case 'MEDIUM': return "warning"
            case 'HIGH': return "danger"
            default: return "neutral"
        }
    }

    const pinnedAnnouncements = announcements.filter(a => a.isPinned)
    const otherAnnouncements = announcements.filter(a => !a.isPinned)

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="Announcements"
                description="Stay updated with company news and events"
                actions={
                    <Button
                        onClick={() => {
                            setEditingId(null)
                            form.reset()
                            setIsModalOpen(true)
                        }}
                        leftIcon={<PlusIcon className="w-4 h-4" />}
                    >
                        New Announcement
                    </Button>
                }
            />

            <div className="grid grid-cols-[1fr_350px] gap-5">
                <div className="flex flex-col gap-4">
                    {isLoading ? (
                        <div className="p-10 flex justify-center">
                            <Spinner size="lg" />
                        </div>
                    ) : announcements.length === 0 ? (
                        <EmptyState
                            title="No announcements yet"
                            description="Create one to get started!"
                            action={
                                <Button
                                    onClick={() => {
                                        setEditingId(null)
                                        form.reset()
                                        setIsModalOpen(true)
                                    }}
                                    leftIcon={<PlusIcon className="w-4 h-4" />}
                                >
                                    New Announcement
                                </Button>
                            }
                        />
                    ) : (
                        announcements.map((ann, i) => {
                            const { icon, color } = getCategoryDetails(ann.category)
                            return (
                                <div key={ann.id} className="glass p-[22px] group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200 animate-[fadeRow_0.4s_both]" style={{ animationDelay: `${i * 0.1}s` }}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-[42px] h-[42px] rounded-xl flex items-center justify-center text-[20px] shrink-0 bg-gradient-to-br text-white shadow-sm", color)}>
                                                {icon}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-base font-bold text-text group-hover:text-accent transition-colors">{ann.title}</h3>
                                                    {ann.isPinned && <DrawingPinFilledIcon className="w-3.5 h-3.5 text-warning" />}
                                                </div>
                                                <div className="text-sm text-text-3 flex items-center gap-1.5 mt-[1px]">
                                                    <span>{ann.author}</span>
                                                    <span className="w-[3px] h-[3px] bg-text-3 rounded-full" />
                                                    <span>{format(new Date(ann.createdAt), "MMM d, yyyy")}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={getPriorityBadgeVariant(ann.priority)} size="sm">
                                                {ann.priority}
                                            </Badge>
                                            <Button variant="ghost" size="icon" onClick={() => togglePin(ann)} title={ann.isPinned ? "Unpin" : "Pin"}>
                                                {ann.isPinned ? <DrawingPinFilledIcon className="w-3.5 h-3.5 text-warning" /> : <DrawingPinIcon className="w-3.5 h-3.5 text-text-3" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(ann)}>
                                                <Pencil2Icon className="w-3.5 h-3.5 text-text-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => deleteAnnouncement(ann.id)}>
                                                <TrashIcon className="w-3.5 h-3.5 text-danger" />
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-base text-text-2 leading-[1.5] mb-3 pl-[54px]">{ann.content}</p>
                                </div>
                            )
                        })
                    )}
                </div>

                <div className="flex flex-col gap-5">
                    <div className="p-[22px] rounded-xl shadow-sm bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] text-white">
                        <div className="text-md font-bold mb-3 flex items-center gap-2">
                            <span>📌</span> Pinned
                        </div>
                        {pinnedAnnouncements.length > 0 ? pinnedAnnouncements.map(ann => (
                            <div key={ann.id} className="p-[14px] bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 mb-[10px] last:mb-0">
                                <div className="text-xs font-bold text-warning uppercase tracking-[0.5px] mb-1">{ann.priority}</div>
                                <div className="text-md font-bold mb-1.5">{ann.title}</div>
                                <p className="text-sm text-white/70 leading-[1.4] line-clamp-2">{ann.content}</p>
                            </div>
                        )) : (
                            <div className="text-sm text-white/50 italic py-4 text-center">No pinned announcements</div>
                        )}
                        <Button
                            variant="secondary"
                            className="w-full mt-3 bg-white text-black hover:bg-white/90"
                            onClick={() => {
                                setEditingId(null)
                                form.reset()
                                setIsModalOpen(true)
                            }}
                        >
                            + New Announcement
                        </Button>
                    </div>

                    <GoogleCalendarWidget />

                    <KudosSidebarWidget />
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Edit Announcement" : "New Announcement"}
            >
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        label="Title *"
                        {...form.register('title')}
                        placeholder="e.g. Office Relocation"
                        error={form.formState.errors.title?.message as string}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Category *"
                            {...form.register('category')}
                        >
                            <option value="GENERAL">General</option>
                            <option value="EVENT">Event</option>
                            <option value="POLICY">Policy</option>
                            <option value="MEETING">Meeting</option>
                            <option value="SYSTEM">System</option>
                        </Select>
                        <Select
                            label="Priority *"
                            {...form.register('priority')}
                        >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 py-1">
                        <input type="checkbox" {...form.register('isPinned')} id="isPinned" className="w-3.5 h-3.5" />
                        <label htmlFor="isPinned" className="text-base font-medium text-text cursor-pointer">Pin to sidebar</label>
                    </div>

                    <Textarea
                        label="Content *"
                        {...form.register('content')}
                        rows={4}
                        placeholder="Type your announcement here..."
                        error={form.formState.errors.content?.message as string}
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
                            Save Announcement
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
