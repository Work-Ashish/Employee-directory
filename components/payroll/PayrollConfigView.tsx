import * as React from "react"
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons"
import { payrollConfigSchema } from "@/lib/schemas/payroll"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Spinner } from "@/components/ui/Spinner"
import { PayrollAPI } from "@/features/payroll/api/client"

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
            const data = await PayrollAPI.getConfig()
            if (data && 'id' in data && data.id) {
                form.reset({
                    regimeName: data.regimeName || "Old Regime",
                    pfPercentage: data.pfPercentage,
                    standardDeduction: data.standardDeduction,
                    healthCess: data.healthCess,
                    isActive: data.isActive ?? true,
                    taxSlabs: data.taxSlabs || []
                })
            } else {
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
            const payload = {
                ...data,
                taxSlabs: data.taxSlabs?.map(slab => ({
                    ...slab,
                    maxIncome: slab.maxIncome || null
                }))
            }

            await PayrollAPI.saveConfig(payload)
            toast.success("Compliance configuration saved!")
            fetchConfig()
        } catch (error) {
            toast.error("An error occurred")
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20 gap-3 text-text-3">
                <Spinner size="lg" />
                <span>Loading configuration...</span>
            </div>
        )
    }

    return (
        <Card className="animate-page-in">
            <CardHeader>
                <CardTitle>Payroll Compliance Settings</CardTitle>
                <p className="text-sm text-text-3 mt-1">Define standard deductions, Provident Fund percentages, and income tax brackets used by the payroll engine.</p>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-3 gap-6">
                        <Input
                            label="PF Percentage (%)"
                            type="number"
                            step="0.1"
                            {...form.register("pfPercentage", { valueAsNumber: true })}
                        />
                        <Input
                            label="Standard Deduction (₹)"
                            type="number"
                            {...form.register("standardDeduction", { valueAsNumber: true })}
                        />
                        <Input
                            label="Health & Edu Cess (%)"
                            type="number"
                            step="0.1"
                            {...form.register("healthCess", { valueAsNumber: true })}
                        />
                    </div>

                    <div className="space-y-4 pt-6 border-t border-border">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-text">Income Tax Slabs</h3>
                                <p className="text-xs text-text-3">Configure progressive tax brackets. Leave Max Income empty for infinity.</p>
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                leftIcon={<PlusIcon className="w-3.5 h-3.5" />}
                                onClick={() => append({ minIncome: 0, maxIncome: null, taxRate: 0, baseTax: 0 })}
                            >
                                Add Slab
                            </Button>
                        </div>

                        <div className="bg-bg rounded-xl border border-border overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-bg-2 border-b border-border">
                                        <th className="px-4 py-3 text-xs font-bold text-text-3 uppercase tracking-wide">Min Income (₹)</th>
                                        <th className="px-4 py-3 text-xs font-bold text-text-3 uppercase tracking-wide">Max Income (₹)</th>
                                        <th className="px-4 py-3 text-xs font-bold text-text-3 uppercase tracking-wide">Tax Rate (%)</th>
                                        <th className="px-4 py-3 text-xs font-bold text-text-3 uppercase tracking-wide">Base Tax (₹)</th>
                                        <th className="p-3 w-12 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fields.map((field, index) => (
                                        <tr key={field.id} className="border-b border-border last:border-0 hover:bg-bg-2 transition-colors">
                                            <td className="p-2 pl-4">
                                                <input
                                                    type="number"
                                                    {...form.register(`taxSlabs.${index}.minIncome`, { valueAsNumber: true })}
                                                    className="input-base font-mono"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    placeholder="Infinity"
                                                    {...form.register(`taxSlabs.${index}.maxIncome`, {
                                                        setValueAs: v => v === "" ? null : Number(v)
                                                    })}
                                                    className="input-base font-mono"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    {...form.register(`taxSlabs.${index}.taxRate`, { valueAsNumber: true })}
                                                    className="input-base font-mono text-success font-bold"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    {...form.register(`taxSlabs.${index}.baseTax`, { valueAsNumber: true })}
                                                    className="input-base font-mono"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => remove(index)}
                                                    className="text-text-3 hover:text-danger hover:bg-danger/10"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {fields.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-text-3 text-sm italic">
                                                No tax slabs configured
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" loading={isSaving}>
                            {isSaving ? "Saving..." : "Save Configuration"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
