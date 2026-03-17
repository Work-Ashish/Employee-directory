"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import type { SignupFormData } from "@/lib/schemas/signup"

interface StepProps {
  data: SignupFormData
  updateData: (partial: Partial<SignupFormData>) => void
  errors: Record<string, string>
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "ceo", label: "CEO" },
  { value: "hr_manager", label: "HR Manager" },
  { value: "payroll_admin", label: "Payroll Admin" },
  { value: "team_lead", label: "Team Lead" },
  { value: "hiring_manager", label: "Hiring Manager" },
  { value: "recruiter", label: "Recruiter" },
  { value: "interviewer", label: "Interviewer" },
  { value: "it_admin", label: "IT Admin" },
  { value: "employee", label: "Employee" },
  { value: "viewer", label: "Viewer" },
]

const SEAT_LIMITS: Record<string, number> = {
  starter: 10,
  growth: 25,
  enterprise: Infinity,
}

const TIER_LABELS: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  enterprise: "Enterprise",
}

const PlusIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8 3v10M3 8h10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)

const CloseIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3.5 3.5l7 7M10.5 3.5l-7 7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)

function extractNameFromEmail(email: string): string {
  const local = email.split("@")[0] || ""
  return local
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function TeamSetupStep({ data, updateData, errors }: StepProps) {
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("employee")
  const [inviteError, setInviteError] = useState("")

  const seatLimit = SEAT_LIMITS[data.subscriptionTier] ?? 25
  const seatsUsed = 1 + data.teamInvites.length // admin + invites
  const tierLabel = TIER_LABELS[data.subscriptionTier] ?? "Growth"

  const handleInvite = useCallback(() => {
    setInviteError("")

    const trimmedEmail = inviteEmail.trim().toLowerCase()

    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setInviteError("Please enter a valid email address")
      return
    }

    if (trimmedEmail === data.adminEmail?.toLowerCase()) {
      setInviteError("This email is already used for the admin account")
      return
    }

    const isDuplicate = data.teamInvites.some(
      (inv) => inv.email.toLowerCase() === trimmedEmail
    )
    if (isDuplicate) {
      setInviteError("This email has already been invited")
      return
    }

    if (seatLimit !== Infinity && seatsUsed >= seatLimit) {
      setInviteError(`Seat limit reached (${seatLimit} on ${tierLabel} plan)`)
      return
    }

    const newInvite = {
      email: trimmedEmail,
      role: inviteRole,
      name: extractNameFromEmail(trimmedEmail),
    }

    updateData({ teamInvites: [...data.teamInvites, newInvite] })
    setInviteEmail("")
    setInviteRole("employee")
  }, [
    inviteEmail,
    inviteRole,
    data.adminEmail,
    data.teamInvites,
    seatLimit,
    seatsUsed,
    tierLabel,
    updateData,
  ])

  const handleRemove = useCallback(
    (emailToRemove: string) => {
      updateData({
        teamInvites: data.teamInvites.filter(
          (inv) => inv.email !== emailToRemove
        ),
      })
    },
    [data.teamInvites, updateData]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleInvite()
      }
    },
    [handleInvite]
  )

  const adminName = [data.adminFirstName, data.adminLastName]
    .filter(Boolean)
    .join(" ") || "Admin"

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="glass-premium rounded-2xl p-6 md:p-8">
          <h3 className="font-bold text-text mb-4">Invite Team Members</h3>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full">
              <Input
                label="Email"
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value)
                  if (inviteError) setInviteError("")
                }}
                onKeyDown={handleKeyDown}
                placeholder="Enter email address..."
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
              leftIcon={<PlusIcon />}
              onClick={handleInvite}
              className="w-full sm:w-auto whitespace-nowrap"
            >
              Invite
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Members Table */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: 0.15 }}
      >
        <div className="glass-premium rounded-2xl p-6 md:p-8">
          <h3 className="font-bold text-text mb-4">Team Members</h3>

          {/* Table Header */}
          <div className="grid grid-cols-[1fr_1.5fr_0.8fr_0.8fr_auto] gap-4 px-4 py-2 border-b border-border">
            <span className="text-text-3 text-xs uppercase tracking-wider font-semibold">
              Name
            </span>
            <span className="text-text-3 text-xs uppercase tracking-wider font-semibold">
              Email
            </span>
            <span className="text-text-3 text-xs uppercase tracking-wider font-semibold">
              Role
            </span>
            <span className="text-text-3 text-xs uppercase tracking-wider font-semibold">
              Status
            </span>
            <span className="w-8" />
          </div>

          {/* Admin Row (always present) */}
          <div className="grid grid-cols-[1fr_1.5fr_0.8fr_0.8fr_auto] gap-4 px-4 py-3 items-center border-b border-border/50">
            <span className="text-sm text-text font-medium truncate">
              {adminName}
            </span>
            <span className="text-sm text-text-2 truncate">
              {data.adminEmail || "admin@company.com"}
            </span>
            <div>
              <Badge variant="success" size="sm">
                Owner
              </Badge>
            </div>
            <div>
              <Badge variant="success" size="sm" dot>
                Active
              </Badge>
            </div>
            <span className="w-8" />
          </div>

          {/* Invited Members */}
          <AnimatePresence mode="popLayout">
            {data.teamInvites.map((invite) => (
              <motion.div
                key={invite.email}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                layout
                className="grid grid-cols-[1fr_1.5fr_0.8fr_0.8fr_auto] gap-4 px-4 py-3 items-center border-b border-border/50"
              >
                <span className="text-sm text-text font-medium truncate">
                  {invite.name || extractNameFromEmail(invite.email)}
                </span>
                <span className="text-sm text-text-2 truncate">
                  {invite.email}
                </span>
                <div>
                  <Badge variant="default" size="sm">
                    {ROLE_OPTIONS.find((r) => r.value === invite.role)?.label ??
                      invite.role}
                  </Badge>
                </div>
                <div>
                  <Badge variant="warning" size="sm" dot>
                    Invited
                  </Badge>
                </div>
                <div className="w-8 flex justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(invite.email)}
                    aria-label={`Remove ${invite.email}`}
                  >
                    <CloseIcon />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty State */}
          {data.teamInvites.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-text-3 text-center py-8"
            >
              Invite your team members to get started. You can also do this later.
            </motion.p>
          )}

          {/* Seat Counter */}
          <div className="mt-4 pt-3 border-t border-border/50 text-center">
            <p className="text-sm text-text-2">
              <span className="font-semibold text-text">{seatsUsed}</span>
              {" of "}
              {seatLimit === Infinity ? (
                <span className="font-semibold text-text">unlimited</span>
              ) : (
                <span className="font-semibold text-text">{seatLimit}</span>
              )}
              {" seats used "}
              <span className="text-text-3">({tierLabel} plan)</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
