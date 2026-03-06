"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { canAccessModule, hasPermission, Module, Action } from "@/lib/permissions"

interface Team {
  id: string
  name: string
  description?: string
  lead: { id: string; firstName: string; lastName: string; avatarUrl?: string }
  members: { employee: { id: string; firstName: string; lastName: string; designation: string } }[]
  _count: { members: number }
}

export default function TeamsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [teams, setTeams] = React.useState<Team[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!isLoading && !canAccessModule(user?.role ?? "", Module.TEAMS)) {
      router.push("/")
    }
  }, [user, isLoading, router])

  React.useEffect(() => {
    fetch("/api/teams")
      .then(r => r.json())
      .then(data => {
        const arr = data.data || data
        setTeams(Array.isArray(arr) ? arr : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (isLoading || loading) return <div className="p-6 text-[var(--text3)]">Loading...</div>

  const canCreate = hasPermission(user?.role ?? "", Module.TEAMS, Action.CREATE)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Teams</h1>
          <p className="text-[var(--text3)] text-sm mt-1">Manage teams and their members</p>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-12 text-[var(--text3)]">
          <p>No teams found.</p>
          {canCreate && <p className="text-sm mt-2">Create a team to get started.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <div key={team.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[var(--text)]">{team.name}</h3>
                <span className="text-xs text-[var(--text3)] bg-[var(--bg2)] px-2 py-1 rounded-full">
                  {team._count.members} member{team._count.members !== 1 ? "s" : ""}
                </span>
              </div>
              {team.description && (
                <p className="text-sm text-[var(--text3)] mb-3">{team.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#5856d6] flex items-center justify-center text-white text-[10px] font-bold">
                  {team.lead.firstName[0]}{team.lead.lastName[0]}
                </div>
                <span className="text-[var(--text2)]">
                  {team.lead.firstName} {team.lead.lastName}
                </span>
                <span className="text-[var(--text4)] text-xs">Lead</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
