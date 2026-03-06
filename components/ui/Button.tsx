"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Spinner } from "./Spinner"

const variantStyles = {
  primary: "bg-accent text-white hover:brightness-110 shadow-xs",
  secondary: "bg-surface text-text-2 border border-border-2 hover:bg-bg-2 hover:text-text",
  ghost: "bg-transparent text-text-2 hover:bg-bg-2 hover:text-text",
  danger: "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/[0.15]",
  success: "bg-success/10 text-success border border-success/20 hover:bg-success/[0.15]",
  link: "bg-transparent text-accent hover:underline p-0 h-auto",
}

const sizeStyles = {
  sm: "px-3 py-1.5 text-xs rounded-sm gap-1",
  default: "px-4 py-2 text-base rounded-md gap-1.5",
  lg: "px-6 py-3 text-md rounded-md gap-2",
  icon: "p-2 rounded aspect-square justify-center",
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles
  size?: keyof typeof sizeStyles
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", loading, leftIcon, rightIcon, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer select-none",
          "active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Spinner size={size === "sm" ? "sm" : "default"} /> : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)

Button.displayName = "Button"
