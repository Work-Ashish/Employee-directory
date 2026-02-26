import * as React from "react"
import { cn } from "@/lib/utils"
import { PlusIcon, UploadIcon } from "@radix-ui/react-icons"
import { Modal } from "@/components/ui/Modal"
import { CsvImportModal } from "@/components/ui/CsvImportModal"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast, Toaster } from "react-hot-toast"
import { format } from "date-fns"

// ----------------------------------------------------------------------------
// Zod Schema for Validation
// ----------------------------------------------------------------------------
const pfSchema = z.object({
    employeeId: z.string().min(1, "Employee is required"),
    month: z.string().min(1, "Month is required"),
    accountNumber: z.string().min(1, "Account number is required"),
    basicSalary: z.number().min(0, "Salary must be positive"),
    employeeContribution: z.number().min(0, "Contribution must be positive"),
    employerContribution: z.number().min(0, "Contribution must be positive"),
    totalContribution: z.number(),
    status: z.enum(["Credited", "Pending", "Failed"]),
})

type PFFormData = z.infer<typeof pfSchema>

type Employee = {
    id: string
    firstName: string
    lastName: string
    salary: number
}

type PFRecord = {
    id: string
    month: string
    accountNumber: string
    basicSalary: number
    employeeContribution: number
    employerContribution: number
    totalContribution: number
    status: string
    employeeId: string
    employee: {
        firstName: string
        lastName: string
    }
}

