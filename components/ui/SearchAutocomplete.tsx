"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import { MagnifyingGlassIcon, PersonIcon, FileTextIcon, ReaderIcon } from "@radix-ui/react-icons"

interface Suggestion {
    entityType: string
    entityId: string
    title: string
    subtitle: string | null
    metadata: Record<string, unknown>
}

interface SearchAutocompleteProps {
    /** Optional callback when a result is selected. If not provided, navigates to entity page. */
    onSelect?: (entityType: string, entityId: string) => void
    placeholder?: string
    className?: string
}

const ENTITY_ROUTES: Record<string, string> = {
    EMPLOYEE: "/employees",
    CANDIDATE: "/recruitment",
    DOCUMENT: "/documents",
}

const ENTITY_LABELS: Record<string, string> = {
    EMPLOYEE: "Employee",
    CANDIDATE: "Candidate",
    DOCUMENT: "Document",
}

const ENTITY_COLORS: Record<string, string> = {
    EMPLOYEE: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    CANDIDATE: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    DOCUMENT: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
}

function EntityIcon({ type }: { type: string }) {
    switch (type) {
        case "EMPLOYEE": return <PersonIcon className="w-4 h-4" />
        case "CANDIDATE": return <ReaderIcon className="w-4 h-4" />
        case "DOCUMENT": return <FileTextIcon className="w-4 h-4" />
        default: return <PersonIcon className="w-4 h-4" />
    }
}

export function SearchAutocomplete({
    onSelect,
    placeholder = "Quick search employees, departments...",
    className,
}: SearchAutocompleteProps) {
    const router = useRouter()
    const [query, setQuery] = React.useState("")
    const [suggestions, setSuggestions] = React.useState<Suggestion[]>([])
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    // Debounced fetch
    React.useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)

        if (!query.trim()) {
            setSuggestions([])
            setOpen(false)
            return
        }

        debounceRef.current = setTimeout(async () => {
            setLoading(true)
            try {
                const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query.trim())}&limit=8`)
                if (res.ok) {
                    const json = await res.json()
                    const items = json.data?.suggestions ?? []
                    setSuggestions(items)
                    setOpen(items.length > 0)
                }
            } catch {
                // silently fail
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [query])

    // Close on outside click
    React.useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    // Ctrl+K focus
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                const input = containerRef.current?.querySelector("input")
                input?.focus()
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const handleSelect = React.useCallback((suggestion: Suggestion) => {
        setOpen(false)
        setQuery("")
        setSuggestions([])

        if (onSelect) {
            onSelect(suggestion.entityType, suggestion.entityId)
            return
        }

        // Default navigation
        const base = ENTITY_ROUTES[suggestion.entityType] || "/employees"
        router.push(base)
    }, [onSelect, router])

    return (
        <div ref={containerRef} className={`relative flex-1 max-w-[380px] ${className ?? ""}`} role="search">
            <Command shouldFilter={false} className="relative">
                <div className="relative">
                    <MagnifyingGlassIcon
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-4 w-3.5 h-3.5 pointer-events-none"
                        aria-hidden="true"
                    />
                    <Command.Input
                        value={query}
                        onValueChange={(v) => {
                            setQuery(v)
                            if (!v.trim()) setOpen(false)
                        }}
                        onFocus={() => {
                            if (suggestions.length > 0) setOpen(true)
                        }}
                        placeholder={placeholder}
                        aria-label="Search employees, candidates, and documents"
                        className="input-base w-full pl-10 pr-16 py-2 text-sm"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        {loading && (
                            <div className="w-3.5 h-3.5 border-2 border-text-4 border-t-accent rounded-full animate-spin" />
                        )}
                        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-text-4 bg-bg-2 border border-border rounded">
                            Ctrl K
                        </kbd>
                    </div>
                </div>

                {open && (
                    <Command.List className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-xl border border-border bg-surface shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="max-h-[320px] overflow-y-auto p-1">
                            {suggestions.length === 0 ? (
                                <div className="py-6 text-center text-sm text-text-3">No results found.</div>
                            ) : (
                                suggestions.map((s) => (
                                    <Command.Item
                                        key={`${s.entityType}-${s.entityId}`}
                                        value={`${s.title} ${s.subtitle ?? ""}`}
                                        onSelect={() => handleSelect(s)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-text hover:bg-bg-2 data-[selected=true]:bg-accent/8 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-bg-2 flex items-center justify-center shrink-0 text-text-3">
                                            <EntityIcon type={s.entityType} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-text truncate">{s.title}</div>
                                            {s.subtitle && (
                                                <div className="text-xs text-text-3 truncate">{s.subtitle}</div>
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${ENTITY_COLORS[s.entityType] ?? "bg-gray-100 text-gray-600"}`}>
                                            {ENTITY_LABELS[s.entityType] ?? s.entityType}
                                        </span>
                                    </Command.Item>
                                ))
                            )}
                        </div>
                        <div className="border-t border-border px-3 py-1.5 flex items-center justify-between bg-bg">
                            <span className="text-[10px] text-text-4">
                                <kbd className="font-sans border border-border-2 rounded-[3px] px-1 bg-surface">↑</kbd>{" "}
                                <kbd className="font-sans border border-border-2 rounded-[3px] px-1 bg-surface">↓</kbd> navigate
                            </span>
                            <span className="text-[10px] text-text-4">
                                <kbd className="font-sans border border-border-2 rounded-[3px] px-1 bg-surface">↵</kbd> select
                            </span>
                            <span className="text-[10px] text-text-4">
                                <kbd className="font-sans border border-border-2 rounded-[3px] px-1 bg-surface">Esc</kbd> close
                            </span>
                        </div>
                    </Command.List>
                )}
            </Command>
        </div>
    )
}
