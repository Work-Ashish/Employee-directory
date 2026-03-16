"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import { canAccessModule, canAccessModuleEffective, Module, hasPermission, Action } from "@/lib/permissions"
import type { Role } from "@/lib/permissions"
import { Avatar } from "@/components/ui/Avatar"
import {
  DashboardIcon,
  PersonIcon,
  CalendarIcon,
  ClockIcon,
  ReaderIcon,
  ArchiveIcon,
  BarChartIcon,
  ExitIcon,
  IdCardIcon,
  BackpackIcon,
  SpeakerLoudIcon,
  GearIcon,
  MixIcon,
  LaptopIcon,
  FileTextIcon,
  ChatBubbleIcon,
  GroupIcon,
  ChevronDownIcon,
} from "@radix-ui/react-icons"

/* ── Types ──────────────────────────────────────── */

interface NavItem {
  name: string
  href: string
  icon: any
  module: Module
  hrefByRole?: Partial<Record<Role, string>>
}

interface NavGroup {
  label: string | null
  items: NavItem[]
}

/* ── Navigation Structure ───────────────────────── */

const navGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { name: "Dashboard", href: "/", icon: DashboardIcon, module: Module.DASHBOARD },
    ],
  },
  {
    label: "People",
    items: [
      { name: "Employees", href: "/employees", icon: PersonIcon, module: Module.EMPLOYEES },
      { name: "Org Chart", href: "/org-chart", icon: GroupIcon, module: Module.EMPLOYEES },
      { name: "Teams", href: "/teams", icon: GroupIcon, module: Module.TEAMS },
    ],
  },
  {
    label: "Time & Leave",
    items: [
      { name: "Attendance", href: "/attendance", icon: ClockIcon, module: Module.ATTENDANCE },
      { name: "Leave", href: "/leave", icon: CalendarIcon, module: Module.LEAVES },
    ],
  },
  {
    label: "Compensation",
    items: [
      { name: "Payroll", href: "/payroll", icon: ReaderIcon, module: Module.PAYROLL },
      { name: "Reimbursement", href: "/reimbursement", icon: ArchiveIcon, module: Module.REIMBURSEMENT },
    ],
  },
  {
    label: "Growth",
    items: [
      { name: "Performance", href: "/performance", icon: BarChartIcon, module: Module.PERFORMANCE },
      { name: "Training", href: "/training", icon: BackpackIcon, module: Module.TRAINING },
      { name: "Feedback", href: "/feedback", icon: ChatBubbleIcon, module: Module.FEEDBACK },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        name: "Assets", href: "/admin/assets", icon: LaptopIcon, module: Module.ASSETS,
        hrefByRole: { EMPLOYEE: "/employee/assets", TEAM_LEAD: "/employee/assets" },
      },
      {
        name: "Documents", href: "/admin/documents", icon: FileTextIcon, module: Module.DOCUMENTS,
        hrefByRole: { EMPLOYEE: "/employee/documents", TEAM_LEAD: "/employee/documents" },
      },
      { name: "Announcements", href: "/announcements", icon: SpeakerLoudIcon, module: Module.ANNOUNCEMENTS },
      { name: "Help Desk", href: "/help-desk", icon: ArchiveIcon, module: Module.TICKETS },
    ],
  },
  {
    label: "Admin",
    items: [
      { name: "Recruitment", href: "/recruitment", icon: IdCardIcon, module: Module.RECRUITMENT },
      { name: "Resignation", href: "/resignation", icon: ExitIcon, module: Module.RESIGNATION },
      { name: "Reports", href: "/admin/reports", icon: BarChartIcon, module: Module.REPORTS },
      { name: "Roles", href: "/admin/roles", icon: IdCardIcon, module: Module.SETTINGS },
      { name: "Workflows", href: "/admin/workflows", icon: MixIcon, module: Module.WORKFLOWS },
      { name: "Agent Tracking", href: "/admin/agent-tracking", icon: LaptopIcon, module: Module.AGENT_TRACKING },
      { name: "Settings", href: "/settings", icon: GearIcon, module: Module.SETTINGS },
    ],
  },
]

