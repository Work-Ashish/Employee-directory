"use client"

import * as React from "react"
import { toast } from "sonner"
import { extractArray } from "@/lib/utils"
import { api, apiClient } from "@/lib/api-client"
import { RoleAPI } from "@/features/roles/api/client"
import { EmployeeAPI } from "@/features/employees/api/client"
import { Module, Action } from "@/lib/permissions"
import { PageHeader } from "@/components/ui/PageHeader"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Dialog, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/Dialog"
import { Spinner } from "@/components/ui/Spinner"
import { EmptyState } from "@/components/ui/EmptyState"
import { PlusIcon, Pencil1Icon, TrashIcon, PersonIcon, MixIcon, DashboardIcon } from "@radix-ui/react-icons"

/* ── Types ───────────────────────────────────────── */

interface RoleCapability {
    id: string
    module: string
    actions: string[]
}

interface FunctionalRole {
    id: string
    name: string
    description: string | null
    level: number
    parentRoleId: string | null
    isActive: boolean
    parentRole: { id: string; name: string } | null
    capabilities: RoleCapability[]
    _count: { employees: number; childRoles: number }
}

interface EmployeeOption {
    id: string
    firstName: string
    lastName: string
    email: string
    designation: string
}

const ALL_MODULES = Object.values(Module)
const ALL_ACTIONS = Object.values(Action)

/* ── Component ───────────────────────────────────── */

