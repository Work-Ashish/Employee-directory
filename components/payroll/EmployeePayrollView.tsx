import * as React from "react"
import { cn, extractArray } from "@/lib/utils"
import { DownloadIcon, ReaderIcon, ArchiveIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"
import { format } from "date-fns"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { Spinner } from "@/components/ui/Spinner"

type Payslip = {
    id: string
    month: string
    basicSalary: number
    allowances: number
    pfDeduction: number
    tax: number
    otherDed: number
    netSalary: number
    status: string
    createdAt: string
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
}

function getPayslipStatusBadge(status: string) {
    if (status === "PAID") return <Badge variant="success" dot>{status}</Badge>
    if (status === "PROCESSED") return <Badge variant="info" dot>{status}</Badge>
    return <Badge variant="neutral" dot>{status}</Badge>
}

function getPFStatusBadge(status: string) {
    if (status === "Credited") return <Badge variant="success" dot>{status}</Badge>
    if (status === "Pending") return <Badge variant="warning" dot>{status}</Badge>
    return <Badge variant="danger" dot>{status}</Badge>
}

export function EmployeePayrollView() {
    const [activeTab, setActiveTab] = React.useState<"payroll" | "pf">("payroll")
    const [payslips, setPayslips] = React.useState<Payslip[]>([])
    const [pfRecords, setPfRecords] = React.useState<PFRecord[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    const fetchData = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const [payRes, pfRes] = await Promise.all([
                fetch('/api/payroll'),
                fetch('/api/pf')
            ])
            if (payRes.ok && pfRes.ok) {
                setPayslips(extractArray<Payslip>(await payRes.json()))
                setPfRecords(extractArray<PFRecord>(await pfRes.json()))
            }
        } catch (error) {
            toast.error("Failed to load your financial data")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchData()
    }, [fetchData])

    const latest = payslips[0]
    const totalPF = pfRecords.reduce((acc, curr) => acc + curr.totalContribution, 0)

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title={activeTab === "payroll" ? "My Payslips" : "My Provident Fund"}
                description={activeTab === "payroll" ? "View and download your monthly salary slips" : "Track your accumulated PF contributions and balance"}
                actions={
                    <div className="flex bg-bg-2 p-1 rounded-xl border border-border">
                        <button
                            onClick={() => setActiveTab("payroll")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all outline-none",
                                activeTab === "payroll" ? "bg-surface text-text shadow-sm" : "text-text-3 hover:text-text-2"
                            )}
                        >
                            <ReaderIcon className="w-4 h-4" /> Payslips
                        </button>
                        <button
                            onClick={() => setActiveTab("pf")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all outline-none",
                                activeTab === "pf" ? "bg-surface text-text shadow-sm" : "text-text-3 hover:text-text-2"
                            )}
                        >
                            <ArchiveIcon className="w-4 h-4" /> PF
                        </button>
                    </div>
                }
            />

            {activeTab === "payroll" ? (
                <>
                    {latest ? (
                        <div className="glass p-6 md:p-8 bg-gradient-to-br from-accent to-purple text-white relative overflow-hidden shadow-lg rounded-2xl">
                            <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-end gap-6">
                                <div>
                                    <div className="text-sm font-medium text-white/80 uppercase tracking-wider mb-2">Last Disbursed Salary ({latest.month})</div>
                                    <div className="text-3xl md:text-[48px] font-extrabold leading-none mb-1">₹{latest.netSalary.toLocaleString()}</div>
                                    <div className="text-md text-white/90 font-medium">Credited on {format(new Date(latest.createdAt), "MMM dd, yyyy")}</div>
                                </div>
                                <div className="text-left md:text-right flex flex-row md:flex-col gap-6 md:gap-0">
                                    <div>
                                        <div className="text-xs md:text-sm text-white/80 mb-1">Gross Earnings</div>
                                        <div className="text-lg md:text-xl font-bold md:mb-3">₹{(latest.basicSalary + latest.allowances).toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs md:text-sm text-white/80 mb-1">Total Deductions</div>
                                        <div className="text-lg md:text-xl font-bold">-₹{(latest.pfDeduction + latest.tax + latest.otherDed).toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute right-[-40px] top-[-40px] w-[300px] h-[300px] bg-white/10 rounded-full blur-[60px]" />
                        </div>
                    ) : (
                        <Card variant="glass" className="rounded-2xl">
                            <CardContent className="p-12 text-center text-text-3 italic">
                                {isLoading ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <Spinner size="lg" />
                                        <span>Loading salary info...</span>
                                    </div>
                                ) : "No payroll records found yet."}
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader className="flex-row items-center justify-between border-b border-border">
                            <CardTitle className="text-sm flex items-center gap-2">Payslip History</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-border bg-bg-2">
                                            {['Month', 'Basic', 'Allowances', 'Deductions', 'Net Salary', 'Status', 'Action'].map((h) => (
                                                <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wide">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-text-3">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <Spinner size="lg" />
                                                        <span>Loading payslips...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : payslips.length > 0 ? payslips.map((slip) => (
                                            <tr key={slip.id} className="group hover:bg-accent/[0.03] transition-colors duration-200 border-b border-border/40 last:border-0">
                                                <td className="px-4 py-3 font-mono text-base text-text">{slip.month}</td>
                                                <td className="px-4 py-3 text-base text-text-2 font-mono">₹{slip.basicSalary.toLocaleString()}</td>
                                                <td className="px-4 py-3 font-mono text-base text-success">+₹{slip.allowances.toLocaleString()}</td>
                                                <td className="px-4 py-3 font-mono text-base text-danger">-₹{(slip.pfDeduction + slip.tax + slip.otherDed).toLocaleString()}</td>
                                                <td className="px-4 py-3 font-mono text-md font-bold text-accent">₹{slip.netSalary.toLocaleString()}</td>
                                                <td className="px-4 py-3">
                                                    {getPayslipStatusBadge(slip.status)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Button variant="secondary" size="sm" leftIcon={<DownloadIcon className="w-3.5 h-3.5" />}>
                                                        PDF
                                                    </Button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={7}>
                                                    <EmptyState title="No payslips" description="No payroll records found yet." />
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card Stack */}
                            <div className="md:hidden divide-y divide-border">
                                {isLoading ? (
                                    <div className="p-8 text-center text-text-3">
                                        <Spinner size="lg" />
                                    </div>
                                ) : payslips.map((slip) => (
                                    <div key={slip.id} className="p-4 flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="text-md font-bold text-text">{slip.month}</div>
                                                <div className="text-xs text-text-3">Net Salary: <span className="text-accent font-bold">₹{slip.netSalary.toLocaleString()}</span></div>
                                            </div>
                                            {getPayslipStatusBadge(slip.status)}
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <div className="flex gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-text-4 text-xs uppercase">G. Earnings</span>
                                                    <span className="font-mono text-text-2">₹{(slip.basicSalary + slip.allowances).toLocaleString()}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-text-4 text-xs uppercase">Deductions</span>
                                                    <span className="font-mono text-danger">₹{(slip.pfDeduction + slip.tax + slip.otherDed).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm">
                                                <DownloadIcon className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <>
                    <div className="glass p-6 md:p-8 bg-gradient-to-br from-success to-[#34c759] text-white relative overflow-hidden shadow-lg rounded-2xl">
                        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-end gap-6">
                            <div>
                                <div className="text-sm font-medium text-white/80 uppercase tracking-wider mb-2">Total Accumulated Corpus</div>
                                <div className="text-3xl md:text-[48px] font-extrabold leading-none mb-1">₹{totalPF.toLocaleString()}</div>
                                <div className="text-md text-white/90 font-medium">As of {format(new Date(), "MMMM yyyy")}</div>
                            </div>
                            <div className="text-left md:text-right flex flex-row md:flex-col gap-6 md:gap-0">
                                <div>
                                    <div className="text-xs md:text-sm text-white/80 mb-1">Total Contributions</div>
                                    <div className="text-xl md:text-2xl font-bold">{pfRecords.length} Months</div>
                                </div>
                                <div className="md:mt-4">
                                    <div className="text-xs md:text-sm text-white/80 mb-1">A/C Number</div>
                                    <div className="text-md md:text-lg font-mono font-bold tracking-wider">{pfRecords[0]?.accountNumber || "N/A"}</div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute right-[-40px] top-[-40px] w-[300px] h-[300px] bg-white/10 rounded-full blur-[60px]" />
                    </div>

                    <Card>
                        <CardHeader className="flex-row items-center justify-between border-b border-border">
                            <CardTitle className="text-sm flex items-center gap-2">PF Contribution Ledger</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-border bg-bg-2">
                                            {['Month', 'Basic Salary', 'Your Contrib. (12%)', 'Employer Contrib. (12%)', 'Total', 'Status'].map((h) => (
                                                <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wide">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-text-3">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <Spinner size="lg" />
                                                        <span>Loading PF records...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : pfRecords.length > 0 ? pfRecords.map((rec) => (
                                            <tr key={rec.id} className="group hover:bg-accent/[0.03] transition-colors duration-200 border-b border-border/40 last:border-0">
                                                <td className="px-4 py-3 font-mono text-base text-text">{rec.month}</td>
                                                <td className="px-4 py-3 text-base text-text-2 font-mono">₹{rec.basicSalary.toLocaleString()}</td>
                                                <td className="px-4 py-3 font-mono text-base text-success font-bold">₹{rec.employeeContribution.toLocaleString()}</td>
                                                <td className="px-4 py-3 font-mono text-base text-success font-bold">₹{rec.employerContribution.toLocaleString()}</td>
                                                <td className="px-4 py-3 font-mono text-md font-bold text-info">₹{rec.totalContribution.toLocaleString()}</td>
                                                <td className="px-4 py-3">
                                                    {getPFStatusBadge(rec.status)}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={6}>
                                                    <EmptyState title="No PF records" description="No provident fund records found yet." />
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card Stack */}
                            <div className="md:hidden divide-y divide-border">
                                {isLoading ? (
                                    <div className="p-8 text-center text-text-3">
                                        <Spinner size="lg" />
                                    </div>
                                ) : pfRecords.map((rec) => (
                                    <div key={rec.id} className="p-4 flex flex-col gap-1">
                                        <div className="flex justify-between items-center">
                                            <div className="text-md font-bold text-text">{rec.month}</div>
                                            {getPFStatusBadge(rec.status)}
                                        </div>
                                        <div className="flex justify-between text-xs mt-1">
                                            <div className="text-text-3">Contribution: <span className="text-info font-bold">₹{rec.totalContribution.toLocaleString()}</span></div>
                                            <div className="text-text-4 font-mono text-xs">Basic: ₹{rec.basicSalary.toLocaleString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
