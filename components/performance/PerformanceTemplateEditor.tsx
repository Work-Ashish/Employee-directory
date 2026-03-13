"use client"

import * as React from "react"
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/Dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs"
import { Button } from "@/components/ui/Button"
import { Cross2Icon, PlusIcon, ArrowUpIcon, ArrowDownIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"

interface PerformanceTemplate {
    dailyMetrics: string[]
    dailyCompetencies: string[]
    monthlyKpis: string[]
    monthlyCompetencies: string[]
    selfCompetencies: string[]
}

const DEFAULTS: PerformanceTemplate = {
    dailyMetrics: [
        "Tasks Completed", "Meetings Attended", "Emails/Communications",
        "Reports Prepared", "Client Interactions", "Issues Resolved",
        "Training Hours", "Collaboration Activities",
    ],
    dailyCompetencies: [
        "Communication Quality", "Responsiveness & Follow-Through",
        "Team Collaboration", "Attention to Detail",
        "Problem Solving", "Process Adherence",
    ],
    monthlyKpis: [
        "Projects/Tasks Completed", "Deadlines Met", "Quality Score",
        "Client/Stakeholder Satisfaction", "Revenue/Cost Impact",
        "Training Completed", "Attendance Rate", "Team Contribution",
        "Documentation Delivered", "Innovation Initiatives",
    ],
    monthlyCompetencies: [
        "Technical Proficiency", "Communication & Collaboration",
        "Leadership & Initiative", "Problem Solving", "Time Management",
        "Customer Focus", "Adaptability & Learning", "Quality & Detail",
        "Process Compliance", "Continuous Improvement",
    ],
    selfCompetencies: [
        "Technical Proficiency", "Communication & Collaboration",
        "Leadership & Initiative", "Problem Solving", "Time Management",
        "Customer Focus", "Adaptability & Learning", "Quality & Detail",
        "Process Compliance", "Continuous Improvement",
    ],
}

interface Props {
    open: boolean
    onClose: () => void
    template: PerformanceTemplate
    onSaved: (template: PerformanceTemplate) => void
}

function EditableList({
    items,
    onChange,
    label,
}: {
    items: string[]
    onChange: (items: string[]) => void
    label: string
}) {
    const addItem = () => onChange([...items, ""])

    const removeItem = (index: number) => {
        if (items.length <= 1) { toast.error("At least one item is required"); return }
        onChange(items.filter((_, i) => i !== index))
    }

    const moveItem = (index: number, direction: -1 | 1) => {
        const target = index + direction
        if (target < 0 || target >= items.length) return
        const next = [...items]
        ;[next[index], next[target]] = [next[target], next[index]]
        onChange(next)
    }

    const updateItem = (index: number, value: string) => {
        onChange(items.map((item, i) => (i === index ? value : item)))
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-text-2">{label}</label>
                <Button variant="ghost" size="sm" onClick={addItem} leftIcon={<PlusIcon className="w-3.5 h-3.5" />}>
                    Add
                </Button>
            </div>
            <div className="space-y-1.5">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-text-4 w-5 text-right shrink-0">{i + 1}.</span>
                        <input
                            className="input-base text-sm py-1.5 flex-1"
                            value={item}
                            onChange={(e) => updateItem(i, e.target.value)}
                            placeholder={`Item ${i + 1}`}
                        />
                        <button
                            type="button"
                            onClick={() => moveItem(i, -1)}
                            disabled={i === 0}
                            className="p-1 text-text-4 hover:text-text disabled:opacity-30 transition-colors"
                        >
                            <ArrowUpIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => moveItem(i, 1)}
                            disabled={i === items.length - 1}
                            className="p-1 text-text-4 hover:text-text disabled:opacity-30 transition-colors"
                        >
                            <ArrowDownIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => removeItem(i)}
                            className="p-1 text-text-4 hover:text-danger transition-colors"
                        >
                            <Cross2Icon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

export function PerformanceTemplateEditor({ open, onClose, template, onSaved }: Props) {
    const [draft, setDraft] = React.useState<PerformanceTemplate>(template)
    const [saving, setSaving] = React.useState(false)

    // Sync draft when template prop changes (e.g. dialog reopens)
    React.useEffect(() => {
        if (open) setDraft(template)
    }, [open, template])

    const update = (key: keyof PerformanceTemplate, value: string[]) => {
        setDraft(prev => ({ ...prev, [key]: value }))
    }

    const handleSave = async () => {
        // Validate: no empty strings
        for (const [key, arr] of Object.entries(draft)) {
            const empty = (arr as string[]).filter(s => !s.trim())
            if (empty.length > 0) {
                toast.error(`Remove or fill empty items in ${key.replace(/([A-Z])/g, " $1").toLowerCase()}`)
                return
            }
        }

        setSaving(true)
        try {
            const res = await fetch("/api/performance/config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(draft),
            })
            if (res.ok) {
                const json = await res.json()
                const saved = json.data || json
                onSaved(saved)
                toast.success("Performance template saved")
                onClose()
            } else {
                const err = await res.json().catch(() => null)
                toast.error(err?.message || "Failed to save template")
            }
        } catch {
            toast.error("An error occurred while saving the template")
        } finally {
            setSaving(false)
        }
    }

    const handleReset = () => {
        setDraft({ ...DEFAULTS })
        toast.info("Reset to defaults — save to apply")
    }

    return (
        <Dialog open={open} onClose={onClose} size="xl">
            <DialogHeader>
                <DialogTitle>Configure Performance Templates</DialogTitle>
            </DialogHeader>
            <DialogBody>
                <Tabs defaultValue="daily">
                    <TabsList>
                        <TabsTrigger value="daily">Daily Review</TabsTrigger>
                        <TabsTrigger value="monthly">Monthly Review</TabsTrigger>
                        <TabsTrigger value="self">Self Review</TabsTrigger>
                    </TabsList>

                    <TabsContent value="daily" className="space-y-6 pt-4">
                        <EditableList
                            label="Activity Metrics"
                            items={draft.dailyMetrics}
                            onChange={v => update("dailyMetrics", v)}
                        />
                        <EditableList
                            label="Behavioral Competencies"
                            items={draft.dailyCompetencies}
                            onChange={v => update("dailyCompetencies", v)}
                        />
                    </TabsContent>

                    <TabsContent value="monthly" className="space-y-6 pt-4">
                        <EditableList
                            label="KPI Scorecard Items"
                            items={draft.monthlyKpis}
                            onChange={v => update("monthlyKpis", v)}
                        />
                        <EditableList
                            label="Competency Areas"
                            items={draft.monthlyCompetencies}
                            onChange={v => update("monthlyCompetencies", v)}
                        />
                    </TabsContent>

                    <TabsContent value="self" className="space-y-6 pt-4">
                        <EditableList
                            label="Self-Assessment Competencies"
                            items={draft.selfCompetencies}
                            onChange={v => update("selfCompetencies", v)}
                        />
                    </TabsContent>
                </Tabs>
            </DialogBody>
            <DialogFooter>
                <Button variant="ghost" onClick={handleReset}>Reset to Defaults</Button>
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} loading={saving}>Save Template</Button>
            </DialogFooter>
        </Dialog>
    )
}
