import * as React from "react"
import { cn } from "@/lib/utils"

const variantStyles = {
  default: "bg-accent/10 text-accent border-accent/20",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-danger/10 text-danger border-danger/20",
  info: "bg-info/10 text-info border-info/20",
  neutral: "bg-bg-2 text-text-3 border-border",
  purple: "bg-purple/10 text-purple border-purple/20",
}

const sizeStyles = {
  sm: "px-2 py-0.5 text-[10px]",
  default: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1 text-sm",
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantStyles
  size?: keyof typeof sizeStyles
  dot?: boolean
}

export function Badge({ className, variant = "default", size = "default", dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold border whitespace-nowrap",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            variant === "success" && "bg-success",
            variant === "warning" && "bg-warning",
            variant === "danger" && "bg-danger",
            variant === "info" && "bg-info",
            variant === "default" && "bg-accent",
            variant === "neutral" && "bg-text-3",
            variant === "purple" && "bg-purple",
          )}
        />
      )}
      {children}
    </span>
  )
}
