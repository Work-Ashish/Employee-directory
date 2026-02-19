import { cn } from "@/lib/utils"

export function StatCard({ label, value, sub, badge, badgeType, icon, iconClass, glowClass, isMoney }: any) {
    return (
        <div className={cn("glass p-5 relative overflow-hidden group cursor-default before:absolute before:-top-8 before:-right-8 before:w-[100px] before:h-[100px] before:rounded-full before:transition-transform before:duration-400 group-hover:before:scale-140", glowClass)}>
            <div className="flex justify-between items-start mb-[14px] relative z-10">
                <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.6px]">{label}</div>
                <div className={cn("w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-[17px] shrink-0", iconClass)}>
                    {icon}
                </div>
            </div>
            <div className={cn("text-[var(--text)] font-extrabold tracking-[-1px] mb-2 leading-none relative z-10 animate-[countUp_0.5s_0.1s_both]", isMoney ? "text-[24px] tracking-[-0.5px]" : "text-[32px]")}>
                {value}
            </div>
            <div className="text-[12px] text-[var(--text3)] mb-2 relative z-10">{sub}</div>
            {badge && (
                <span className={cn("inline-flex items-center gap-[3px] text-[11.5px] font-semibold px-[9px] py-[3px] rounded-[20px] font-mono border relative z-10",
                    badgeType === 'up' ? "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.2)]" : "bg-[var(--red-dim)] text-[var(--red)] border-[rgba(255,59,48,0.15)]"
                )}>
                    {badge}
                </span>
            )}
        </div>
    )
}

export function LegendItem({ color, label, pct }: any) {
    return (
        <div className="flex items-center gap-[7px] text-[12px] text-[var(--text2)]">
            <div className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            {label}
            <span className="ml-auto font-mono text-[11px] text-[var(--text3)]">{pct}</span>
        </div>
    )
}

export function DeptRow({ name, count, pct, color, delay }: any) {
    return (
        <div className="flex items-center gap-[12px] animate-[fadeSlide_0.4s_both]" style={{ animationDelay: delay }}>
            <div className="w-6 h-6 rounded-[7px] flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}40` }}>
                {count}
            </div>
            <span className="text-[13px] font-medium flex-1 text-[var(--text2)]">{name}</span>
            <div className="flex-[2] h-[5px] bg-[var(--bg2)] rounded-[3px] overflow-hidden">
                <div className="h-full rounded-[3px] animate-[growBar_0.8s_0.3s_both] origin-left scale-x-0" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-[11.5px] text-[var(--text3)] font-mono w-[30px] text-right">{pct}%</span>
        </div>
    )
}

export function HireRow({ initials, name, role, date, color }: any) {
    return (
        <div className="flex items-center gap-[12px] py-[10px] border-b border-[var(--border)] last:border-0 hover:pl-1 transition-all cursor-default relative group">
            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0", color)}>
                {initials}
            </div>
            <div className="flex flex-col">
                <div className="text-[13.5px] font-semibold text-[var(--text)]">{name}</div>
                <div className="text-[12px] text-[var(--text3)] mt-[1px]">{role}</div>
            </div>
            <div className="ml-auto text-[11.5px] text-[var(--text3)] font-mono flex items-center gap-1 whitespace-nowrap">
                📅 {date}
            </div>
        </div>
    )
}
