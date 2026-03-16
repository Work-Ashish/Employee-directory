import * as React from "react"
import { cn, extractArray } from "@/lib/utils"
import { PlusIcon, UploadIcon } from "@radix-ui/react-icons"
import { Modal } from "@/components/ui/Modal"
import { CsvImportModal } from "@/components/ui/CsvImportModal"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { format } from "date-fns"
import { PageHeader } from "@/components/ui/PageHeader"
import { Button } from "@/components/ui/Button"
import { StatCard } from "@/components/ui/StatCard"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { Spinner } from "@/components/ui/Spinner"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { api } from "@/lib/api-client"
import { EmployeeAPI } from "@/features/employees/api/client"

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
                api.get<PFRecord[]>('/pf/'),
                EmployeeAPI.fetchEmployees(1, 100)
            ])
            setRecords(extractArray<PFRecord>(pfRes.data))
            setEmployees(extractArray<Employee>(empRes.results))
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
            await api.post('/pf/', data)
            toast.success("PF record created")
            setIsModalOpen(false)
            fetchAll()
            form.reset({
                ...form.getValues(),
                employeeId: "",
                basicSalary: 0,
            })
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
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="Provident Fund"
                description="Track provident fund contributions"
                actions={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setIsImportOpen(true)}
                            leftIcon={<UploadIcon className="w-4 h-4" />}
                        >
                            Import CSV
                        </Button>
                        <Button
                            onClick={() => setIsModalOpen(true)}
                            leftIcon={<PlusIcon className="w-4 h-4" />}
                        >
                            Add PF Entry
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <StatCard
                    label="Employee Contribution"
                    value={`$${totals.emp.toLocaleString()}`}
                    icon={<span className="text-[20px]">💳</span>}
                    change={{ value: "Accumulated", positive: true }}
                />
                <StatCard
                    label="Employer Contribution"
                    value={`$${totals.employer.toLocaleString()}`}
                    icon={<span className="text-[20px]">🏢</span>}
                    change={{ value: "Accumulated", positive: true }}
                />
                <StatCard
                    label="Total PF"
                    value={`$${totals.total.toLocaleString()}`}
                    icon={<span className="text-[20px]">📈</span>}
                    change={{ value: "Combined", positive: true }}
                />
            </div>

            <Card>
                <div className="px-5 py-4 flex items-center justify-between border-b border-border bg-surface-2 backdrop-blur-md">
                    <div className="text-md font-bold flex items-center gap-2 text-text">📄 Provident Fund Records</div>
                    <Button variant="secondary" size="sm">⬇ Export Report</Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-surface-2 backdrop-blur-md">
                                {['Employee', 'Month', 'Account No.', 'Basic Salary', 'Employee (12%)', 'Employer (12%)', 'Total', 'Status'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-[0.5px]">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {!isLoading ? records.map((rec) => (
                                <tr key={rec.id} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0 grow-in">
                                    <td className="px-4 py-3 text-base text-text">
                                        <div className="flex items-center gap-3">
                                            <Avatar
                                                name={`${rec.employee.firstName} ${rec.employee.lastName}`}
                                                size="sm"
                                            />
                                            <span className="font-semibold">{rec.employee.firstName} {rec.employee.lastName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant="neutral" size="sm">
                                            <span className="font-mono">{rec.month}</span>
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-text-3 font-mono">{rec.accountNumber}</td>
                                    <td className="px-4 py-3 text-base text-text-2 font-mono">${rec.basicSalary.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-base font-bold font-mono text-success">${rec.employeeContribution.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-base font-bold font-mono text-success">${rec.employerContribution.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-md font-extrabold font-mono text-accent">${rec.totalContribution.toLocaleString()}</td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            variant={
                                                rec.status === 'Credited' ? 'success' :
                                                rec.status === 'Pending' ? 'info' :
                                                'neutral'
                                            }
                                        >
                                            {rec.status}
                                        </Badge>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} className="p-10 text-center text-text-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <Spinner /> Loading records...
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Add PF Entry"
            >
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Employee *"
                            {...form.register('employeeId')}
                            onChange={(e) => {
                                form.register('employeeId').onChange(e)
                                const emp = employees.find(emp => emp.id === e.target.value)
                                if (emp) form.setValue("basicSalary", emp.salary)
                            }}
                        >
                            <option value="">Select Employee...</option>
                            {employees.map((e) => (
                                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                            ))}
                        </Select>
                        <Input
                            label="Month *"
                            {...form.register('month')}
                            placeholder="e.g. Jan 2026"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Account Number *"
                            {...form.register('accountNumber')}
                            placeholder="PF12345678"
                        />
                        <Input
                            label="Basic Salary *"
                            type="number"
                            {...form.register('basicSalary', { valueAsNumber: true })}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1 p-2 bg-bg-2 rounded border border-border">
                            <label className="text-xs font-bold text-text-3 uppercase">Employee (12%)</label>
                            <div className="text-md font-mono font-bold text-success">${form.getValues("employeeContribution")}</div>
                        </div>
                        <div className="space-y-1 p-2 bg-bg-2 rounded border border-border">
                            <label className="text-xs font-bold text-text-3 uppercase">Employer (12%)</label>
                            <div className="text-md font-mono font-bold text-success">${form.getValues("employerContribution")}</div>
                        </div>
                        <div className="space-y-1 p-2 bg-bg-2 rounded border border-border">
                            <label className="text-xs font-bold text-text-3 uppercase">Total Credit</label>
                            <div className="text-md font-mono font-bold text-accent">${form.getValues("totalContribution")}</div>
                        </div>
                    </div>

                    <Select
                        label="Status"
                        {...form.register('status')}
                        options={[
                            { value: "Credited", label: "Credited" },
                            { value: "Pending", label: "Pending" },
                            { value: "Failed", label: "Failed" },
                        ]}
                    />

                    <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-border">
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
                            {form.formState.isSubmitting ? "Saving..." : "Save PF Record"}
                        </Button>
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
