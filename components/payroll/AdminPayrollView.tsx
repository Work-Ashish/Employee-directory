import * as React from "react"
import { cn } from "@/lib/utils"
import { PlusIcon, DownloadIcon } from "@radix-ui/react-icons"
import { Modal } from "@/components/ui/Modal"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast, Toaster } from "react-hot-toast"
import { format } from "date-fns"

// ----------------------------------------------------------------------------
// Zod Schema for Validation
// ----------------------------------------------------------------------------
const payrollSchema = z.object({
    employeeId: z.string().min(1, "Employee is required"),
    month: z.string().min(1, "Month is required"),
    basicSalary: z.number().min(0, "Salary must be positive"),
    allowances: z.number().min(0, "Allowances must be positive"),
    pfDeduction: z.number().min(0, "PF must be positive"),
    tax: z.number().min(0, "Tax must be positive"),
    otherDed: z.number().min(0, "Deductions must be positive"),
    netSalary: z.number(),
    status: z.enum(["PENDING", "PROCESSED", "PAID"]),
})

type PayrollFormData = z.infer<typeof payrollSchema>

type Employee = {
    id: string
    firstName: string
    lastName: string
    salary: number
}

type PayrollRecord = {
    id: string
    month: string
    basicSalary: number
    allowances: number
    pfDeduction: number
    tax: number
    otherDed: number
    netSalary: number
    status: string
    employeeId: string
    employee: {
        firstName: string
        lastName: string
    }
    createdAt: string
}

