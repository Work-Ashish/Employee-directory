"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { canAccessModule, Module } from "@/lib/permissions"
import { PlusIcon, TrashIcon, RocketIcon, DownloadIcon, CheckCircledIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"
import { api } from "@/lib/api-client"
import { Modal } from "@/components/ui/Modal"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { webhookSchema } from "@/lib/schemas/integrations"
import { cn } from "@/lib/utils"
import { confirmDanger, confirmAction, showSuccess } from "@/lib/swal"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { PageHeader } from "@/components/ui/PageHeader"
import { Spinner } from "@/components/ui/Spinner"

const AVAILABLE_EVENTS = [
    { value: "employee.created", label: "Employee Created" },
    { value: "employee.updated", label: "Employee Updated" },
    { value: "payroll.finalized", label: "Payroll Finalized" },
    { value: "attendance.late", label: "Late Attendance" },
]

export default function IntegrationsPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
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
            const { data } = await api.get<any>('/settings/webhooks/')
            setWebhooks(data.data || data || [])
        } catch {
            // Webhooks endpoint not yet available — show empty state
            setWebhooks([])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (!authLoading && !canAccessModule(user?.role ?? "", Module.SETTINGS)) {
            router.push("/")
        }
    }, [user, authLoading, router])

    useEffect(() => {
        if (!authLoading) fetchWebhooks()
    }, [authLoading])

    const onSubmit = async (formData: any) => {
        try {
            await api.post('/settings/webhooks/', formData)
            toast.success("Webhook created successfully")
            setIsModalOpen(false)
            fetchWebhooks()
        } catch (error: any) {
            toast.error(error?.data?.message || error?.message || "Failed to create webhook")
        }
    }

    const handleDelete = async (id: string) => {
        if (!await confirmDanger("Delete Webhook?", "This webhook will be permanently removed.")) return
        try {
            await api.delete('/settings/webhooks/' + id + '/')
            showSuccess("Deleted", "Webhook removed successfully")
            fetchWebhooks()
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

    if (authLoading || !canAccessModule(user?.role ?? "", Module.SETTINGS)) return null

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
            <PageHeader
                title="Integrations"
                description="Connect your HRMS data with external platforms."
                actions={
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        leftIcon={<PlusIcon className="w-5 h-5" />}
                        size="lg"
                    >
                        Add Webhook
                    </Button>
                }
            />

            <section className="grid md:grid-cols-3 gap-8">
                {/* Webhooks List */}
                <div className="md:col-span-2 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <RocketIcon className="w-5 h-5 text-accent" />
                        <h2 className="text-xl font-bold">Outbound Webhooks</h2>
                    </div>

                    {isLoading ? (
                        <div className="glass p-12 text-center text-text-3 rounded-2xl flex items-center justify-center gap-2">
                            <Spinner /> Loading webhooks...
                        </div>
                    ) : webhooks.length === 0 ? (
                        <div className="glass p-12 text-center text-text-3 rounded-2xl border-dashed border-2">
                            No webhooks configured. Add one to start syncing data.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {webhooks.map((wh) => (
                                <div key={wh.id} className="glass p-5 rounded-2xl flex justify-between items-center group hover:border-accent transition-all">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-[15px] max-w-[300px] truncate">{wh.url}</span>
                                            {wh.isActive ? (
                                                <Badge variant="success" size="sm" dot>Active</Badge>
                                            ) : (
                                                <Badge variant="neutral" size="sm">Disabled</Badge>
                                            )}
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {wh.events.map((e: string) => (
                                                <span key={e} className="text-[11px] text-text-3 bg-bg-2 px-2 py-1 rounded-md">{e}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <Button
                                        variant="danger"
                                        size="icon"
                                        onClick={() => handleDelete(wh.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Accounting Sidebar */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <DownloadIcon className="w-5 h-5 text-accent" />
                        <h2 className="text-xl font-bold">Accounting Sync</h2>
                    </div>

                    <div className="glass p-6 rounded-2xl space-y-6">
                        <div className="p-4 bg-bg-2 rounded-xl flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-bold text-blue-600 text-xl shadow-sm">QB</div>
                            <div className="flex-1">
                                <div className="text-sm font-bold">Quickbooks</div>
                                <div className="text-[11px] text-text-3">Export payroll entries</div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleExport("QUICKBOOKS")}
                                disabled={exportLoading}
                            >
                                <DownloadIcon className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="p-4 bg-bg-2 rounded-xl flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#13B5EA] rounded-lg flex items-center justify-center font-bold text-white text-xl shadow-sm">X</div>
                            <div className="flex-1">
                                <div className="text-sm font-bold">Xero</div>
                                <div className="text-[11px] text-text-3">Direct bank import file</div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleExport("XERO")}
                                disabled={exportLoading}
                            >
                                <DownloadIcon className="w-5 h-5" />
                            </Button>
                        </div>

                        <p className="text-[11px] text-text-3 italic">
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
                    <Input
                        label="Payload URL"
                        {...form.register("url")}
                        placeholder="Enter your webhook endpoint URL"
                        error={form.formState.errors.url?.message as string}
                    />

                    <div className="space-y-1.5">
                        <Input
                            label="Secret (Optional)"
                            {...form.register("secret")}
                            type="password"
                            placeholder="HMAC secret for signing"
                        />
                        <p className="text-[10px] text-text-3">Used to calculate X-EMS-Signature header.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-2">Subscribed Events</label>
                        <div className="grid grid-cols-2 gap-3">
                            {AVAILABLE_EVENTS.map(event => (
                                <label
                                    key={event.value}
                                    className={cn(
                                        "flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all",
                                        form.watch("events").includes(event.value)
                                            ? "border-accent bg-accent/5"
                                            : "border-border bg-bg-2"
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
                                    <span className="text-xs font-medium">{event.label}</span>
                                    {form.watch("events").includes(event.value) && <CheckCircledIcon className="ml-auto w-4 h-4 text-accent" />}
                                </label>
                            ))}
                        </div>
                        {form.formState.errors.events && <p className="text-[11px] text-danger">{form.formState.errors.events.message as string}</p>}
                    </div>

                    <div className="pt-6 border-t border-border flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            loading={form.formState.isSubmitting}
                        >
                            Create Webhook
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
