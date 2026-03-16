"use client"

import * as React from "react"
import { Command } from "cmdk"
import { cn } from "@/lib/utils"
import { Avatar } from "@/components/ui/Avatar"
import { MagnifyingGlassIcon, CheckIcon, ChevronDownIcon } from "@radix-ui/react-icons"

export interface ComboboxOption {
    value: string
    label: string
    description?: string
    avatar?: string | null
}

interface ComboboxProps {
    options: ComboboxOption[]
    value?: string
    onValueChange: (value: string) => void
    placeholder?: string
    label?: string
    error?: string
    disabled?: boolean
    searchPlaceholder?: string
    emptyMessage?: string
    className?: string
}

export function Combobox({
    options,
    value,
    onValueChange,
    placeholder = "Select...",
    label,
    error,
    disabled,
    searchPlaceholder = "Search...",
    emptyMessage = "No results found.",
    className,
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")
    const containerRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    React.useEffect(() => {
        if (!open) setSearch("")
    }, [open])

    const selected = options.find((o) => o.value === value)

    return (
        <div ref={containerRef} className={cn("flex flex-col gap-1.5 relative", className)}>
            {label && <label className="text-sm font-medium text-text-2">{label}</label>}

            <button
                type="button"
                onClick={() => !disabled && setOpen(!open)}
                disabled={disabled}
                className={cn(
                    "input-base w-full text-left flex items-center justify-between gap-2 min-h-[42px]",
                    error && "border-danger focus:ring-danger/20 focus:border-danger",
                    disabled && "opacity-60 cursor-not-allowed",
                    open && "ring-2 ring-accent/20 border-accent"
                )}
            >
                {selected ? (
                    <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                        {selected.avatar !== undefined && (
                            <Avatar name={selected.label} src={selected.avatar} size="xs" />
                        )}
                        <div className="truncate">
                            <span className="text-sm font-medium text-text">{selected.label}</span>
                            {selected.description && (
                                <span className="text-xs text-text-3 ml-1.5">— {selected.description}</span>
                            )}
                        </div>
                    </div>
                ) : (
                    <span className="text-sm text-text-3 truncate">{placeholder}</span>
                )}
                <ChevronDownIcon
                    className={cn(
                        "w-4 h-4 text-text-3 shrink-0 transition-transform duration-200",
                        open && "rotate-180"
                    )}
                />
            </button>

            {open && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-xl border border-border bg-surface shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    <Command shouldFilter={true}>
                        <div className="flex items-center border-b border-border px-3 gap-2">
                            <MagnifyingGlassIcon className="w-4 h-4 text-text-3 shrink-0" />
                            <Command.Input
                                value={search}
                                onValueChange={setSearch}
                                placeholder={searchPlaceholder}
                                className="flex-1 py-2.5 text-sm bg-transparent outline-none text-text placeholder:text-text-3"
                            />
                        </div>
                        <Command.List className="max-h-[220px] overflow-y-auto p-1">
                            <Command.Empty className="py-8 text-center text-sm text-text-3">
                                {emptyMessage}
                            </Command.Empty>
                            {options.map((opt) => (
                                <Command.Item
                                    key={opt.value}
                                    value={opt.label}
                                    onSelect={() => {
                                        onValueChange(opt.value)
                                        setOpen(false)
                                    }}
                                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-text hover:bg-bg-2 data-[selected=true]:bg-accent/8 transition-colors"
                                >
                                    {opt.avatar !== undefined && (
                                        <Avatar name={opt.label} src={opt.avatar} size="xs" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-text truncate">{opt.label}</div>
                                        {opt.description && (
                                            <div className="text-[11px] text-text-3 truncate">{opt.description}</div>
                                        )}
                                    </div>
                                    {opt.value === value && (
                                        <CheckIcon className="w-4 h-4 text-accent shrink-0" />
                                    )}
                                </Command.Item>
                            ))}
                        </Command.List>
                    </Command>
                </div>
            )}

            {error && <p className="text-xs text-danger mt-0.5">{error}</p>}
        </div>
    )
}
