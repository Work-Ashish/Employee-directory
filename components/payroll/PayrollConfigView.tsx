import * as React from "react"
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast, Toaster } from "react-hot-toast"
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons"
import { payrollConfigSchema } from "@/lib/schemas/payroll"

type ConfigFormData = z.infer<typeof payrollConfigSchema>

export function PayrollConfigView() {
    const [isLoading, setIsLoading] = React.useState(true)
    const [isSaving, setIsSaving] = React.useState(false)

    const form = useForm<ConfigFormData>({
        resolver: zodResolver(payrollConfigSchema),
        defaultValues: {
            regimeName: "Old Regime",
            pfPercentage: 12,
            standardDeduction: 50000,
            healthCess: 4,
            isActive: true,
            taxSlabs: []
        }
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "taxSlabs"
    })

    const fetchConfig = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const res = await fetch('/api/payroll/config')
            if (res.ok) {
                const data = await res.json()
                if (data.data && data.data.id) {
                    form.reset({
                        regimeName: data.data.regimeName || "Old Regime",
                        pfPercentage: data.data.pfPercentage,
                        standardDeduction: data.data.standardDeduction,
                        healthCess: data.data.healthCess,
                        isActive: data.data.isActive ?? true,
                        taxSlabs: data.data.taxSlabs || []
                    })
                } else {
                    // Seed defaults if no config exists
                    form.reset({
                        regimeName: "Old Regime",
                        pfPercentage: 12,
                        standardDeduction: 50000,
                        healthCess: 4,
                        isActive: true,
                        taxSlabs: [
                            { minIncome: 0, maxIncome: 300000, taxRate: 0, baseTax: 0 },
                            { minIncome: 300001, maxIncome: 600000, taxRate: 5, baseTax: 0 },
                            { minIncome: 600001, maxIncome: 900000, taxRate: 10, baseTax: 15000 }
                        ]
                    })
                }
            }
        } catch (error) {
            toast.error("Failed to load configuration")
        } finally {
            setIsLoading(false)
        }
    }, [form])

    React.useEffect(() => {
        fetchConfig()
    }, [fetchConfig])

    const onSubmit: SubmitHandler<ConfigFormData> = async (data) => {
        try {
            setIsSaving(true)
            // Ensure null handling for maxIncome
            const payload = {
                ...data,
                taxSlabs: data.taxSlabs?.map(slab => ({
                    ...slab,
                    maxIncome: slab.maxIncome || null
                }))
            }

            const res = await fetch('/api/payroll/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            if (res.ok) {
                toast.success("Compliance configuration saved!")
                fetchConfig()
            } else {
                toast.error("Failed to save configuration")
            }
        } catch (error) {
            toast.error("An error occurred")
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return <div className="p-8 text-center text-[var(--text3)] animate-pulse">Loading configuration...</div>
    }

    return (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] p-8 shadow-sm animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <h2 className="text-xl font-extrabold tracking-tight mb-2 text-[var(--text)]">Payroll Compliance Settings</h2>
            <p className="text-sm text-[var(--text3)] mb-8">Define standard deductions, Provident Fund percentages, and income tax brackets used by the payroll engine.</p>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-[var(--text2)]">PF Percentage (%)</label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                {...form.register("pfPercentage", { valueAsNumber: true })}
                                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2.5 pl-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-[var(--text2)]">Standard Deduction (₹)</label>
                        <input
                            type="number"
                            {...form.register("standardDeduction", { valueAsNumber: true })}
                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2.5 pl-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-[var(--text2)]">Health & Edu Cess (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            {...form.register("healthCess", { valueAsNumber: true })}
                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2.5 pl-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                        />
                    </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between pl-1">
                        <div>
                            <h3 className="text-lg font-bold text-[var(--text)]">Income Tax Slabs</h3>
                            <p className="text-xs text-[var(--text3)]">Configure progressive tax brackets. Leave Max Income empty for infinity.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => append({ minIncome: 0, maxIncome: null, taxRate: 0, baseTax: 0 })}
                            className="flex items-center gap-1.5 bg-[var(--bg2)] border border-[var(--border)] text-[var(--text2)] px-3 py-1.5 rounded-md text-xs font-bold hover:bg-[var(--surface2)] transition-colors"
                        >
                            <PlusIcon className="w-3.5 h-3.5" /> Add Slab
                        </button>
                    </div>

                    <div className="bg-[var(--bg)] rounded-xl border border-[var(--border)] overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--surface2)] border-b border-[var(--border)]">
                                    <th className="p-3 text-[11px] font-bold text-[var(--text3)] uppercase tracking-wider pl-4">Min Income (₹)</th>
                                    <th className="p-3 text-[11px] font-bold text-[var(--text3)] uppercase tracking-wider">Max Income (₹)</th>
                                    <th className="p-3 text-[11px] font-bold text-[var(--text3)] uppercase tracking-wider">Tax Rate (%)</th>
                                    <th className="p-3 text-[11px] font-bold text-[var(--text3)] uppercase tracking-wider">Base Tax (₹)</th>
                                    <th className="p-3 w-12 text-center"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {fields.map((field, index) => (
                                    <tr key={field.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg2)] transition-colors">
                                        <td className="p-2 pl-4">
                                            <input
                                                type="number"
                                                {...form.register(`taxSlabs.${index}.minIncome`, { valueAsNumber: true })}
                                                className="w-full bg-transparent border border-transparent hover:border-[var(--border)] focus:border-[var(--brand)] rounded px-2 py-1.5 text-sm font-mono focus:outline-none"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                placeholder="Infinity"
                                                {...form.register(`taxSlabs.${index}.maxIncome`, {
                                                    setValueAs: v => v === "" ? null : Number(v)
                                                })}
                                                className="w-full bg-transparent border border-transparent hover:border-[var(--border)] focus:border-[var(--brand)] rounded px-2 py-1.5 text-sm font-mono focus:outline-none"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                step="0.1"
                                                {...form.register(`taxSlabs.${index}.taxRate`, { valueAsNumber: true })}
                                                className="w-full bg-transparent border border-transparent hover:border-[var(--border)] focus:border-[var(--brand)] rounded px-2 py-1.5 text-sm font-mono focus:outline-none text-[#1a9140] font-bold"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                {...form.register(`taxSlabs.${index}.baseTax`, { valueAsNumber: true })}
                                                className="w-full bg-transparent border border-transparent hover:border-[var(--border)] focus:border-[var(--brand)] rounded px-2 py-1.5 text-sm font-mono focus:outline-none"
                                            />
                                        </td>
                                        <td className="p-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => remove(index)}
                                                className="p-1.5 text-[var(--text3)] hover:text-[var(--red)] hover:bg-[var(--red-dim)] rounded transition-colors"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {fields.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-6 text-center text-[var(--text3)] text-sm italic">
                                            No tax slabs configured
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-[var(--brand)] text-white rounded-lg text-sm font-bold shadow-md hover:bg-opacity-90 transition-all font-inter disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : "Save Configuration"}
                    </button>
                </div>
            </form>
        </div>
    )
}
