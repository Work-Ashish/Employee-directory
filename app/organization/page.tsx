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
import { Roles } from "@/lib/permissions"
import { useRouter } from "next/navigation"
import dagre from 'dagre';
import { toast } from 'sonner';
import { Modal } from "@/components/ui/Modal"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { PlusIcon, Pencil2Icon, TrashIcon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Spinner } from "@/components/ui/Spinner"

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
            "relative px-4 py-3 rounded-xl border bg-surface shadow-lg min-w-[200px] transition-all duration-200 hover:shadow-xl hover:border-accent group",
            data.isRoot ? "border-accent bg-accent/5" : "border-border"
        )}>
            <Handle type="target" position={Position.Top} className="!bg-text-4 !w-2 !h-2" />

            <div className="flex items-center gap-3">
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0 bg-gradient-to-br shadow-sm",
                    data.gradient || "from-text-3 to-text-4"
                )}>
                    {data.initials}
                </div>
                <div className="flex flex-col">
                    <div className="text-sm font-bold text-text">{data.label}</div>
                    <div className="text-[11px] text-text-3 font-medium">{data.role}</div>
                </div>
            </div>

            {/* Hover Actions */}
            <div className="absolute -top-3 -right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-surface border border-border rounded-full shadow-sm p-1 z-10">
                <button onClick={(e) => { e.stopPropagation(); data.onAddChild(); }} className="p-1 hover:bg-accent/10 hover:text-accent rounded-full text-text-3 transition-colors" title="Add Direct Report">
                    <PlusIcon className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); data.onEdit(); }} className="p-1 hover:bg-accent/10 hover:text-accent rounded-full text-text-3 transition-colors" title="Edit Employee">
                    <Pencil2Icon className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); data.onDelete(); }} className="p-1 hover:bg-danger/10 hover:text-danger rounded-full text-text-3 transition-colors" title="Delete Employee">
                    <TrashIcon className="w-3.5 h-3.5" />
                </button>
            </div>

            <Handle type="source" position={Position.Bottom} className="!bg-text-4 !w-2 !h-2" />
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
        if (!authLoading && user?.role === Roles.EMPLOYEE) {
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

    if (authLoading || isLoading || user?.role === Roles.EMPLOYEE) {
        return (
            <div className="p-8 text-center text-text-3 flex items-center justify-center gap-2">
                <Spinner /> Loading Chart...
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-40px)] w-full rounded-xl overflow-hidden border border-border shadow-sm bg-surface animate-in fade-in duration-300 relative">
            <div className="absolute top-4 left-4 z-10 glass px-3 py-1.5 md:px-4 md:py-2 pointer-events-none rounded-lg">
                <h1 className="text-sm md:text-base font-extrabold text-text">Organization Chart</h1>
                <p className="text-[11px] md:text-xs text-text-3">Drag connections to change managers</p>
            </div>

            <div className="absolute top-4 right-4 z-10 flex gap-2">
                <Button
                    onClick={() => openCreateModal(null)}
                    leftIcon={<PlusIcon className="w-4 h-4" />}
                >
                    Add Employee
                </Button>
                <Button
                    variant="secondary"
                    onClick={fetchData}
                >
                    Auto Layout
                </Button>
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
                className="bg-bg-2"
            >
                <Controls className="!bg-surface !border-border !shadow-sm [&>button]:!border-b-border [&>button]:!fill-text-2 hover:[&>button]:!bg-bg" />
                <MiniMap
                    className="hidden md:block !bg-surface !border-border !shadow-sm rounded-lg overflow-hidden"
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
                        <Input
                            label="First Name *"
                            {...form.register('firstName')}
                            error={form.formState.errors.firstName?.message}
                        />
                        <Input
                            label="Last Name *"
                            {...form.register('lastName')}
                            error={form.formState.errors.lastName?.message}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Email *"
                            type="email"
                            {...form.register('email')}
                            error={form.formState.errors.email?.message}
                        />
                        <Input
                            label="Designation *"
                            {...form.register('designation')}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-text-2">Department *</label>
                            <select
                                {...form.register('departmentId')}
                                className="input-base"
                            >
                                <option value="">Select Department...</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                            {form.formState.errors.departmentId && <span className="text-xs text-danger">{form.formState.errors.departmentId.message}</span>}
                        </div>
                        <Input
                            label="Salary *"
                            type="number"
                            {...form.register('salary', { valueAsNumber: true })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Employee Code *"
                            {...form.register('employeeCode')}
                        />
                        <Input
                            label="Date Of Joining *"
                            type="date"
                            {...form.register('dateOfJoining')}
                        />
                    </div>

                    {/* Hidden Field for Pre-populating Manager relationships on creation */}
                    <input type="hidden" {...form.register('managerId')} />

                    <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            loading={form.formState.isSubmitting}
                        >
                            {modalMode === "CREATE" ? "Create Node" : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
