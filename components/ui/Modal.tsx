"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Cross2Icon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    className?: string
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!mounted) return null

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_both]">
            <div
                className={cn(
                    "bg-surface border border-border w-full max-w-md rounded-xl shadow-2xl relative animate-[scaleIn_0.3s_both] flex flex-col max-h-[90vh]",
                    className
                )}
            >
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-bold text-text">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-bg-2 text-text-3 hover:text-text transition-colors"
                    >
                        <Cross2Icon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    )
}
