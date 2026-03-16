"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Cross2Icon, PlusIcon, TrashIcon, DragHandleDots2Icon, Pencil1Icon, CheckIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Spinner } from "@/components/ui/Spinner"
import { Badge } from "@/components/ui/Badge"

const FIELD_TYPE_OPTIONS = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
    { value: "dropdown", label: "Dropdown" },
    { value: "multi_select", label: "Multi Select" },
    { value: "file", label: "File Upload" },
    { value: "rich_text", label: "Rich Text" },
    { value: "user_picker", label: "User Picker" },
]

interface FieldConfig {
    id: string
    screenName: string
    fieldName: string
    fieldType: string
    label: string
    placeholder?: string | null
    required: boolean
    displayOrder: number
    defaultValue?: string | null
    options?: any
    isActive: boolean
    version: number
}

interface ConfigPanelProps {
    isOpen: boolean
    onClose: () => void
    screenName: string
    onFieldsChange?: (fields: FieldConfig[]) => void
}

// ── Sortable Field Item ──

function SortableFieldItem({
    field,
    editingId,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onDelete,
    editState,
    setEditState,
}: {
    field: FieldConfig
    editingId: string | null
    onStartEdit: (f: FieldConfig) => void
    onSaveEdit: () => void
    onCancelEdit: () => void
    onDelete: (id: string) => void
    editState: { label: string; fieldType: string; required: boolean; placeholder: string }
    setEditState: React.Dispatch<React.SetStateAction<typeof editState>>
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })
    const style = { transform: CSS.Transform.toString(transform), transition }
    const isEditing = editingId === field.id

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-3 p-3 rounded-lg border border-border bg-surface transition-all",
                isDragging && "opacity-50 shadow-lg",
                isEditing && "ring-2 ring-accent/30 border-accent/50"
            )}
        >
            <button {...attributes} {...listeners} className="cursor-grab text-text-3 hover:text-text shrink-0">
                <DragHandleDots2Icon className="w-4 h-4" />
            </button>

            {isEditing ? (
                <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                        value={editState.label}
                        onChange={e => setEditState(s => ({ ...s, label: e.target.value }))}
                        placeholder="Label"
                        className="text-sm h-8"
                    />
                    <Select
                        value={editState.fieldType}
                        onChange={e => setEditState(s => ({ ...s, fieldType: e.target.value }))}
                        options={FIELD_TYPE_OPTIONS}
                        className="text-sm h-8"
                    />
                    <Input
                        value={editState.placeholder}
                        onChange={e => setEditState(s => ({ ...s, placeholder: e.target.value }))}
                        placeholder="Placeholder text"
                        className="text-sm h-8"
                    />
                    <label className="flex items-center gap-2 text-sm text-text-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={editState.required}
                            onChange={e => setEditState(s => ({ ...s, required: e.target.checked }))}
                            className="rounded border-border"
                        />
                        Required
                    </label>
                </div>
            ) : (
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text truncate">{field.label}</span>
                        {field.required && <Badge size="sm" variant="warning">Required</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-text-3">{field.fieldName}</span>
                        <Badge size="sm">{field.fieldType}</Badge>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-1 shrink-0">
                {isEditing ? (
                    <>
                        <Button size="icon" variant="ghost" onClick={onSaveEdit} className="h-7 w-7">
                            <CheckIcon className="w-3.5 h-3.5 text-success" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={onCancelEdit} className="h-7 w-7">
                            <Cross2Icon className="w-3.5 h-3.5" />
                        </Button>
                    </>
                ) : (
                    <>
                        <Button size="icon" variant="ghost" onClick={() => onStartEdit(field)} className="h-7 w-7">
                            <Pencil1Icon className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => onDelete(field.id)} className="h-7 w-7">
                            <TrashIcon className="w-3.5 h-3.5 text-danger" />
                        </Button>
                    </>
                )}
            </div>
        </div>
    )
}

// ── Main ConfigPanel ──

