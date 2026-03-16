"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { canAccessModule, hasPermission, Module, Action } from "@/lib/permissions"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Avatar } from "@/components/ui/Avatar"
import { EmptyState } from "@/components/ui/EmptyState"
import { Spinner } from "@/components/ui/Spinner"
import { TeamFormModal } from "@/components/teams/TeamFormModal"
import { TeamDetailModal } from "@/components/teams/TeamDetailModal"
import { PlusIcon, Pencil1Icon, TrashIcon, PersonIcon } from "@radix-ui/react-icons"
import { TeamAPI } from "@/features/teams/api/client"

interface TeamMember {
    employee: { id: string; firstName: string; lastName: string; avatarUrl?: string; designation: string; email?: string }
}

interface Team {
    id: string
    name: string
    description?: string | null
    leadId: string
    lead: { id: string; firstName: string; lastName: string; avatarUrl?: string; designation?: string }
    members: TeamMember[]
    _count: { members: number }
}

export default function TeamsPage() {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    const [teams, setTeams] = React.useState<Team[]>([])
    const [loading, setLoading] = React.useState(true)
    const [formOpen, setFormOpen] = React.useState(false)
    const [editingTeam, setEditingTeam] = React.useState<Team | null>(null)
    const [detailTeam, setDetailTeam] = React.useState<Team | null>(null)
    const [deleting, setDeleting] = React.useState<string | null>(null)

    const role = user?.role ?? ""
    const canCreate = hasPermission(role, Module.TEAMS, Action.CREATE)
    const canEditPerm = hasPermission(role, Module.TEAMS, Action.UPDATE)
    const canDelete = hasPermission(role, Module.TEAMS, Action.DELETE)
    const canAssign = hasPermission(role, Module.TEAMS, Action.ASSIGN)

    React.useEffect(() => {
        if (!isLoading && !canAccessModule(role, Module.TEAMS)) {
            router.push("/")
        }
    }, [user, isLoading, router, role])

    const fetchTeams = React.useCallback(async () => {
        try {
            const data = await TeamAPI.list()
            const arr = data.results || data
            setTeams(Array.isArray(arr) ? arr as Team[] : [])
        } catch { /* empty */ }
        finally { setLoading(false) }
    }, [])

    React.useEffect(() => { fetchTeams() }, [fetchTeams])

    const handleDelete = async (teamId: string) => {
        if (!confirm("Are you sure you want to delete this team? All members will be removed.")) return
        setDeleting(teamId)
        try {
            await TeamAPI.delete(teamId)
            setTeams(prev => prev.filter(t => t.id !== teamId))
        } catch { /* empty */ }
        finally { setDeleting(null) }
    }

    const handleFormSaved = () => {
        setFormOpen(false)
        setEditingTeam(null)
        fetchTeams()
    }

    const handleMembersChanged = () => {
        fetchTeams()
    }

    if (isLoading || loading) {
        return <div className="p-6 text-text-3 flex items-center gap-2"><Spinner /> Loading...</div>
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <PageHeader
                title="Teams"
                description="Manage teams and their members"
                actions={canCreate ? (
                    <Button leftIcon={<PlusIcon />} onClick={() => { setEditingTeam(null); setFormOpen(true) }}>
                        Create Team
                    </Button>
                ) : undefined}
            />

            {teams.length === 0 ? (
                <EmptyState
                    icon={<PersonIcon className="w-6 h-6" />}
                    title="No teams found."
                    description={canCreate ? "Create a team to get started." : "No teams have been created yet."}
                    action={canCreate ? (
                        <Button leftIcon={<PlusIcon />} onClick={() => { setEditingTeam(null); setFormOpen(true) }}>
                            Create Team
                        </Button>
                    ) : undefined}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {teams.map(team => (
                        <Card
                            key={team.id}
                            className="p-5 hover:shadow-md transition-shadow cursor-pointer group"
                            onClick={() => setDetailTeam(team)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-text truncate">{team.name}</h3>
                                    {team.description && (
                                        <p className="text-xs text-text-3 mt-0.5 line-clamp-2">{team.description}</p>
                                    )}
                                </div>
                                <Badge variant="neutral" size="sm">
                                    {team._count.members} member{team._count.members !== 1 ? "s" : ""}
                                </Badge>
                            </div>

                            {/* Team Lead */}
                            <div className="flex items-center gap-2 text-sm mb-3">
                                <Avatar
                                    src={team.lead.avatarUrl}
                                    name={`${team.lead.firstName} ${team.lead.lastName}`}
                                    size="xs"
                                />
                                <span className="text-text-2 truncate">
                                    {team.lead.firstName} {team.lead.lastName}
                                </span>
                                <Badge variant="default" size="sm">Lead</Badge>
                            </div>

                            {/* Member avatars preview */}
                            {team.members.length > 0 && (
                                <div className="flex items-center -space-x-2 mb-3">
                                    {team.members.slice(0, 5).map(m => (
                                        <Avatar
                                            key={m.employee.id}
                                            src={m.employee.avatarUrl}
                                            name={`${m.employee.firstName} ${m.employee.lastName}`}
                                            size="xs"
                                            className="ring-2 ring-surface"
                                        />
                                    ))}
                                    {team.members.length > 5 && (
                                        <span className="text-xs text-text-3 ml-3">
                                            +{team.members.length - 5} more
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Action buttons */}
                            {(canEditPerm || canDelete) && (
                                <div className="flex gap-2 pt-2 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                                    {canEditPerm && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            leftIcon={<Pencil1Icon />}
                                            onClick={(e) => { e.stopPropagation(); setEditingTeam(team); setFormOpen(true) }}
                                        >
                                            Edit
                                        </Button>
                                    )}
                                    {canDelete && (
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            leftIcon={<TrashIcon />}
                                            loading={deleting === team.id}
                                            onClick={(e) => { e.stopPropagation(); handleDelete(team.id) }}
                                        >
                                            Delete
                                        </Button>
                                    )}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* Create / Edit Team Modal */}
            <TeamFormModal
                isOpen={formOpen}
                onClose={() => { setFormOpen(false); setEditingTeam(null) }}
                team={editingTeam}
                onSaved={handleFormSaved}
            />

            {/* Team Detail / Member Management Modal */}
            {detailTeam && (
                <TeamDetailModal
                    isOpen={!!detailTeam}
                    onClose={() => setDetailTeam(null)}
                    team={detailTeam}
                    canAssign={canAssign}
                    canEdit={canEditPerm}
                    onMembersChanged={handleMembersChanged}
                    onEditTeam={(t) => { setDetailTeam(null); setEditingTeam(t); setFormOpen(true) }}
                />
            )}
        </div>
    )
}
