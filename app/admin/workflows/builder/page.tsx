"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PlusIcon, TrashIcon, GearIcon } from '@radix-ui/react-icons'
import { ROLES } from '@/lib/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent } from '@/components/ui/Card'
import { ConfigPanel } from '@/components/ui/ConfigPanel'

export default function BuilderPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [entityType, setEntityType] = useState('LEAVE')
    const [steps, setSteps] = useState([{ approverType: 'MANAGER', role: '', userId: '', slaHours: 24 }])
    const [configPanelOpen, setConfigPanelOpen] = useState(false)

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
            <PageHeader
                title="Workflow Builder"
                description="Configure logic layers for automatic approval routing."
                actions={
                    <div className="flex gap-2">
                        <Button variant="secondary" leftIcon={<GearIcon className="w-4 h-4" />} onClick={() => setConfigPanelOpen(true)}>
                            Configure Fields
                        </Button>
                        <Button onClick={handleSave}>
                            Save Workflow
                        </Button>
                    </div>
                }
                className="mb-8"
            />

            <Card className="mb-8 shadow-sm">
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Workflow Name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Executive Leave Policy"
                            />
                            <Select
                                label="Trigger Entity"
                                value={entityType}
                                onChange={e => setEntityType(e.target.value)}
                                options={[
                                    { value: "LEAVE", label: "Leave Request" },
                                    { value: "ASSET", label: "Asset Request" },
                                    { value: "EXPENSE", label: "Expense Claim" },
                                    { value: "RESIGNATION", label: "Resignation Request" },
                                    { value: "TICKET", label: "Support Ticket" },
                                ]}
                            />
                            <Textarea
                                wrapperClassName="col-span-2"
                                label="Description"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Describe the purpose of this workflow..."
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h2 className="text-xl font-bold text-text tracking-tight hover:text-accent transition-colors">Approval Sequence</h2>
                {steps.map((step, index) => (
                    <div key={index} className="flex flex-col gap-2 relative">
                        <div className="flex items-center space-x-4 bg-surface p-5 rounded-xl shadow-sm border border-border hover:border-blue-500/20 transition-all">
                            <div className="w-8 h-8 flex items-center justify-center bg-blue-500/10 text-blue-500 rounded-full font-bold text-sm shrink-0 border border-blue-500/20">{index + 1}</div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Select
                                    label="Approver Role Type"
                                    value={step.approverType}
                                    onChange={e => {
                                        const newSteps = [...steps];
                                        newSteps[index].approverType = e.target.value;
                                        setSteps(newSteps)
                                    }}
                                    options={[
                                        { value: "MANAGER", label: "Direct Manager" },
                                        { value: "ROLE", label: "Specific Role" },
                                        { value: "SPECIFIC_USER", label: "Specific Employee" },
                                    ]}
                                />
                                {step.approverType === 'ROLE' && (
                                    <Select
                                        label="Target System Role"
                                        value={step.role}
                                        onChange={e => {
                                            const newSteps = [...steps];
                                            newSteps[index].role = e.target.value;
                                            setSteps(newSteps)
                                        }}
                                    >
                                        <option value="">Select Role</option>
                                        {ROLES.map(role => (
                                            <option key={role} value={role}>{role.replace("_", " ")}</option>
                                        ))}
                                    </Select>
                                )}
                                {step.approverType === 'SPECIFIC_USER' && (
                                    <Input
                                        label="Configured User ID"
                                        value={step.userId}
                                        placeholder="Enter Employee ID"
                                        onChange={e => {
                                            const newSteps = [...steps]
                                            newSteps[index].userId = e.target.value
                                            setSteps(newSteps)
                                        }}
                                    />
                                )}
                                <div className={step.approverType === 'MANAGER' ? 'md:col-span-2' : ''}>
                                    <Input
                                        label="SLA Timeout (Hours)"
                                        type="number"
                                        value={step.slaHours}
                                        onChange={e => {
                                            const newSteps = [...steps]
                                            newSteps[index].slaHours = Number(e.target.value)
                                            setSteps(newSteps)
                                        }}
                                    />
                                </div>
                            </div>
                            <Button
                                variant="danger"
                                size="icon"
                                onClick={() => removeStep(index)}
                                className="ml-2 shrink-0"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </Button>
                        </div>
                        {index < steps.length - 1 && (
                            <div className="flex justify-center py-1 text-gray-400">
                                <div className="w-[2px] h-6 bg-border border-dashed border-l-2"></div>
                            </div>
                        )}
                    </div>
                ))}

                <div className="flex justify-center mt-8">
                    <Button
                        variant="secondary"
                        leftIcon={<PlusIcon className="w-4 h-4" />}
                        onClick={addStep}
                        className="border-dashed text-blue-500 hover:border-blue-500 hover:bg-blue-500/5"
                    >
                        Add Secondary Approver
                    </Button>
                </div>
            </div>

            <ConfigPanel
                isOpen={configPanelOpen}
                onClose={() => setConfigPanelOpen(false)}
                screenName={`${entityType}_REQUEST`}
            />
        </div>
    )
}
