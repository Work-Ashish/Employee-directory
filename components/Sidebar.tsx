"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
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
  FileTextIcon
} from '@radix-ui/react-icons'

const navItems = [
  { name: 'Dashboard', href: '/', icon: DashboardIcon },
  { name: 'Employees', href: '/employees', icon: PersonIcon },
  { name: 'Organization', href: '/organization', icon: MixIcon }, // New Link
  { name: 'Assets', href: '/admin/assets', hrefEmployee: '/employee/assets', icon: LaptopIcon }, // New Module
  { name: 'Documents', href: '/admin/documents', hrefEmployee: '/employee/documents', icon: FileTextIcon }, // New Module
  { name: 'Leave', href: '/leave', icon: CalendarIcon },
  { name: 'Attendance', href: '/attendance', icon: ClockIcon },
  { name: 'Payroll', href: '/payroll', icon: ReaderIcon },
  { name: 'Provident Fund', href: '/pf', icon: ArchiveIcon },
  { name: 'Performance', href: '/performance', icon: BarChartIcon },
  { name: 'Resignation', href: '/resignation', icon: ExitIcon },
  { name: 'Training', href: '/training', icon: BackpackIcon },
  { name: 'Announcements', href: '/announcements', icon: SpeakerLoudIcon },
  { name: 'Settings', href: '/settings', icon: GearIcon },
]

export function NavContent({ pathname, user, logout, onItemClick }: { pathname: string, user: any, logout: () => void, onItemClick?: () => void }) {
  // Filter items based on role
  const filteredNavItems = navItems.filter(item => {
    if (!user) return false
    if (user.role === 'ADMIN') return true

    // Employee restrictions
    const restrictedItems = ['Settings', 'Payroll', 'Resignation', 'Recruitment', 'Employees', 'Organization']
    return !restrictedItems.includes(item.name)
  })

  return (
    <div className="flex flex-col h-full">
      <div className="p-[22px_18px_18px] border-b border-[var(--border)]">
        <div className="flex items-center gap-[11px]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden shrink-0">
            <img src="/logo.svg" alt="EMS Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[16px] text-[var(--text)] tracking-tight">EMS Pro</span>
            <span className="text-[11px] text-[var(--text3)] mt-[1px]">Enterprise Edition</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-[14px_10px] flex flex-col gap-[2px] overflow-y-auto scrollbar-hide">
        {filteredNavItems.map((item) => {
          // Determine href based on role
          const href = (user.role === 'EMPLOYEE' && item.hrefEmployee) ? item.hrefEmployee : item.href
          const isActive = pathname === href

          return (
            <Link
              key={item.name}
              href={href}
              onClick={onItemClick}
              className={cn(
                "flex items-center gap-[10px] p-[10px_12px] rounded-[10px] cursor-pointer text-[13.5px] font-medium transition-all duration-200 relative overflow-hidden group select-none",
                isActive
                  ? "text-[var(--accent)] bg-[rgba(0,122,255,0.1)] border border-[rgba(0,122,255,0.18)] shadow-[0_1px_4px_rgba(0,122,255,0.08)] dark:bg-[rgba(10,132,255,0.15)] dark:border-[rgba(10,132,255,0.2)]"
                  : "text-[var(--text2)] hover:text-[var(--text)] hover:bg-[rgba(0,0,0,0.04)] hover:translate-x-[2px] dark:hover:bg-[rgba(255,255,255,0.05)]"
              )}
            >
              <div className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-[var(--accent)] rounded-r-[3px] transition-opacity duration-200",
                isActive ? "opacity-100" : "opacity-0"
              )} />

              <item.icon className={cn(
                "w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                isActive ? "text-[var(--accent)]" : "text-current"
              )} />

              <span>{item.name}</span>

              {item.badge && (
                <span className={cn(
                  "ml-auto text-white text-[10.5px] font-bold px-[7px] py-[2px] rounded-[20px]",
                  item.badgeColor || "bg-[var(--accent)]"
                )}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-[14px_16px] border-t border-[#00000014] bg-white/50 dark:bg-white/5 dark:border-[var(--border)]">
        <div className="flex items-center gap-[10px] group">
          <Link href={user.role === 'ADMIN' ? "/settings" : "#"} className={cn("flex items-center gap-[10px] flex-1 cursor-pointer hover:bg-black/5 p-1 -m-1 rounded-lg transition-colors", user.role !== 'ADMIN' && "cursor-default hover:bg-transparent")}>
            <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-[var(--accent)] to-[#5856d6] flex items-center justify-center text-white text-[12px] font-bold shrink-0 transition-shadow duration-200 group-hover:shadow-[0_2px_10px_var(--glow)]">
              {user.avatar || 'US'}
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-[var(--text)]">{user.name}</span>
              <span className="text-[11px] text-[var(--text3)] mt-[1px]">{user.email}</span>
            </div>
          </Link>
          <button
            onClick={logout}
            className="ml-auto text-[var(--text4)] text-[14px] transition-colors duration-200 hover:text-[var(--red)] p-2 hover:bg-[var(--red-dim)] rounded-md"
            title="Logout"
          >
            <ExitIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <aside className="hidden md:flex w-[220px] min-w-[220px] bg-[var(--glass-bg)] backdrop-blur-xl border-r border-[var(--border)] flex-col relative z-50 h-screen transition-colors duration-300">
      <NavContent pathname={pathname} user={user} logout={logout} />
    </aside>
  )
}
