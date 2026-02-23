"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { DrawingPinFilledIcon } from "@radix-ui/react-icons"
import { GoogleCalendarWidget } from "./GoogleCalendarWidget"

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


export function EmployeeAnnouncementsView() {
    const [announcements, setAnnouncements] = React.useState<Announcement[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    const fetchAnnouncements = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const res = await fetch('/api/announcements')
            if (res.ok) {
                setAnnouncements(await res.json())
            }
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

    const getPriorityStyles = (prio: string) => {
        switch (prio) {
            case 'LOW': return "bg-[var(--blue-dim)] text-[#0a7ea4]"
            case 'MEDIUM': return "bg-[var(--amber-dim)] text-[#b86c00]"
            case 'HIGH': return "bg-[var(--red-dim)] text-[var(--red)]"
            default: return "bg-gray-100 text-gray-500"
        }
    }

    const pinnedAnnouncements = announcements.filter(a => a.isPinned)

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Announcements</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Stay updated with company news and events</p>
            </div>

            <div className="grid grid-cols-[1fr_350px] gap-[20px]">
                <div className="flex flex-col gap-[16px]">
                    {isLoading ? (
                        <div className="p-10 text-center text-[var(--text3)]">Loading announcements...</div>
                    ) : announcements.length === 0 ? (
                        <div className="p-10 text-center text-[var(--text3)] glass">No announcements yet. Check back later!</div>
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
                                        <span className={cn("text-[11px] font-bold px-[8px] py-[2px] rounded-[10px] uppercase tracking-[0.5px]", getPriorityStyles(ann.priority))}>
                                            {ann.priority}
                                        </span>
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
                    </div>

                    <GoogleCalendarWidget />
                </div>
            </div>
        </div>
    )
}
