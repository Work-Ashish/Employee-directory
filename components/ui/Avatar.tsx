import * as React from "react"
import { cn } from "@/lib/utils"

const sizeStyles = {
  xs: "w-6 h-6 text-[9px]",
  sm: "w-8 h-8 text-[11px]",
  default: "w-9 h-9 text-xs",
  lg: "w-11 h-11 text-sm",
  xl: "w-14 h-14 text-base",
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? ""
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getGradient(name: string): string {
  const gradients = [
    "from-accent to-purple",
    "from-success to-cyan",
    "from-warning to-pink",
    "from-info to-accent",
    "from-purple to-pink",
    "from-danger to-warning",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  name: string
  size?: keyof typeof sizeStyles
}

export function Avatar({ src, name, size = "default", className, ...props }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false)

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className={cn(
          "rounded-full object-cover flex-shrink-0",
          sizeStyles[size],
          className
        )}
        {...(props as React.ImgHTMLAttributes<HTMLImageElement>)}
      />
    )
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br flex-shrink-0",
        getGradient(name),
        sizeStyles[size],
        className
      )}
      title={name}
      {...props}
    >
      {getInitials(name)}
    </div>
  )
}
