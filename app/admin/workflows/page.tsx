"use client"
import React, { useEffect, useState } from 'react'
import { PlusIcon, InputIcon, GearIcon } from '@radix-ui/react-icons'
import Link from 'next/link'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { WorkflowTemplate } from '@prisma/client'
import { extractArray } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfigPanel } from '@/components/ui/ConfigPanel'

// Extended interface matches our Prisma return structure
interface Template extends WorkflowTemplate {
    steps: any[]
}

export default function WorkflowsAdmin() {
    const [templates, setTemplates] = useState<Template[]>([])
    const [configScreen, setConfigScreen] = useState<string | null>(null)

    const loadTemplates = async () => {
        try {
            const { data } = await api.get<any>('/workflows/templates/')
            setTemplates(extractArray<Template>(data))
        } catch (err) {
            toast.error('Failed to load workflow templates')
        }
    }

    useEffect(() => { loadTemplates() }, [])

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
                                <CardTitle>{tpl.name}</CardTitle>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <Badge size="sm" className="uppercase tracking-wider">{tpl.entityType}</Badge>
                                    <Badge
                                        size="sm"
                                        variant={tpl.status === 'PUBLISHED' ? 'success' : 'warning'}
                                        className="uppercase tracking-wider"
                                    >
                                        {tpl.status}
                                    </Badge>
                                </div>
                                <div className="text-sm text-text-2 line-clamp-2 min-h-[40px] mb-4">
                                    {tpl.description || 'No description provided.'}
                                </div>
                                <div className="flex bg-bg-2 p-2 rounded-lg items-center space-x-2 text-base font-medium text-text-2 border border-border">
                                    <InputIcon className="h-4 w-4 text-accent" />
                                    <span>{tpl.steps.length} Step{tpl.steps.length !== 1 && 's'} Configured</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    leftIcon={<GearIcon className="w-3.5 h-3.5" />}
                                    onClick={() => setConfigScreen(`${tpl.entityType}_REQUEST`)}
                                    className="mt-3 w-full text-text-2 hover:text-accent"
                                >
                                    Configure Fields
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {templates.length === 0 && (
                    <div className="col-span-3">
                        <EmptyState
                            title="No working policies defined yet"
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
