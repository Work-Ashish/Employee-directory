"use client"

import * as React from "react"
import ReactFlow, {
    Node,
    Edge,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    BackgroundVariant,
    MiniMap,
    Position,
    Handle,
    Connection,
    addEdge,
    MarkerType,
} from "reactflow"
import dagre from "dagre"
import "reactflow/dist/style.css"
import { Avatar } from "@/components/ui/Avatar"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Spinner } from "@/components/ui/Spinner"
import { useAuth } from "@/context/AuthContext"
import { Roles } from "@/lib/permissions"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { PlusIcon, Pencil2Icon, TrashIcon } from "@radix-ui/react-icons"

/* ── Types ── */

interface OrgEmployee {
    id: string
    firstName: string
    lastName: string
    designation: string
    managerId: string | null
    avatarUrl: string | null
    employeeCode: string
    email: string
    phone?: string
    dateOfJoining?: string
    salary?: number
    status?: string
    departmentId?: string
    department: { id: string; name: string; color: string } | null
    user: { role: string } | null
}

interface Department {
    id: string
    name: string
    color: string
}

const employeeSchema = z.object({
    id: z.string().optional(),
    employeeCode: z.string().min(1, "Employee Code is required"),
    firstName: z.string().min(1, "First Name is required"),
    lastName: z.string().min(1, "Last Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    designation: z.string().min(1, "Designation is required"),
    departmentId: z.string().min(1, "Department is required"),
    dateOfJoining: z.string().min(1, "Date of Joining is required"),
    salary: z.number().min(0, "Salary must be positive"),
    status: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED"]),
    managerId: z.string().optional().nullable(),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

/* ── Dagre layout ── */

const NODE_WIDTH = 240
const NODE_HEIGHT = 110

function layoutGraph(nodes: Node[], edges: Edge[]): Node[] {
    const g = new dagre.graphlib.Graph()
    g.setDefaultEdgeLabel(() => ({}))
    g.setGraph({ rankdir: "TB", ranksep: 80, nodesep: 40 })

    nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
    edges.forEach((e) => g.setEdge(e.source, e.target))

    dagre.layout(g)

    return nodes.map((n) => {
        const pos = g.node(n.id)
        return {
            ...n,
            position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
        }
    })
}

/* ── Department colors ── */

const DEPT_COLORS: Record<string, string> = {}
const COLOR_PALETTE = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
    "#f97316", "#eab308", "#22c55e", "#14b8a6",
    "#06b6d4", "#3b82f6", "#a855f7", "#ef4444",
]

function getDeptColor(deptName: string): string {
    if (!DEPT_COLORS[deptName]) {
        const idx = Object.keys(DEPT_COLORS).length % COLOR_PALETTE.length
        DEPT_COLORS[deptName] = COLOR_PALETTE[idx]
    }
    return DEPT_COLORS[deptName]
}

/* ── Custom node ── */

const EmployeeNode = React.memo(function EmployeeNode({ data }: { data: OrgEmployee & { directReports: number; isAdmin: boolean; onEdit: () => void; onDelete: () => void; onAddChild: () => void } }) {
    const deptName = data.department?.name || "No Dept"
    const deptColor = data.department?.color || getDeptColor(deptName)
    const role = data.user?.role || ""
    const isCEO = role === "CEO"

    return (
        <div
            className="bg-surface border border-border rounded-xl shadow-lg px-4 py-3 min-w-[220px] transition-shadow hover:shadow-xl group relative"
            style={{ borderTopColor: deptColor, borderTopWidth: 3 }}
        >
            {data.isAdmin && <Handle type="target" position={Position.Top} className="!bg-text-4 !w-2 !h-2" />}

            <div className="flex items-center gap-3">
                <Avatar
                    name={`${data.firstName} ${data.lastName}`}
                    src={data.avatarUrl}
                    size="default"
                />
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-text text-sm truncate">
                        {data.firstName} {data.lastName}
                    </span>
                    <span className="text-xs text-text-3 truncate">{data.designation}</span>
                </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
                <Badge
                    variant="default"
                    size="sm"
                    className="truncate max-w-[120px]"
                    style={{ backgroundColor: `${deptColor}15`, color: deptColor, borderColor: `${deptColor}30` }}
                >
                    {deptName}
                </Badge>
                {isCEO && <Badge variant="purple" size="sm">CEO</Badge>}
                {data.directReports > 0 && (
                    <span className="text-[10px] text-text-4 font-medium ml-auto">
                        {data.directReports} report{data.directReports > 1 ? "s" : ""}
                    </span>
                )}
            </div>

            {/* Admin hover actions */}
            {data.isAdmin && (
                <div className="absolute -top-3 -right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-surface border border-border rounded-full shadow-sm p-1 z-10">
                    <button onClick={(e) => { e.stopPropagation(); data.onAddChild() }} className="p-1 hover:bg-accent/10 hover:text-accent rounded-full text-text-3 transition-colors" title="Add Direct Report">
                        <PlusIcon className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); data.onEdit() }} className="p-1 hover:bg-accent/10 hover:text-accent rounded-full text-text-3 transition-colors" title="Edit Employee">
                        <Pencil2Icon className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); data.onDelete() }} className="p-1 hover:bg-danger/10 hover:text-danger rounded-full text-text-3 transition-colors" title="Delete Employee">
                        <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {data.isAdmin && <Handle type="source" position={Position.Bottom} className="!bg-text-4 !w-2 !h-2" />}
        </div>
    )
})