/* ── Collapse state persistence ─────────────────── */

const STORAGE_KEY = "ems-nav-collapsed"

function getCollapsedState(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
  } catch {
    return {}
  }
}

function setCollapsedState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* noop */ }
}

/* ── NavContent (shared between Sidebar & MobileSidebar) ── */

export function NavContent({
  pathname,
  user,
  logout,
  onItemClick,
}: {
  pathname: string
  user: any
  logout: () => void
  onItemClick?: () => void
}) {
  const role = user?.role as Role
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>(getCollapsedState)

  const toggleGroup = (label: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [label]: !prev[label] }
      setCollapsedState(next)
      return next
    })
  }

  // Filter groups — only show groups with at least one accessible item
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => user && canAccessModuleEffective(role, item.module, user.functionalCapabilities)),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
            <img src="/logo.svg" alt="EMS Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-text tracking-tight leading-tight">EMS Pro</span>
            <span className="text-xs text-text-3">Enterprise Edition</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto scrollbar-hide">
        {visibleGroups.map((group, gi) => {
          const isCollapsed = group.label ? collapsed[group.label] : false

          return (
            <div key={group.label || gi}>
              {/* Group label */}
              {group.label && (
                <button
                  onClick={() => toggleGroup(group.label!)}
                  className="w-full flex items-center justify-between px-3 pt-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-text-4 hover:text-text-3 transition-colors select-none"
                >
                  <span>{group.label}</span>
                  <ChevronDownIcon
                    className={cn(
                      "w-3 h-3 transition-transform duration-200",
                      isCollapsed && "-rotate-90"
                    )}
                  />
                </button>
              )}

              {/* Group items */}
              {!isCollapsed &&
                group.items.map((item) => {
                  const href = item.hrefByRole?.[role] || item.href
                  const isActive = pathname === href

                  return (
                    <Link
                      key={item.name}
                      href={href}
                      onClick={onItemClick}
                      aria-label={`Navigate to ${item.name}`}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-md text-base font-medium transition-all duration-200 relative group select-none",
                        "outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                        isActive
                          ? "text-accent bg-accent/10 border border-accent/[0.18] shadow-xs"
                          : "text-text-2 hover:text-text hover:bg-bg-2/60 border border-transparent"
                      )}
                    >
                      {/* Active indicator bar */}
                      <div
                        aria-hidden="true"
                        className={cn(
                          "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-accent rounded-r transition-opacity duration-200",
                          isActive ? "opacity-100" : "opacity-0"
                        )}
                      />

                      <item.icon
                        aria-hidden="true"
                        className={cn(
                          "w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                          isActive ? "text-accent" : "text-current"
                        )}
                      />

                      <span>{item.name}</span>
                    </Link>
                  )
                })}
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-3 border-t border-border bg-surface/50">
        <div className="flex items-center gap-2.5 group">
          <Link
            href={hasPermission(role, Module.SETTINGS, Action.VIEW) ? "/settings" : "#"}
            className={cn(
              "flex items-center gap-2.5 flex-1 p-1 -m-1 rounded-lg transition-colors",
              hasPermission(role, Module.SETTINGS, Action.VIEW)
                ? "cursor-pointer hover:bg-bg-2"
                : "cursor-default"
            )}
          >
            <Avatar name={user.name || "User"} size="sm" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-text truncate">{user.name}</span>
              <span className="text-xs text-text-3 truncate">{user.email}</span>
            </div>
          </Link>
          <button
            onClick={logout}
            className="ml-auto text-text-4 p-2 rounded-md transition-colors hover:text-danger hover:bg-danger/10 outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
            title="Logout"
            aria-label="Logout"
          >
            <ExitIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Desktop Sidebar ────────────────────────────── */

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <aside className="hidden md:flex w-sidebar min-w-sidebar bg-glass-bg backdrop-blur-xl border-r border-border flex-col relative z-50 h-screen transition-colors duration-300">
      <NavContent pathname={pathname} user={user} logout={logout} />
    </aside>
  )
}
