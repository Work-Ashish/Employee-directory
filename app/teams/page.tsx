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
import { StatCard } from "@/components/ui/StatCard"
import { PlusIcon, Pencil1Icon, TrashIcon, PersonIcon, UpdateIcon, MagnifyingGlassIcon, GroupIcon } from "@radix-ui/react-icons"
import { TeamAPI } from "@/features/teams/api/client"
import { confirmDanger, showSuccess } from "@/lib/swal"

const ACCENT_COLORS = [
    "border-l-accent", "border-l-success", "border-l-warning",
    "border-l-purple", "border-l-danger", "border-l-[#007aff]",
]

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

/** Normalize Django team response into the shape the UI expects */
function normalizeTeam(raw: any): Team {
    const leadIsObject = raw.lead && typeof raw.lead === "object"
    const leadId = leadIsObject ? raw.lead.id : (raw.leadId || raw.lead || "")
    const leadNameStr: string = raw.leadName || ""
    const [leadFirst = "", ...leadRest] = leadNameStr.split(/\s+/)
    const lead = leadIsObject
        ? raw.lead
        : { id: leadId, firstName: leadFirst, lastName: leadRest.join(" "), avatarUrl: null, designation: "" }

    const membersCount = raw._count?.members ?? raw.membersCount ?? raw.members?.length ?? 0

    const members: TeamMember[] = (raw.members || []).map((m: any) => {
        if (m.employee && typeof m.employee === "object") return m
        const empNameStr: string = m.employeeName || ""
        const [fn = "", ...ln] = empNameStr.split(/\s+/)
        return {
            ...m,
            employee: { id: m.employee || m.id, firstName: fn, lastName: ln.join(" "), avatarUrl: null, designation: m.role || "" },
        }
    })

    return {
        id: raw.id,
        name: raw.name,
        description: raw.description,
        leadId,
        lead,
        members,
        _count: { members: membersCount },
    }
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
    const [syncing, setSyncing] = React.useState(false)
    const [search, setSearch] = React.useState("")
    const syncAttempted = React.useRef(false)

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

    const handleSync = React.useCallback(async () => {
        setSyncing(true)
        try {
            const result = await TeamAPI.syncFromHierarchy()
            if (result.teamsCreated > 0 || result.membersAdded > 0) {
                showSuccess("Teams Synced", `${result.teamsCreated} team(s) created, ${result.membersAdded} member(s) added.`)
            }
        } catch { /* empty */ }
        finally { setSyncing(false) }
    }, [])

    const fetchTeams = React.useCallback(async () => {
        try {
            const data = await TeamAPI.list()
            const arr = data.results || data
            const list = Array.isArray(arr) ? arr : []
            const normalized = list.map(normalizeTeam)
            setTeams(normalized)

            // Auto-sync from hierarchy on first load if no teams exist
            if (normalized.length === 0 && !syncAttempted.current && canCreate) {
                syncAttempted.current = true
                setSyncing(true)
                try {
                    await TeamAPI.syncFromHierarchy()
                    // Re-fetch after sync
                    const data2 = await TeamAPI.list()
                    const arr2 = data2.results || data2
                    const list2 = Array.isArray(arr2) ? arr2 : []
                    setTeams(list2.map(normalizeTeam))
                } catch { /* empty */ }
                finally { setSyncing(false) }
            }
        } catch { /* empty */ }
        finally { setLoading(false) }
    }, [canCreate])

    React.useEffect(() => { fetchTeams() }, [fetchTeams])

    const handleDelete = async (teamId: string) => {
        if (!await confirmDanger("Delete Team?", "All members will be removed from this team.")) return
        setDeleting(teamId)
        try {
            await TeamAPI.delete(teamId)
            showSuccess("Team Deleted", "All members have been removed from the team.")
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

    // Computed stats
    const totalMembers = teams.reduce((sum, t) => sum + t._count.members, 0)
    const avgSize = teams.length > 0 ? Math.round(totalMembers / teams.length) : 0
    const myTeam = teams.find(t =>
        t.lead.id === user?.id || t.members.some(m => m.employee.id === user?.id)
    )

    // Search filter
    const q = search.toLowerCase().trim()
    const filteredTeams = q
        ? teams.filter(t =>
            t.name.toLowerCase().includes(q) ||
            `${t.lead.firstName} ${t.lead.lastName}`.toLowerCase().includes(q)
        )
        : teams

    if (isLoading || loading) {
        return <div className="p-6 text-text-3 flex items-center gap-2"><Spinner /> Loading...</div>
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <PageHeader
                title="Teams"
                description="Manage teams and their members"
                actions={canCreate ? (
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            leftIcon={<UpdateIcon />}
                            loading={syncing}
                            onClick={async () => { await handleSync(); fetchTeams() }}
                        >
                            Sync from Org Chart
                        </Button>
                        <Button leftIcon={<PlusIcon />} onClick={() => { setEditingTeam(null); setFormOpen(true) }}>
                            Create Team
                        </Button>
                    </div>
                ) : undefined}
            />

            {/* Stats Row */}
            {teams.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <StatCard label="Total Teams" value={teams.length} icon={<GroupIcon className="w-4 h-4" />} />
                    <StatCard label="Total Members" value={totalMembers} icon={<PersonIcon className="w-4 h-4" />} />
                    <StatCard label="Avg Team Size" value={avgSize} />
                    <StatCard label="Your Team" value={myTeam?.name || "—"} />
                </div>
            )}

            {/* Search Bar */}
            {teams.length > 0 && (
                <div className="relative mt-4">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-4" />
                    <input
                        type="text"
                        placeholder="Search teams or team leads..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-bg-2 border border-border rounded-xl text-sm text-text placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                    />
                </div>
            )}

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
            ) : filteredTeams.length === 0 ? (
                <EmptyState
                    icon={<MagnifyingGlassIcon className="w-6 h-6" />}
                    title="No teams match your search"
                    description={`No results for "${search}". Try a different keyword.`}
                    className="mt-6"
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {filteredTeams.map((team, idx) => (
                        <Card
                            key={team.id}
                            variant="glass-premium"
                            className={`p-5 hover:shadow-lg transition-all cursor-pointer group border-l-4 ${ACCENT_COLORS[idx % ACCENT_COLORS.length]}`}
                            onClick={async () => {
                                try {
                                    const full = await TeamAPI.get(team.id)
                                    setDetailTeam(normalizeTeam(full))
                                } catch {
                                    setDetailTeam(team)
                                }
                            }}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-text truncate text-base">{team.name}</h3>
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
                                <div className="flex-1 min-w-0">
                                    <span className="text-text-2 truncate block">
                                        {team.lead.firstName} {team.lead.lastName}
                                    </span>
                                    {team.lead.designation && (
                                        <span className="text-xs text-text-4 truncate block">{team.lead.designation}</span>
                                    )}
                                </div>
                                <Badge variant="default" size="sm">Lead</Badge>
                            </div>

                            {/* Member avatars preview */}
                            {team.members.length > 0 && (
                                <div className="flex items-center -space-x-2.5 mb-3">
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
                                        <span className="text-xs text-text-3 ml-3 font-medium">
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
