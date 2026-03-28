"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { PlusIcon, TrashIcon, GearIcon } from '@radix-ui/react-icons'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent } from '@/components/ui/Card'
import { ConfigPanel } from '@/components/ui/ConfigPanel'
import { useAuth } from "@/context/AuthContext"
import { canAccessModule, Module } from "@/lib/permissions"

interface StepDraft {
    name: string
    approverType: string
    slaHours: number
    isOptional: boolean
}

const ENTITY_TYPES = [
    { value: "LEAVE", label: "Leave Request" },
    { value: "REIMBURSEMENT", label: "Reimbursement" },
    { value: "RESIGNATION", label: "Resignation" },
    { value: "ASSET_REQUEST", label: "Asset Request" },
    { value: "ONBOARDING", label: "Onboarding" },
    { value: "OFFBOARDING", label: "Offboarding" },
]

const APPROVER_TYPES = [
    { value: "REPORTING_MANAGER", label: "Reporting Manager" },
    { value: "HR", label: "HR" },
    { value: "DEPARTMENT_HEAD", label: "Department Head" },
    { value: "SPECIFIC_EMPLOYEE", label: "Specific Employee" },
    { value: "AUTO_APPROVE", label: "Auto Approve" },
]

export default function BuilderPage() {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    React.useEffect(() => { if (!isLoading && user && !canAccessModule(user.role, Module.WORKFLOWS)) router.push("/") }, [user, isLoading, router])

    const router = useRouter()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [entityType, setEntityType] = useState('LEAVE')
    const [steps, setSteps] = useState<StepDraft[]>([
        { name: 'Manager Approval', approverType: 'REPORTING_MANAGER', slaHours: 24, isOptional: false },
    ])
    const [saving, setSaving] = useState(false)
    const [configPanelOpen, setConfigPanelOpen] = useState(false)

    const addStep = () => {
        setSteps([...steps, { name: '', approverType: 'REPORTING_MANAGER', slaHours: 24, isOptional: false }])
    }

    const removeStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index))
    }

    const updateStep = (index: number, field: keyof StepDraft, value: string | number | boolean) => {
        const newSteps = [...steps]
        ;(newSteps[index] as any)[field] = value
        setSteps(newSteps)
    }

    const handleSave = async () => {
        if (!name.trim()) return toast.error('Workflow name is required')
        if (steps.length === 0) return toast.error('At least one step is required')
        if (steps.some(s => !s.name.trim())) return toast.error('All steps must have a name')

        setSaving(true)
        try {
            const payload = {
                name,
                description,
                entityType,
                steps: steps.map((s, idx) => ({
                    name: s.name,
                    approverType: s.approverType,
                    order: idx + 1,
                    slaHours: s.slaHours ? Number(s.slaHours) : 24,
                    isOptional: s.isOptional,
                }))
            }

            await api.post('/workflows/templates/', payload)
            toast.success('Workflow created successfully')
            router.push('/admin/workflows')
        } catch (err) {
            toast.error('Failed to create workflow')
        } finally {
            setSaving(false)
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
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Workflow'}
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
                                options={ENTITY_TYPES}
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
                        <div className="flex items-start space-x-4 bg-surface p-5 rounded-xl shadow-sm border border-border hover:border-blue-500/20 transition-all">
                            <div className="w-8 h-8 flex items-center justify-center bg-blue-500/10 text-blue-500 rounded-full font-bold text-sm shrink-0 border border-blue-500/20 mt-6">{index + 1}</div>
                            <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input
                                        label="Step Name"
                                        value={step.name}
                                        onChange={e => updateStep(index, 'name', e.target.value)}
                                        placeholder="e.g. Manager Approval"
                                    />
                                    <Select
                                        label="Approver Type"
                                        value={step.approverType}
                                        onChange={e => updateStep(index, 'approverType', e.target.value)}
                                        options={APPROVER_TYPES}
                                    />
                                    <Input
                                        label="SLA (Hours)"
                                        type="number"
                                        value={step.slaHours}
                                        onChange={e => updateStep(index, 'slaHours', Number(e.target.value))}
                                    />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-text-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={step.isOptional}
                                        onChange={e => updateStep(index, 'isOptional', e.target.checked)}
                                        className="rounded border-border text-accent focus:ring-accent"
                                    />
                                    Optional step (can be skipped)
                                </label>
                            </div>
                            <Button
                                variant="danger"
                                size="icon"
                                onClick={() => removeStep(index)}
                                className="shrink-0 mt-6"
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
                        Add Approval Step
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
