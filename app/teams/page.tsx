"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { canAccessModule, hasPermission, Module, Action } from "@/lib/permissions"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Avatar } from "@/components/ui/Avatar"
import { EmptyState } from "@/components/ui/EmptyState"
import { Spinner } from "@/components/ui/Spinner"
import { TeamFormModal } from "@/components/teams/TeamFormModal"
import { TeamDetailModal } from "@/components/teams/TeamDetailModal"
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

    const STAT_ICONS: Record<string, { bg: string; text: string }> = {
        teams: { bg: "bg-accent/10", text: "text-accent" },
        members: { bg: "bg-success/10", text: "text-success" },
        avg: { bg: "bg-purple/10", text: "text-purple" },
        yours: { bg: "bg-warning/10", text: "text-warning" },
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Hero Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-text tracking-tight">Teams</h1>
                    <p className="text-sm text-text-3 mt-1">Manage teams, view members, and track collaboration</p>
                </div>
                {canCreate && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<UpdateIcon />}
                            loading={syncing}
                            onClick={async () => { await handleSync(); fetchTeams() }}
                        >
                            Sync Org Chart
                        </Button>
                        <Button size="sm" leftIcon={<PlusIcon />} onClick={() => { setEditingTeam(null); setFormOpen(true) }}>
                            New Team
                        </Button>
                    </div>
                )}
            </div>

            {/* Stats Row — Compact inline pills */}
            {teams.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        { key: "teams", label: "Teams", val: teams.length, icon: <GroupIcon className="w-4 h-4" /> },
                        { key: "members", label: "Members", val: totalMembers, icon: <PersonIcon className="w-4 h-4" /> },
                        { key: "avg", label: "Avg Size", val: avgSize, icon: <PersonIcon className="w-4 h-4" /> },
                        { key: "yours", label: "Your Team", val: myTeam?.name || "—", icon: <PersonIcon className="w-4 h-4" /> },
                    ].map(s => (
                        <div key={s.key} className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3.5 hover:border-border-2 transition-colors">
                            <span className={`flex items-center justify-center w-9 h-9 rounded-lg ${STAT_ICONS[s.key].bg} ${STAT_ICONS[s.key].text}`}>
                                {s.icon}
                            </span>
                            <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-4">{s.label}</p>
                                <p className="text-lg font-extrabold text-text truncate leading-tight">{s.val}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Search + Count bar */}
            {teams.length > 0 && (
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-4" />
                        <input
                            type="text"
                            placeholder="Search teams or team leads..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                        />
                    </div>
                    <span className="text-xs text-text-4 whitespace-nowrap font-medium">
                        {filteredTeams.length} of {teams.length} team{teams.length !== 1 ? "s" : ""}
                    </span>
                </div>
            )}

            {teams.length === 0 ? (
                <EmptyState
                    icon={<PersonIcon className="w-6 h-6" />}
                    title="No teams yet"
                    description={canCreate ? "Create your first team to get started." : "No teams have been created yet."}
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
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredTeams.map((team, idx) => {
                        const accentColor = ACCENT_COLORS[idx % ACCENT_COLORS.length]
                        return (
                            <div
                                key={team.id}
                                className="group relative bg-surface border border-border rounded-2xl overflow-hidden hover:border-border-2 hover:shadow-md transition-all duration-200 cursor-pointer"
                                onClick={async () => {
                                    try {
                                        const full = await TeamAPI.get(team.id)
                                        setDetailTeam(normalizeTeam(full))
                                    } catch {
                                        setDetailTeam(team)
                                    }
                                }}
                            >
                                {/* Color accent bar */}
                                <div className={`h-1 w-full ${accentColor.replace("border-l-", "bg-")}`} />

                                <div className="p-5">
                                    {/* Header: name + member count */}
                                    <div className="flex items-start justify-between gap-2 mb-4">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-bold text-text text-[15px] truncate leading-snug">{team.name}</h3>
                                            {team.description && (
                                                <p className="text-xs text-text-4 mt-1 line-clamp-1">{team.description}</p>
                                            )}
                                        </div>
                                        <Badge variant="neutral" size="sm" className="flex-shrink-0">
                                            {team._count.members} member{team._count.members !== 1 ? "s" : ""}
                                        </Badge>
                                    </div>

                                    {/* Team Lead — prominent row */}
                                    <div className="flex items-center gap-3 bg-bg-2 rounded-xl px-3.5 py-3 mb-4">
                                        <Avatar
                                            src={team.lead.avatarUrl}
                                            name={`${team.lead.firstName} ${team.lead.lastName}`}
                                            size="sm"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm font-semibold text-text truncate block leading-tight">
                                                {team.lead.firstName} {team.lead.lastName}
                                            </span>
                                            <span className="text-[11px] text-text-4 truncate block">
                                                {team.lead.designation || "Team Lead"}
                                            </span>
                                        </div>
                                        <Badge variant="default" size="sm">Lead</Badge>
                                    </div>

                                    {/* Member avatars row */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="flex -space-x-2">
                                                {team.members.slice(0, 6).map(m => (
                                                    <Avatar
                                                        key={m.employee.id}
                                                        src={m.employee.avatarUrl}
                                                        name={`${m.employee.firstName} ${m.employee.lastName}`}
                                                        size="xs"
                                                        className="ring-2 ring-surface"
                                                    />
                                                ))}
                                            </div>
                                            {team.members.length > 6 && (
                                                <span className="text-[11px] text-text-4 ml-2 font-medium">
                                                    +{team.members.length - 6}
                                                </span>
                                            )}
                                        </div>

                                        {/* Hover actions */}
                                        {(canEditPerm || canDelete) && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                                {canEditPerm && (
                                                    <button
                                                        className="p-1.5 rounded-lg text-text-3 hover:text-accent hover:bg-accent/10 transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); setEditingTeam(team); setFormOpen(true) }}
                                                        title="Edit team"
                                                    >
                                                        <Pencil1Icon className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        className="p-1.5 rounded-lg text-text-3 hover:text-danger hover:bg-danger/10 transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(team.id) }}
                                                        title="Delete team"
                                                    >
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
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
