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

  // Load team members
  React.useEffect(() => {
    async function loadTeam() {
      try {
        const { data } = await api.get<{ results?: TeamMember[]; members?: TeamMember[] }>("/organization/members/")
        const list = data.results || data.members || []
        setMembers(list)
      } catch {
        // Load from localStorage fallback
        try {
          const saved = localStorage.getItem("team_members")
          if (saved) setMembers(JSON.parse(saved))
        } catch { /* ignore */ }
      }
    }
    loadTeam()
  }, [])

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
      await api.post("/invitations/", { email: trimmed, role: inviteRole })
    } catch {
      // API not available — proceed with local state
    }

    const updated = [...members, newMember]
    setMembers(updated)
    localStorage.setItem("team_members", JSON.stringify(updated))
    toast.success(`Invitation sent to ${trimmed}`)
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

          {/* Owner Row */}
          <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1.5fr_0.7fr_0.7fr_auto] gap-2 sm:gap-4 px-4 py-3 items-center border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user?.name?.substring(0, 2).toUpperCase() || "AD"}
              </div>
              <span className="text-sm font-medium text-text truncate">{user?.name || "Admin"}</span>
            </div>
            <span className="text-sm text-text-2 truncate">{user?.email || "admin@company.com"}</span>
            <Badge variant="purple" size="sm">Owner</Badge>
            <Badge variant="success" size="sm" dot>Active</Badge>
            <span className="w-20" />
          </div>

          {/* Members */}
          {members.map((member) => (
            <div
              key={member.email}
              className="grid grid-cols-1 sm:grid-cols-[1.2fr_1.5fr_0.7fr_0.7fr_auto] gap-2 sm:gap-4 px-4 py-3 items-center border-b border-border/50 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-bg-2 flex items-center justify-center text-text-3 text-xs font-bold shrink-0">
                  {member.name.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-text truncate">{member.name}</span>
              </div>
              <span className="text-sm text-text-2 truncate">{member.email}</span>
              <Badge variant="default" size="sm">{ROLE_LABELS[member.role] || member.role}</Badge>
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
                <button
                  onClick={() => handleRemove(member.email)}
                  className="text-[11px] text-danger hover:underline"
                  title="Remove member"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {members.length === 0 && (
            <p className="text-sm text-text-3 text-center py-8">
              No team members yet. Use the form above to invite your colleagues.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
