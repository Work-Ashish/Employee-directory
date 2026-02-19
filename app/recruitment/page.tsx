"use client"

import { cn } from "@/lib/utils"
import { RecruitmentKanban } from "@/components/RecruitmentKanban"

const candidates = [
    { name: "Robert Fox", role: "Senior UX Designer", stage: "Interview", date: "Feb 20, 2026", status: "Scheduled", statusColor: "bg-[rgba(0,122,255,0.08)] text-[var(--accent)] border-[rgba(0,122,255,0.18)]", initials: "RF", color: "from-[#ec4899] to-[#f43f5e]" },
    { name: "Jenny Wilson", role: "Product Manager", stage: "Application", date: "Feb 19, 2026", status: "New", statusColor: "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]", initials: "JW", color: "from-[#38bdf8] to-[#0ea5e9]" },
    { name: "Guy Hawkins", role: "DevOps Engineer", stage: "Technical Round", date: "Feb 18, 2026", status: "Evaluated", statusColor: "bg-[var(--purple-dim)] text-[var(--purple)] border-[rgba(175,82,222,0.2)]", initials: "GH", color: "from-[#a78bfa] to-[#5856d6]" },
    { name: "Jacob Jones", role: "Frontend Developer", stage: "Offer", date: "Feb 15, 2026", status: "Pending", statusColor: "bg-[var(--amber-dim)] text-[#b86c00] border-[rgba(255,149,0,0.25)]", initials: "JJ", color: "from-[#f59e0b] to-[#d97706]" },
    { name: "Cody Fisher", role: "Marketing Specialist", stage: "Screening", date: "Feb 12, 2026", status: "Rejected", statusColor: "bg-[var(--red-dim)] text-[var(--red)] border-[rgba(255,59,48,0.2)]", initials: "CF", color: "from-[#10b981] to-[#059669]" },
]

export default function Recruitment() {
    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Recruitment Pipeline</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Manage job openings and candidate applications</p>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-5">
                <div className="glass p-5 flex flex-col items-start gap-1 bg-[#f0f9ff] dark:bg-[var(--surface)] border-[rgba(0,122,255,0.15)] dark:border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div className="text-[11px] font-bold text-[#0a7ea4] dark:text-[var(--accent)] uppercase tracking-[0.6px] mb-[6px]">Open Positions</div>
                    <div className="text-[36px] font-extrabold leading-[1] tracking-[-1px] text-[var(--accent)] animate-[countUp_0.5s_0.1s_both]">12</div>
                    <div className="text-[12px] text-[var(--accent)] mt-1">Across 4 departments</div>
                    <div className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[30px] opacity-35 grayscale dark:grayscale-0">💼</div>
                </div>
                <div className="glass p-5 flex flex-col items-start gap-1 bg-[#f0fdf4] dark:bg-[var(--surface)] border-[rgba(52,199,89,0.2)] dark:border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div className="text-[11px] font-bold text-[#1a9140] dark:text-[var(--green)] uppercase tracking-[0.6px] mb-[6px]">Active Candidates</div>
                    <div className="text-[36px] font-extrabold leading-[1] tracking-[-1px] text-[#1a9140] dark:text-[var(--green)] animate-[countUp_0.5s_0.2s_both]">48</div>
                    <div className="text-[12px] text-[#1a9140] dark:text-[var(--green)] mt-1">In pipeline</div>
                    <div className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[30px] opacity-35 grayscale dark:grayscale-0">👥</div>
                </div>
                <div className="glass p-5 flex flex-col items-start gap-1 bg-[#fffbf0] dark:bg-[var(--surface)] border-[rgba(255,149,0,0.2)] dark:border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div className="text-[11px] font-bold text-[var(--amber)] uppercase tracking-[0.6px] mb-[6px]">Interviews</div>
                    <div className="text-[36px] font-extrabold leading-[1] tracking-[-1px] text-[var(--amber)] animate-[countUp_0.5s_0.3s_both]">8</div>
                    <div className="text-[12px] text-[var(--amber)] mt-1">Scheduled this week</div>
                    <div className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[30px] opacity-35 grayscale dark:grayscale-0">🗓️</div>
                </div>
                <div className="glass p-5 flex flex-col items-start gap-1 bg-[#faf5ff] dark:bg-[var(--surface)] border-[rgba(175,82,222,0.15)] dark:border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div className="text-[11px] font-bold text-[var(--purple)] uppercase tracking-[0.6px] mb-[6px]">Hired</div>
                    <div className="text-[36px] font-extrabold leading-[1] tracking-[-1px] text-[var(--purple)] animate-[countUp_0.5s_0.4s_both]">5</div>
                    <div className="text-[12px] text-[var(--purple)] mt-1">This month</div>
                    <div className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[30px] opacity-35 grayscale dark:grayscale-0">🎉</div>
                </div>
            </div>

            {/* <div className="grid grid-cols-4 gap-4 mb-5">
                ... (Stats can stay or be moved)
            </div> */}

            <RecruitmentKanban />

        </div>
    )
}

// function JobRow... (keeping it for reference or removing if unused)

function JobRow({ title, dept, type, applicants }: any) {
    return (
        <div className="flex justify-between items-center p-[10px] rounded-[10px] border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--surface)] hover:shadow-sm hover:border-[var(--border2)] transition-all cursor-pointer group">
            <div>
                <div className="text-[13px] font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{title}</div>
                <div className="text-[11px] text-[var(--text3)] flex items-center gap-2 mt-[2px]">
                    <span>{dept}</span>
                    <span className="w-[3px] h-[3px] bg-[var(--text4)] rounded-full" />
                    <span>{type}</span>
                </div>
            </div>
            <div className="flex items-center gap-[6px]">
                <span className="text-[11px] font-mono font-medium bg-[rgba(0,122,255,0.08)] text-[var(--accent)] px-[6px] py-[2px] rounded-[6px]">{applicants}</span>
            </div>
        </div>
    )
}
