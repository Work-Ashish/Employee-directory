"use client"
import React, { useEffect, useState, useCallback } from 'react'
import { PlusIcon, InputIcon, GearIcon, TrashIcon, RocketIcon, ArchiveIcon, EyeOpenIcon, CheckIcon, Cross2Icon } from '@radix-ui/react-icons'
import Link from 'next/link'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { api } from '@/lib/api-client'
import { extractArray } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfigPanel } from '@/components/ui/ConfigPanel'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog'

interface WorkflowTemplate {
    id: string
    name: string
    description: string | null
    entityType: string
    entityTypeDisplay: string
    status: string
    statusDisplay: string
    steps: Array<{
        id: string
        order: number
        name: string
        approverType: string
        slaHours: number
        isOptional: boolean
    }>
    createdByName: string | null
    createdAt: string
    updatedAt: string
}

interface WorkflowAction {
    id: string
    stepName: string
    actorName: string
    decision: string
    decisionDisplay: string
    comments: string
    createdAt: string
}

interface WorkflowInstance {
    id: string
    templateName: string
    entityType: string
    entityId: string
    initiatedByName: string
    currentStep: number
    totalSteps: number
    status: string
    statusDisplay: string
    actions: WorkflowAction[]
    steps: Array<{ id: string; order: number; name: string; approverType: string }>
    createdAt: string
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger'> = {
    PUBLISHED: 'success',
    DRAFT: 'warning',
    ARCHIVED: 'danger',
}

const INSTANCE_STATUS_VARIANT: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'neutral'> = {
    PENDING: 'warning',
    IN_PROGRESS: 'info',
    APPROVED: 'success',
    REJECTED: 'danger',
    CANCELLED: 'neutral',
}

