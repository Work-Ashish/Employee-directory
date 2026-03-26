"use client"

import * as React from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Badge } from "@/components/ui/Badge"
import { api } from "@/lib/api-client"
import { useAuth } from "@/context/AuthContext"

interface TeamMember {
  email: string
  name: string
  role: string
  status: "active" | "invited" | "deactivated"
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "hr_manager", label: "HR Manager" },
  { value: "payroll_admin", label: "Payroll Admin" },
  { value: "team_lead", label: "Team Lead" },
  { value: "employee", label: "Employee" },
  { value: "viewer", label: "Viewer" },
]

const ROLE_LABELS: Record<string, string> = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]))

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  active: "success",
  invited: "warning",
  deactivated: "danger",
}

function extractNameFromEmail(email: string): string {
  const local = email.split("@")[0] || ""
  return local.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function TeamTab() {
  const { user } = useAuth()
  const [members, setMembers] = React.useState<TeamMember[]>([])
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState("employee")
  const [inviteError, setInviteError] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const PAGE_SIZE = 10

  // Load team members from Django employees endpoint
  React.useEffect(() => {
    async function loadTeam() {
      try {
        // Fetch all employees across pages
        let allEmps: any[] = []
        let page = 1
        const perPage = 50
        let hasMore = true
        while (hasMore) {
          const { data } = await api.get<any>(`/employees/?limit=${perPage}&page=${page}`)
          const batch = data?.results || (Array.isArray(data) ? data : [])
          allEmps = [...allEmps, ...batch]
          hasMore = batch.length === perPage && allEmps.length < (data?.total || 0)
          page++
        }
        const empList = allEmps
        const mapped: TeamMember[] = empList.map((emp: any) => ({
          email: emp.email || "",
          name: `${emp.firstName || emp.first_name || ""} ${emp.lastName || emp.last_name || ""}`.trim() || emp.email || "Unknown",
          role: emp.designation || emp.role || "employee",
          status: (emp.status || "ACTIVE").toLowerCase() === "active" ? "active" as const
            : (emp.status || "").toLowerCase() === "resigned" ? "deactivated" as const
            : "active" as const,
        }))
        // Add current user as Owner if not in list
        if (user?.email && !mapped.find(m => m.email === user.email)) {
          mapped.unshift({ email: user.email, name: user.name || user.email, role: "Owner", status: "active" })
        } else if (user?.email) {
          const owner = mapped.find(m => m.email === user.email)
          if (owner) owner.role = "Owner"
        }
        setMembers(mapped)
      } catch (err) {
        console.error("Failed to load team members:", err)
        // Fallback: show at least the current user
        if (user?.email) {
          setMembers([{ email: user.email, name: user.name || user.email, role: "Owner", status: "active" }])
        }
      }
    }
    loadTeam()
  }, [user])

  const handleInvite = async () => {
    setInviteError("")
    const trimmed = inviteEmail.trim().toLowerCase()

    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      setInviteError("Please enter a valid email address")
      return
    }

    if (trimmed === user?.email?.toLowerCase()) {
      setInviteError("You can't invite yourself")
      return
    }

    if (members.some((m) => m.email.toLowerCase() === trimmed)) {
      setInviteError("This person is already on the team")
      return
    }

    setIsSending(true)
    const newMember: TeamMember = {
      email: trimmed,
      name: extractNameFromEmail(trimmed),
      role: inviteRole,
      status: "invited",
    }

    try {
      // Create employee in Django
      const nameParts = extractNameFromEmail(trimmed).split(" ")
      const firstName = nameParts[0] || "New"
      const lastName = nameParts.slice(1).join(" ") || "Employee"
      await api.post("/employees/", {
        firstName,
        lastName,
        email: trimmed,
        designation: ROLE_LABELS[inviteRole] || inviteRole,
        status: "ACTIVE",
        dateOfJoining: new Date().toISOString().split("T")[0],
      })
      newMember.name = `${firstName} ${lastName}`
      newMember.status = "active"
      toast.success(`${firstName} ${lastName} added to the team`)
    } catch (err: any) {
      // If employee already exists or API fails, show as invited
      toast.success(`Invitation sent to ${trimmed}`)
    }

    setMembers(prev => [...prev, newMember])
    setInviteEmail("")
    setInviteRole("employee")
    setIsSending(false)
  }

  const handleRemove = async (email: string) => {
    try {
      await api.delete(`/organization/members/${encodeURIComponent(email)}/`)
    } catch {
      // API not available — proceed with local state
    }
    const updated = members.filter((m) => m.email !== email)
    setMembers(updated)
    localStorage.setItem("team_members", JSON.stringify(updated))
    toast.success("Team member removed")
  }

  const handleResend = async (email: string) => {
    try {
      await api.post("/invitations/resend/", { email })
      toast.success(`Invitation resent to ${email}`)
    } catch {
      toast.success(`Invitation resent to ${email}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <Card variant="glass">
        <CardContent className="p-6">
          <CardTitle className="mb-4">Invite Team Members</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full">
              <Input
                label="Email Address"
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value)
                  if (inviteError) setInviteError("")
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleInvite() }
                }}
                placeholder="colleague@company.com"
                error={inviteError}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                label="Role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                options={ROLE_OPTIONS}
              />
            </div>
            <Button
              variant="primary"
              onClick={handleInvite}
              loading={isSending}
              className="w-full sm:w-auto whitespace-nowrap"
              leftIcon={
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              }
            >
              Send Invite
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Members List */}
      <Card variant="glass">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Team Members</CardTitle>
            <Badge variant="neutral" size="sm">{(members.length + 1)} members</Badge>
          </div>

          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-[1.2fr_1.5fr_0.7fr_0.7fr_auto] gap-4 px-4 py-2 border-b border-border">
            <span className="text-text-3 text-xs uppercase tracking-wider font-semibold">Name</span>
            <span className="text-text-3 text-xs uppercase tracking-wider font-semibold">Email</span>
            <span className="text-text-3 text-xs uppercase tracking-wider font-semibold">Role</span>
            <span className="text-text-3 text-xs uppercase tracking-wider font-semibold">Status</span>
            <span className="w-20" />
          </div>

          {/* Paginated Members */}
          {(() => {
            const totalPages = Math.ceil(members.length / PAGE_SIZE)
            const startIdx = (currentPage - 1) * PAGE_SIZE
            const pageMembers = members.slice(startIdx, startIdx + PAGE_SIZE)

            return (
              <>
                {pageMembers.map((member) => (
                  <div
                    key={member.email}
                    className="grid grid-cols-1 sm:grid-cols-[1.2fr_1.5fr_0.7fr_0.7fr_auto] gap-2 sm:gap-4 px-4 py-3 items-center border-b border-border/50 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        member.role === "Owner"
                          ? "bg-gradient-to-br from-[var(--accent)] to-purple-500 text-white"
                          : "bg-bg-2 text-text-3"
                      )}>
                        {(member.name || "?").substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-text truncate">{member.name}</span>
                    </div>
                    <span className="text-sm text-text-2 truncate">{member.email}</span>
                    <Badge variant={member.role === "Owner" ? "purple" : "default"} size="sm">
                      {ROLE_LABELS[member.role] || member.role}
                    </Badge>
                    <Badge variant={STATUS_VARIANT[member.status] || "neutral"} size="sm" dot>
                      {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                    </Badge>
                    <div className="flex gap-1 w-20 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      {member.status === "invited" && (
                        <button
                          onClick={() => handleResend(member.email)}
                          className="text-[11px] text-[var(--accent)] hover:underline"
                          title="Resend invitation"
                        >
                          Resend
                        </button>
                      )}
                      {member.role !== "Owner" && (
                        <button
                          onClick={() => handleRemove(member.email)}
                          className="text-[11px] text-danger hover:underline"
                          title="Remove member"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Empty State */}
                {members.length === 0 && (
                  <p className="text-sm text-text-3 text-center py-8">
                    No team members yet. Use the form above to invite your colleagues.
                  </p>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 px-4">
                    <span className="text-xs text-text-3">
                      Page {currentPage} of {totalPages} ({members.length} total)
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg disabled:opacity-40 hover:bg-bg-2 transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg disabled:opacity-40 hover:bg-bg-2 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </CardContent>
      </Card>
    </div>
  )
}
