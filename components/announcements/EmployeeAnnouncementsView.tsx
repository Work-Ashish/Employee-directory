"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { DrawingPinFilledIcon } from "@radix-ui/react-icons"
import { GoogleCalendarWidget } from "./GoogleCalendarWidget"
import { KudosSidebarWidget } from "./KudosSidebarWidget"
import { Badge } from "@/components/ui/Badge"
import { AnnouncementAPI } from "@/features/announcements/api/client"

type Announcement = {
    id: string
    title: string
    content: string
    author?: string
    category?: string
    priority: string
    priorityDisplay?: string
    isPinned?: boolean
    isActive?: boolean
    createdBy?: string | null
    createdByName?: string | null
    expiresAt?: string | null
    createdAt: string
    updatedAt?: string
}


export function EmployeeAnnouncementsView() {
    const [announcements, setAnnouncements] = React.useState<Announcement[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    const fetchAnnouncements = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const data = await AnnouncementAPI.list()
            setAnnouncements(data.results || (data as unknown as Announcement[]))
        } catch {
            console.error("Failed to load announcements")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchAnnouncements()
    }, [fetchAnnouncements])

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

    const getPriorityVariant = (prio: string): "info" | "warning" | "danger" | "neutral" => {
        switch (prio) {
            case 'LOW': return "info"
            case 'MEDIUM': return "warning"
            case 'HIGH': return "danger"
            default: return "neutral"
        }
    }

    const pinnedAnnouncements = announcements.filter(a => a.isPinned)

    return (
        <div className="space-y-6 animate-page-in">
            <div className="mb-[26px]">
                <h1 className="text-2xl font-extrabold tracking-[-0.5px] text-text">Announcements</h1>
                <p className="text-base text-text-3 mt-[4px]">Stay updated with company news and events</p>
            </div>

            <div className="grid grid-cols-[1fr_350px] gap-[20px]">
                <div className="flex flex-col gap-[16px]">
                    {isLoading ? (
                        <div className="p-10 text-center text-text-3">Loading announcements...</div>
                    ) : announcements.length === 0 ? (
                        <div className="p-10 text-center text-text-3 glass">No announcements yet. Check back later!</div>
                    ) : (
                        announcements.map((ann, i) => {
                            const { icon, color } = getCategoryDetails(ann.category || "general")
                            return (
                                <div key={ann.id} className="glass p-[22px] group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200 animate-[fadeRow_0.4s_both]" style={{ animationDelay: `${i * 0.1}s` }}>
                                    <div className="flex justify-between items-start mb-[12px]">
                                        <div className="flex items-center gap-[12px]">
                                            <div className={cn("w-[42px] h-[42px] rounded-[12px] flex items-center justify-center text-[20px] shrink-0 bg-gradient-to-br text-white shadow-sm", color)}>
                                                {icon}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-bold text-text group-hover:text-accent transition-colors">{ann.title}</h3>
                                                    {ann.isPinned && <DrawingPinFilledIcon className="w-3.5 h-3.5 text-warning" />}
                                                </div>
                                                <div className="text-sm text-text-3 flex items-center gap-[6px] mt-[1px]">
                                                    <span>{ann.author}</span>
                                                    <span className="w-[3px] h-[3px] bg-text-3 rounded-full" />
                                                    <span>{format(new Date(ann.createdAt), "MMM d, yyyy")}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant={getPriorityVariant(ann.priority)} size="sm" className="uppercase tracking-[0.5px]">
                                            {ann.priority}
                                        </Badge>
                                    </div>
                                    <p className="text-base text-text-2 leading-[1.5] mb-[12px] pl-[54px]">{ann.content}</p>
                                </div>
                            )
                        })
                    )}
                </div>

                <div className="flex flex-col gap-[20px]">
                    <div className="p-[22px] rounded-xl shadow-sm bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] text-white">
                        <div className="text-md font-bold mb-[12px] flex items-center gap-2">
                            <span>📌</span> Pinned
                        </div>
                        {pinnedAnnouncements.length > 0 ? pinnedAnnouncements.map(ann => (
                            <div key={ann.id} className="p-[14px] bg-white/10 rounded-[12px] backdrop-blur-sm border border-white/10 mb-[10px] last:mb-0">
                                <div className="text-xs font-bold text-warning uppercase tracking-[0.5px] mb-[4px]">{ann.priority}</div>
                                <div className="text-md font-bold mb-[6px]">{ann.title}</div>
                                <p className="text-sm text-white/70 leading-[1.4] line-clamp-2">{ann.content}</p>
                            </div>
                        )) : (
                            <div className="text-sm text-white/50 italic py-4 text-center">No pinned announcements</div>
                        )}
                    </div>

                    <GoogleCalendarWidget />

                    <KudosSidebarWidget />
                </div>
            </div>
        </div>
    )
}