const nodeTypes = { employee: EmployeeNode }

/* ── Page ── */

export default function OrgChartPage() {
    const { user, isLoading: authLoading } = useAuth()
    const [employees, setEmployees] = React.useState<OrgEmployee[]>([])
    const [departments, setDepartments] = React.useState<Department[]>([])
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)

    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])

    // Admin check
    const isAdmin = user?.role === Roles.CEO || user?.role === Roles.HR

    // Modal state
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [modalMode, setModalMode] = React.useState<"CREATE" | "EDIT">("CREATE")

    const form = useForm<EmployeeFormData>({
        resolver: zodResolver(employeeSchema),
        defaultValues: {
            status: "ACTIVE", employeeCode: "", firstName: "", lastName: "", email: "",
            phone: "", designation: "", departmentId: "", dateOfJoining: new Date().toISOString().split("T")[0],
            salary: 0, managerId: null,
        },
    })

    const openCreateModal = React.useCallback((managerIdPreselect: string | null = null) => {
        setModalMode("CREATE")
        form.reset({
            status: "ACTIVE",
            employeeCode: `EMP-ORG-${Date.now().toString().slice(-4)}`,
            firstName: "", lastName: "", email: "", phone: "", designation: "",
            departmentId: departments[0]?.id || "",
            dateOfJoining: new Date().toISOString().split("T")[0],
            salary: 0, managerId: managerIdPreselect,
        })
        setIsModalOpen(true)
    }, [departments, form])

    const openEditModal = React.useCallback((emp: OrgEmployee) => {
        setModalMode("EDIT")
        let doj = new Date().toISOString().split("T")[0]
        if (emp.dateOfJoining) {
            try { doj = new Date(emp.dateOfJoining).toISOString().split("T")[0] } catch { /* keep default */ }
        }
        form.reset({
            id: emp.id, employeeCode: emp.employeeCode || "", firstName: emp.firstName || "",
            lastName: emp.lastName || "", email: emp.email || "", phone: emp.phone || "",
            designation: emp.designation || "", departmentId: emp.departmentId || emp.department?.id || "",
            dateOfJoining: doj, salary: emp.salary || 0, status: (emp.status as any) || "ACTIVE",
            managerId: emp.managerId || null,
        })
        setIsModalOpen(true)
    }, [form])

    // Fetch data
    const fetchData = React.useCallback(async () => {
        try {
            setLoading(true)
            const [chartRes, deptRes] = await Promise.all([
                fetch("/api/org-chart"),
                fetch("/api/departments"),
            ])
            if (!chartRes.ok) throw new Error("Failed to load org chart data")
            const chartJson = await chartRes.json()
            const deptJson = deptRes.ok ? await deptRes.json() : { data: [] }
            setEmployees(chartJson.data || [])
            setDepartments(deptJson.data || deptJson || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    const handleDelete = React.useCallback(async (id: string, name: string) => {
        if (!window.confirm(`Delete ${name}? Their direct reports will be unlinked.`)) return
        try {
            const res = await fetch(`/api/employees/${id}`, { method: "DELETE" })
            if (res.ok) { toast.success("Employee deleted"); fetchData() }
            else toast.error("Failed to delete employee")
        } catch { toast.error("An error occurred") }
    }, [fetchData])

    const onSubmit = async (data: EmployeeFormData) => {
        try {
            const isEdit = modalMode === "EDIT"
            const payload: any = { ...data }
            if (payload.managerId === "") payload.managerId = null
            const res = await fetch(isEdit ? `/api/employees/${data.id}` : "/api/employees", {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            if (res.ok) {
                toast.success(`Employee ${isEdit ? "updated" : "created"} successfully`)
                setIsModalOpen(false)
                fetchData()
            } else {
                const err = await res.json()
                toast.error(err.error || "Operation failed")
            }
        } catch { toast.error("An error occurred") }
    }

    React.useEffect(() => {
        if (!authLoading) fetchData()
    }, [authLoading, fetchData])

    // Build graph when employees change
    const buildGraph = React.useCallback(() => {
        if (employees.length === 0) { setNodes([]); setEdges([]); return }

        const reportCounts: Record<string, number> = {}
        employees.forEach((e) => {
            if (e.managerId) reportCounts[e.managerId] = (reportCounts[e.managerId] || 0) + 1
        })

        const rawNodes: Node[] = employees.map((e) => ({
            id: e.id,
            type: "employee",
            data: {
                ...e,
                directReports: reportCounts[e.id] || 0,
                isAdmin,
                onEdit: () => openEditModal(e),
                onDelete: () => handleDelete(e.id, `${e.firstName} ${e.lastName}`),
                onAddChild: () => openCreateModal(e.id),
            },
            position: { x: 0, y: 0 },
        }))

        const rawEdges: Edge[] = employees
            .filter((e) => e.managerId)
            .map((e) => ({
                id: `${e.managerId}-${e.id}`,
                source: e.managerId!,
                target: e.id,
                type: isAdmin ? "smoothstep" : "default",
                style: { stroke: "var(--border)", strokeWidth: 2 },
                animated: isAdmin,
                ...(isAdmin ? { markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "var(--border)" } } : {}),
            }))

        const laid = layoutGraph(rawNodes, rawEdges)
        setNodes(laid)
        setEdges(rawEdges)
    }, [employees, isAdmin, setNodes, setEdges, openEditModal, handleDelete, openCreateModal])

    React.useEffect(() => { buildGraph() }, [buildGraph])

    // Drag-to-connect for admins (reassign manager)
    const onConnect = React.useCallback(async (params: Connection) => {
        if (!isAdmin) return
        setEdges((eds) => addEdge({
            ...params, type: "smoothstep", animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--border)" },
        }, eds))
        try {
            await fetch("/api/organization", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify([{ id: params.target, managerId: params.source }]),
            })
            toast.success("Manager updated!")
            fetchData()
        } catch { toast.error("Failed to update manager") }
    }, [isAdmin, setEdges, fetchData])

    if (!user || authLoading) return null

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh] gap-2 text-text-3">
                <Spinner /> Loading org chart...
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <p className="text-danger font-medium">{error}</p>
                    <button onClick={() => { setError(null); fetchData() }} className="mt-2 text-sm text-accent hover:underline">Retry</button>
                </div>
            </div>
        )
    }

    if (employees.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-text-3">
                <p>No employees found for the org chart.</p>
                {isAdmin && <Button onClick={() => openCreateModal(null)} leftIcon={<PlusIcon className="w-4 h-4" />}>Add First Employee</Button>}
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-surface/50 backdrop-blur-sm flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-text">Organization Chart</h1>
                    <p className="text-sm text-text-3 mt-0.5">
                        {employees.length} employee{employees.length !== 1 ? "s" : ""}
                        {isAdmin && " \u2014 drag connections to change managers"}
                    </p>
                </div>
                {isAdmin && (
                    <div className="flex gap-2">
                        <Button onClick={() => openCreateModal(null)} leftIcon={<PlusIcon className="w-4 h-4" />}>
                            Add Employee
                        </Button>
                        <Button variant="secondary" onClick={buildGraph}>
                            Auto Layout
                        </Button>
                    </div>
                )}
            </div>

            {/* Chart */}
            <div className="flex-1">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={isAdmin ? onConnect : undefined}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    minZoom={0.2}
                    maxZoom={1.5}
                    proOptions={{ hideAttribution: true }}
                    nodesDraggable={isAdmin}
                    nodesConnectable={isAdmin}
                >
                    <Controls className="!bg-surface !border-border !shadow-lg [&>button]:!bg-surface [&>button]:!border-border [&>button]:!text-text-3 [&>button:hover]:!bg-bg-2" />
                    <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
                    <MiniMap
                        nodeColor={(n) => n.data?.department?.color || "#6366f1"}
                        maskColor="rgba(0,0,0,0.1)"
                        className="!bg-surface !border-border !shadow-lg"
                    />
                </ReactFlow>
            </div>

            {/* Employee Form Modal (admins only) */}
            {isAdmin && (
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={modalMode === "CREATE" ? "Add New Employee" : "Edit Employee"}
                >
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="First Name *" {...form.register("firstName")} error={form.formState.errors.firstName?.message} />
                            <Input label="Last Name *" {...form.register("lastName")} error={form.formState.errors.lastName?.message} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Email *" type="email" {...form.register("email")} error={form.formState.errors.email?.message} />
                            <Input label="Designation *" {...form.register("designation")} error={form.formState.errors.designation?.message} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-text-2">Department *</label>
                                <select {...form.register("departmentId")} className="input-base">
                                    <option value="">Select Department...</option>
                                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                                {form.formState.errors.departmentId && <span className="text-xs text-danger">{form.formState.errors.departmentId.message}</span>}
                            </div>
                            <Input label="Salary *" type="number" {...form.register("salary", { valueAsNumber: true })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Employee Code *" {...form.register("employeeCode")} error={form.formState.errors.employeeCode?.message} />
                            <Input label="Date of Joining *" type="date" {...form.register("dateOfJoining")} />
                        </div>
                        <input type="hidden" {...form.register("managerId")} />
                        <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border">
                            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="submit" loading={form.formState.isSubmitting}>
                                {modalMode === "CREATE" ? "Create Employee" : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    )
}
