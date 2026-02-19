"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"
import { DataTable } from "@/components/ui/DataTable"
import { ColumnDef } from "@tanstack/react-table"
import { CaretSortIcon, DotsHorizontalIcon, DownloadIcon, PlusIcon } from "@radix-ui/react-icons" // Fallback or use lucide if available
import { exportToCSV, exportToPDF } from "@/lib/exportUtils"

type Employee = {
    id: string
    name: string
    email: string
    dept: string
    role: string
    status: "Active" | "On Leave" | "Terminated"
    start: string
    initials: string
    color: string
}

const employees: Employee[] = [
    { id: "1", name: "Michael Johnson", email: "michael.j@emspro.com", dept: "Sales", role: "Sales Representative", status: "Active", start: "Mar 10, 2023", initials: "MJ", color: "from-[#007aff] to-[#5856d6]" },
    { id: "2", name: "Lisa Anderson", email: "lisa.a@emspro.com", dept: "Marketing", role: "Content Strategist", status: "Active", start: "Jan 8, 2023", initials: "LA", color: "from-[#ec4899] to-[#f43f5e]" },
    { id: "3", name: "David Wilson", email: "david.w@emspro.com", dept: "Finance", role: "Financial Analyst", status: "Active", start: "Nov 15, 2022", initials: "DW", color: "from-[#38bdf8] to-[#0ea5e9]" },
    { id: "4", name: "John Doe", email: "john.d@emspro.com", dept: "Engineering", role: "Senior Software Engineer", status: "Active", start: "Jan 15, 2022", initials: "JD", color: "from-[#3395ff] to-[#007aff]" },
    { id: "5", name: "James Taylor", email: "james.t@emspro.com", dept: "Engineering", role: "DevOps Engineer", status: "Active", start: "Oct 30, 2021", initials: "JT", color: "from-[#10b981] to-[#059669]" },
    { id: "6", name: "Jane Smith", email: "jane.s@emspro.com", dept: "Marketing", role: "Marketing Manager", status: "Active", start: "Jun 20, 2021", initials: "JS", color: "from-[#f59e0b] to-[#d97706]" },
    { id: "7", name: "Sarah Davis", email: "sarah.d@emspro.com", dept: "Engineering", role: "Product Designer", status: "On Leave", start: "Apr 22, 2021", initials: "SD", color: "from-[#a78bfa] to-[#5856d6]" },
    { id: "8", name: "Emily Brown", email: "emily.b@emspro.com", dept: "HR", role: "HR Director", status: "Active", start: "Sep 1, 2020", initials: "EB", color: "from-[#10b981] to-[#0d9488]" },
    { id: "9", name: "Amanda Thomas", email: "amanda.t@emspro.com", dept: "Sales", role: "Sales Director", status: "Active", start: "Feb 14, 2020", initials: "AT", color: "from-[#f43f5e] to-[#e11d48]" },
    { id: "10", name: "Robert Martinez", email: "robert.m@emspro.com", dept: "Operations", role: "Operations Manager", status: "Active", start: "Aug 12, 2019", initials: "RM", color: "from-[#007aff] to-[#4f46e5]" },
]

