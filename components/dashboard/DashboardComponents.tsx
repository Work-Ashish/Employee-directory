"use client"

import { cn } from "@/lib/utils"
import { Avatar } from "@/components/ui/Avatar"
import { Badge } from "@/components/ui/Badge"

export function DashboardStatCard({ label, value, sub, badge, badgeType, icon, isMoney }: {
  label: string
  value: string
  sub?: string
  badge?: string
  badgeType?: "up" | "down" | "neutral"
  icon: React.ReactNode
  isMoney?: boolean
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden group hover:border-border-2 hover:shadow transition-all duration-200">
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-accent to-transparent opacity-[0.03] rounded-bl-full pointer-events-none group-hover:opacity-[0.08] transition-opacity" />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-bg-2 flex items-center justify-center text-lg shrink-0">
          {icon}
        </div>
        <div>
          <span className="text-sm font-semibold text-text-2 block">{label}</span>
          {sub && <span className="text-xs text-text-3">{sub}</span>}
        </div>
      </div>

      <div className="flex items-end justify-between mt-auto">
        <div className={cn(
          "font-extrabold tracking-tight text-text leading-none animate-count-up",
          isMoney ? "text-xl" : "text-3xl"
        )}>
          {isMoney ? `₹${Number(value).toLocaleString("en-IN")}` : value}
        </div>

        {badge && (
          <Badge
            variant={badgeType === "up" ? "success" : badgeType === "down" ? "danger" : "neutral"}
            size="sm"
            dot
          >
            {badge}
          </Badge>
        )}
      </div>
    </div>
  )
}

export function DeptRow({ name, count, pct, color, delay }: {
  name: string
  count: number
  pct: number
  color: string
  delay?: string
}) {
  return (
    <div className="flex items-center gap-3 animate-fade-slide" style={{ animationDelay: delay }}>
      <div
        className="w-6 h-6 rounded-sm flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ background: color }}
      >
        {count}
      </div>
      <span className="text-base font-medium flex-1 text-text-2">{name}</span>
      <div className="flex-[2] h-1.5 bg-bg-3 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs text-text-3 font-mono w-8 text-right">{pct}%</span>
    </div>
  )
}

export function HireRow({ initials, name, role, date, color }: {
  initials: string
  name: string
  role: string
  date: string
  color?: string
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0 hover:bg-bg-2 px-2 rounded-lg transition-colors cursor-default">
      <Avatar name={name} size="default" />
      <div className="flex flex-col min-w-0">
        <span className="text-base font-semibold text-text truncate">{name}</span>
        <span className="text-sm text-text-3">{role}</span>
      </div>
      <span className="ml-auto text-xs text-text-4 font-mono whitespace-nowrap">
        {date}
      </span>
    </div>
  )
}

export function LegendItem({ color, label, pct }: { color: string; label: string; pct: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-text-2">
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      {label}
      <span className="ml-auto font-mono text-xs text-text-3">{pct}</span>
    </div>
  )
}
