import * as React from "react"
import { cn } from "@/lib/utils"

const variantStyles = {
  default: "bg-surface border border-border rounded-lg shadow-xs",
  glass: "glass",
  "glass-premium": "glass-premium rounded-lg",
  ghost: "bg-transparent",
}

/* ── Card ─────────────────────────────────────────── */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantStyles
}

export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(variantStyles[variant], "transition-colors", className)}
      {...props}
    />
  )
}

/* ── Card Header ──────────────────────────────────── */

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1 p-5 pb-0", className)}
      {...props}
    />
  )
}

/* ── Card Title ───────────────────────────────────── */

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-bold text-text tracking-tight", className)}
      {...props}
    />
  )
}

/* ── Card Description ─────────────────────────────── */

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-text-3", className)}
      {...props}
    />
  )
}

/* ── Card Content ─────────────────────────────────── */

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("p-5", className)}
      {...props}
    />
  )
}

/* ── Card Footer ──────────────────────────────────── */

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-3 p-5 pt-0", className)}
      {...props}
    />
  )
}
