import { cn } from "@/lib/utils"

export function StatCard({ label, value, sub, badge, badgeType, icon, iconClass, glowClass, isMoney }: any) {
    return (
        <div className={cn("bg-[var(--surface)] rounded-[16px] border border-[var(--border)] p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200", glowClass)}>
            {/* Icon + label row */}
            <div className="flex items-center gap-2">
                <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[15px] shrink-0", iconClass || "bg-[var(--bg2)]")}>{icon}</span>
                <span className="text-[12.5px] font-medium text-[var(--text3)] tracking-wide">{label}</span>
            </div>

            {/* Big number */}
            <div className={cn("font-extrabold tracking-[-1px] text-[var(--text)] leading-none animate-[countUp_0.5s_0.1s_both]",
                isMoney ? "text-[22px] tracking-[-0.5px]" : "text-[30px]"
            )}>
                {isMoney ? `₹${value}` : value}
            </div>

            {/* Sub + badge row */}
            <div className="flex items-center gap-2 flex-wrap">
                {badge && (
                    <span className={cn("inline-flex items-center gap-[3px] text-[11px] font-semibold px-[8px] py-[3px] rounded-[20px] font-mono",
                        badgeType === 'up' ? "bg-[#e8f8ef] text-[#1a9140]" :
                            badgeType === 'down' ? "bg-[#fff0f0] text-[#d93025]" :
                                "bg-[#f2f3f8] text-[#8a8fa8]"
                    )}>
                        {badgeType === 'up' && "+"}{badge}
                    </span>
                )}
                <span className="text-[11.5px] text-[var(--text3)]">{sub}</span>
            </div>
        </div>
    )
}

export function LegendItem({ color, label, pct }: any) {
    return (
        <div className="flex items-center gap-[7px] text-[12px] text-[var(--text2)]">
            <div className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: color }} />
            {label}
            <span className="ml-auto font-mono text-[11px] text-[var(--text3)]">{pct}</span>
        </div>
    )
}

export function DeptRow({ name, count, pct, color, delay }: any) {
    return (
        <div className="flex items-center gap-[12px] animate-[fadeSlide_0.4s_both]" style={{ animationDelay: delay }}>
            <div className="w-6 h-6 rounded-[7px] flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                style={{ background: color }}>
                {count}
            </div>
            <span className="text-[13px] font-medium flex-1 text-[var(--text2)]">{name}</span>
            <div className="flex-[2] h-[5px] bg-[var(--bg3)] rounded-[3px] overflow-hidden">
                <div className="h-full rounded-[3px] animate-[growBar_0.8s_0.3s_both] origin-left scale-x-0"
                    style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-[11.5px] text-[var(--text3)] font-mono w-[30px] text-right">{pct}%</span>
        </div>
    )
}

export function HireRow({ initials, name, role, date, color }: any) {
    return (
        <div className="flex items-center gap-[12px] py-[10px] border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg2)] px-2 rounded-lg transition-colors cursor-default">
            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0", color)}>
                {initials}
            </div>
            <div className="flex flex-col">
                <div className="text-[13.5px] font-semibold text-[var(--text)]">{name}</div>
                <div className="text-[12px] text-[var(--text3)] mt-[1px]">{role}</div>
            </div>
            <div className="ml-auto text-[11.5px] text-[var(--text4)] font-mono whitespace-nowrap">
                {date}
            </div>
        </div>
    )
}
