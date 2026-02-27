"use client"

import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    Handle,
    Position,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { cn } from '@/lib/utils';
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import dagre from 'dagre';
import { toast, Toaster } from 'react-hot-toast';
import { Modal } from "@/components/ui/Modal"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { PlusIcon, Pencil2Icon, TrashIcon } from "@radix-ui/react-icons"

// ----------------------------------------------------------------------------
// Zod Schema for Validation
// ----------------------------------------------------------------------------
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

export type Department = {
    id: string
    name: string
    color: string
}

// Custom Node Component
const CustomNode = ({ data }: any) => {
    return (
        <div className={cn(
            "relative px-4 py-3 rounded-xl border bg-[var(--surface)] shadow-lg min-w-[200px] transition-all duration-200 hover:shadow-xl hover:border-[var(--accent)] group",
            data.isRoot ? "border-[var(--accent)] bg-[rgba(0,122,255,0.05)]" : "border-[var(--border)]"
        )}>
            <Handle type="target" position={Position.Top} className="!bg-[var(--text4)] !w-2 !h-2" />

            <div className="flex items-center gap-3">
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0 bg-gradient-to-br shadow-sm",
                    data.gradient || "from-[var(--text3)] to-[var(--text4)]"
                )}>
                    {data.initials}
                </div>
                <div className="flex flex-col">
                    <div className="text-[14px] font-bold text-[var(--text)]">{data.label}</div>
                    <div className="text-[11px] text-[var(--text3)] font-medium">{data.role}</div>
                </div>
            </div>

            {/* Hover Actions */}
            <div className="absolute -top-3 -right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--surface)] border border-[var(--border)] rounded-full shadow-sm p-1 z-10">
                <button onClick={(e) => { e.stopPropagation(); data.onAddChild(); }} className="p-1 hover:bg-[rgba(0,122,255,0.1)] hover:text-[var(--accent)] rounded-full text-[var(--text3)] transition-colors" title="Add Direct Report">
                    <PlusIcon className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); data.onEdit(); }} className="p-1 hover:bg-[rgba(0,122,255,0.1)] hover:text-[var(--accent)] rounded-full text-[var(--text3)] transition-colors" title="Edit Employee">
                    <Pencil2Icon className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); data.onDelete(); }} className="p-1 hover:bg-[rgba(255,59,48,0.1)] hover:text-[var(--red)] rounded-full text-[var(--text3)] transition-colors" title="Delete Employee">
                    <TrashIcon className="w-3.5 h-3.5" />
                </button>
            </div>

            <Handle type="source" position={Position.Bottom} className="!bg-[var(--text4)] !w-2 !h-2" />
        </div>
    );
};

const nodeTypes = {
    custom: CustomNode,
};

// Layout generator
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Ensure direction is passed properly
    dagreGraph.setGraph({ rankdir: direction, ranker: 'network-simplex', marginx: 50, marginy: 50 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 250, height: 100 }); // give a little more vertical space for nodes
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = Position.Top;
        node.sourcePosition = Position.Bottom;

        // Shift coordinates back to top left vs center
        node.position = {
            x: nodeWithPosition.x - 250 / 2,
            y: nodeWithPosition.y - 100 / 2,
        };
        return node;
    });

    return { nodes, edges };
};

