"use client"

import * as React from "react"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { Pencil1Icon, PlusIcon, Cross2Icon, MagnifyingGlassIcon } from "@radix-ui/react-icons"
import { EmployeeAPI } from "@/features/employees/api/client"
import { api } from "@/lib/api-client"
import { confirmDanger, confirmAction, showSuccess } from "@/lib/swal"

interface Employee {
    id: string
    firstName: string
    lastName: string
    avatarUrl?: string
    designation: string
    email?: string
}

interface TeamMember {
    employee: Employee
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

interface TeamDetailModalProps {
    isOpen: boolean
    onClose: () => void
    team: Team
    canAssign: boolean
    canEdit: boolean
    onMembersChanged: () => void
    onEditTeam: (team: Team) => void
}

export function TeamDetailModal({
    isOpen, onClose, team, canAssign, canEdit, onMembersChanged, onEditTeam,
}: TeamDetailModalProps) {
    const [addingMember, setAddingMember] = React.useState(false)
    const [allEmployees, setAllEmployees] = React.useState<Employee[]>([])
    const [searchTerm, setSearchTerm] = React.useState("")
    const [loadingEmp, setLoadingEmp] = React.useState(false)
    const [actionLoading, setActionLoading] = React.useState<string | null>(null)

    // Fetch employees when add member panel opens
    React.useEffect(() => {
        if (!addingMember) return
        setLoadingEmp(true)
        EmployeeAPI.fetchEmployees(1, 100)
            .then(data => {
                const list = data.results || []
                setAllEmployees(Array.isArray(list) ? list as unknown as Employee[] : [])
            })
            .catch(() => {})
            .finally(() => setLoadingEmp(false))
    }, [addingMember])

    // IDs already in team (lead + members)
    const memberIds = React.useMemo(() => {
        const ids = new Set<string>()
        if (team.leadId) ids.add(team.leadId)
        else if (team.lead && typeof team.lead === "object") ids.add(team.lead.id)
        ;(team.members || []).forEach(m => {
            const empId = typeof m.employee === "object" ? m.employee.id : m.employee
            if (empId) ids.add(empId)
        })
        return ids
    }, [team])

    const availableEmployees = React.useMemo(() => {
        let list = allEmployees.filter(e => !memberIds.has(e.id))
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase()
            list = list.filter(e =>
                `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
                e.email?.toLowerCase().includes(q) ||
                e.designation?.toLowerCase().includes(q)
            )
        }
        return list
    }, [allEmployees, memberIds, searchTerm])

    const handleAddMember = async (employeeId: string) => {
        setActionLoading(employeeId)
        try {
            await api.post(`/teams/${team.id}/members/`, { employeeId })
            onMembersChanged()
            // Add to local memberIds to hide from available list
            setAllEmployees(prev => prev) // trigger re-render
        } catch { /* empty */ }
        finally { setActionLoading(null) }
    }

    const handleRemoveMember = async (employeeId: string) => {
        if (!await confirmDanger("Remove Member?", "This member will be removed from the team.")) return
        setActionLoading(employeeId)
        try {
            await api.delete(`/teams/${team.id}/members/?employee_id=${employeeId}`)
            showSuccess("Removed", "Member removed from team")
            onMembersChanged()
        } catch { /* empty */ }
        finally { setActionLoading(null) }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={team.name} className="max-w-2xl">
            <div className="flex flex-col gap-4">
                {/* Team Info */}
                {team.description && (
                    <p className="text-sm text-text-3">{team.description}</p>
                )}

                {/* Team Lead Section */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-text">Team Lead</h4>
                        {canEdit && (
                            <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Pencil1Icon />}
                                onClick={() => onEditTeam(team)}
                            >
                                Edit Team
                            </Button>
                        )}
                    </div>
                    {team.lead ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 border border-accent/15">
                        <Avatar
                            src={typeof team.lead === "object" ? team.lead.avatarUrl : undefined}
                            name={typeof team.lead === "object" ? `${team.lead.firstName} ${team.lead.lastName}` : "Lead"}
                            size="sm"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text">
                                {typeof team.lead === "object" ? `${team.lead.firstName} ${team.lead.lastName}` : (team as any).leadName || "Team Lead"}
                            </p>
                            {typeof team.lead === "object" && team.lead.designation && (
                                <p className="text-xs text-text-3">{team.lead.designation}</p>
                            )}
                        </div>
                        <Badge variant="default" size="sm">Lead</Badge>
                    </div>
                    ) : (
                        <p className="text-sm text-text-3 py-2">No team lead assigned</p>
                    )}
                </div>

                {/* Members Section */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-text">
                            Members <span className="text-text-3 font-normal">({team.members.length})</span>
                        </h4>
                        {canAssign && (
                            <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<PlusIcon />}
                                onClick={() => setAddingMember(!addingMember)}
                            >
                                {addingMember ? "Done" : "Add Member"}
                            </Button>
                        )}
                    </div>

                    {/* Add member panel */}
                    {addingMember && canAssign && (
                        <div className="mb-3 p-3 rounded-lg border border-border bg-bg-2/50">
                            <div className="relative mb-2">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-4" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Search employees to add..."
                                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 placeholder:text-text-4"
                                />
                            </div>
                            <div className="max-h-36 overflow-y-auto divide-y divide-border rounded-lg border border-border bg-surface">
                                {loadingEmp ? (
                                    <p className="p-3 text-sm text-text-3 text-center">Loading...</p>
                                ) : availableEmployees.length === 0 ? (
                                    <p className="p-3 text-sm text-text-3 text-center">
                                        {searchTerm ? "No matching employees" : "All employees are already members"}
                                    </p>
                                ) : (
                                    availableEmployees.map(emp => (
                                        <div key={emp.id} className="flex items-center gap-2 p-2">
                                            <Avatar
                                                src={emp.avatarUrl}
                                                name={`${emp.firstName} ${emp.lastName}`}
                                                size="xs"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-text truncate">{emp.firstName} {emp.lastName}</p>
                                                <p className="text-xs text-text-4 truncate">{emp.designation}</p>
                                            </div>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                loading={actionLoading === emp.id}
                                                onClick={() => handleAddMember(emp.id)}
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Current members list */}
                    {(team.members || []).length === 0 ? (
                        <p className="text-sm text-text-3 text-center py-4">No members yet. Add members to this team.</p>
                    ) : (
                        <div className="divide-y divide-border rounded-lg border border-border">
                            {(team.members || []).map(m => {
                                const emp = typeof m.employee === "object"
                                    ? m.employee
                                    : { id: m.employee || (m as any).id, firstName: ((m as any).employeeName || "").split(/\s+/)[0] || "", lastName: ((m as any).employeeName || "").split(/\s+/).slice(1).join(" ") || "", avatarUrl: undefined, designation: (m as any).role || "" }
                                return (
                                <div key={emp.id} className="flex items-center gap-3 p-3">
                                    <Avatar
                                        src={emp.avatarUrl}
                                        name={`${emp.firstName} ${emp.lastName}`}
                                        size="sm"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text truncate">
                                            {emp.firstName} {emp.lastName}
                                        </p>
                                        <p className="text-xs text-text-3 truncate">{emp.designation}</p>
                                    </div>
                                    {canAssign && (
                                        <button
                                            onClick={() => handleRemoveMember(emp.id)}
                                            disabled={actionLoading === emp.id}
                                            className="p-1.5 rounded-md text-text-4 hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                                            title="Remove member"
                                        >
                                            <Cross2Icon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