export function AdminPFView() {
    const [records, setRecords] = React.useState<PFRecord[]>([])
    const [employees, setEmployees] = React.useState<Employee[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [isImportOpen, setIsImportOpen] = React.useState(false)

    const form = useForm<PFFormData>({
        resolver: zodResolver(pfSchema),
        defaultValues: {
            employeeId: "",
            month: format(new Date(), "MMM yyyy"),
            accountNumber: "",
            basicSalary: 0,
            employeeContribution: 0,
            employerContribution: 0,
            totalContribution: 0,
            status: "Credited",
        }
    })

    const fetchAll = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const [pfRes, empRes] = await Promise.all([
                fetch('/api/pf'),
                fetch('/api/employees?limit=100')
            ])
            if (pfRes.ok && empRes.ok) {
                setRecords(await pfRes.json())
                const empJson = await empRes.json()
                setEmployees(Array.isArray(empJson) ? empJson : empJson.data || [])
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

    // Watch values to auto-calculate contributions (12% each)
    const basic = form.watch("basicSalary")
    React.useEffect(() => {
        const b = Number(basic) || 0
        const contribution = Number((b * 0.12).toFixed(2))
        form.setValue("employeeContribution", contribution)
        form.setValue("employerContribution", contribution)
        form.setValue("totalContribution", Number((contribution * 2).toFixed(2)))
    }, [basic, form])

    const onSubmit: SubmitHandler<PFFormData> = async (data) => {
        try {
            const res = await fetch('/api/pf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            if (res.ok) {
                toast.success("PF record created")
                setIsModalOpen(false)
                fetchAll()
                form.reset({
                    ...form.getValues(),
                    employeeId: "",
                    basicSalary: 0,
                })
            } else {
                toast.error("Failed to create record")
            }
        } catch (error) {
            toast.error("An error occurred")
        }
    }

    const totals = React.useMemo(() => {
        return records.reduce((acc, curr) => ({
            emp: acc.emp + curr.employeeContribution,
            employer: acc.employer + curr.employerContribution,
            total: acc.total + curr.totalContribution
        }), { emp: 0, employer: 0, total: 0 })
    }, [records])

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <Toaster position="top-right" />
            <div className="flex items-center justify-between mb-[26px]">
                <div>
                    <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Provident Fund</h1>
                    <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Track provident fund contributions</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsImportOpen(true)}
                        className="flex items-center gap-2 bg-[var(--surface)] text-[var(--text2)] border border-[var(--border)] px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-[var(--bg2)] transition-colors"
                    >
                        <UploadIcon className="w-4 h-4" /> Import CSV
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
                    >
                        <PlusIcon className="w-4 h-4" /> Add PF Entry
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[8px]">Employee Contribution</div>
                        <div className="text-[28px] font-extrabold tracking-[-0.5px] text-[var(--accent)] mb-[4px]">${totals.emp.toLocaleString()}</div>
                        <div className="text-[12px] text-[var(--accent)]">Accumulated</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[rgba(0,122,255,0.1)] shrink-0">💳</div>
                </div>
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[8px]">Employer Contribution</div>
                        <div className="text-[28px] font-extrabold tracking-[-0.5px] text-[#7c3aed] mb-[4px]">${totals.employer.toLocaleString()}</div>
                        <div className="text-[12px] text-[#7c3aed]">Accumulated</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[rgba(88,86,214,0.12)] shrink-0">🏢</div>
                </div>
                <div className="glass p-5 flex items-center justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm relative overflow-hidden group hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    <div>
                        <div className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-[0.5px] mb-[8px]">Total PF</div>
                        <div className="text-[28px] font-extrabold tracking-[-0.5px] text-[#1a9140] mb-[4px]">${totals.total.toLocaleString()}</div>
                        <div className="text-[12px] text-[#1a9140]">↑ Combined</div>
                    </div>
                    <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[20px] bg-[var(--green-dim)] shrink-0">📈</div>
                </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                <div className="p-[16px_20px] flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                    <div className="text-[14px] font-bold flex items-center gap-[8px] text-[var(--text)]">📄 Provident Fund Records</div>
                    <button className="text-[12.5px] font-semibold text-[var(--text2)] bg-[var(--surface)] border border-[var(--border)] px-[14px] py-[6px] rounded-[8px] shadow-sm hover:bg-[var(--bg)] hover:text-[var(--text)] hover:border-[var(--border2)] transition-all">⬇ Export Report</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                                {['Employee', 'Month', 'Account No.', 'Basic Salary', 'Employee (12%)', 'Employer (12%)', 'Total', 'Status'].map((h) => (
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
                                    <td className="p-[13px_18px] text-[12.5px] text-[var(--text3)] font-mono">{rec.accountNumber}</td>
                                    <td className="p-[13px_18px] text-[13.5px] text-[var(--text2)] font-mono">${rec.basicSalary.toLocaleString()}</td>
                                    <td className="p-[13px_18px] text-[13px] font-bold font-mono text-[#1a9140]">${rec.employeeContribution.toLocaleString()}</td>
                                    <td className="p-[13px_18px] text-[13px] font-bold font-mono text-[#1a9140]">${rec.employerContribution.toLocaleString()}</td>
                                    <td className="p-[13px_18px] text-[14px] font-extrabold font-mono text-[var(--accent)]">${rec.totalContribution.toLocaleString()}</td>
                                    <td className="p-[13px_18px]">
                                        <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[11px] font-semibold border",
                                            rec.status === 'Credited' ? "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]" :
                                                rec.status === 'Pending' ? "bg-[var(--blue-dim)] text-[#007aff] border-[rgba(0,122,255,0.25)]" :
                                                    "bg-[var(--bg2)] text-[var(--text3)] border-[var(--border)]")
                                        }>
                                            {rec.status}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} className="p-10 text-center text-[var(--text3)]">Loading records...</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Add PF Entry"
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
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Account Number *</label>
                            <input
                                {...form.register('accountNumber')}
                                placeholder="PF12345678"
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Basic Salary *</label>
                            <input
                                type="number"
                                {...form.register('basicSalary', { valueAsNumber: true })}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1 p-2 bg-[var(--bg2)] rounded border border-[var(--border)]">
                            <label className="text-[11px] font-bold text-[var(--text3)] uppercase">Employee (12%)</label>
                            <div className="text-[14px] font-mono font-bold text-[var(--green)]">${form.getValues("employeeContribution")}</div>
                        </div>
                        <div className="space-y-1 p-2 bg-[var(--bg2)] rounded border border-[var(--border)]">
                            <label className="text-[11px] font-bold text-[var(--text3)] uppercase">Employer (12%)</label>
                            <div className="text-[14px] font-mono font-bold text-[var(--green)]">${form.getValues("employerContribution")}</div>
                        </div>
                        <div className="space-y-1 p-2 bg-[var(--bg2)] rounded border border-[var(--border)]">
                            <label className="text-[11px] font-bold text-[var(--text3)] uppercase">Total Credit</label>
                            <div className="text-[14px] font-mono font-bold text-[var(--accent)]">${form.getValues("totalContribution")}</div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-[var(--text2)]">Status</label>
                        <select
                            {...form.register('status')}
                            className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                        >
                            <option value="Credited">Credited</option>
                            <option value="Pending">Pending</option>
                            <option value="Failed">Failed</option>
                        </select>
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
                            {form.formState.isSubmitting ? "Saving..." : "Save PF Record"}
                        </button>
                    </div>
                </form>
            </Modal>
            <CsvImportModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                title="Provident Fund Records"
                templateHeaders={["employeeCode", "month", "accountNumber", "basicSalary", "employeeContribution", "employerContribution", "totalContribution", "status"]}
                apiEndpoint="/api/pf/import"
                onSuccess={fetchAll}
            />
        </div>
    )
}
