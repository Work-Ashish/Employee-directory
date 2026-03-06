"use client"

import React, { useState } from "react"
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragOverEvent,
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
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/Badge"
// import confetti from "canvas-confetti"

// Mock Data
type Candidate = {
    id: string
    name: string
    role: string
    initials: string
    color: string
}

type Column = {
    id: string
    title: string
    items: Candidate[]
}

const initialData: Column[] = [
    {
        id: "applied",
        title: "Applied",
        items: [
            { id: "c1", name: "Jenny Wilson", role: "Product Manager", initials: "JW", color: "from-[#38bdf8] to-[#0ea5e9]" },
            { id: "c2", name: "Devon Lane", role: "Qa Engineer", initials: "DL", color: "from-[#f59e0b] to-[#d97706]" },
        ],
    },
    {
        id: "screening",
        title: "Screening",
        items: [
            { id: "c3", name: "Cody Fisher", role: "Marketing Specialist", initials: "CF", color: "from-[#10b981] to-[#059669]" },
        ],
    },
    {
        id: "interview",
        title: "Interview",
        items: [
            { id: "c4", name: "Robert Fox", role: "Senior UX Designer", initials: "RF", color: "from-[#ec4899] to-[#f43f5e]" },
            { id: "c5", name: "Guy Hawkins", role: "DevOps Engineer", initials: "GH", color: "from-[#a78bfa] to-[#5856d6]" },
        ],
    },
    {
        id: "offer",
        title: "Offer",
        items: [
            { id: "c6", name: "Jacob Jones", role: "Frontend Developer", initials: "JJ", color: "from-[#f59e0b] to-[#d97706]" },
        ],
    },
    {
        id: "hired",
        title: "Hired",
        items: [],
    },
]

export function RecruitmentKanban() {
    const [columns, setColumns] = useState<Column[]>(initialData)
    const [activeId, setActiveId] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const findColumn = (id: string) => {
        return columns.find((col) => col.items.some((item) => item.id === id) || col.id === id)
    }

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        // Find the containers
        const activeColumn = findColumn(activeId)
        const overColumn = findColumn(overId)

        if (!activeColumn || !overColumn || activeColumn === overColumn) {
            return
        }

        setColumns((prev) => {
            const activeItems = activeColumn.items
            const overItems = overColumn.items
            const activeIndex = activeItems.findIndex((i) => i.id === activeId)
            const overIndex = overItems.findIndex((i) => i.id === overId)

            let newIndex
            if (overId === overColumn.id) {
                newIndex = overItems.length + 1
            } else {
                const isBelowOverItem =
                    over &&
                    active.rect.current.translated &&
                    active.rect.current.translated.top > over.rect.top + over.rect.height
                const modifier = isBelowOverItem ? 1 : 0
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1
            }

            return prev.map((c) => {
                if (c.id === activeColumn.id) {
                    return { ...c, items: activeItems.filter((i) => i.id !== activeId) }
                } else if (c.id === overColumn.id) {
                    return {
                        ...c,
                        items: [
                            ...overItems.slice(0, newIndex),
                            activeItems[activeIndex],
                            ...overItems.slice(newIndex, overItems.length),
                        ],
                    }
                } else {
                    return c
                }
            })
        })
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        const activeId = active.id as string
        const overId = over ? (over.id as string) : null

        const activeColumn = findColumn(activeId)
        const overColumn = overId ? findColumn(overId) : null

        if (
            activeColumn &&
            overColumn &&
            activeColumn === overColumn
        ) {
            const activeIndex = activeColumn.items.findIndex((i) => i.id === activeId)
            const overIndex = overColumn.items.findIndex((i) => i.id === overId)

            if (activeIndex !== overIndex) {
                setColumns((prev) => {
                    return prev.map((col) => {
                        if (col.id === activeColumn.id) {
                            return {
                                ...col,
                                items: arrayMove(col.items, activeIndex, overIndex),
                            }
                        }
                        return col
                    })
                })
            }
        }

        // Check for "Hired" column drop
        if (overColumn && overColumn.id === 'hired' && activeColumn?.id !== 'hired') {
            // Trigger confetti
            import("canvas-confetti").then((confetti) => {
                confetti.default({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                })
            })
        }

        setActiveId(null)
    }

    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: "0.5",
                },
            },
        }),
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)]">
                {columns.map((col) => (
                    <div key={col.id} className="w-[280px] shrink-0 flex flex-col">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-sm font-bold text-text-3 uppercase tracking-wider">{col.title}</span>
                            <Badge variant="neutral" size="sm" className="font-mono">{col.items.length}</Badge>
                        </div>
                        <div className="flex-1 bg-bg-2 rounded-[12px] p-2 border border-border">
                            <SortableContext
                                items={col.items.map((i) => i.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="flex flex-col gap-2 min-h-[100px]">
                                    {col.items.map((candidate) => (
                                        <SortableItem key={candidate.id} candidate={candidate} />
                                    ))}
                                </div>
                            </SortableContext>
                        </div>
                    </div>
                ))}
            </div>
            <DragOverlay dropAnimation={dropAnimation}>
                {activeId ? (
                    <CandidateCard candidate={
                        columns.flatMap(c => c.items).find(i => i.id === activeId)!
                    } isOverlay />
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}

function SortableItem({ candidate }: { candidate: Candidate }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: candidate.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <CandidateCard candidate={candidate} />
        </div>
    )
}

function CandidateCard({ candidate, isOverlay }: { candidate: Candidate, isOverlay?: boolean }) {
    return (
        <div className={cn(
            "bg-surface p-3 rounded-[10px] border border-border shadow-sm cursor-grab active:cursor-grabbing group hover:border-accent hover:shadow-md transition-all",
            isOverlay && "cursor-grabbing scale-105 shadow-xl rotate-2"
        )}>
            <div className="flex items-center gap-3 mb-2">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 bg-gradient-to-br", candidate.color)}>
                    {candidate.initials}
                </div>
                <div className="flex flex-col overflow-hidden">
                    <span className="text-base font-semibold text-text truncate">{candidate.name}</span>
                    <span className="text-xs text-text-3 truncate">{candidate.role}</span>
                </div>
            </div>
            <div className="flex items-center justify-between mt-2">
                <div className="text-[10px] text-text-4 flex items-center gap-1">
                    <span>File</span>
                    <span>•</span>
                    <span>2d ago</span>
                </div>
            </div>
        </div>
    )
}