export const columns: ColumnDef<Employee>[] = [
    {
        accessorKey: "name",
        header: ({ column }) => {
            return (
                <button
                    className="flex items-center gap-1 hover:text-[var(--text)] transition-colors"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Name
                    <CaretSortIcon className="w-3 h-3" />
                </button>
            )
        },
        cell: ({ row }) => (
            <div className="flex items-center gap-[11px] text-[13.5px] text-[var(--text)]">
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0 bg-gradient-to-br", row.original.color)}>
                    {row.original.initials}
                </div>
                <span className="font-semibold">{row.getValue("name")}</span>
            </div>
        ),
    },
    {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => <div className="text-[13px] text-[var(--text3)]">{row.getValue("email")}</div>,
    },
    {
        accessorKey: "dept",
        header: "Department",
        cell: ({ row }) => (
            <span className="inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold bg-[rgba(0,122,255,0.08)] text-[var(--accent)] border border-[rgba(0,122,255,0.18)]">
                {row.getValue("dept")}
            </span>
        ),
    },
    {
        accessorKey: "role",
        header: "Position",
        cell: ({ row }) => <div className="text-[13.5px] text-[var(--text)]">{row.getValue("role")}</div>,
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string
            return (
                <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold border",
                    status === 'Active'
                        ? "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]"
                        : "bg-[var(--amber-dim)] text-[#b86c00] border-[rgba(255,149,0,0.25)]"
                )}>
                    ● {status}
                </span>
            )
        },
    },
    {
        accessorKey: "start",
        header: "Start Date",
        cell: ({ row }) => <div className="text-[13px] text-[var(--text3)] font-mono">{row.getValue("start")}</div>,
    },
    {
        id: "actions",
        cell: ({ row }) => {
            return (
                <div className="flex items-center gap-[6px] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button className="w-[30px] h-[30px] rounded-[8px] border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center text-[13px] text-[var(--text3)] transition-all duration-200 hover:bg-[rgba(0,122,255,0.08)] hover:border-[rgba(0,122,255,0.25)] hover:text-[var(--accent)] hover:scale-110">👁</button>
                    <button className="w-[30px] h-[30px] rounded-[8px] border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center text-[13px] text-[var(--text3)] transition-all duration-200 hover:bg-[rgba(0,122,255,0.08)] hover:border-[rgba(0,122,255,0.25)] hover:text-[var(--accent)] hover:scale-110">✏</button>
                    <button className="w-[30px] h-[30px] rounded-[8px] border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center text-[13px] text-[var(--text3)] transition-all duration-200 hover:bg-[rgba(255,59,48,0.08)] hover:border-[rgba(255,59,48,0.25)] hover:text-[var(--red)] hover:scale-110">🗑</button>
                </div>
            )
        },
    },
]

export default function Employees() {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    React.useEffect(() => {
        if (!isLoading && user?.role === 'employee') {
            router.push('/')
        }
    }, [user, isLoading, router])

    if (isLoading || user?.role === 'employee') return null

    const handleExportCSV = () => {
        const exportData = employees.map(({ color, initials, ...rest }) => rest);
        exportToCSV(exportData, 'employees_list');
    }

    const handleExportPDF = () => {
        const headers = ['Name', 'Email', 'Department', 'Role', 'Status', 'Start Date'];
        const data = employees.map(e => [e.name, e.email, e.dept, e.role, e.status, e.start]);
        exportToPDF(headers, data, 'employees_list', 'Employee Directory Report');
    }

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Employee Management</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Manage and organize your employee records</p>
            </div>

            <DataTable
                columns={columns}
                data={employees}
                searchKey="name"
                filterFields={[
                    { id: "dept", label: "Departments", options: ["Engineering", "Sales", "Marketing", "Finance", "HR", "Operations"] },
                    { id: "status", label: "Status", options: ["Active", "On Leave"] }
                ]}
                actions={
                    <>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 p-[9px_14px] bg-[var(--surface)] border border-[var(--border)] rounded-[9px] text-[13px] text-[var(--text2)] hover:bg-[var(--bg2)] transition-colors"
                        >
                            <DownloadIcon className="w-3.5 h-3.5" /> CSV
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 p-[9px_14px] bg-[var(--surface)] border border-[var(--border)] rounded-[9px] text-[13px] text-[var(--text2)] hover:bg-[var(--bg2)] transition-colors"
                        >
                            <DownloadIcon className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button className="flex items-center gap-2 p-[9px_14px] bg-[var(--accent)] text-white rounded-[9px] text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-[0_2px_8px_rgba(0,122,255,0.25)]">
                            <PlusIcon className="w-4 h-4" /> Add Employee
                        </button>
                    </>
                }
            />
        </div>
    )
}
