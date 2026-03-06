"use client"

import React, { useEffect, useState } from "react"
import { PlusIcon, TrashIcon, RocketIcon, ReloadIcon, DownloadIcon, CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons"
import { toast, Toaster } from "react-hot-toast"
import { Modal } from "@/components/ui/Modal"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { webhookSchema } from "@/lib/schemas/integrations"
import { cn } from "@/lib/utils"

const AVAILABLE_EVENTS = [
    { value: "employee.created", label: "Employee Created" },
    { value: "employee.updated", label: "Employee Updated" },
    { value: "payroll.finalized", label: "Payroll Finalized" },
    { value: "attendance.late", label: "Late Attendance" },
]

export default function IntegrationsPage() {
    const [webhooks, setWebhooks] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [exportLoading, setExportLoading] = useState(false)

    const form = useForm({
        resolver: zodResolver(webhookSchema),
        defaultValues: {
            url: "",
            secret: "",
            events: [] as string[],
            isActive: true
        }
    })

    const fetchWebhooks = async () => {
        try {
            setIsLoading(true)
            const res = await fetch("/api/settings/webhooks")
            if (res.ok) {
                const data = await res.json()
                setWebhooks(data.data || [])
            }
        } catch (error) {
            toast.error("Failed to load webhooks")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchWebhooks()
    }, [])

    const onSubmit = async (data: any) => {
        try {
            const res = await fetch("/api/settings/webhooks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            })
            if (res.ok) {
                toast.success("Webhook created successfully")
                setIsModalOpen(false)
                fetchWebhooks()
            } else {
                const err = await res.json()
                toast.error(err.message || "Failed to create webhook")
            }
        } catch (error) {
            toast.error("An error occurred")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this webhook?")) return
        try {
            const res = await fetch(`/api/settings/webhooks/${id}`, { method: "DELETE" })
            if (res.ok) {
                toast.success("Webhook deleted")
                fetchWebhooks()
            }
        } catch (error) {
            toast.error("Failed to delete webhook")
        }
    }

    const handleExport = async (platform: string) => {
        const now = new Date()
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
        try {
            setExportLoading(true)
            const res = await fetch(`/api/integrations/export?platform=${platform}&month=${month}`)
            if (res.ok) {
                const blob = await res.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `payroll_${platform.toLowerCase()}_${month}.csv`
                document.body.appendChild(a)
                a.click()
                a.remove()
                toast.success(`${platform} export downloaded`)
            } else {
                const err = await res.json()
                toast.error(err.message || "Export failed")
            }
        } catch (error) {
            toast.error("Export failed")
        } finally {
            setExportLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
            <Toaster position="top-right" />

            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text)]">Integrations</h1>
                    <p className="text-[var(--text3)] mt-2">Connect your HRMS data with external platforms.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-[var(--accent)] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all active:scale-95"
                    >
                        <PlusIcon className="w-5 h-5" /> Add Webhook
                    </button>
                </div>
            </header>

            <section className="grid md:grid-cols-3 gap-8">
                {/* Webhooks List */}
                <div className="md:col-span-2 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <RocketIcon className="w-5 h-5 text-[var(--accent)]" />
                        <h2 className="text-xl font-bold">Outbound Webhooks</h2>
                    </div>

                    {isLoading ? (
                        <div className="glass p-12 text-center text-[var(--text3)] rounded-2xl">Loading webhooks...</div>
                    ) : webhooks.length === 0 ? (
                        <div className="glass p-12 text-center text-[var(--text3)] rounded-2xl border-dashed border-2">
                            No webhooks configured. Add one to start syncing data.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {webhooks.map((wh) => (
                                <div key={wh.id} className="glass p-5 rounded-2xl flex justify-between items-center group hover:border-[var(--accent)] transition-all">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-[15px] max-w-[300px] truncate">{wh.url}</span>
                                            {wh.isActive ? (
                                                <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-bold rounded-full uppercase tracking-wider">Active</span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-gray-500/10 text-[var(--text3)] text-[10px] font-bold rounded-full uppercase tracking-wider">Disabled</span>
                                            )}
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {wh.events.map((e: string) => (
                                                <span key={e} className="text-[11px] text-[var(--text3)] bg-[var(--bg2)] px-2 py-1 rounded-md">{e}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(wh.id)}
                                        className="p-2.5 text-[var(--red)] hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Accounting Sidebar */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <DownloadIcon className="w-5 h-5 text-[var(--accent)]" />
                        <h2 className="text-xl font-bold">Accounting Sync</h2>
                    </div>

                    <div className="glass p-6 rounded-2xl space-y-6">
                        <div className="p-4 bg-[var(--bg2)] rounded-xl flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-bold text-blue-600 text-xl shadow-sm">QB</div>
                            <div className="flex-1">
                                <div className="text-sm font-bold">Quickbooks</div>
                                <div className="text-[11px] text-[var(--text3)]">Export payroll entries</div>
                            </div>
                            <button
                                onClick={() => handleExport("QUICKBOOKS")}
                                disabled={exportLoading}
                                className="p-2 hover:bg-[var(--bg)] rounded-lg transition-colors disabled:opacity-50"
                            >
                                <DownloadIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 bg-[var(--bg2)] rounded-xl flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#13B5EA] rounded-lg flex items-center justify-center font-bold text-white text-xl shadow-sm">X</div>
                            <div className="flex-1">
                                <div className="text-sm font-bold">Xero</div>
                                <div className="text-[11px] text-[var(--text3)]">Direct bank import file</div>
                            </div>
                            <button
                                onClick={() => handleExport("XERO")}
                                disabled={exportLoading}
                                className="p-2 hover:bg-[var(--bg)] rounded-lg transition-colors disabled:opacity-50"
                            >
                                <DownloadIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-[11px] text-[var(--text3)] italic">
                            Exports include all finalized payroll records for the current period (Mar 2024).
                        </p>
                    </div>
                </div>
            </section>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Configure New Webhook"
            >
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[13px] font-bold text-[var(--text2)]">Payload URL</label>
                        <input
                            {...form.register("url")}
                            placeholder="Enter your webhook endpoint URL"
                            className="w-full p-3 bg-[var(--bg2)] border border-[var(--border)] rounded-xl text-sm focus:border-[var(--accent)] outline-none"
                        />
                        {form.formState.errors.url && <p className="text-[11px] text-[var(--red)]">{form.formState.errors.url.message as string}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[13px] font-bold text-[var(--text2)]">Secret (Optional)</label>
                        <input
                            {...form.register("secret")}
                            type="password"
                            placeholder="HMAC secret for signing"
                            className="w-full p-3 bg-[var(--bg2)] border border-[var(--border)] rounded-xl text-sm focus:border-[var(--accent)] outline-none"
                        />
                        <p className="text-[10px] text-[var(--text3)]">Used to calculate X-EMS-Signature header.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[13px] font-bold text-[var(--text2)]">Subscribed Events</label>
                        <div className="grid grid-cols-2 gap-3">
                            {AVAILABLE_EVENTS.map(event => (
                                <label
                                    key={event.value}
                                    className={cn(
                                        "flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all",
                                        form.watch("events").includes(event.value)
                                            ? "border-[var(--accent)] bg-[rgba(0,122,255,0.05)]"
                                            : "border-[var(--border)] bg-[var(--bg2)]"
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        value={event.value}
                                        className="hidden"
                                        onChange={(e) => {
                                            const current = form.getValues("events")
                                            if (e.target.checked) {
                                                form.setValue("events", [...current, event.value])
                                            } else {
                                                form.setValue("events", current.filter(v => v !== event.value))
                                            }
                                        }}
                                    />
                                    <span className="text-[12px] font-medium">{event.label}</span>
                                    {form.watch("events").includes(event.value) && <CheckCircledIcon className="ml-auto w-4 h-4 text-[var(--accent)]" />}
                                </label>
                            ))}
                        </div>
                        {form.formState.errors.events && <p className="text-[11px] text-[var(--red)]">{form.formState.errors.events.message as string}</p>}
                    </div>

                    <div className="pt-6 border-t border-[var(--border)] flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[var(--bg2)] text-[var(--text2)]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.formState.isSubmitting}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[var(--accent)] text-white disabled:opacity-50"
                        >
                            {form.formState.isSubmitting ? "Saving..." : "Create Webhook"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
