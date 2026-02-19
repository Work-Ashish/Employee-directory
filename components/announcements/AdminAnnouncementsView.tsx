import { cn } from "@/lib/utils"

const announcements = [
    { title: "Annual Company Retreat", date: "Feb 20, 2026", author: "HR Department", category: "Event", content: "We are excited to announce our annual company retreat happening next month at the Grand Resort. Please RSVP by Friday.", priority: "High", priorityColor: "bg-[var(--red-dim)] text-[var(--red)]", icon: "🎉", color: "from-[#f59e0b] to-[#d97706]" },
    { title: "New Health Insurance Policy", date: "Feb 18, 2026", author: "Admin", category: "Policy", content: "We have updated our health insurance provider to offer better coverage. Check your email for more details and enrollment steps.", priority: "Medium", priorityColor: "bg-[var(--amber-dim)] text-[#b86c00]", icon: "🏥", color: "from-[#10b981] to-[#059669]" },
    { title: "Q1 Town Hall Meeting", date: "Feb 15, 2026", author: "CEO Office", category: "Meeting", content: "Join us for the Q1 Town Hall meeting where we will discuss our goals and achievements for the quarter.", priority: "High", priorityColor: "bg-[var(--red-dim)] text-[var(--red)]", icon: "📢", color: "from-[#3b82f6] to-[#1d4ed8]" },
    { title: "System Maintenance", date: "Feb 10, 2026", author: "IT Support", category: "System", content: "Scheduled maintenance for the HR portal this Saturday from 10 PM to 2 AM. The system will be unavailable during this time.", priority: "Low", priorityColor: "bg-[var(--blue-dim)] text-[#0a7ea4]", icon: "🛠️", color: "from-[#64748b] to-[#475569]" },
]

function HolidayRow({ name, date, day }: any) {
    return (
        <div className="flex items-center gap-[12px] p-[10px] rounded-[10px] bg-[var(--bg)] border border-[var(--border)]">
            <div className="flex flex-col items-center bg-[var(--surface)] p-[4px_10px] rounded-[6px] border border-[var(--border)] shadow-sm shrink-0 min-w-[50px]">
                <span className="text-[10px] font-bold text-[var(--text3)] uppercase">{date.split(' ')[0]}</span>
                <span className="text-[15px] font-extrabold text-[var(--text)]">{date.split(' ')[1]}</span>
            </div>
            <div>
                <div className="text-[13px] font-semibold text-[var(--text)]">{name}</div>
                <div className="text-[11.5px] text-[var(--text3)]">{day}</div>
            </div>
        </div>
    )
}

export function AdminAnnouncementsView() {
    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Announcements</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Stay updated with company news and events</p>
            </div>

            <div className="grid grid-cols-[1fr_350px] gap-[20px]">
                <div className="flex flex-col gap-[16px]">
                    {announcements.map((ann, i) => (
                        <div key={i} className="glass p-[22px] group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200 animate-[fadeRow_0.4s_both]" style={{ animationDelay: `${i * 0.1}s` }}>
                            <div className="flex justify-between items-start mb-[12px]">
                                <div className="flex items-center gap-[12px]">
                                    <div className={cn("w-[42px] h-[42px] rounded-[12px] flex items-center justify-center text-[20px] shrink-0 bg-gradient-to-br text-white shadow-sm", ann.color)}>
                                        {ann.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-[16px] font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{ann.title}</h3>
                                        <div className="text-[12px] text-[var(--text3)] flex items-center gap-[6px] mt-[1px]">
                                            <span>{ann.author}</span>
                                            <span className="w-[3px] h-[3px] bg-[var(--text3)] rounded-full" />
                                            <span>{ann.date}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className={cn("text-[11px] font-bold px-[8px] py-[2px] rounded-[10px] uppercase tracking-[0.5px]", ann.priorityColor)}>
                                    {ann.priority}
                                </span>
                            </div>
                            <p className="text-[13.5px] text-[var(--text2)] leading-[1.5] mb-[12px] pl-[54px]">{ann.content}</p>
                            <div className="pl-[54px] flex gap-[8px]">
                                <button className="text-[12px] font-semibold text-[var(--accent)] hover:underline">Read More</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-[20px]">
                    <div className="glass p-[22px] bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] text-white">
                        <div className="text-[14px] font-bold mb-[12px] flex items-center gap-2">
                            <span>📌</span> Pinned
                        </div>
                        <div className="p-[14px] bg-white/10 rounded-[12px] backdrop-blur-sm border border-white/10 mb-[10px]">
                            <div className="text-[11px] font-bold text-[var(--amber)] uppercase tracking-[0.5px] mb-[4px]">Important</div>
                            <div className="text-[14px] font-bold mb-[6px]">Office Relocation Update</div>
                            <p className="text-[12px] text-white/70 leading-[1.4]">We are shifting to the new tech park campus starting next month. Please clear your lockers.</p>
                        </div>
                        <button className="w-full py-[8px] bg-white text-black rounded-[8px] text-[13px] font-bold mt-[4px] hover:bg-white/90 transition-colors">+ New Announcement</button>
                    </div>

                    <div className="glass p-[22px]">
                        <div className="text-[13.5px] font-bold text-[var(--text)] mb-[14px]">📅 Upcoming Holidays</div>
                        <div className="flex flex-col gap-[10px]">
                            <HolidayRow name="Good Friday" date="Mar 29" day="Fri" />
                            <HolidayRow name="Eid al-Fitr" date="Apr 10" day="Wed" />
                            <HolidayRow name="Labor Day" date="May 1" day="Wed" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
