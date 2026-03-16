import * as React from "react"
import { cn, extractArray } from "@/lib/utils"
import { PlusIcon, DownloadIcon, UploadIcon, ReaderIcon, ArchiveIcon, GearIcon } from "@radix-ui/react-icons"
import { useAuth } from "@/context/AuthContext"
import { hasPermission, Module, Action } from "@/lib/permissions"
import { CsvImportModal } from "@/components/ui/CsvImportModal"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { format } from "date-fns"
import { PayrollConfigView } from "@/components/payroll/PayrollConfigView"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/Dialog"
import { StatCard } from "@/components/ui/StatCard"
import { PageHeader } from "@/components/ui/PageHeader"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs"
import { EmptyState } from "@/components/ui/EmptyState"
import { PayrollAPI } from "@/features/payroll/api/client"
import { EmployeeAPI } from "@/features/employees/api/client"
import { ReimbursementAPI } from "@/features/reimbursements/api/client"

// ----------------------------------------------------------------------------
// Zod Schema for Validation
// ----------------------------------------------------------------------------
const payrollSchema = z.object({
    employeeId: z.string().min(1, "Employee is required"),
    month: z.string().min(1, "Month is required"),
    basicSalary: z.number().min(0, "Salary must be positive"),
    allowances: z.number().min(0),
    arrears: z.number().min(0),
    reimbursements: z.number().min(0),
    loansAdvances: z.number().min(0),
    otherDed: z.number().min(0),
    pfDeduction: z.number().optional(),
    tax: z.number().optional(),
    netSalary: z.number().optional(),
    status: z.enum(["PENDING", "PROCESSED", "PAID"]),
})

type PayrollFormData = z.infer<typeof payrollSchema>

type Employee = {
    id: string
    firstName: string
    lastName: string
    salary: number
}

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

type PayrollRecord = {
    id: string
    month: string
    basicSalary: number
    allowances: number
    arrears: number
    reimbursements: number
    pfDeduction: number
    tax: number
    otherDed: number
    loansAdvances: number
    netSalary: number
    status: string
    isFinalized: boolean
    employeeId: string
    employee: {
        firstName: string
        lastName: string
    }
    createdAt: string
}

function getPayrollStatusBadge(status: string, isFinalized: boolean) {
    if (isFinalized) return <Badge variant="success" dot>LOCKED</Badge>
    if (status === "PAID") return <Badge variant="info" dot>{status}</Badge>
    return <Badge variant="neutral" dot>{status}</Badge>
}

function getPFStatusBadge(status: string) {
    if (status === "Credited") return <Badge variant="success" dot>{status}</Badge>
    if (status === "Pending") return <Badge variant="warning" dot>{status}</Badge>
    return <Badge variant="danger" dot>{status}</Badge>
}

