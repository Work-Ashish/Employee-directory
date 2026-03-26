"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import { MagnifyingGlassIcon, FileTextIcon, PersonIcon, CalendarIcon, GearIcon, ComponentPlaceholderIcon } from "@radix-ui/react-icons"

export function CommandPalette() {
    const [open, setOpen] = React.useState(false)
    const router = useRouter()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
            if (e.key === "Escape") {
                setOpen(false)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false)
        command()
    }, [])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[14vh] animate-in fade-in duration-200" onClick={() => setOpen(false)}>
            <Command className="w-full max-w-[640px] bg-surface rounded-xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center border-b border-border px-3 bg-glass-bg">
                    <MagnifyingGlassIcon className="mr-2 h-5 w-5 shrink-0 opacity-50" />
                    <Command.Input
                        placeholder="Type a command or search..."
                        className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-text-4 text-text disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 scrollbar-hide">
                    <Command.Empty className="py-6 text-center text-sm text-text-3">No results found.</Command.Empty>

                    <Command.Group heading="Pages" className="text-xs font-bold text-text-3 uppercase tracking-wider mb-2 px-2 mt-2">
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/'))}
                            className="flex items-center gap-2 px-2 py-2 text-base text-text rounded-md cursor-pointer hover:bg-accent hover:text-white transition-colors aria-selected:bg-accent aria-selected:text-white group"
                        >
                            <ComponentPlaceholderIcon className="w-4 h-4 text-text-3 group-hover:text-white" />
                            Dashboard
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/employees'))}
                            className="flex items-center gap-2 px-2 py-2 text-base text-text rounded-md cursor-pointer hover:bg-accent hover:text-white transition-colors aria-selected:bg-accent aria-selected:text-white group"
                        >
                            <PersonIcon className="w-4 h-4 text-text-3 group-hover:text-white" />
                            Employees
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/organization'))}
                            className="flex items-center gap-2 px-2 py-2 text-base text-text rounded-md cursor-pointer hover:bg-accent hover:text-white transition-colors aria-selected:bg-accent aria-selected:text-white group"
                        >
                            <span className="w-4 h-4 text-text-3 group-hover:text-white flex items-center justify-center font-bold text-[10px]">ORG</span>
                            Organization
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/leave'))}
                            className="flex items-center gap-2 px-2 py-2 text-base text-text rounded-md cursor-pointer hover:bg-accent hover:text-white transition-colors aria-selected:bg-accent aria-selected:text-white group"
                        >
                            <CalendarIcon className="w-4 h-4 text-text-3 group-hover:text-white" />
                            Leave Management
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/settings'))}
                            className="flex items-center gap-2 px-2 py-2 text-base text-text rounded-md cursor-pointer hover:bg-accent hover:text-white transition-colors aria-selected:bg-accent aria-selected:text-white group"
                        >
                            <GearIcon className="w-4 h-4 text-text-3 group-hover:text-white" />
                            Settings
                        </Command.Item>
                    </Command.Group>

                    <div className="h-[1px] bg-border my-2 mx-2" />

                    <Command.Group heading="Actions" className="text-xs font-bold text-text-3 uppercase tracking-wider mb-2 px-2">
                        <Command.Item onSelect={() => runCommand(() => router.push('/employees'))} className="flex items-center gap-2 px-2 py-2 text-base text-text rounded-md cursor-pointer hover:bg-accent hover:text-white transition-colors aria-selected:bg-accent aria-selected:text-white group">
                            <span className="w-4 h-4 flex items-center justify-center text-[10px] border border-current rounded-full group-hover:border-white opacity-60">+</span>
                            New Employee
                        </Command.Item>
                        <Command.Item onSelect={() => runCommand(() => router.push('/leave'))} className="flex items-center gap-2 px-2 py-2 text-base text-text rounded-md cursor-pointer hover:bg-accent hover:text-white transition-colors aria-selected:bg-accent aria-selected:text-white group">
                            <span className="w-4 h-4 flex items-center justify-center text-[10px] border border-current rounded-full group-hover:border-white opacity-60">✉️</span>
                            Request Leave
                        </Command.Item>
                    </Command.Group>
                </Command.List>
                <div className="border-t border-border px-4 py-2 flex items-center justify-between bg-bg">
                    <span className="text-xs text-text-3">
                        <kbd className="font-sans border border-border-2 rounded-[4px] px-1 bg-surface">↑</kbd> <kbd className="font-sans border border-border-2 rounded-[4px] px-1 bg-surface">↓</kbd> to navigate
                    </span>
                    <span className="text-xs text-text-3">
                        <kbd className="font-sans border border-border-2 rounded-[4px] px-1 bg-surface">↵</kbd> to select
                    </span>
                </div>
            </Command>
        </div>
    )
}
