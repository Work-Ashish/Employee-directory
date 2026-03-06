"use client"

import { useRouter } from "next/navigation"
import { MagnifyingGlassIcon, PersonIcon, GearIcon, ExitIcon } from "@radix-ui/react-icons"
import { ModeToggle } from "./ModeToggle"
import { NotificationCenter } from "./NotificationCenter"
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
      <div className="flex-1 max-w-[380px] relative" role="search">
        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-4 w-3.5 h-3.5" aria-hidden="true" />
        <input
          type="text"
          placeholder="Quick search employees, departments..."
          aria-label="Search employees and departments"
          className="input-base pl-10 pr-4 py-2"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-text-4 bg-bg-2 border border-border rounded">
          Ctrl K
        </kbd>
      </div>

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