export function AdminPayrollView() {
    const { user } = useAuth()
    const canEdit = hasPermission(user?.role ?? '', Module.PAYROLL, Action.CREATE)
    const [activeTab, setActiveTab] = React.useState<string>("payroll")
    const [records, setRecords] = React.useState<PayrollRecord[]>([])
    const [pfRecords, setPfRecords] = React.useState<PFRecord[]>([])
    const [employees, setEmployees] = React.useState<Employee[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [isPFModalOpen, setIsPFModalOpen] = React.useState(false)
    const [isImportOpen, setIsImportOpen] = React.useState(false)
    const [isPFImportOpen, setIsPFImportOpen] = React.useState(false)
    const [approvedReimbursements, setApprovedReimbursements] = React.useState<{ id: string; amount: number; category: string; description: string }[]>([])
    const [loadingReimb, setLoadingReimb] = React.useState(false)

    const form = useForm<PayrollFormData>({
        resolver: zodResolver(payrollSchema),
        defaultValues: {
            employeeId: "",
            month: format(new Date(), "MMM yyyy"),
            basicSalary: 0,
            allowances: 0,
            arrears: 0,
            reimbursements: 0,
            loansAdvances: 0,
            otherDed: 0,
            status: "PENDING",
        }
    })

    const pfForm = useForm<PFFormData>({
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
            const [payData, pfData, empData] = await Promise.all([
                PayrollAPI.list(),
                PayrollAPI.listPF(),
                EmployeeAPI.fetchEmployees(1, 100)
            ])
            setRecords(payData.results as unknown as PayrollRecord[])
            setPfRecords(pfData.results as unknown as PFRecord[])
            setEmployees(empData.results as unknown as Employee[])
        } catch (error) {
            toast.error("Failed to load data")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchAll()
    }, [fetchAll])

    // Fetch approved reimbursements for selected employee
    const selectedEmpId = form.watch("employeeId")
    const fetchApprovedReimbursements = React.useCallback(async (empId: string) => {
        if (!empId) { setApprovedReimbursements([]); return }
        setLoadingReimb(true)
        try {
            const reimbData = await ReimbursementAPI.list('status=APPROVED&employeeId=' + empId)
            const items = (reimbData.results || []).filter((r: any) => !r.paidInMonth)
            setApprovedReimbursements(items as any)
        } catch { /* ignore */ } finally { setLoadingReimb(false) }
    }, [])

    React.useEffect(() => {
        if (isModalOpen && selectedEmpId) fetchApprovedReimbursements(selectedEmpId)
        else setApprovedReimbursements([])
    }, [selectedEmpId, isModalOpen, fetchApprovedReimbursements])

    const pullReimbursementAmount = () => {
        const total = approvedReimbursements.reduce((s, r) => s + r.amount, 0)
        form.setValue("reimbursements", total)
    }

    // Watch values to auto-calculate gross net salary estimation
    const basic = form.watch("basicSalary")
    const allow = form.watch("allowances")
    const arrears = form.watch("arrears")
    const reimb = form.watch("reimbursements")
    const loans = form.watch("loansAdvances")
    const other = form.watch("otherDed")

    React.useEffect(() => {
        const net = (Number(basic) || 0) + (Number(allow) || 0) + (Number(arrears) || 0) + (Number(reimb) || 0) - (Number(loans) || 0) - (Number(other) || 0)
        // Set an estimated raw net. Actual Tax/PF is reduced server-side on submit!
        form.setValue("netSalary", Number(net.toFixed(2)))
    }, [basic, allow, arrears, reimb, loans, other, form])

    // PF Contribution Auto-calc
    const pfBasic = pfForm.watch("basicSalary")
    React.useEffect(() => {
        const employeeContribution = Math.round(pfBasic * 0.12)
        const employerContribution = Math.round(pfBasic * 0.12)
        pfForm.setValue("employeeContribution", employeeContribution)
        pfForm.setValue("employerContribution", employerContribution)
        pfForm.setValue("totalContribution", employeeContribution + employerContribution)
    }, [pfBasic, pfForm])

    const onSubmit: SubmitHandler<PayrollFormData> = async (data) => {
        try {
            await PayrollAPI.run(data)
            toast.success("Payroll record calculated and created")
            setIsModalOpen(false)
            fetchAll()
            form.reset()
        } catch (error) {
            toast.error("An error occurred")
        }
    }

    const handleFinalize = async (id: string) => {
        if (!confirm("Are you sure? This will lock the payslip forever.")) return;
        try {
            await PayrollAPI.finalize(id)
            toast.success("Payroll finalized")
            fetchAll()
        } catch (e) {
            toast.error("Network error")
        }
    }

    const handleDownloadPDF = (id: string) => {
        window.open(`/api/payroll/${id}/payslip`, '_blank')
    }

    const onPFSubmit: SubmitHandler<PFFormData> = async (data) => {
        try {
            await PayrollAPI.createPF(data)
            toast.success("PF record created")
            setIsPFModalOpen(false)
            fetchAll()
            pfForm.reset()
        } catch (error) {
            toast.error("An error occurred")
        }
    }

    const totals = React.useMemo(() => {
        if (activeTab === "payroll") {
            const results = records.reduce((acc, curr) => ({
                net: acc.net + curr.netSalary,
                allow: acc.allow + curr.allowances,
                ded: acc.ded + (curr.pfDeduction + curr.tax + curr.otherDed)
            }), { net: 0, allow: 0, ded: 0 })
            return { ...results, count: records.length, label1: "Net Payout", label2: "Total Allowances", label3: "Total Deductions" }
        } else {
            const results = pfRecords.reduce((acc, curr) => ({
                net: acc.net + curr.totalContribution,
                allow: acc.allow + curr.employeeContribution,
                ded: acc.ded + curr.employerContribution
            }), { net: 0, allow: 0, ded: 0 })
            return { ...results, count: pfRecords.length, label1: "Total PF Corpus", label2: "Employee Contrib.", label3: "Employer Contrib." }
        }
    }, [records, pfRecords, activeTab])

    const employeeOptions = React.useMemo(
        () => [
            { value: "", label: "Select Employee" },
            ...employees.map((emp) => ({ value: emp.id, label: `${emp.firstName} ${emp.lastName}` }))
        ],
        [employees]
    )

    const pfStatusOptions = [
        { value: "Credited", label: "Credited" },
        { value: "Pending", label: "Pending" },
        { value: "Failed", label: "Failed" },
    ]

    return (
        <div className="space-y-6 animate-page-in">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <PageHeader
                    title={activeTab === "payroll" ? "Payroll Management" : activeTab === "pf" ? "Provident Fund Management" : "Payroll Setup"}
                    description={
                        activeTab === "payroll"
                            ? "Manage salary disbursements and payslips"
                            : activeTab === "pf"
                                ? "Track and manage employee PF contributions"
                                : "Configure payroll compliance settings"
                    }
                    actions={
                        <div className="flex items-center gap-2">
                            <TabsList>
                                <TabsTrigger value="payroll" className="gap-1.5">
                                    <ReaderIcon className="w-4 h-4" /> Salary
                                </TabsTrigger>
                                <TabsTrigger value="pf" className="gap-1.5">
                                    <ArchiveIcon className="w-4 h-4" /> PF
                                </TabsTrigger>
                                {canEdit && (
                                    <TabsTrigger value="config" className="gap-1.5">
                                        <GearIcon className="w-4 h-4" /> Setup
                                    </TabsTrigger>
                                )}
                            </TabsList>
                            {activeTab !== "config" && canEdit && (
                                <>
                                    <Button
                                        variant="secondary"
                                        size="default"
                                        leftIcon={<UploadIcon className="w-4 h-4" />}
                                        onClick={() => activeTab === "payroll" ? setIsImportOpen(true) : setIsPFImportOpen(true)}
                                    >
                                        Import CSV
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="default"
                                        leftIcon={<PlusIcon className="w-4 h-4" />}
                                        onClick={() => activeTab === "payroll" ? setIsModalOpen(true) : setIsPFModalOpen(true)}
                                    >
                                        {activeTab === "payroll" ? "New Record" : "New PF Entry"}
                                    </Button>
                                </>
                            )}
                        </div>
                    }
                />

                <TabsContent value="config">
                    <PayrollConfigView />
                </TabsContent>

                <TabsContent value="payroll">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                        <StatCard
                            label={totals.label1}
                            value={`₹${totals.net.toLocaleString()}`}
                            change={{ value: "Total Volume", positive: true }}
                            icon={<span className="text-lg">💵</span>}
                        />
                        <StatCard
                            label={totals.label2}
                            value={`₹${totals.allow.toLocaleString()}`}
                            change={{ value: "Components", positive: true }}
                            icon={<span className="text-lg">📈</span>}
                        />
                        <StatCard
                            label={totals.label3}
                            value={`₹${totals.ded.toLocaleString()}`}
                            change={{ value: "Outflow", positive: false }}
                            icon={<span className="text-lg">📉</span>}
                        />
                        <StatCard
                            label="Active Records"
                            value={totals.count}
                            icon={<span className="text-lg">📁</span>}
                        />
                    </div>

                    <Card>
                        <CardHeader className="flex-row items-center justify-between border-b border-border p-4">
                            <CardTitle className="text-sm flex items-center gap-2">📋 Payroll Records</CardTitle>
                            <Button variant="secondary" size="sm" leftIcon={<DownloadIcon className="w-3.5 h-3.5" />}>
                                Download Payslips
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-border bg-bg-2">
                                            {['Employee', 'Month', 'Basic', '+ Additions', '- Deductions', 'Net Payout', 'Status', ...(canEdit ? ['Actions'] : [])].map((h) => (
                                                <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wide">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={8} className="p-8 text-center text-text-3 animate-pulse">Loading records...</td>
                                            </tr>
                                        ) : records.length > 0 ? records.map((rec) => (
                                            <tr key={rec.id} className="group hover:bg-accent/[0.03] transition-colors border-b border-border/40 last:border-0">
                                                <td className="px-4 py-3 text-sm text-text">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar name={`${rec.employee.firstName} ${rec.employee.lastName}`} size="sm" />
                                                        <span className="font-semibold tracking-tight truncate max-w-[120px]">
                                                            {rec.employee.firstName} {rec.employee.lastName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-text-2 font-mono">{rec.month}</td>
                                                <td className="px-4 py-3 text-sm text-text-2 font-mono">₹{rec.basicSalary.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm font-bold text-success">₹{(rec.allowances + (rec.arrears || 0) + (rec.reimbursements || 0)).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm font-bold text-danger">₹{(rec.pfDeduction + rec.tax + rec.otherDed + (rec.loansAdvances || 0)).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm font-extrabold text-accent">₹{rec.netSalary.toLocaleString()}</td>
                                                <td className="px-4 py-3">
                                                    {getPayrollStatusBadge(rec.status, rec.isFinalized)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {rec.isFinalized ? (
                                                        <Button size="sm" variant="primary" onClick={() => handleDownloadPDF(rec.id)}>
                                                            PDF
                                                        </Button>
                                                    ) : canEdit ? (
                                                        <Button size="sm" variant="success" onClick={() => handleFinalize(rec.id)}>
                                                            Lock & Finalize
                                                        </Button>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={8}>
                                                    <EmptyState
                                                        icon={<ReaderIcon className="w-5 h-5" />}
                                                        title="No payroll records found"
                                                        description="Create a new payroll record to get started."
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pf">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                        <StatCard
                            label={totals.label1}
                            value={`₹${totals.net.toLocaleString()}`}
                            change={{ value: "Total Volume", positive: true }}
                            icon={<span className="text-lg">💵</span>}
                        />
                        <StatCard
                            label={totals.label2}
                            value={`₹${totals.allow.toLocaleString()}`}
                            change={{ value: "Components", positive: true }}
                            icon={<span className="text-lg">📈</span>}
                        />
                        <StatCard
                            label={totals.label3}
                            value={`₹${totals.ded.toLocaleString()}`}
                            change={{ value: "Outflow", positive: false }}
                            icon={<span className="text-lg">📉</span>}
                        />
                        <StatCard
                            label="Active Records"
                            value={totals.count}
                            icon={<span className="text-lg">📁</span>}
                        />
                    </div>

                    <Card>
                        <CardHeader className="flex-row items-center justify-between border-b border-border p-4">
                            <CardTitle className="text-sm flex items-center gap-2">📁 PF Ledger</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-border bg-bg-2">
                                            {['Employee', 'Month', 'A/C Number', 'Basic', 'Employee (12%)', 'Employer (12%)', 'Total', 'Status'].map((h) => (
                                                <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wide">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={8} className="p-8 text-center text-text-3 animate-pulse">Loading records...</td>
                                            </tr>
                                        ) : pfRecords.length > 0 ? pfRecords.map((rec) => (
                                            <tr key={rec.id} className="group hover:bg-accent/[0.03] transition-colors border-b border-border/40 last:border-0">
                                                <td className="px-4 py-3 text-sm text-text">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar name={`${rec.employee.firstName} ${rec.employee.lastName}`} size="sm" />
                                                        <span className="font-semibold tracking-tight truncate max-w-[120px]">
                                                            {rec.employee.firstName} {rec.employee.lastName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-text-2 font-medium">{rec.month}</td>
                                                <td className="px-4 py-3 text-sm text-text-2 font-mono">{rec.accountNumber}</td>
                                                <td className="px-4 py-3 text-sm text-text font-bold">₹{rec.basicSalary.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm text-success font-bold">₹{rec.employeeContribution.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm text-success font-bold">₹{rec.employerContribution.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm text-accent font-bold">₹{rec.totalContribution.toLocaleString()}</td>
                                                <td className="px-4 py-3">
                                                    {getPFStatusBadge(rec.status)}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={8}>
                                                    <EmptyState
                                                        icon={<ArchiveIcon className="w-5 h-5" />}
                                                        title="No PF records found"
                                                        description="Create a new PF entry to get started."
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Payroll Modal */}
            <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg">
                <DialogHeader>
                    <DialogTitle>Create Payroll Record</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <form id="payroll-form" onSubmit={form.handleSubmit((data) => onSubmit(data as any))} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Employee *"
                                options={employeeOptions}
                                error={form.formState.errors.employeeId?.message}
                                {...form.register("employeeId")}
                            />
                            <Input
                                label="Month *"
                                placeholder="e.g. Feb 2026"
                                error={form.formState.errors.month?.message}
                                {...form.register("month")}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Basic Salary *"
                                type="number"
                                error={form.formState.errors.basicSalary?.message}
                                {...form.register("basicSalary", { valueAsNumber: true })}
                            />
                            <Input
                                label="Allowances"
                                type="number"
                                {...form.register("allowances", { valueAsNumber: true })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Arrears/Overtime"
                                type="number"
                                {...form.register("arrears", { valueAsNumber: true })}
                            />
                            <div className="flex flex-col gap-1.5">
                                <Input
                                    label="Reimbursements"
                                    type="number"
                                    {...form.register("reimbursements", { valueAsNumber: true })}
                                />
                                {approvedReimbursements.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={pullReimbursementAmount}
                                        className="text-xs text-accent hover:underline text-left font-semibold"
                                    >
                                        Pull ₹{approvedReimbursements.reduce((s, r) => s + r.amount, 0).toLocaleString()} from {approvedReimbursements.length} approved request{approvedReimbursements.length > 1 ? "s" : ""}
                                    </button>
                                )}
                                {loadingReimb && <span className="text-xs text-text-4">Checking approved reimbursements...</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Loans/Advances Rec."
                                type="number"
                                {...form.register("loansAdvances", { valueAsNumber: true })}
                            />
                            <Input
                                label="Other Ded."
                                type="number"
                                {...form.register("otherDed", { valueAsNumber: true })}
                            />
                        </div>

                        <Card className="bg-bg-2">
                            <CardContent className="flex items-center justify-between p-4">
                                <span className="text-sm font-bold text-text-3 uppercase tracking-wider">Gross Pre-Tax Estimate</span>
                                <span className="text-xl font-extrabold text-accent">₹{form.watch("netSalary")?.toLocaleString() || "0"}</span>
                            </CardContent>
                            <p className="text-xs text-text-3 px-4 pb-4">Note: Statutory components like Income Tax and PF will be dynamically automatically deducted by the Payroll Compliance Engine upon record creation.</p>
                        </Card>
                    </form>
                </DialogBody>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" form="payroll-form">
                        Save Record
                    </Button>
                </DialogFooter>
            </Dialog>

            {/* PF Modal */}
            <Dialog open={isPFModalOpen} onClose={() => setIsPFModalOpen(false)} size="lg">
                <DialogHeader>
                    <DialogTitle>New Provident Fund Entry</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <form id="pf-form" onSubmit={pfForm.handleSubmit(onPFSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Employee *"
                                options={employeeOptions}
                                error={pfForm.formState.errors.employeeId?.message}
                                {...pfForm.register("employeeId")}
                            />
                            <Input
                                label="Month *"
                                placeholder="e.g. Feb 2026"
                                error={pfForm.formState.errors.month?.message}
                                {...pfForm.register("month")}
                            />
                        </div>

                        <Input
                            label="Account Number *"
                            placeholder="PF-XXXX-XXXX"
                            error={pfForm.formState.errors.accountNumber?.message}
                            {...pfForm.register("accountNumber")}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Basic Salary *"
                                type="number"
                                error={pfForm.formState.errors.basicSalary?.message}
                                {...pfForm.register("basicSalary", { valueAsNumber: true })}
                            />
                            <Select
                                label="Status"
                                options={pfStatusOptions}
                                {...pfForm.register("status")}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 opacity-70">
                            <Input
                                label="Employee Contrib. (12%)"
                                type="number"
                                disabled
                                {...pfForm.register("employeeContribution")}
                            />
                            <Input
                                label="Employer Contrib. (12%)"
                                type="number"
                                disabled
                                {...pfForm.register("employerContribution")}
                            />
                        </div>

                        <Card className="bg-bg-2">
                            <CardContent className="flex items-center justify-between p-4">
                                <span className="text-sm font-bold text-text-3 uppercase tracking-wider">Total Monthly Contribution</span>
                                <span className="text-xl font-extrabold text-success">₹{pfForm.watch("totalContribution").toLocaleString()}</span>
                            </CardContent>
                        </Card>
                    </form>
                </DialogBody>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsPFModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" form="pf-form">
                        Save Entry
                    </Button>
                </DialogFooter>
            </Dialog>

            <CsvImportModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onSuccess={fetchAll}
                apiEndpoint="/api/payroll/import"
                title="Import Payroll CSV"
                templateHeaders={["employeeId", "month", "basicSalary", "allowances", "pfDeduction", "tax", "otherDed", "netSalary", "status"]}
            />

            <CsvImportModal
                isOpen={isPFImportOpen}
                onClose={() => setIsPFImportOpen(false)}
                onSuccess={fetchAll}
                apiEndpoint="/api/pf/import"
                title="Import PF CSV"
                templateHeaders={["employeeId", "month", "accountNumber", "basicSalary", "employeeContribution", "employerContribution", "totalContribution", "status"]}
            />
        </div>
    )
}
