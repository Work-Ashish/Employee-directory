"use client"

import * as React from "react"
import { DataTable } from "@/components/ui/DataTable"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { Tooltip } from "@/components/ui/Tooltip"
import { Spinner } from "@/components/ui/Spinner"
import { ColumnDef } from "@tanstack/react-table"
import { CaretSortIcon, DownloadIcon, PlusIcon } from "@radix-ui/react-icons"
import { TableEmployee, Department } from "@/features/employees/types"

interface EmployeeListProps {
    employees: TableEmployee[]
    departments: Department[]
    isLoading: boolean
    pageCount: number
    pageIndex: number
    totalRows: number
    onPageChange: (newPageIndex: number) => void
    onOpenCreateModal: () => void
    onOpenEditModal: (emp: any) => void
    onOpenViewModal: (emp: any) => void
    onResetCredentials: (emp: any) => void
    onRelinkUsers: () => void
    onDelete: (id: string, name: string) => void
    onImportClick: () => void
    onExportCSV: () => void
    onExportPDF: () => void
    isResettingCreds: string | null
    isRelinkingUsers?: boolean
    searchValue?: string
    onSearchChange?: (value: string) => void
}

function getStatusVariant(status: string) {
    switch (status) {
        case "Active": return "success"
        case "On Leave": return "warning"
        case "Resigned": return "neutral"
        default: return "danger"
    }
}

export const EmployeeList = React.memo(function EmployeeList({
    employees,
    departments,
    isLoading,
    pageCount,
    pageIndex,
    totalRows,
    onPageChange,
    onOpenCreateModal,
    onOpenEditModal,
    onOpenViewModal,
    onResetCredentials,
    onRelinkUsers,
    onDelete,
    onImportClick,
    onExportCSV,
    onExportPDF,
    isResettingCreds,
    isRelinkingUsers,
    searchValue,
    onSearchChange
}: EmployeeListProps) {
    const columns = React.useMemo<ColumnDef<TableEmployee>[]>(() => [
        {
            accessorKey: "name",
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 hover:text-text transition-colors"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Name
                    <CaretSortIcon className="w-3 h-3" />
                </button>
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <Avatar
                        name={row.getValue("name") as string}
                        src={row.original.avatarUrl}
                        size="default"
                    />
                    <span className="font-semibold text-text">{row.getValue("name")}</span>
                </div>
            ),
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => <span className="text-sm text-text-3">{row.getValue("email")}</span>,
        },
        {
            accessorKey: "dept",
            header: "Department",
            cell: ({ row }) => <Badge variant="default" size="sm">{row.getValue("dept")}</Badge>,
        },
        {
            accessorKey: "role",
            header: "Position",
            cell: ({ row }) => <span className="text-base text-text">{row.getValue("role")}</span>,
        },
        {
            id: "manager",
            header: "Reports To",
            cell: ({ row }) => {
                const emp = row.original
                if (!emp.manager) {
                    return <Badge variant="warning" size="sm" dot>Unassigned</Badge>
                }
                return (
                    <div className="flex items-center gap-2">
                        <Avatar name={emp.manager} src={emp.managerAvatarUrl} size="xs" />
                        <span className="text-sm text-text-2">{emp.manager}</span>
                    </div>
                )
            },
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as string
                return <Badge variant={getStatusVariant(status) as any} dot>{status}</Badge>
            },
        },
        {
            accessorKey: "start",
            header: "Start Date",
            cell: ({ row }) => <span className="text-sm text-text-3 font-mono">{row.getValue("start")}</span>,
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const emp = row.original.raw
                return (
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Tooltip content="View">
                            <button onClick={() => onOpenViewModal(emp)} className="w-8 h-8 rounded-md border border-border bg-bg flex items-center justify-center text-sm text-text-3 transition-all hover:bg-accent/10 hover:border-accent/25 hover:text-accent hover:scale-110">
                                👁
                            </button>
                        </Tooltip>
                        <Tooltip content="Edit">
                            <button onClick={() => onOpenEditModal(emp)} className="w-8 h-8 rounded-md border border-border bg-bg flex items-center justify-center text-sm text-text-3 transition-all hover:bg-accent/10 hover:border-accent/25 hover:text-accent hover:scale-110">
                                ✏
                            </button>
                        </Tooltip>
                        <Tooltip content="Reset Credentials">
                            <button onClick={() => onResetCredentials(emp)} disabled={isResettingCreds === emp.id} className="w-8 h-8 rounded-md border border-border bg-bg flex items-center justify-center text-sm text-text-3 transition-all hover:bg-warning/10 hover:border-warning/25 hover:text-warning hover:scale-110 disabled:opacity-40">
                                {isResettingCreds === emp.id ? <Spinner size="sm" /> : "🔑"}
                            </button>
                        </Tooltip>
                        <Tooltip content="Delete">
                            <button onClick={() => onDelete(emp.id, `${emp.firstName} ${emp.lastName}`)} className="w-8 h-8 rounded-md border border-border bg-bg flex items-center justify-center text-sm text-text-3 transition-all hover:bg-danger/10 hover:border-danger/25 hover:text-danger hover:scale-110">
                                🗑
                            </button>
                        </Tooltip>
                    </div>
                )
            },
        },
    ], [departments, isResettingCreds, onOpenEditModal, onOpenViewModal, onResetCredentials, onDelete])

    if (isLoading) {
        return (
            <div className="h-[400px] w-full flex items-center justify-center gap-2 text-text-3">
                <Spinner /> Loading Data...
            </div>
        )
    }

    return (
        <DataTable
            columns={columns}
            data={employees}
            searchKey="name"
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            pageCount={pageCount}
            pageIndex={pageIndex}
            totalRows={totalRows}
            onPageChange={onPageChange}
            filterFields={[
                { id: "dept", label: "Departments", options: departments.map(d => d.name) },
                { id: "status", label: "Status", options: ["Active", "On Leave", "Resigned", "Terminated"] }
            ]}
            actions={
                <>
                    <Button variant="secondary" size="sm" onClick={onImportClick} leftIcon={<DownloadIcon className="w-3.5 h-3.5 rotate-180" />}>
                        Import
                    </Button>
                    <Button variant="secondary" size="sm" onClick={onRelinkUsers} loading={isRelinkingUsers}>
                        Repair Logins
                    </Button>
                    <Button variant="secondary" size="sm" onClick={onExportCSV} leftIcon={<DownloadIcon className="w-3.5 h-3.5" />}>
                        CSV
                    </Button>
                    <Button variant="secondary" size="sm" onClick={onExportPDF} leftIcon={<DownloadIcon className="w-3.5 h-3.5" />}>
                        PDF
                    </Button>
                    <Button onClick={onOpenCreateModal} leftIcon={<PlusIcon className="w-4 h-4" />}>
                        Add Employee
                    </Button>
                </>
            }
        />
    )
})
