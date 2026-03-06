"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/Sidebar"
import { MobileSidebar } from "@/components/MobileSidebar"
import { Topbar } from "@/components/Topbar"
import { AuthProvider } from "@/context/AuthContext"
import { AIChatbot } from "@/components/AIChatbot"
import { TooltipProvider } from "@/components/ui/Tooltip"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  return (
    <AuthProvider>
      <TooltipProvider>
        {!isLoginPage && (
          <>
            <Sidebar />
            <MobileSidebar />
          </>
        )}
        <div className="flex-1 flex flex-col overflow-hidden relative z-10 w-full">
          {!isLoginPage && <Topbar />}
          <main className={`flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-bg-3 scrollbar-track-transparent ${!isLoginPage ? "p-6 lg:p-7" : ""}`}>
            {!isLoginPage ? (
              <div className="animate-page-in">{children}</div>
            ) : (
              children
            )}
          </main>
        </div>
        {!isLoginPage && <AIChatbot />}
      </TooltipProvider>
    </AuthProvider>
  )
}
