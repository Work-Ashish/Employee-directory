"use client"
import React, { useEffect, useState } from 'react'
import { PlusIcon, InputIcon } from '@radix-ui/react-icons'
import Link from 'next/link'
import { toast } from 'sonner'
import { WorkflowTemplate } from '@prisma/client'

// Extended interface matches our Prisma return structure
interface Template extends WorkflowTemplate {
    steps: any[]
}

export default function WorkflowsAdmin() {
    const [templates, setTemplates] = useState<Template[]>([])

    const loadTemplates = async () => {
        try {
            const res = await fetch('/api/workflows/templates')
            if (res.ok) {
                const json = await res.json()
                setTemplates(json.data)
            } else {
                toast.error('Failed to load workflow templates')
            }
        } catch (err) {
            toast.error('Network error loading workflows')
        }
    }

    useEffect(() => { loadTemplates() }, [])

    return (
        <div className="space-y-6 max-w-[1200px] mx-auto p-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">Workflow Engine</h1>
                    <p className="text-sm text-[var(--text3)] mt-1">Design and manage multi-step approval SLA processes.</p>
                </div>
                <Link href="/admin/workflows/builder">
                    <button className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap">
                        <PlusIcon className="w-4 h-4" /> New Workflow
                    </button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {templates.map(tpl => (
                    <div key={tpl.id} className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-blue-500/30 transition-colors flex flex-col justify-between">
                        <div className="flex flex-row items-center justify-between pb-2 border-b border-[var(--border)] mb-4">
                            <h3 className="text-lg font-medium tracking-tight text-[var(--text)]">{tpl.name}</h3>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-bold px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-sm uppercase tracking-wider">{tpl.entityType}</span>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-sm ${tpl.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'} uppercase tracking-wider`}>{tpl.status}</span>
                            </div>
                            <div className="text-sm text-[var(--text2)] line-clamp-2 min-h-[40px] mb-4">
                                {tpl.description || 'No description provided.'}
                            </div>
                            <div className="flex bg-[var(--bg2)] p-2 rounded-lg items-center space-x-2 text-[13px] font-medium text-[var(--text2)] border border-[var(--border)]">
                                <InputIcon className="h-4 w-4 text-[var(--accent)]" />
                                <span>{tpl.steps.length} Step{tpl.steps.length !== 1 && 's'} Configured</span>
                            </div>
                        </div>
                    </div>
                ))}
                {templates.length === 0 && (
                    <div className="col-span-3 text-center py-16 text-[var(--text3)] border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--surface)]">
                        <p className="mb-4 text-sm font-medium">No working policies defined yet.</p>
                        <Link href="/admin/workflows/builder">
                            <button className="px-4 py-2 bg-[var(--bg2)] border border-[var(--border)] text-[var(--text2)] font-semibold rounded-lg hover:bg-[var(--border)] transition-colors text-sm">
                                Create Initial Workflow
                            </button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
