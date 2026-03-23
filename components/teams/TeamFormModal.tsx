"use client"

import * as React from "react"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { Avatar } from "@/components/ui/Avatar"
import { MagnifyingGlassIcon } from "@radix-ui/react-icons"
import { EmployeeAPI } from "@/features/employees/api/client"
import { TeamAPI } from "@/features/teams/api/client"

interface Employee {
    id: string
    firstName: string
    lastName: string
    avatarUrl?: string
    designation: string
    email: string
}

interface Team {
    id: string
    name: string
    description?: string | null
    leadId: string
    lead: { id: string; firstName: string; lastName: string; avatarUrl?: string }
}

interface TeamFormModalProps {
    isOpen: boolean
    onClose: () => void
    team: Team | null
    onSaved: () => void
}

export function TeamFormModal({ isOpen, onClose, team, onSaved }: TeamFormModalProps) {
    const [name, setName] = React.useState("")
    const [description, setDescription] = React.useState("")
    const [leadId, setLeadId] = React.useState("")
    const [employees, setEmployees] = React.useState<Employee[]>([])
    const [searchTerm, setSearchTerm] = React.useState("")
    const [saving, setSaving] = React.useState(false)
    const [error, setError] = React.useState("")
    const [loadingEmp, setLoadingEmp] = React.useState(false)

    const isEdit = !!team

    // Load form values when team changes
    React.useEffect(() => {
        if (team) {
            setName(team.name)
            setDescription(team.description ?? "")
            setLeadId(team.leadId || (typeof team.lead === "object" ? team.lead?.id : team.lead as any) || "")
        } else {
            setName("")
            setDescription("")
            setLeadId("")
        }
        setError("")
        setSearchTerm("")
    }, [team, isOpen])

    // Fetch employees for lead picker
    React.useEffect(() => {
        if (!isOpen) return
        setLoadingEmp(true)
        EmployeeAPI.fetchEmployees(1, 100)
            .then(data => {
                const list = data.results || []
                setEmployees(Array.isArray(list) ? list as unknown as Employee[] : [])
            })
            .catch(() => {})
            .finally(() => setLoadingEmp(false))
    }, [isOpen])

    const filteredEmployees = React.useMemo(() => {
        if (!searchTerm.trim()) return employees
        const q = searchTerm.toLowerCase()
        return employees.filter(e =>
            `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
            e.email?.toLowerCase().includes(q) ||
            e.designation?.toLowerCase().includes(q)
        )
    }, [employees, searchTerm])

    const selectedLead = employees.find(e => e.id === leadId)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!name.trim()) { setError("Team name is required"); return }
        if (!leadId) { setError("Please select a team lead"); return }

        setSaving(true)
        try {
            const body = { name: name.trim(), description: description.trim() || null, leadId }
            if (isEdit) {
                await TeamAPI.update(team.id, body)
            } else {
                await TeamAPI.create(body)
            }

            onSaved()
        } catch (err: any) {
            setError(err.message || "Something went wrong")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit Team" : "Create Team"} className="max-w-2xl">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                    <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">
                        {error}
                    </div>
                )}

                {/* Team Name */}
                <div>
                    <label className="block text-sm font-medium text-text mb-1.5">Team Name *</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Engineering, Design, Marketing"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 placeholder:text-text-4"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-text mb-1.5">Description</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Brief description of the team's purpose"
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 placeholder:text-text-4 resize-none"
                    />
                </div>

                {/* Team Lead Selector */}
                <div>
                    <label className="block text-sm font-medium text-text mb-1.5">Team Lead *</label>

                    {/* Selected lead display */}
                    {selectedLead && (
                        <div className="flex items-center gap-2 p-2 mb-2 rounded-lg bg-accent/5 border border-accent/20">
                            <Avatar
                                src={selectedLead.avatarUrl}
                                name={`${selectedLead.firstName} ${selectedLead.lastName}`}
                                size="sm"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text truncate">
                                    {selectedLead.firstName} {selectedLead.lastName}
                                </p>
                                <p className="text-xs text-text-3 truncate">{selectedLead.designation}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setLeadId("")}
                                className="text-xs text-text-3 hover:text-danger transition-colors"
                            >
                                Change
                            </button>
                        </div>
                    )}

                    {/* Search + list */}
                    {!selectedLead && (
                        <>
                            <div className="relative mb-2">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-4" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Search employees..."
                                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 placeholder:text-text-4"
                                />
                            </div>
                            <div className="max-h-40 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                                {loadingEmp ? (
                                    <p className="p-3 text-sm text-text-3 text-center">Loading employees...</p>
                                ) : filteredEmployees.length === 0 ? (
                                    <p className="p-3 text-sm text-text-3 text-center">No employees found</p>
                                ) : (
                                    filteredEmployees.map(emp => (
                                        <button
                                            key={emp.id}
                                            type="button"
                                            onClick={() => { setLeadId(emp.id); setSearchTerm("") }}
                                            className="w-full flex items-center gap-2 p-2 hover:bg-bg-2 transition-colors text-left"
                                        >
                                            <Avatar
                                                src={emp.avatarUrl}
                                                name={`${emp.firstName} ${emp.lastName}`}
                                                size="xs"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-text truncate">{emp.firstName} {emp.lastName}</p>
                                                <p className="text-xs text-text-4 truncate">{emp.designation}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={saving}>
                        {isEdit ? "Save Changes" : "Create Team"}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