export default function Organization() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [departments, setDepartments] = useState<Department[]>([])

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<"CREATE" | "EDIT">("CREATE")

    const form = useForm<EmployeeFormData>({
        resolver: zodResolver(employeeSchema),
        defaultValues: {
            status: "ACTIVE",
            employeeCode: "",
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            designation: "",
            departmentId: "",
            dateOfJoining: new Date().toISOString().split('T')[0],
            salary: 0,
            managerId: null
        }
    })

    const openCreateModal = (managerIdPreselect: string | null = null) => {
        setModalMode("CREATE")
        form.reset({
            status: "ACTIVE",
            employeeCode: `EMP-ORG-${Date.now().toString().slice(-4)}`,
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            designation: "",
            departmentId: departments[0]?.id || "",
            dateOfJoining: new Date().toISOString().split('T')[0],
            salary: 0,
            managerId: managerIdPreselect
        })
        setIsModalOpen(true)
    }

    const openEditModal = (empRaw: any) => {
        setModalMode("EDIT")

        // Defensive date parsing
        let doj = new Date().toISOString().split('T')[0]
        if (empRaw.dateOfJoining) {
            try {
                doj = new Date(empRaw.dateOfJoining).toISOString().split('T')[0]
            } catch (e) {
                console.error("Failed to parse date", e)
            }
        }

        form.reset({
            id: empRaw.id,
            employeeCode: empRaw.employeeCode || "",
            firstName: empRaw.firstName || "",
            lastName: empRaw.lastName || "",
            email: empRaw.email || "",
            phone: empRaw.phone || "",
            designation: empRaw.designation || "",
            departmentId: empRaw.departmentId || empRaw.department?.id || "",
            dateOfJoining: doj,
            salary: empRaw.salary || 0,
            status: (empRaw.status as any) || "ACTIVE",
            managerId: empRaw.managerId || null
        })
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete ${name}? This will also un-link any direct reports they have!`)) return

        try {
            const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Employee deleted successfully')
                fetchData()
            } else {
                toast.error('Failed to delete employee')
            }
        } catch (error) {
            toast.error('An error occurred')
        }
    }

    const onSubmit = async (data: EmployeeFormData) => {
        try {
            const isEdit = modalMode === "EDIT"
            const url = isEdit ? `/api/employees/${data.id}` : '/api/employees'
            const method = isEdit ? 'PUT' : 'POST'

            const payload: any = { ...data }

            // Convert empty string managerId to null
            if (payload.managerId === "") {
                payload.managerId = null
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                toast.success(`Employee ${isEdit ? 'updated' : 'created'} successfully`)
                setIsModalOpen(false)
                fetchData() // Refresh chart
            } else {
                const err = await res.json()
                toast.error(err.error || 'Operation failed')
            }
        } catch (error) {
            toast.error('An error occurred')
        }
    }

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [orgRes, deptRes] = await Promise.all([
                fetch('/api/organization'),
                fetch('/api/departments')
            ])

            if (!orgRes.ok || !deptRes.ok) throw new Error("API responded with an error")

            const orgPayload = await orgRes.json();
            const deptPayload = await deptRes.json();

            const employees = orgPayload.data || orgPayload || [];
            const depts = deptPayload.data || deptPayload || [];
            setDepartments(depts)

            let newNodes: Node[] = [];
            let newEdges: Edge[] = [];

            if (employees && employees.length > 0) {
                newNodes = employees.map((emp: any) => ({
                    id: emp.id,
                    type: 'custom',
                    position: { x: 0, y: 0 },
                    data: {
                        label: `${emp.firstName} ${emp.lastName}`,
                        role: emp.designation,
                        initials: `${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}`,
                        gradient: emp.department?.color
                            ? `from-[${emp.department.color}] to-[#000000]` // Simple gradient fallback
                            : 'from-[#6366f1] to-[#4f46e5]',
                        isRoot: !emp.managerId,
                        // Callbacks
                        onEdit: () => openEditModal(emp),
                        onDelete: () => handleDelete(emp.id, `${emp.firstName} ${emp.lastName}`),
                        onAddChild: () => openCreateModal(emp.id),
                    }
                }));

                newEdges = employees
                    .filter((emp: any) => emp.managerId)
                    .map((emp: any) => ({
                        id: `e${emp.managerId}-${emp.id}`,
                        source: emp.managerId,
                        target: emp.id,
                        type: 'smoothstep',
                        animated: true,
                        style: { stroke: 'var(--text4)' },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            width: 20,
                            height: 20,
                            color: 'var(--text4)',
                        },
                    }));

                // Auto Layout
                const layouted = getLayoutedElements(newNodes, newEdges);
                setNodes(layouted.nodes);
                setEdges(layouted.edges);
            } else {
                setNodes([]);
                setEdges([]);
            }
        } catch (error) {
            console.error("Failed to load organization", error);
            toast.error("Failed to load chart data");
        } finally {
            setIsLoading(false);
        }
    }, [setNodes, setEdges]);

    useEffect(() => {
        if (!authLoading && user?.role === 'EMPLOYEE') {
            router.push('/')
        } else if (!authLoading) {
            fetchData();
        }
    }, [user, authLoading, router, fetchData])

    const onConnect = useCallback(async (params: Connection) => {
        setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--text4)' } }, eds));

        try {
            // Update the target node's manager to be the source node
            await fetch('/api/organization', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([{ id: params.target, managerId: params.source }])
            });
            toast.success("Organization map updated!");
            fetchData(); // Refresh layout to auto-range the dragged node under its new manager
        } catch (error) {
            toast.error("Failed to update manager");
        }
    }, [setEdges, fetchData]);

    if (authLoading || isLoading || user?.role === 'EMPLOYEE') {
        return <div className="p-8 text-center text-[var(--text3)]">Loading Chart...</div>
    }

    return (
        <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-40px)] w-full rounded-xl overflow-hidden border border-[var(--border)] shadow-sm bg-[var(--surface)] animate-in fade-in duration-300 relative">
            <Toaster position="top-right" />
            <div className="absolute top-4 left-4 z-10 glass px-3 py-1.5 md:px-4 md:py-2 pointer-events-none rounded-lg">
                <h1 className="text-[14px] md:text-[16px] font-extrabold text-[var(--text)]">Organization Chart</h1>
                <p className="text-[11px] md:text-[12px] text-[var(--text3)]">Drag connections to change managers</p>
            </div>

            <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                    onClick={() => openCreateModal(null)}
                    className="flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-[0_2px_8px_rgba(0,122,255,0.25)] hover:opacity-90 transition-opacity"
                >
                    <PlusIcon className="w-4 h-4" /> Add Employee
                </button>
                <button
                    onClick={fetchData}
                    className="bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] px-4 py-2 rounded-lg text-sm shadow-sm hover:bg-[var(--bg2)] transition-colors"
                >
                    Auto Layout
                </button>
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-right"
                className="bg-[var(--bg2)]"
            >
                <Controls className="!bg-[var(--surface)] !border-[var(--border)] !shadow-sm [&>button]:!border-b-[var(--border)] [&>button]:!fill-[var(--text2)] hover:[&>button]:!bg-[var(--bg)]" />
                <MiniMap
                    className="hidden md:block !bg-[var(--surface)] !border-[var(--border)] !shadow-sm rounded-lg overflow-hidden"
                    nodeColor={(n) => {
                        if (n.data?.isRoot) return 'var(--accent)';
                        return 'var(--text4)';
                    }}
                    maskColor="rgba(0,0,0,0.05)"
                />
                <Background color="#000000" gap={16} size={1} className="opacity-[0.03]" />
            </ReactFlow>

            {/* Employee Form Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalMode === "CREATE" ? "Add New Employee" : "Edit Employee"}
            >
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">First Name *</label>
                            <input
                                {...form.register('firstName')}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                            {form.formState.errors.firstName && <span className="text-[11px] text-red-500">{form.formState.errors.firstName.message}</span>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Last Name *</label>
                            <input
                                {...form.register('lastName')}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                            {form.formState.errors.lastName && <span className="text-[11px] text-red-500">{form.formState.errors.lastName.message}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Email *</label>
                            <input
                                type="email"
                                {...form.register('email')}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                            {form.formState.errors.email && <span className="text-[11px] text-red-500">{form.formState.errors.email.message}</span>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Designation *</label>
                            <input
                                {...form.register('designation')}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Department *</label>
                            <select
                                {...form.register('departmentId')}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            >
                                <option value="">Select Department...</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                            {form.formState.errors.departmentId && <span className="text-[11px] text-red-500">{form.formState.errors.departmentId.message}</span>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Salary *</label>
                            <input
                                type="number"
                                {...form.register('salary', { valueAsNumber: true })}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Employee Code *</label>
                            <input
                                {...form.register('employeeCode')}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Date Of Joining *</label>
                            <input
                                type="date"
                                {...form.register('dateOfJoining')}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    </div>

                    {/* Hidden Field for Pre-populating Manager relationships on creation */}
                    <input type="hidden" {...form.register('managerId')} />

                    <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-[var(--border)]">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-[13px] font-semibold bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg2)] text-[var(--text2)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.formState.isSubmitting}
                            className="px-4 py-2 text-[13px] font-semibold text-white bg-[var(--accent)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {form.formState.isSubmitting ? "Saving..." : modalMode === "CREATE" ? "Create Node" : "Save Changes"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
