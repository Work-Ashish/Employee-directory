"use client"

import { useRouter } from "next/navigation"
import { PersonIcon, GearIcon, ExitIcon } from "@radix-ui/react-icons"
import { ModeToggle } from "./ModeToggle"
import { NotificationCenter } from "./NotificationCenter"
import { SearchAutocomplete } from "@/components/ui/SearchAutocomplete"
import { useAuth } from "@/context/AuthContext"
import { Avatar } from "@/components/ui/Avatar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/DropdownMenu"

export function Topbar() {
  const { user, logout } = useAuth()
  const router = useRouter()

  return (
    <div className="h-topbar bg-glass-bg backdrop-blur-xl border-b border-border flex items-center px-7 gap-4 shrink-0 z-40 sticky top-0 transition-colors duration-300">
      {/* Search */}
      <SearchAutocomplete />

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-3">
        <ModeToggle />
        <NotificationCenter />

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="User menu"
              className="rounded-full border-2 border-transparent transition-all duration-200 shadow-glow hover:border-accent hover:scale-105 outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <Avatar name={user?.name || "User"} src={user?.avatar} size="default" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-[220px]">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-text">{user?.name || "User"}</span>
                <span className="text-xs text-text-3 font-normal">{user?.email || ""}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <PersonIcon className="w-4 h-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <GearIcon className="w-4 h-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={logout}>
              <ExitIcon className="w-4 h-4" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