export function AdminPayrollView() {
    const [records, setRecords] = React.useState<PayrollRecord[]>([])
    const [employees, setEmployees] = React.useState<Employee[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [isModalOpen, setIsModalOpen] = React.useState(false)

    const form = useForm<PayrollFormData>({
        resolver: zodResolver(payrollSchema),
        defaultValues: {
            employeeId: "",
            month: format(new Date(), "MMM yyyy"),
            basicSalary: 0,
            allowances: 0,
            pfDeduction: 0,
            tax: 0,
            otherDed: 0,
            netSalary: 0,
            status: "PENDING",
        }
    })

    const fetchAll = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const [payRes, empRes] = await Promise.all([
                fetch('/api/payroll'),
                fetch('/api/employees')
            ])
            if (payRes.ok && empRes.ok) {
                setRecords(await payRes.json())
                setEmployees(await empRes.json())
            }
        } catch (error) {
            toast.error("Failed to load data")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchAll()
    }, [fetchAll])

    // Watch values to auto-calculate net salary
    const basic = form.watch("basicSalary")
    const allow = form.watch("allowances")
    const pf = form.watch("pfDeduction")
    const tax = form.watch("tax")
    const other = form.watch("otherDed")

    React.useEffect(() => {
        const net = (Number(basic) || 0) + (Number(allow) || 0) - (Number(pf) || 0) - (Number(tax) || 0) - (Number(other) || 0)
        form.setValue("netSalary", Number(net.toFixed(2)))
    }, [basic, allow, pf, tax, other, form])

    const onSubmit: SubmitHandler<PayrollFormData> = async (data) => {
        try {
            const res = await fetch('/api/payroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            if (res.ok) {
                toast.success("Payroll record created")
                setIsModalOpen(false)
                fetchAll()
                form.reset()
            } else {
                toast.error("Failed to create record")
            }
        } catch (error) {
            toast.error("An error occurred")
        }
    }

    const totals = React.useMemo(() => {
        return records.reduce((acc, curr) => ({
            net: acc.net + curr.netSalary,
            allow: acc.allow + curr.allowances,
            ded: acc.ded + (curr.pfDeduction + curr.tax + curr.otherDed)
        }), { net: 0, allow: 0, ded: 0 })
    }, [records])

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <Toaster position="top-right" />
            <div className="flex items-center justify-between mb-[26px]">
                <div>
                    <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Payroll Management</h1>
                    <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Manage salary disbursements and payslips</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
                >
                    <PlusIcon className="w-4 h-4" /> Add Payroll
                </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[8px]">Total Payroll</div>
                        <div className="text-[28px] font-extrabold tracking-[-0.5px] text-[#1a9140] mb-[4px]">${totals.net.toLocaleString()}</div>
                        <div className="text-[12px] text-[#1a9140]">Net disbursement</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[var(--green-dim)] shrink-0">💵</div>
                </div>
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[8px]">Total Allowances</div>
                        <div className="text-[28px] font-extrabold tracking-[-0.5px] text-[#0a7ea4] mb-[4px]">${totals.allow.toLocaleString()}</div>
                        <div className="text-[12px] text-[#0a7ea4]">↑ Additional benefits</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[var(--blue-dim)] shrink-0">📈</div>
                </div>
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[8px]">Total Deductions</div>
                        <div className="text-[28px] font-extrabold tracking-[-0.5px] text-[var(--red)] mb-[4px]">${totals.ded.toLocaleString()}</div>
                        <div className="text-[12px] text-[var(--red)]">↘ PF, Tax & Others</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[rgba(255,59,48,0.1)] shrink-0">📉</div>
                </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                    <div className="text-[14px] font-bold flex items-center gap-[8px] text-[var(--text)]">📋 Payroll Records</div>
                    <button className="text-[12.5px] font-semibold text-[var(--text2)] bg-[var(--surface)] border border-[var(--border)] px-[14px] py-[6px] rounded-[8px] shadow-sm hover:bg-[var(--bg)] hover:text-[var(--text)] hover:border-[var(--border2)] transition-all">⬇ Download Payslips</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                                {['Employee', 'Month', 'Basic', 'Allowances', 'PF', 'Tax', 'Other', 'Net Salary', 'Status'].map((h) => (
                                    <th key={h} className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {!isLoading ? records.map((rec, i) => (
                                <tr key={rec.id} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0 grow-in">
                                    <td className="p-[13px_18px] text-[13.5px] text-[var(--text)]">
                                        <div className="flex items-center gap-[11px]">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 bg-gradient-to-br from-[#3395ff] to-[#007aff]">
                                                {rec.employee.firstName.charAt(0)}{rec.employee.lastName.charAt(0)}
                                            </div>
                                            <span className="font-semibold">{rec.employee.firstName} {rec.employee.lastName}</span>
                                        </div>
                                    </td>
                                    <td className="p-[13px_18px]">
                                        <span className="inline-block px-[10px] py-[3px] border border-[var(--border)] rounded-[6px] text-[12px] text-[var(--text3)] bg-[var(--bg)] font-mono">
                                            {rec.month}
                                        </span>
                                    </td>
                                    <td className="p-[13px_18px] text-[13.5px] text-[var(--text2)] font-mono">${rec.basicSalary.toLocaleString()}</td>
                                    <td className="p-[13px_18px] text-[13px] font-bold font-mono text-[#1a9140]">+${rec.allowances.toLocaleString()}</td>
                                    <td className="p-[13px_18px] text-[13px] font-bold font-mono text-[var(--red)]">-${rec.pfDeduction.toLocaleString()}</td>
                                    <td className="p-[13px_18px] text-[13px] font-bold font-mono text-[var(--red)]">-${rec.tax.toLocaleString()}</td>
                                    <td className="p-[13px_18px] text-[13px] font-bold font-mono text-[var(--red)]">-${rec.otherDed.toLocaleString()}</td>
                                    <td className="p-[13px_18px] text-[14px] font-extrabold font-mono text-[var(--accent)]">${rec.netSalary.toLocaleString()}</td>
                                    <td className="p-[13px_18px]">
                                        <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[11px] font-semibold border",
                                            rec.status === 'PAID' ? "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]" :
                                                rec.status === 'PROCESSED' ? "bg-[var(--blue-dim)] text-[#007aff] border-[rgba(0,122,255,0.25)]" :
                                                    "bg-[var(--bg2)] text-[var(--text3)] border-[var(--border)]")
                                        }>
                                            {rec.status}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={9} className="p-10 text-center text-[var(--text3)]">Loading records...</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Create Payroll Entry"
            >
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Employee *</label>
                            <select
                                {...form.register('employeeId')}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                                onChange={(e) => {
                                    const emp = employees.find(emp => emp.id === e.target.value)
                                    if (emp) form.setValue("basicSalary", emp.salary)
                                }}
                            >
                                <option value="">Select Employee...</option>
                                {employees.map((e) => (
                                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Month *</label>
                            <input
                                {...form.register('month')}
                                placeholder="e.g. Jan 2026"
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Basic Salary *</label>
                            <input
                                type="number"
                                {...form.register('basicSalary', { valueAsNumber: true })}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Allowances</label>
                            <input
                                type="number"
                                {...form.register('allowances', { valueAsNumber: true })}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">PF Deduction</label>
                            <input
                                type="number"
                                {...form.register('pfDeduction', { valueAsNumber: true })}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Tax</label>
                            <input
                                type="number"
                                {...form.register('tax', { valueAsNumber: true })}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Other Ded.</label>
                            <input
                                type="number"
                                {...form.register('otherDed', { valueAsNumber: true })}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    </div>

                    <div className="p-3 bg-[var(--bg2)] rounded-lg border border-[var(--border)] flex items-center justify-between mt-2">
                        <span className="text-[13px] font-bold text-[var(--text2)]">Net Salary:</span>
                        <span className="text-[16px] font-extrabold text-[var(--accent)] font-mono">${form.getValues("netSalary").toLocaleString()}</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-[var(--border)]">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-[13px] font-semibold bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg2)] text-[var(--text2)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.formState.isSubmitting}
                            className="px-4 py-2 text-[13px] font-semibold text-white bg-[var(--accent)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {form.formState.isSubmitting ? "Creating..." : "Save Record"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
