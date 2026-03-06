import * as React from "react"
import { cn } from "@/lib/utils"

export interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  change?: { value: string; positive?: boolean }
  className?: string
  onClick?: () => void
}

export function StatCard({ label, value, icon, change, className, onClick }: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-xl p-5 transition-all duration-200",
        "hover:border-border-2 hover:shadow",
        onClick && "cursor-pointer active:scale-[0.98]",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-text-3">{label}</span>
        {icon && (
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-accent">
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-extrabold text-text tracking-tight animate-count-up">
          {value}
        </span>
        {change && (
          <span
            className={cn(
              "text-xs font-semibold mb-0.5",
              change.positive ? "text-success" : "text-danger"
            )}
          >
            {change.positive ? "+" : ""}{change.value}
          </span>
        )}
      </div>
    </div>
  )
}