export default function WorkflowsAdmin() {
    const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [configScreen, setConfigScreen] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<WorkflowTemplate | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Workflow instances state
    const [instances, setInstances] = useState<WorkflowInstance[]>([])
    const [instancesLoading, setInstancesLoading] = useState(true)
    const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null)
    const [actionComments, setActionComments] = useState('')
    const [submittingAction, setSubmittingAction] = useState(false)

    const loadTemplates = useCallback(async () => {
        setLoading(true)
        try {
            const { data } = await api.get<any>('/workflows/templates/')
            const results = (data as any)?.results || extractArray<WorkflowTemplate>(data)
            // Ensure steps always defaults to an empty array
            setTemplates(results.map((tpl: any) => ({ ...tpl, steps: tpl.steps || [] })))
        } catch (err) {
            toast.error('Failed to load workflow templates')
        } finally {
            setLoading(false)
        }
    }, [])

    const loadInstances = useCallback(async () => {
        setInstancesLoading(true)
        try {
            const { data } = await api.get<any>('/workflows/instances/')
            const results = (data as any)?.results || extractArray<WorkflowInstance>(data)
            setInstances(results.map((inst: any) => ({
                ...inst,
                actions: inst.actions || [],
                steps: inst.steps || [],
            })))
        } catch (err) {
            toast.error('Failed to load workflow instances')
        } finally {
            setInstancesLoading(false)
        }
    }, [])

    useEffect(() => { loadTemplates() }, [loadTemplates])
    useEffect(() => { loadInstances() }, [loadInstances])

    const handleWorkflowAction = async (instanceId: string, decision: string) => {
        setSubmittingAction(true)
        try {
            await api.post(`/workflows/instances/${instanceId}/action/`, {
                decision,
                comments: actionComments,
            })
            toast.success(`Workflow ${decision.toLowerCase()} successfully`)
            setActionComments('')
            setSelectedInstance(null)
            loadInstances()
        } catch (err) {
            toast.error('Failed to submit workflow action')
        } finally {
            setSubmittingAction(false)
        }
    }

    const updateStatus = async (tpl: WorkflowTemplate, newStatus: string) => {
        try {
            await api.put(`/workflows/templates/${tpl.id}/`, { status: newStatus })
            toast.success(`Workflow ${newStatus === 'PUBLISHED' ? 'published' : 'archived'} successfully`)
            loadTemplates()
        } catch (err) {
            toast.error('Failed to update workflow status')
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await api.delete(`/workflows/templates/${deleteTarget.id}/`)
            toast.success('Workflow deleted')
            setDeleteTarget(null)
            loadTemplates()
        } catch (err) {
            toast.error('Failed to delete workflow')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-6 max-w-[1200px] mx-auto p-6 animate-in fade-in duration-500">
            <PageHeader
                title="Workflow Engine"
                description="Design and manage multi-step approval SLA processes."
                actions={
                    <Link href="/admin/workflows/builder">
                        <Button leftIcon={<PlusIcon className="w-4 h-4" />}>
                            New Workflow
                        </Button>
                    </Link>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {templates.map(tpl => (
                    <Card key={tpl.id} className="p-5 rounded-2xl hover:border-blue-500/30 transition-colors flex flex-col justify-between">
                        <CardContent className="p-0">
                            <div className="flex flex-row items-center justify-between pb-2 border-b border-border mb-4">
                                <CardTitle className="truncate">{tpl.name}</CardTitle>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <Badge size="sm" className="uppercase tracking-wider">
                                        {tpl.entityTypeDisplay || tpl.entityType}
                                    </Badge>
                                    <Badge
                                        size="sm"
                                        variant={STATUS_VARIANT[tpl.status] || 'warning'}
                                        className="uppercase tracking-wider"
                                    >
                                        {tpl.statusDisplay || tpl.status}
                                    </Badge>
                                </div>
                                <div className="text-sm text-text-2 line-clamp-2 min-h-[40px] mb-4">
                                    {tpl.description || 'No description provided.'}
                                </div>
                                <div className="flex bg-bg-2 p-2 rounded-lg items-center space-x-2 text-base font-medium text-text-2 border border-border">
                                    <InputIcon className="h-4 w-4 text-accent" />
                                    <span>{tpl.steps.length} Step{tpl.steps.length !== 1 && 's'} Configured</span>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2 mt-3">
                                    {tpl.status === 'DRAFT' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            leftIcon={<RocketIcon className="w-3.5 h-3.5" />}
                                            onClick={() => updateStatus(tpl, 'PUBLISHED')}
                                            className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-500/5"
                                        >
                                            Publish
                                        </Button>
                                    )}
                                    {tpl.status === 'PUBLISHED' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            leftIcon={<ArchiveIcon className="w-3.5 h-3.5" />}
                                            onClick={() => updateStatus(tpl, 'ARCHIVED')}
                                            className="flex-1 text-text-2 hover:text-accent"
                                        >
                                            Archive
                                        </Button>
                                    )}
                                    {tpl.status === 'ARCHIVED' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            leftIcon={<RocketIcon className="w-3.5 h-3.5" />}
                                            onClick={() => updateStatus(tpl, 'PUBLISHED')}
                                            className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-500/5"
                                        >
                                            Re-publish
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        leftIcon={<GearIcon className="w-3.5 h-3.5" />}
                                        onClick={() => setConfigScreen(`${tpl.entityType}_REQUEST`)}
                                        className="flex-1 text-text-2 hover:text-accent"
                                    >
                                        Fields
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        leftIcon={<TrashIcon className="w-3.5 h-3.5" />}
                                        onClick={() => setDeleteTarget(tpl)}
                                        className="text-red-500 hover:text-red-600 hover:bg-red-500/5"
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {!loading && templates.length === 0 && (
                    <div className="col-span-3">
                        <EmptyState
                            title="No workflow policies defined yet"
                            action={
                                <Link href="/admin/workflows/builder">
                                    <Button variant="secondary">Create Initial Workflow</Button>
                                </Link>
                            }
                            className="border-2 border-dashed border-border rounded-2xl bg-surface"
                        />
                    </div>
                )}
            </div>

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="sm">
                <DialogHeader>
                    <DialogTitle>Delete Workflow</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <p className="text-text-2">
                        Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
                        This action cannot be undone. Any running instances of this workflow will also be removed.
                    </p>
                </DialogBody>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                        {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogFooter>
            </Dialog>

            {/* ── Active Workflow Instances ──────────────────────────────── */}
            <div className="mt-10">
                <h2 className="text-xl font-bold text-text mb-4">Active Workflow Instances</h2>

                {instancesLoading ? (
                    <div className="flex items-center justify-center py-12 gap-3 text-text-3">
                        <Spinner size="lg" />
                        <span>Loading workflow instances...</span>
                    </div>
                ) : instances.length === 0 ? (
                    <EmptyState
                        title="No workflow instances yet"
                        description="When employees create leave requests or resignations that match a published workflow, instances will appear here."
                        className="border-2 border-dashed border-border rounded-2xl bg-surface"
                    />
                ) : (
                    <Card>
                        <CardContent className="p-0">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-border bg-bg-2">
                                        {['Template', 'Entity Type', 'Initiated By', 'Progress', 'Status', 'Created', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wide">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {instances.map((inst, i) => (
                                        <tr
                                            key={inst.id}
                                            className="group hover:bg-accent/[0.03] transition-colors duration-200 border-b border-border last:border-0"
                                        >
                                            <td className="px-4 py-3 text-sm font-semibold text-text">{inst.templateName}</td>
                                            <td className="px-4 py-3">
                                                <Badge size="sm" className="uppercase tracking-wider">{inst.entityType}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-text-2">{inst.initiatedByName || '—'}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-mono text-text-2">
                                                    Step {inst.currentStep} / {inst.totalSteps}
                                                </span>
                                                {inst.steps && inst.steps.length > 0 && inst.currentStep <= inst.steps.length && (
                                                    <span className="ml-2 text-xs text-text-3">
                                                        ({inst.steps.find(s => s.order === inst.currentStep)?.name || ''})
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    variant={INSTANCE_STATUS_VARIANT[inst.status] || 'neutral'}
                                                    dot
                                                    size="sm"
                                                >
                                                    {inst.statusDisplay || inst.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-text-3">
                                                {format(new Date(inst.createdAt), 'MMM d, yyyy')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    leftIcon={<EyeOpenIcon className="w-3.5 h-3.5" />}
                                                    onClick={() => { setSelectedInstance(inst); setActionComments('') }}
                                                >
                                                    View
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* ── Instance Detail / Action Dialog ───────────────────────── */}
            <Dialog open={!!selectedInstance} onClose={() => setSelectedInstance(null)} size="lg">
                <DialogHeader>
                    <DialogTitle>
                        {selectedInstance?.templateName} — {selectedInstance?.statusDisplay}
                    </DialogTitle>
                </DialogHeader>
                <DialogBody>
                    {selectedInstance && (
                        <div className="space-y-5">
                            {/* Summary */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-text-3">Entity Type</span>
                                    <p className="font-medium text-text">{selectedInstance.entityType}</p>
                                </div>
                                <div>
                                    <span className="text-text-3">Initiated By</span>
                                    <p className="font-medium text-text">{selectedInstance.initiatedByName || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-text-3">Current Step</span>
                                    <p className="font-medium text-text">
                                        {selectedInstance.currentStep} of {selectedInstance.totalSteps}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-text-3">Created</span>
                                    <p className="font-medium text-text">
                                        {format(new Date(selectedInstance.createdAt), 'MMM d, yyyy h:mm a')}
                                    </p>
                                </div>
                            </div>

                            {/* Steps overview */}
                            <div>
                                <h4 className="text-sm font-bold text-text mb-2">Workflow Steps</h4>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {selectedInstance.steps.map(step => {
                                        const isActive = step.order === selectedInstance.currentStep
                                        const isDone = step.order < selectedInstance.currentStep ||
                                            selectedInstance.status === 'APPROVED'
                                        return (
                                            <div
                                                key={step.id}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                                                    isDone
                                                        ? 'bg-success/10 border-success/30 text-success'
                                                        : isActive
                                                            ? 'bg-info/10 border-info/30 text-info'
                                                            : 'bg-bg-2 border-border text-text-3'
                                                }`}
                                            >
                                                <span className="font-bold">{step.order}.</span> {step.name}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Action timeline */}
                            <div>
                                <h4 className="text-sm font-bold text-text mb-2">Action Timeline</h4>
                                {selectedInstance.actions.length === 0 ? (
                                    <p className="text-sm text-text-3">No actions taken yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedInstance.actions.map(action => (
                                            <div key={action.id} className="flex items-start gap-3 p-3 bg-bg-2 rounded-lg border border-border">
                                                <Badge
                                                    variant={
                                                        action.decision === 'APPROVED' ? 'success' :
                                                        action.decision === 'REJECTED' ? 'danger' : 'warning'
                                                    }
                                                    size="sm"
                                                >
                                                    {action.decisionDisplay || action.decision}
                                                </Badge>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="font-medium text-text">{action.actorName || '—'}</span>
                                                        <span className="text-text-3">on</span>
                                                        <span className="text-text-3 font-medium">{action.stepName || '—'}</span>
                                                    </div>
                                                    {action.comments && (
                                                        <p className="text-sm text-text-2 mt-1">{action.comments}</p>
                                                    )}
                                                    <p className="text-xs text-text-3 mt-1">
                                                        {format(new Date(action.createdAt), 'MMM d, yyyy h:mm a')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Action form — only for actionable instances */}
                            {(selectedInstance.status === 'PENDING' || selectedInstance.status === 'IN_PROGRESS') && (
                                <div className="border-t border-border pt-4">
                                    <h4 className="text-sm font-bold text-text mb-2">Take Action</h4>
                                    <Textarea
                                        label="Comments (optional)"
                                        value={actionComments}
                                        onChange={e => setActionComments(e.target.value)}
                                        placeholder="Add comments for this action..."
                                        className="resize-none h-20 mb-3"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            variant="success"
                                            size="sm"
                                            leftIcon={<CheckIcon className="w-3.5 h-3.5" />}
                                            onClick={() => handleWorkflowAction(selectedInstance.id, 'APPROVED')}
                                            disabled={submittingAction}
                                        >
                                            {submittingAction ? 'Submitting...' : 'Approve'}
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            leftIcon={<Cross2Icon className="w-3.5 h-3.5" />}
                                            onClick={() => handleWorkflowAction(selectedInstance.id, 'REJECTED')}
                                            disabled={submittingAction}
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogBody>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setSelectedInstance(null)}>
                        Close
                    </Button>
                </DialogFooter>
            </Dialog>

            {configScreen && (
                <ConfigPanel
                    isOpen
                    onClose={() => setConfigScreen(null)}
                    screenName={configScreen}
                />
            )}
        </div>
    )
}
