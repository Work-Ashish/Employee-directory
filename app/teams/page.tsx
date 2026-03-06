"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { canAccessModule, hasPermission, Module, Action } from "@/lib/permissions"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { EmptyState } from "@/components/ui/EmptyState"
import { Spinner } from "@/components/ui/Spinner"

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

  if (isLoading || loading) return <div className="p-6 text-text-3 flex items-center gap-2"><Spinner /> Loading...</div>

  const canCreate = hasPermission(user?.role ?? "", Module.TEAMS, Action.CREATE)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Teams"
        description="Manage teams and their members"
      />

      {teams.length === 0 ? (
        <EmptyState
          title="No teams found."
          description={canCreate ? "Create a team to get started." : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <Card key={team.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-text">{team.name}</h3>
                <Badge variant="neutral" size="sm">
                  {team._count.members} member{team._count.members !== 1 ? "s" : ""}
                </Badge>
              </div>
              {team.description && (
                <p className="text-sm text-text-3 mb-3">{team.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Avatar
                  src={team.lead.avatarUrl}
                  name={`${team.lead.firstName} ${team.lead.lastName}`}
                  size="xs"
                />
                <span className="text-text-2">
                  {team.lead.firstName} {team.lead.lastName}
                </span>
                <span className="text-text-4 text-xs">Lead</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
