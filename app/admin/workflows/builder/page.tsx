"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PlusIcon, TrashIcon, ArrowRightIcon } from '@radix-ui/react-icons'

export default function BuilderPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [entityType, setEntityType] = useState('LEAVE')
    const [steps, setSteps] = useState([{ approverType: 'MANAGER', role: '', userId: '', slaHours: 24 }])

    const addStep = () => {
        setSteps([...steps, { approverType: 'MANAGER', role: '', userId: '', slaHours: 24 }])
    }

    const removeStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index))
    }

    const handleSave = async () => {
        if (!name || steps.length === 0) return toast.error('Name and at least 1 step required')
        try {
            const payload = {
                name,
                description,
                entityType,
                steps: steps.map((s, idx) => ({
                    stepOrder: idx + 1,
                    approverType: s.approverType,
                    role: s.role || undefined,
                    userId: s.userId || undefined,
                    slaHours: s.slaHours ? Number(s.slaHours) : undefined
                }))
            }

            const res = await fetch('/api/workflows/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                toast.success('Workflow created successfully')
                router.push('/admin/workflows')
            } else {
                toast.error('Failed to create workflow')
            }
        } catch (err) {
            toast.error('Network error')
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--text)]">Workflow Builder</h1>
                    <p className="text-sm text-[var(--text3)] mt-1">Configure logic layers for automatic approval routing.</p>
                </div>
                <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-[var(--accent)] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity">
                    Save Workflow
                </button>
            </div>

            <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] mb-8 shadow-sm">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[13px] font-semibold text-[var(--text2)] block">Workflow Name</label>
                            <input type="text" className="w-full p-2 border border-[var(--border)] rounded text-sm bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Executive Leave Policy" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[13px] font-semibold text-[var(--text2)] block">Trigger Entity</label>
                            <select className="w-full p-2 border border-[var(--border)] rounded text-sm bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]" value={entityType} onChange={e => setEntityType(e.target.value)}>
                                <option value="LEAVE">Leave Request</option>
                                <option value="ASSET">Asset Request</option>
                                <option value="EXPENSE">Expense Claim</option>
                                <option value="RESIGNATION">Resignation Request</option>
                                <option value="TICKET">Support Ticket</option>
                            </select>
                        </div>
                        <div className="col-span-2 space-y-2 text-sm font-medium">
                            <label className="text-[13px] font-semibold text-[var(--text2)] block">Description</label>
                            <textarea className="w-full p-2 border border-[var(--border)] rounded min-h-[80px] bg-[var(--bg)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the purpose of this workflow..." />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-bold text-[var(--text)] tracking-tight hover:text-[var(--accent)] transition-colors">Approval Sequence</h2>
                {steps.map((step, index) => (
                    <div key={index} className="flex flex-col gap-2 relative">
                        <div className="flex items-center space-x-4 bg-[var(--surface)] p-5 rounded-xl shadow-sm border border-[var(--border)] hover:border-blue-500/20 transition-all">
                            <div className="w-8 h-8 flex items-center justify-center bg-blue-500/10 text-blue-500 rounded-full font-bold text-sm shrink-0 border border-blue-500/20">{index + 1}</div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-[11px] font-bold text-[var(--text3)] uppercase mb-1 block tracking-wider">Approver Role Type</label>
                                    <select className="w-full p-2 border border-[var(--border)] rounded text-sm bg-[var(--bg)] text-[var(--text)] focus:outline-none" value={step.approverType} onChange={e => {
                                        const newSteps = [...steps];
                                        newSteps[index].approverType = e.target.value;
                                        setSteps(newSteps)
                                    }}>
                                        <option value="MANAGER">Direct Manager</option>
                                        <option value="ROLE">Specific Role</option>
                                        <option value="SPECIFIC_USER">Specific Employee</option>
                                    </select>
                                </div>
                                {step.approverType === 'ROLE' && (
                                    <div>
                                        <label className="text-[11px] font-bold text-[var(--text3)] uppercase mb-1 block tracking-wider">Target System Role</label>
                                        <select className="w-full p-2 border border-[var(--border)] rounded text-sm bg-[var(--bg)] text-[var(--text)] focus:outline-none" value={step.role} onChange={e => {
                                            const newSteps = [...steps];
                                            newSteps[index].role = e.target.value;
                                            setSteps(newSteps)
                                        }}>
                                            <option value="">Select Role</option>
                                            <option value="ADMIN">System Admin</option>
                                            <option value="HR">HR Dept</option>
                                            <option value="FINANCE">Finance</option>
                                        </select>
                                    </div>
                                )}
                                {step.approverType === 'SPECIFIC_USER' && (
                                    <div>
                                        <label className="text-[11px] font-bold text-[var(--text3)] uppercase mb-1 block tracking-wider">Configured User ID</label>
                                        <input type="text" className="w-full p-2 border border-[var(--border)] rounded text-sm bg-[var(--bg)] text-[var(--text)] focus:outline-none" value={step.userId} placeholder="Enter Employee ID" onChange={e => {
                                            const newSteps = [...steps]
                                            newSteps[index].userId = e.target.value
                                            setSteps(newSteps)
                                        }} />
                                    </div>
                                )}
                                <div className={step.approverType === 'MANAGER' ? 'md:col-span-2' : ''}>
                                    <label className="text-[11px] font-bold text-[var(--text3)] uppercase mb-1 block tracking-wider">SLA Timeout (Hours)</label>
                                    <div className="flex items-center space-x-2">
                                        <input type="number" className="w-full p-2 border border-[var(--border)] rounded text-sm bg-[var(--bg)] text-[var(--text)] focus:outline-none" value={step.slaHours} onChange={e => {
                                            const newSteps = [...steps]
                                            newSteps[index].slaHours = Number(e.target.value)
                                            setSteps(newSteps)
                                        }} />
                                    </div>
                                </div>
                            </div>
                            <button className="p-2 text-red-500 hover:text-white border border-[var(--border)] hover:bg-red-500 rounded-lg transition-colors ml-2 shrink-0" onClick={() => removeStep(index)}>
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                        {index < steps.length - 1 && (
                            <div className="flex justify-center py-1 text-gray-400">
                                <div className="w-[2px] h-6 bg-[var(--border)] border-dashed border-l-2"></div>
                            </div>
                        )}
                    </div>
                ))}

                <div className="flex justify-center mt-8">
                    <button className="flex items-center gap-2 px-4 py-2 bg-[var(--bg2)] border border-[var(--border)] border-dashed text-blue-500 font-semibold rounded-lg hover:border-blue-500 hover:bg-blue-500/5 transition-colors text-sm" onClick={addStep}>
                        <PlusIcon className="w-4 h-4" /> Add Secondary Approver
                    </button>
                </div>
            </div>
        </div>
    )
}