export function ConfigPanel({ isOpen, onClose, screenName, onFieldsChange }: ConfigPanelProps) {
    const [mounted, setMounted] = React.useState(false)
    const [fields, setFields] = React.useState<FieldConfig[]>([])
    const [loading, setLoading] = React.useState(false)
    const [editingId, setEditingId] = React.useState<string | null>(null)
    const [editState, setEditState] = React.useState({ label: "", fieldType: "text", required: false, placeholder: "" })
    const [showAddForm, setShowAddForm] = React.useState(false)
    const [newField, setNewField] = React.useState({ fieldName: "", label: "", fieldType: "text", required: false, placeholder: "" })
    const [saving, setSaving] = React.useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    React.useEffect(() => { setMounted(true); return () => setMounted(false) }, [])

    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "unset"
        }
        return () => { document.body.style.overflow = "unset" }
    }, [isOpen])

    // Fetch fields when panel opens
    const fetchFields = React.useCallback(async () => {
        if (!screenName) return
        setLoading(true)
        try {
            const res = await fetch(`/api/workflows/fields?screenName=${encodeURIComponent(screenName)}&active=true`)
            if (res.ok) {
                const json = await res.json()
                const list = json.data?.fields ?? json.fields ?? []
                setFields(list)
            } else {
                toast.error("Failed to load fields")
            }
        } catch { toast.error("Network error loading fields") }
        finally { setLoading(false) }
    }, [screenName])

    React.useEffect(() => {
        if (isOpen) { fetchFields() }
    }, [isOpen, fetchFields])

    // Notify parent on field changes
    React.useEffect(() => {
        onFieldsChange?.(fields)
    }, [fields, onFieldsChange])

    // ── Drag reorder ──
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const oldIndex = fields.findIndex(f => f.id === active.id)
        const newIndex = fields.findIndex(f => f.id === over.id)
        const reordered = arrayMove(fields, oldIndex, newIndex)

        // Assign new displayOrder values
        const updated = reordered.map((f, i) => ({ ...f, displayOrder: i }))
        setFields(updated)

        // Persist order changes
        for (const field of updated) {
            if (field.displayOrder !== fields.find(f => f.id === field.id)?.displayOrder) {
                fetch(`/api/workflows/fields/${field.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ displayOrder: field.displayOrder }),
                }).catch(() => {})
            }
        }
    }

    // ── Add field ──
    const handleAddField = async () => {
        if (!newField.fieldName || !newField.label) {
            return toast.error("Field name and label are required")
        }
        if (!/^[a-z][a-z0-9_]*$/.test(newField.fieldName)) {
            return toast.error("Field name must be snake_case (e.g. start_date)")
        }
        setSaving(true)
        try {
            const res = await fetch("/api/workflows/fields", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    screenName,
                    fieldName: newField.fieldName,
                    fieldType: newField.fieldType,
                    label: newField.label,
                    placeholder: newField.placeholder || undefined,
                    required: newField.required,
                    displayOrder: fields.length,
                }),
            })
            if (res.ok) {
                const json = await res.json()
                const created = json.data?.created?.[0] ?? json.created?.[0]
                if (created) setFields(prev => [...prev, created])
                setNewField({ fieldName: "", label: "", fieldType: "text", required: false, placeholder: "" })
                setShowAddForm(false)
                toast.success("Field added")
            } else {
                const err = await res.json().catch(() => null)
                toast.error(err?.data?.errors?.[0]?.reason || err?.message || "Failed to add field")
            }
        } catch { toast.error("Network error") }
        finally { setSaving(false) }
    }

    // ── Edit field ──
    const handleStartEdit = (f: FieldConfig) => {
        setEditingId(f.id)
        setEditState({ label: f.label, fieldType: f.fieldType, required: f.required, placeholder: f.placeholder || "" })
    }

    const handleSaveEdit = async () => {
        if (!editingId) return
        setSaving(true)
        try {
            const res = await fetch(`/api/workflows/fields/${editingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    label: editState.label,
                    fieldType: editState.fieldType,
                    required: editState.required,
                    placeholder: editState.placeholder || undefined,
                }),
            })
            if (res.ok) {
                const json = await res.json()
                const updated = json.data ?? json
                setFields(prev => prev.map(f => f.id === editingId ? { ...f, ...updated } : f))
                setEditingId(null)
                toast.success("Field updated")
            } else {
                toast.error("Failed to update field")
            }
        } catch { toast.error("Network error") }
        finally { setSaving(false) }
    }

    // ── Delete field ──
    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/workflows/fields/${id}`, { method: "DELETE" })
            if (res.ok) {
                setFields(prev => prev.filter(f => f.id !== id))
                toast.success("Field removed")
            } else {
                toast.error("Failed to remove field")
            }
        } catch { toast.error("Network error") }
    }

    if (!mounted || !isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div className="flex-1 bg-black/40 backdrop-blur-sm animate-fade-in-overlay" onClick={onClose} />

            {/* Slide-over panel */}
            <div className="w-full max-w-md bg-surface border-l border-border shadow-2xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div>
                        <h2 className="text-lg font-bold text-text">Configure Fields</h2>
                        <p className="text-xs text-text-3 mt-0.5">{screenName}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-md hover:bg-bg-2 text-text-3 hover:text-text transition-colors">
                        <Cross2Icon className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Spinner size="lg" className="text-accent" />
                        </div>
                    ) : fields.length === 0 && !showAddForm ? (
                        <div className="text-center py-12 text-text-3 text-sm">
                            No fields configured for this screen yet.
                        </div>
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                {fields.map(field => (
                                    <SortableFieldItem
                                        key={field.id}
                                        field={field}
                                        editingId={editingId}
                                        onStartEdit={handleStartEdit}
                                        onSaveEdit={handleSaveEdit}
                                        onCancelEdit={() => setEditingId(null)}
                                        onDelete={handleDelete}
                                        editState={editState}
                                        setEditState={setEditState}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    )}

                    {/* Add Field Form */}
                    {showAddForm && (
                        <div className="p-3 rounded-lg border-2 border-dashed border-accent/30 bg-accent/5 space-y-3">
                            <h3 className="text-sm font-semibold text-text">New Field</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    label="Label"
                                    value={newField.label}
                                    onChange={e => setNewField(s => ({ ...s, label: e.target.value }))}
                                    placeholder="e.g. Start Date"
                                    className="text-sm h-8"
                                />
                                <Input
                                    label="Field Name"
                                    value={newField.fieldName}
                                    onChange={e => setNewField(s => ({ ...s, fieldName: e.target.value }))}
                                    placeholder="e.g. start_date"
                                    className="text-sm h-8"
                                />
                                <Select
                                    label="Type"
                                    value={newField.fieldType}
                                    onChange={e => setNewField(s => ({ ...s, fieldType: e.target.value }))}
                                    options={FIELD_TYPE_OPTIONS}
                                    className="text-sm h-8"
                                />
                                <Input
                                    label="Placeholder"
                                    value={newField.placeholder}
                                    onChange={e => setNewField(s => ({ ...s, placeholder: e.target.value }))}
                                    placeholder="Optional"
                                    className="text-sm h-8"
                                />
                            </div>
                            <label className="flex items-center gap-2 text-sm text-text-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={newField.required}
                                    onChange={e => setNewField(s => ({ ...s, required: e.target.checked }))}
                                    className="rounded border-border"
                                />
                                Required field
                            </label>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={handleAddField} disabled={saving}>
                                    {saving ? <Spinner size="sm" /> : "Add Field"}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border">
                    {!showAddForm && (
                        <Button
                            variant="secondary"
                            leftIcon={<PlusIcon className="w-4 h-4" />}
                            onClick={() => setShowAddForm(true)}
                            className="w-full border-dashed"
                        >
                            Add Field
                        </Button>
                    )}
                    <p className="text-xs text-text-3 mt-2 text-center">
                        {fields.length} field{fields.length !== 1 ? "s" : ""} configured
                        {saving && " · Saving..."}
                    </p>
                </div>
            </div>
        </div>,
        document.body
    )
}
