"use client"

import React, { useCallback } from 'react';
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
    Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { cn } from '@/lib/utils';
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

// Custom Node Component
const CustomNode = ({ data }: any) => {
    return (
        <div className={cn(
            "px-4 py-3 rounded-xl border bg-[var(--surface)] shadow-lg min-w-[200px] transition-all duration-200 hover:shadow-xl hover:scale-105 hover:border-[var(--accent)] group",
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
            <Handle type="source" position={Position.Bottom} className="!bg-[var(--text4)] !w-2 !h-2" />
        </div>
    );
};

const nodeTypes = {
    custom: CustomNode,
};

const initialNodes: Node[] = [
    {
        id: '1',
        type: 'custom',
        position: { x: 400, y: 0 },
        data: { label: 'Emily Brown', role: 'CEO / Founder', initials: 'EB', gradient: 'from-[#007aff] to-[#5856d6]', isRoot: true }
    },
    {
        id: '2',
        type: 'custom',
        position: { x: 150, y: 150 },
        data: { label: 'Sarah Davis', role: 'CTO', initials: 'SD', gradient: 'from-[#a78bfa] to-[#5856d6]' }
    },
    {
        id: '3',
        type: 'custom',
        position: { x: 650, y: 150 },
        data: { label: 'Amanda Thomas', role: 'VP of Sales', initials: 'AT', gradient: 'from-[#f43f5e] to-[#e11d48]' }
    },
    {
        id: '4',
        type: 'custom',
        position: { x: 0, y: 300 },
        data: { label: 'John Doe', role: 'Lead Engineer', initials: 'JD', gradient: 'from-[#3395ff] to-[#007aff]' }
    },
    {
        id: '5',
        type: 'custom',
        position: { x: 300, y: 300 },
        data: { label: 'James Taylor', role: 'DevOps Lead', initials: 'JT', gradient: 'from-[#10b981] to-[#059669]' }
    },
    {
        id: '6',
        type: 'custom',
        position: { x: 550, y: 300 },
        data: { label: 'Michael Johnson', role: 'Sales Lead', initials: 'MJ', gradient: 'from-[#38bdf8] to-[#0ea5e9]' }
    },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', animated: true, style: { stroke: 'var(--text4)' } },
    { id: 'e1-3', source: '1', target: '3', type: 'smoothstep', animated: true, style: { stroke: 'var(--text4)' } },
    { id: 'e2-4', source: '2', target: '4', type: 'smoothstep', style: { stroke: 'var(--border2)' } },
    { id: 'e2-5', source: '2', target: '5', type: 'smoothstep', style: { stroke: 'var(--border2)' } },
    { id: 'e3-6', source: '3', target: '6', type: 'smoothstep', style: { stroke: 'var(--border2)' } },
];

export default function Organization() {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && user?.role === 'employee') {
            router.push('/')
        }
    }, [user, isLoading, router])

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    if (isLoading || user?.role === 'employee') return null

    return (
        <div className="h-[calc(100vh-40px)] w-full rounded-xl overflow-hidden border border-[var(--border)] shadow-sm bg-[var(--surface)] animate-in fade-in duration-300">
            <div className="absolute top-4 left-4 z-10 glass px-4 py-2 pointer-events-none">
                <h1 className="text-[16px] font-extrabold text-[var(--text)]">Organization Chart</h1>
                <p className="text-[12px] text-[var(--text3)]">Interactive company hierarchy</p>
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
                    className="!bg-[var(--surface)] !border-[var(--border)] !shadow-sm rounded-lg overflow-hidden"
                    nodeColor={(n) => {
                        if (n.data?.isRoot) return 'var(--accent)';
                        return 'var(--text4)';
                    }}
                    maskColor="rgba(0,0,0,0.05)"
                />
                <Background color="#000000" gap={16} size={1} className="opacity-[0.03]" />
            </ReactFlow>
        </div>
    );
}
