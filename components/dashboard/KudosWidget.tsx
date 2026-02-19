"use client"

import { cn } from "@/lib/utils"
import { PaperPlaneIcon, HeartFilledIcon } from "@radix-ui/react-icons"

const recentKudos = [
    { from: "Sarah J.", message: "Thanks for helping with the deployment! 🚀", time: "2h ago", color: "from-[#ef4444] to-[#f43f5e]" },
    { from: "Mike T.", message: "Great presentation today! 👏", time: "5h ago", color: "from-[#3b82f6] to-[#06b6d4]" },
]

export function KudosWidget() {
    return (
        <div className="glass p-6 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <span className="text-[20px]">🎉</span>
                    <h3 className="text-[14px] font-bold text-[var(--text)]">Peer Kudos</h3>
                </div>
                <button className="text-[11px] font-bold text-[var(--accent)] hover:underline">View All</button>
            </div>

            <div className="relative z-10 mb-5">
                <div className="text-[12px] text-[var(--text3)] mb-2 uppercase tracking-wider font-semibold">Send Appreciation</div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Select colleague..."
                        className="flex-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)] transition-colors"
                    />
                    <button className="w-9 h-9 flex items-center justify-center bg-[var(--accent)] text-white rounded-lg shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform">
                        <PaperPlaneIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="relative z-10 space-y-3">
                <div className="text-[12px] text-[var(--text3)] mb-2 uppercase tracking-wider font-semibold">Recent Shoutouts</div>
                {recentKudos.map((k, i) => (
                    <div key={i} className="flex gap-3 items-start animate-[fadeRow_0.3s_both]" style={{ animationDelay: `${i * 0.1}s` }}>
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-gradient-to-br shadow-sm", k.color)}>
                            {k.from.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="bg-[var(--surface2)] p-3 rounded-r-xl rounded-bl-xl text-[13px] border border-[var(--border)] relative">
                            <span className="font-bold text-[var(--text)]">{k.from}</span>
                            <p className="text-[var(--text2)] mt-0.5 leading-snug">{k.message}</p>
                            <span className="text-[10px] text-[var(--text3)] absolute right-2 top-2">{k.time}</span>
                            <div className="absolute -left-2 top-0 w-2 h-2 bg-[var(--surface2)] [clip-path:polygon(100%_0,0_0,100%_100%)]"></div> {/* Speech bubble arrow */}
                        </div>
                    </div>
                ))}
            </div>

            <div className="absolute -right-6 -bottom-6 text-[100px] opacity-[0.03] rotate-[-15deg] pointer-events-none">
                <HeartFilledIcon />
            </div>
        </div>
    )
}