export function RoleManagement() {
    const [roles, setRoles] = React.useState<FunctionalRole[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [editRole, setEditRole] = React.useState<FunctionalRole | null>(null)
    const [showCreate, setShowCreate] = React.useState(false)
    const [assignRole, setAssignRole] = React.useState<FunctionalRole | null>(null)
    const [employees, setEmployees] = React.useState<EmployeeOption[]>([])
    const [viewMode, setViewMode] = React.useState<"grid" | "tree">("grid")

    const fetchRoles = React.useCallback(async () => {
        try {
            const data = await RoleAPI.list()
            setRoles(extractArray<FunctionalRole>(data))
        } catch {
            toast.error("Failed to load roles")
        } finally {
            setIsLoading(false)
        }
    }, [])

    const fetchEmployees = React.useCallback(async () => {
        try {
            const data = await EmployeeAPI.fetchEmployees(1, 500)
            setEmployees(extractArray<EmployeeOption>(data))
        } catch { /* non-critical */ }
    }, [])

    React.useEffect(() => { fetchRoles(); fetchEmployees() }, [fetchRoles, fetchEmployees])

    const handleDelete = async (role: FunctionalRole) => {
        if (!confirm(`Delete role "${role.name}"? This will unassign all employees.`)) return
        try {
            await RoleAPI.delete(role.id)
            toast.success("Role deleted")
            fetchRoles()
        } catch (error: any) {
            toast.error(error?.data?.error?.message || error.message || "Failed to delete role")
        }
    }

    return (
        <div className="space-y-6 max-w-[1200px] mx-auto p-6 animate-in fade-in duration-500">
            <PageHeader
                title="Functional Roles"
                description="Create and manage functional roles with granular capabilities for employees."
                actions={
                    <div className="flex items-center gap-2">
                        <div className="flex border border-border rounded-md overflow-hidden">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${viewMode === "grid" ? "bg-accent/10 text-accent" : "text-text-3 hover:text-text"}`}
                            >
                                <DashboardIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setViewMode("tree")}
                                className={`px-2.5 py-1.5 text-xs font-medium transition-colors border-l border-border ${viewMode === "tree" ? "bg-accent/10 text-accent" : "text-text-3 hover:text-text"}`}
                            >
                                <MixIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <Button leftIcon={<PlusIcon className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
                            New Role
                        </Button>
                    </div>
                }
            />

            {isLoading ? (
                <div className="flex justify-center py-20"><Spinner size="lg" /></div>
            ) : roles.length === 0 ? (
                <EmptyState
                    title="No functional roles defined yet"
                    action={<Button variant="secondary" onClick={() => setShowCreate(true)}>Create First Role</Button>}
                    className="border-2 border-dashed border-border rounded-2xl bg-surface"
                />
            ) : viewMode === "tree" ? (
                <RoleHierarchyTree
                    roles={roles}
                    onEdit={setEditRole}
                    onAssign={setAssignRole}
                    onDelete={handleDelete}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {roles.map((role) => (
                        <Card key={role.id} className="p-5 hover:border-accent/30 transition-colors">
                            <CardContent className="p-0 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-base font-semibold text-text">{role.name}</h3>
                                        <p className="text-sm text-text-3 mt-0.5 line-clamp-2">
                                            {role.description || "No description"}
                                        </p>
                                    </div>
                                    <Badge variant="neutral" size="sm">Lv.{role.level}</Badge>
                                </div>

                                {role.parentRole && (
                                    <div className="text-xs text-text-3">
                                        Inherits from: <span className="font-medium text-text-2">{role.parentRole.name}</span>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-1.5">
                                    {role.capabilities.slice(0, 4).map((cap) => (
                                        <Badge key={cap.id} variant="default" size="sm">
                                            {cap.module} ({cap.actions.length})
                                        </Badge>
                                    ))}
                                    {role.capabilities.length > 4 && (
                                        <Badge variant="neutral" size="sm">+{role.capabilities.length - 4} more</Badge>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-border">
                                    <div className="flex items-center gap-1.5 text-sm text-text-3">
                                        <PersonIcon className="w-3.5 h-3.5" />
                                        <span>{role._count.employees} assigned</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => setAssignRole(role)}>
                                            Assign
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => setEditRole(role)}>
                                            <Pencil1Icon className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(role)}>
                                            <TrashIcon className="w-3.5 h-3.5 text-danger" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <RoleFormDialog
                open={showCreate || !!editRole}
                onClose={() => { setShowCreate(false); setEditRole(null) }}
                role={editRole}
                roles={roles}
                onSaved={fetchRoles}
            />

            {/* Assign Dialog */}
            <AssignDialog
                open={!!assignRole}
                onClose={() => setAssignRole(null)}
                role={assignRole}
                employees={employees}
                onSaved={fetchRoles}
            />
        </div>
    )
}

/* ── Role Hierarchy Tree ─────────────────────────── */

interface TreeNodeData {
    role: FunctionalRole
    children: TreeNodeData[]
}

function buildTree(roles: FunctionalRole[]): TreeNodeData[] {
    const map = new Map<string, TreeNodeData>()
    for (const role of roles) {
        map.set(role.id, { role, children: [] })
    }
    const roots: TreeNodeData[] = []
    for (const node of map.values()) {
        if (node.role.parentRoleId && map.has(node.role.parentRoleId)) {
            map.get(node.role.parentRoleId)!.children.push(node)
        } else {
            roots.push(node)
        }
    }
    // Sort by level desc, then name
    const sortNodes = (nodes: TreeNodeData[]) => {
        nodes.sort((a, b) => b.role.level - a.role.level || a.role.name.localeCompare(b.role.name))
        for (const n of nodes) sortNodes(n.children)
    }
    sortNodes(roots)
    return roots
}

function RoleHierarchyTree({
    roles,
    onEdit,
    onAssign,
    onDelete,
}: {
    roles: FunctionalRole[]
    onEdit: (r: FunctionalRole) => void
    onAssign: (r: FunctionalRole) => void
    onDelete: (r: FunctionalRole) => void
}) {
    const tree = React.useMemo(() => buildTree(roles), [roles])

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Role Hierarchy</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                {tree.length === 0 ? (
                    <p className="text-sm text-text-3 text-center py-4">No roles to display</p>
                ) : (
                    <div className="space-y-1">
                        {tree.map((node) => (
                            <TreeNode key={node.role.id} node={node} depth={0} onEdit={onEdit} onAssign={onAssign} onDelete={onDelete} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function TreeNode({
    node,
    depth,
    onEdit,
    onAssign,
    onDelete,
}: {
    node: TreeNodeData
    depth: number
    onEdit: (r: FunctionalRole) => void
    onAssign: (r: FunctionalRole) => void
    onDelete: (r: FunctionalRole) => void
}) {
    const [expanded, setExpanded] = React.useState(true)
    const { role } = node
    const hasChildren = node.children.length > 0

    return (
        <div>
            <div
                className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent/[0.04] transition-colors group"
                style={{ paddingLeft: `${depth * 24 + 8}px` }}
            >
                {/* Expand toggle */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className={`w-5 h-5 flex items-center justify-center text-text-3 ${hasChildren ? "cursor-pointer hover:text-text" : "invisible"}`}
                >
                    <svg className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} viewBox="0 0 8 8" fill="currentColor">
                        <path d="M2 1l4 3-4 3z" />
                    </svg>
                </button>

                {/* Role info */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="font-medium text-sm text-text truncate">{role.name}</span>
                    <Badge variant="neutral" size="sm">Lv.{role.level}</Badge>
                    <span className="text-xs text-text-3">{role._count.employees} members</span>
                    {role.capabilities.length > 0 && (
                        <span className="text-xs text-text-4">{role.capabilities.length} capabilities</span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => onAssign(role)}>
                        <PersonIcon className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(role)}>
                        <Pencil1Icon className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(role)}>
                        <TrashIcon className="w-3 h-3 text-danger" />
                    </Button>
                </div>
            </div>

            {/* Children */}
            {expanded && hasChildren && (
                <div className="relative">
                    <div
                        className="absolute top-0 bottom-0 w-px bg-border"
                        style={{ left: `${depth * 24 + 18}px` }}
                    />
                    {node.children.map((child) => (
                        <TreeNode key={child.role.id} node={child} depth={depth + 1} onEdit={onEdit} onAssign={onAssign} onDelete={onDelete} />
                    ))}
                </div>
            )}
        </div>
    )
}

/* ── Role Form Dialog ────────────────────────────── */

function RoleFormDialog({
    open,
    onClose,
    role,
    roles,
    onSaved,
}: {
    open: boolean
    onClose: () => void
    role: FunctionalRole | null
    roles: FunctionalRole[]
    onSaved: () => void
}) {
    const [name, setName] = React.useState("")
    const [description, setDescription] = React.useState("")
    const [level, setLevel] = React.useState(0)
    const [parentRoleId, setParentRoleId] = React.useState("")
    const [capabilities, setCapabilities] = React.useState<Record<string, Set<string>>>({})
    const [saving, setSaving] = React.useState(false)

    React.useEffect(() => {
        if (role) {
            setName(role.name)
            setDescription(role.description || "")
            setLevel(role.level)
            setParentRoleId(role.parentRoleId || "")
            const caps: Record<string, Set<string>> = {}
            for (const cap of role.capabilities) {
                caps[cap.module] = new Set(cap.actions)
            }
            setCapabilities(caps)
        } else {
            setName("")
            setDescription("")
            setLevel(0)
            setParentRoleId("")
            setCapabilities({})
        }
    }, [role, open])

    const toggleAction = (module: string, action: string) => {
        setCapabilities((prev) => {
            const next = { ...prev }
            if (!next[module]) next[module] = new Set()
            const s = new Set(next[module])
            if (s.has(action)) s.delete(action)
            else s.add(action)
            if (s.size === 0) delete next[module]
            else next[module] = s
            return next
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        const capsArray = Object.entries(capabilities).map(([module, actions]) => ({
            module,
            actions: Array.from(actions),
        }))

        const body = {
            name,
            description: description || null,
            level,
            parentRoleId: parentRoleId || null,
            capabilities: capsArray,
        }

        try {
            if (role) {
                await RoleAPI.update(role.id, body)
            } else {
                await RoleAPI.create(body)
            }
            toast.success(role ? "Role updated" : "Role created")
            onClose()
            onSaved()
        } catch (error: any) {
            toast.error(error?.data?.error?.message || error.message || "Failed to save role")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onClose={onClose} size="full">
            <DialogHeader>
                <DialogTitle>{role ? "Edit Role" : "Create Functional Role"}</DialogTitle>
            </DialogHeader>
            <DialogBody>
                <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
                    {/* Basic fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text mb-1">Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                placeholder="e.g. Sourcing Specialist"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text mb-1">Level</label>
                            <input
                                type="number"
                                value={level}
                                onChange={(e) => setLevel(Number(e.target.value))}
                                min={0}
                                max={10}
                                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 rounded-md border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                            placeholder="Brief description of this role's purpose"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text mb-1">Parent Role (inherits capabilities)</label>
                        <select
                            value={parentRoleId}
                            onChange={(e) => setParentRoleId(e.target.value)}
                            className="w-full px-3 py-2 rounded-md border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                            <option value="">None</option>
                            {roles
                                .filter((r) => r.id !== role?.id)
                                .map((r) => (
                                    <option key={r.id} value={r.id}>{r.name} (Lv.{r.level})</option>
                                ))}
                        </select>
                    </div>

                    {/* Capabilities grid */}
                    <div>
                        <h3 className="text-sm font-semibold text-text mb-3">Capabilities (Module x Action)</h3>
                        <div className="overflow-x-auto border border-border rounded-lg">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-surface-2">
                                        <th className="px-3 py-2 text-left font-medium text-text-3 sticky left-0 bg-surface-2">Module</th>
                                        {ALL_ACTIONS.map((a) => (
                                            <th key={a} className="px-2 py-2 text-center font-medium text-text-3 text-xs">{a}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {ALL_MODULES.map((mod) => (
                                        <tr key={mod} className="border-b border-border/30 last:border-0 hover:bg-accent/[0.02]">
                                            <td className="px-3 py-1.5 font-mono text-xs text-text-2 sticky left-0 bg-surface">{mod}</td>
                                            {ALL_ACTIONS.map((action) => (
                                                <td key={action} className="px-2 py-1.5 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={capabilities[mod]?.has(action) ?? false}
                                                        onChange={() => toggleAction(mod, action)}
                                                        className="w-4 h-4 rounded border-border text-accent focus:ring-accent cursor-pointer"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button type="submit" disabled={saving || !name.trim()}>
                            {saving ? <Spinner size="sm" className="mr-2" /> : null}
                            {role ? "Update Role" : "Create Role"}
                        </Button>
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    </div>
                </form>
            </DialogBody>
        </Dialog>
    )
}

/* ── Assign Dialog ───────────────────────────────── */

function AssignDialog({
    open,
    onClose,
    role,
    employees,
    onSaved,
}: {
    open: boolean
    onClose: () => void
    role: FunctionalRole | null
    employees: EmployeeOption[]
    onSaved: () => void
}) {
    const [selected, setSelected] = React.useState<Set<string>>(new Set())
    const [saving, setSaving] = React.useState(false)
    const [search, setSearch] = React.useState("")
    const [assigned, setAssigned] = React.useState<Set<string>>(new Set())

    // Load currently assigned employees when opening
    React.useEffect(() => {
        if (!role || !open) return
        async function loadAssigned() {
            try {
                const data = await RoleAPI.get(role!.id) as any
                const ids = new Set<string>((data.employees || []).map((e: any) => e.employeeId || e.employee?.id))
                setAssigned(ids)
                setSelected(ids)
            } catch { /* non-critical */ }
        }
        loadAssigned()
    }, [role, open])

    const filtered = employees.filter((e) => {
        const q = search.toLowerCase()
        return (
            e.firstName.toLowerCase().includes(q) ||
            e.lastName.toLowerCase().includes(q) ||
            e.email.toLowerCase().includes(q) ||
            e.designation.toLowerCase().includes(q)
        )
    })

    const toggleEmployee = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleSave = async () => {
        if (!role) return
        setSaving(true)

        try {
            // Determine adds and removes
            const toAdd = [...selected].filter((id) => !assigned.has(id))
            const toRemove = [...assigned].filter((id) => !selected.has(id))

            if (toAdd.length > 0) {
                await api.post("/roles/" + role.id + "/assign/", { employeeIds: toAdd })
            }
            if (toRemove.length > 0) {
                await apiClient("/roles/" + role.id + "/assign/", {
                    method: "DELETE",
                    body: JSON.stringify({ employeeIds: toRemove }),
                })
            }

            toast.success(`Updated assignments for ${role.name}`)
            onClose()
            onSaved()
        } catch {
            toast.error("Failed to update assignments")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onClose={onClose} size="lg">
            <DialogHeader>
                <DialogTitle>Assign Employees to {role?.name}</DialogTitle>
            </DialogHeader>
            <DialogBody>
                <div className="space-y-4">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search employees..."
                        className="w-full px-3 py-2 rounded-md border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />

                    <div className="max-h-[400px] overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                        {filtered.length === 0 ? (
                            <p className="text-sm text-text-3 text-center py-4">No employees found</p>
                        ) : (
                            filtered.map((emp) => (
                                <label
                                    key={emp.id}
                                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/[0.04] cursor-pointer transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.has(emp.id)}
                                        onChange={() => toggleEmployee(emp.id)}
                                        className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-text truncate">
                                            {emp.firstName} {emp.lastName}
                                        </div>
                                        <div className="text-xs text-text-3 truncate">
                                            {emp.designation} &middot; {emp.email}
                                        </div>
                                    </div>
                                    {assigned.has(emp.id) && (
                                        <Badge variant="default" size="sm">Assigned</Badge>
                                    )}
                                </label>
                            ))
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <span className="text-sm text-text-3">{selected.size} selected</span>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={onClose}>Cancel</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? <Spinner size="sm" className="mr-2" /> : null}
                                Save Assignments
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogBody>
        </Dialog>
    )
}
