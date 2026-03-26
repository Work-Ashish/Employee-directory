"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { extractArray } from "@/lib/utils"
import { DepartmentAPI } from "@/features/departments/api/client"
import { ReportAPI } from "@/features/reports/api/client"
import { toast } from "sonner"
import {
    DownloadIcon,
    ReloadIcon,
    PlusIcon,
    TrashIcon,
    ArchiveIcon,
    PersonIcon,
    CalendarIcon,
    TimerIcon,
    BarChartIcon,
    CaretSortIcon,
    CaretUpIcon,
    CaretDownIcon,
    CheckIcon,
    MixerHorizontalIcon,
    FileTextIcon
} from "@radix-ui/react-icons"
import { format } from "date-fns"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Spinner } from "@/components/ui/Spinner"
import { Badge } from "@/components/ui/Badge"
import { Modal } from "@/components/ui/Modal"

type EntityType = "EMPLOYEE" | "PAYROLL" | "ATTENDANCE" | "LEAVE" | "PERFORMANCE"

interface ColumnDef {
    id: string
    label: string
    entity: EntityType
    format?: "date" | "currency" | "number" | "boolean" | "hours"
    default?: boolean
}

interface SavedReport {
    id: string
    name: string
    entityType: EntityType
    config: { columns: string[]; filters: Record<string, string> }
    createdAt: string
}

const ENTITY_META: Record<EntityType, { label: string; icon: React.ReactNode; color: string }> = {
    EMPLOYEE: { label: "Employee", icon: <PersonIcon className="w-4 h-4" />, color: "bg-blue-500" },
    PAYROLL: { label: "Payroll", icon: <BarChartIcon className="w-4 h-4" />, color: "bg-green-500" },
    ATTENDANCE: { label: "Attendance", icon: <TimerIcon className="w-4 h-4" />, color: "bg-amber-500" },
    LEAVE: { label: "Leave", icon: <CalendarIcon className="w-4 h-4" />, color: "bg-purple-500" },
    PERFORMANCE: { label: "Performance", icon: <FileTextIcon className="w-4 h-4" />, color: "bg-pink-500" },
}

const COLUMNS: ColumnDef[] = [
    // Employee
    { id: "employeeCode", label: "Emp Code", entity: "EMPLOYEE", default: true },
    { id: "firstName", label: "First Name", entity: "EMPLOYEE", default: true },
    { id: "lastName", label: "Last Name", entity: "EMPLOYEE", default: true },
    { id: "email", label: "Email", entity: "EMPLOYEE", default: true },
    { id: "phone", label: "Phone", entity: "EMPLOYEE" },
    { id: "designation", label: "Designation", entity: "EMPLOYEE" },
    { id: "department.name", label: "Department", entity: "EMPLOYEE" },
    { id: "salary", label: "Salary", entity: "EMPLOYEE", format: "currency" },
    { id: "dateOfJoining", label: "Joining Date", entity: "EMPLOYEE", format: "date" },
    { id: "status", label: "Status", entity: "EMPLOYEE" },
    { id: "manager.firstName", label: "Manager", entity: "EMPLOYEE" },
    { id: "address", label: "Address", entity: "EMPLOYEE" },

    // Payroll
    { id: "employee.employeeCode", label: "Emp Code", entity: "PAYROLL", default: true },
    { id: "employee.firstName", label: "First Name", entity: "PAYROLL", default: true },
    { id: "employee.lastName", label: "Last Name", entity: "PAYROLL", default: true },
    { id: "month", label: "Month", entity: "PAYROLL", default: true },
    { id: "basicSalary", label: "Basic Salary", entity: "PAYROLL", format: "currency" },
    { id: "allowances", label: "Allowances", entity: "PAYROLL", format: "currency" },
    { id: "pfDeduction", label: "PF Deduction", entity: "PAYROLL", format: "currency" },
    { id: "tax", label: "Tax", entity: "PAYROLL", format: "currency" },
    { id: "otherDed", label: "Other Deductions", entity: "PAYROLL", format: "currency" },
    { id: "arrears", label: "Arrears", entity: "PAYROLL", format: "currency" },
    { id: "reimbursements", label: "Reimbursements", entity: "PAYROLL", format: "currency" },
    { id: "netSalary", label: "Net Salary", entity: "PAYROLL", format: "currency" },
    { id: "status", label: "Status", entity: "PAYROLL" },
    { id: "isFinalized", label: "Finalized", entity: "PAYROLL", format: "boolean" },

    // Attendance
    { id: "employee.employeeCode", label: "Emp Code", entity: "ATTENDANCE", default: true },
    { id: "employee.firstName", label: "First Name", entity: "ATTENDANCE", default: true },
    { id: "employee.lastName", label: "Last Name", entity: "ATTENDANCE" },
    { id: "date", label: "Date", entity: "ATTENDANCE", format: "date", default: true },
    { id: "checkIn", label: "Check In", entity: "ATTENDANCE", format: "date" },
    { id: "checkOut", label: "Check Out", entity: "ATTENDANCE", format: "date" },
    { id: "workHours", label: "Work Hours", entity: "ATTENDANCE", format: "hours", default: true },
    { id: "overtime", label: "Overtime (min)", entity: "ATTENDANCE", format: "number" },
    { id: "isLate", label: "Late", entity: "ATTENDANCE", format: "boolean" },
    { id: "isEarlyExit", label: "Early Exit", entity: "ATTENDANCE", format: "boolean" },
    { id: "status", label: "Status", entity: "ATTENDANCE" },

    // Leave
    { id: "employee.employeeCode", label: "Emp Code", entity: "LEAVE", default: true },
    { id: "employee.firstName", label: "First Name", entity: "LEAVE", default: true },
    { id: "employee.lastName", label: "Last Name", entity: "LEAVE", default: true },
    { id: "type", label: "Leave Type", entity: "LEAVE", default: true },
    { id: "startDate", label: "Start Date", entity: "LEAVE", format: "date" },
    { id: "endDate", label: "End Date", entity: "LEAVE", format: "date" },
    { id: "reason", label: "Reason", entity: "LEAVE" },
    { id: "status", label: "Status", entity: "LEAVE" },

    // Performance
    { id: "employee.employeeCode", label: "Emp Code", entity: "PERFORMANCE", default: true },
    { id: "employee.firstName", label: "First Name", entity: "PERFORMANCE", default: true },
    { id: "employee.lastName", label: "Last Name", entity: "PERFORMANCE", default: true },
    { id: "rating", label: "Rating", entity: "PERFORMANCE", format: "number", default: true },
    { id: "progress", label: "Progress %", entity: "PERFORMANCE", format: "number" },
    { id: "reviewPeriod", label: "Period", entity: "PERFORMANCE" },
    { id: "reviewType", label: "Review Type", entity: "PERFORMANCE" },
    { id: "status", label: "Status", entity: "PERFORMANCE" },
    { id: "comments", label: "Comments", entity: "PERFORMANCE" },
    { id: "reviewDate", label: "Review Date", entity: "PERFORMANCE", format: "date" },
]

function formatCellValue(val: unknown, fmt?: string): string {
    if (val === null || val === undefined) return "-"
    if (fmt === "date" && (typeof val === "string" || val instanceof Date)) {
        try { return format(new Date(val as string), "MMM dd, yyyy") } catch { return String(val) }
    }
    if (fmt === "currency" && typeof val === "number") return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    if (fmt === "hours" && typeof val === "number") return `${val.toFixed(1)}h`
    if (fmt === "boolean") return val ? "Yes" : "No"
    if (fmt === "number" && typeof val === "number") return val.toLocaleString()
    if (typeof val === "object") return JSON.stringify(val)
    return String(val)
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce((acc: unknown, part) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined), obj)
}

export function ReportBuilder() {
    const [entityType, setEntityType] = useState<EntityType>("EMPLOYEE")
    const [selectedColumns, setSelectedColumns] = useState<string[]>([])
    const [filters, setFilters] = useState<Record<string, string>>({})
    const [reportName, setReportName] = useState("")
    const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([])
    const [totalRows, setTotalRows] = useState(0)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [exporting, setExporting] = useState(false)

    // Sorting
    const [sortBy, setSortBy] = useState("")
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

    // Saved reports
    const [savedReports, setSavedReports] = useState<SavedReport[]>([])
    const [loadingSaved, setLoadingSaved] = useState(false)
    const [showSavedPanel, setShowSavedPanel] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // Departments for filter
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])

    // Filters panel
    const [showFilters, setShowFilters] = useState(false)

    const entityColumns = useMemo(() => COLUMNS.filter(c => c.entity === entityType), [entityType])
    const allSelected = entityColumns.length > 0 && entityColumns.every(c => selectedColumns.includes(c.id))

    // Reset columns when entity changes
    useEffect(() => {
        const defaults = entityColumns.filter(c => c.default).map(c => c.id)
        setSelectedColumns(defaults.length > 0 ? defaults : entityColumns.slice(0, 4).map(c => c.id))
        setPreviewData([])
        setTotalRows(0)
        setSortBy("")
        setFilters({})
        setShowFilters(false)
    }, [entityType]) // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch departments + saved reports on mount
    useEffect(() => {
        DepartmentAPI.list().then(d => {
            const arr = (d as any)?.results || extractArray(d)
            setDepartments((arr as { id: string; name: string }[]).map(dept => ({ id: dept.id, name: dept.name })))
        }).catch((err) => { console.error("ReportBuilder department fetch failed:", err) })

        fetchSavedReports()
    }, [])

    const fetchSavedReports = async () => {
        setLoadingSaved(true)
        try {
            const data = await ReportAPI.list()
            setSavedReports((data.results || extractArray(data)) as unknown as SavedReport[])
        } catch { /* ignore */ } finally {
            setLoadingSaved(false)
        }
    }

    const handlePreview = useCallback(async () => {
        if (selectedColumns.length === 0) {
            toast.error("Select at least one column")
            return
        }
        setLoading(true)
        try {
            const result = await ReportAPI.generate({
                type: entityType,
                config: {
                    columns: selectedColumns,
                    filters,
                    sortBy: sortBy || undefined,
                    sortOrder,
                    limit: 10,
                },
            }) as any
            const inner = result.data || result
            setPreviewData((inner.data || (Array.isArray(inner) ? inner : [])) as Record<string, unknown>[])
            setTotalRows(inner.meta?.total ?? (inner.data?.length || 0))
        } catch {
            toast.error("Failed to fetch preview")
        } finally {
            setLoading(false)
        }
    }, [entityType, selectedColumns, filters, sortBy, sortOrder])

    const handleSave = async () => {
        if (!reportName.trim()) return toast.error("Enter a report name")
        if (reportName.trim().length < 3) return toast.error("Report name must be at least 3 characters")
        setSaving(true)
        try {
            await ReportAPI.create({
                name: reportName.trim(),
                entityType,
                config: { columns: selectedColumns, filters }
            })
            toast.success("Report saved")
            setReportName("")
            fetchSavedReports()
        } catch {
            toast.error("Failed to save")
        } finally {
            setSaving(false)
        }
    }

    const handleLoadReport = (report: SavedReport) => {
        setEntityType(report.entityType)
        setTimeout(() => {
            setSelectedColumns(report.config.columns || [])
            setFilters(report.config.filters || {})
            setReportName(report.name)
            setShowSavedPanel(false)
            toast.success(`Loaded "${report.name}"`)
        }, 50)
    }

    const handleDeleteReport = async (id: string) => {
        setDeletingId(id)
        try {
            await ReportAPI.delete(id)
            toast.success("Report deleted")
            fetchSavedReports()
        } catch {
            toast.error("Failed to delete")
        } finally {
            setDeletingId(null)
        }
    }

    const handleExport = async () => {
        if (selectedColumns.length === 0) return toast.error("Select at least one column")
        setExporting(true)
        try {
            const res = await fetch("/api/reports/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    config: { entityType, columns: selectedColumns, filters, sortBy, sortOrder },
                    format: "CSV"
                })
            })
            if (res.ok) {
                const blob = await res.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `${reportName || entityType}_Report_${format(new Date(), "yyyyMMdd_HHmm")}.csv`
                a.click()
                window.URL.revokeObjectURL(url)
                toast.success("Export downloaded")
            } else {
                toast.error("Export failed")
            }
        } catch {
            toast.error("Export failed")
        } finally {
            setExporting(false)
        }
    }

    const toggleColumn = (colId: string) => {
        setSelectedColumns(prev =>
            prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
        )
    }

    const toggleAllColumns = () => {
        if (allSelected) {
            setSelectedColumns([])
        } else {
            setSelectedColumns(entityColumns.map(c => c.id))
        }
    }

    const handleSort = (colId: string) => {
        if (sortBy === colId) {
            setSortOrder(prev => prev === "asc" ? "desc" : "asc")
        } else {
            setSortBy(colId)
            setSortOrder("asc")
        }
    }

    const activeFilterCount = Object.values(filters).filter(v => v && v.trim()).length

    return (
        <div className="space-y-6 animate-page-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Entity Type */}
                    <Card variant="glass" className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-text-3 uppercase tracking-tight">Entity Type</label>
                            <button
                                onClick={() => setShowSavedPanel(true)}
                                className="text-[11px] font-bold text-accent hover:underline"
                            >
                                Saved Reports ({savedReports.length})
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {(Object.keys(ENTITY_META) as EntityType[]).map((type) => {
                                const meta = ENTITY_META[type]
                                return (
                                    <button
                                        key={type}
                                        onClick={() => setEntityType(type)}
                                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                                            entityType === type
                                                ? "bg-accent text-white border-accent shadow-md shadow-accent/20"
                                                : "bg-surface text-text-2 border-border hover:border-accent/30 hover:bg-surface-2"
                                        }`}
                                    >
                                        {meta.icon}
                                        {meta.label}
                                    </button>
                                )
                            })}
                        </div>
                    </Card>

                    {/* Report Name + Save */}
                    <Card variant="glass" className="p-5 space-y-3">
                        <label className="text-sm font-bold text-text-3 uppercase tracking-tight block">Report Name</label>
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                value={reportName}
                                onChange={(e) => setReportName(e.target.value)}
                                placeholder="e.g., Monthly Payroll Summary"
                                className="flex-1"
                            />
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleSave}
                                loading={saving}
                                leftIcon={<PlusIcon />}
                                disabled={!reportName.trim()}
                                className="shrink-0"
                            >
                                Save
                            </Button>
                        </div>
                    </Card>

                    {/* Filters */}
                    <Card variant="glass" className="p-5 space-y-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center justify-between w-full"
                        >
                            <div className="flex items-center gap-2">
                                <MixerHorizontalIcon className="w-4 h-4 text-text-3" />
                                <span className="text-sm font-bold text-text-3 uppercase tracking-tight">Filters</span>
                                {activeFilterCount > 0 && (
                                    <Badge variant="info" size="sm">{activeFilterCount}</Badge>
                                )}
                            </div>
                            <CaretSortIcon className="w-4 h-4 text-text-4" />
                        </button>

                        {showFilters && (
                            <div className="space-y-3 pt-2 border-t border-border animate-in fade-in duration-200">
                                {departments.length > 0 && (
                                    <Select
                                        label="Department"
                                        value={filters.departmentId || ""}
                                        onChange={(e) => setFilters(prev => ({ ...prev, departmentId: e.target.value }))}
                                    >
                                        <option value="">All Departments</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </Select>
                                )}

                                {entityType === "EMPLOYEE" && (
                                    <Select
                                        label="Status"
                                        value={filters.status || ""}
                                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                        <option value="ON_LEAVE">On Leave</option>
                                        <option value="TERMINATED">Terminated</option>
                                    </Select>
                                )}

                                {entityType === "PAYROLL" && (
                                    <Input
                                        label="Month"
                                        type="month"
                                        value={filters.month || ""}
                                        onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
                                    />
                                )}

                                {(entityType === "ATTENDANCE" || entityType === "LEAVE") && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            label="From"
                                            type="date"
                                            value={filters.dateFrom || ""}
                                            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                                        />
                                        <Input
                                            label="To"
                                            type="date"
                                            value={filters.dateTo || ""}
                                            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                                        />
                                    </div>
                                )}

                                {entityType === "LEAVE" && (
                                    <Select
                                        label="Leave Status"
                                        value={filters.status || ""}
                                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                    >
                                        <option value="">All</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="REJECTED">Rejected</option>
                                    </Select>
                                )}

                                {entityType === "PERFORMANCE" && (
                                    <Input
                                        label="Review Period"
                                        type="text"
                                        placeholder="e.g., 2026-Q1"
                                        value={filters.reviewPeriod || ""}
                                        onChange={(e) => setFilters(prev => ({ ...prev, reviewPeriod: e.target.value }))}
                                    />
                                )}

                                {activeFilterCount > 0 && (
                                    <button
                                        onClick={() => setFilters({})}
                                        className="text-[11px] font-bold text-danger hover:underline"
                                    >
                                        Clear All Filters
                                    </button>
                                )}
                            </div>
                        )}
                    </Card>

                    {/* Column Selection */}
                    <Card variant="glass" className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-text-3 uppercase tracking-tight">
                                Columns ({selectedColumns.length}/{entityColumns.length})
                            </label>
                            <button
                                onClick={toggleAllColumns}
                                className="text-[11px] font-bold text-accent hover:underline"
                            >
                                {allSelected ? "Deselect All" : "Select All"}
                            </button>
                        </div>
                        <div className="space-y-0.5 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                            {entityColumns.map((col) => (
                                <label
                                    key={col.id}
                                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface-2 cursor-pointer group transition-colors"
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                        selectedColumns.includes(col.id)
                                            ? "bg-accent border-accent"
                                            : "border-border group-hover:border-accent/40"
                                    }`}>
                                        {selectedColumns.includes(col.id) && <CheckIcon className="w-3 h-3 text-white" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={selectedColumns.includes(col.id)}
                                        onChange={() => toggleColumn(col.id)}
                                        className="sr-only"
                                    />
                                    <span className="text-sm text-text group-hover:text-accent transition-colors">{col.label}</span>
                                    {col.format && (
                                        <span className="ml-auto text-[9px] font-bold text-text-4 uppercase">{col.format}</span>
                                    )}
                                </label>
                            ))}
                        </div>

                        <div className="pt-3 border-t border-border">
                            <Button
                                onClick={handlePreview}
                                loading={loading}
                                leftIcon={<ReloadIcon />}
                                className="w-full"
                            >
                                Preview Data
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Preview & Actions */}
                <div className="lg:col-span-2 space-y-4">
                    <Card variant="glass" className="p-5 min-h-[500px] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-text">Preview</h3>
                                {totalRows > 0 && (
                                    <Badge variant="neutral" size="sm">
                                        {previewData.length} of {totalRows.toLocaleString()} rows
                                    </Badge>
                                )}
                                {loading && <Spinner size="sm" />}
                            </div>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleExport}
                                loading={exporting}
                                leftIcon={<DownloadIcon />}
                                disabled={selectedColumns.length === 0}
                                className="shadow-md shadow-accent/20"
                            >
                                Export CSV {totalRows > 0 ? `(${totalRows})` : ""}
                            </Button>
                        </div>

                        <div className="flex-1 overflow-x-auto rounded-xl border border-border bg-surface">
                            {previewData.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-bg-2 sticky top-0 z-10">
                                            <th className="p-3 text-[10px] font-bold text-text-4 border-b border-border w-10">#</th>
                                            {selectedColumns.map(col => {
                                                const def = COLUMNS.find(c => c.id === col && c.entity === entityType)
                                                const isSorted = sortBy === col
                                                return (
                                                    <th
                                                        key={col}
                                                        onClick={() => handleSort(col)}
                                                        className="p-3 text-[11px] font-bold text-text-3 uppercase tracking-tight border-b border-border whitespace-nowrap cursor-pointer hover:text-accent transition-colors select-none"
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            {def?.label || col}
                                                            {isSorted ? (
                                                                sortOrder === "asc" ? <CaretUpIcon className="w-3.5 h-3.5 text-accent" /> : <CaretDownIcon className="w-3.5 h-3.5 text-accent" />
                                                            ) : (
                                                                <CaretSortIcon className="w-3.5 h-3.5 opacity-30" />
                                                            )}
                                                        </div>
                                                    </th>
                                                )
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.map((row, i) => (
                                            <tr key={i} className="hover:bg-surface-2/50 transition-colors">
                                                <td className="p-3 text-[11px] text-text-4 border-b border-border font-mono">{i + 1}</td>
                                                {selectedColumns.map(col => {
                                                    const def = COLUMNS.find(c => c.id === col && c.entity === entityType)
                                                    const val = getNestedValue(row, col)
                                                    const formatted = formatCellValue(val, def?.format)
                                                    return (
                                                        <td key={col} className="p-3 text-sm text-text-2 border-b border-border whitespace-nowrap max-w-[200px] truncate">
                                                            {def?.format === "boolean" ? (
                                                                val ? (
                                                                    <span className="inline-flex items-center gap-1 text-green-500 font-bold text-xs">
                                                                        <CheckIcon className="w-3 h-3" /> Yes
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-text-4 text-xs">No</span>
                                                                )
                                                            ) : col === "status" ? (
                                                                <Badge
                                                                    variant={
                                                                        formatted === "ACTIVE" || formatted === "APPROVED" || formatted === "COMPLETED" ? "success"
                                                                            : formatted === "PENDING" ? "warning"
                                                                                : formatted === "REJECTED" || formatted === "TERMINATED" ? "danger"
                                                                                    : "neutral"
                                                                    }
                                                                    size="sm"
                                                                >
                                                                    {formatted}
                                                                </Badge>
                                                            ) : def?.format === "currency" ? (
                                                                <span className="font-mono font-semibold text-text">{formatted}</span>
                                                            ) : (
                                                                formatted
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-text-3 space-y-3 py-24">
                                    <ArchiveIcon className="w-10 h-10 opacity-15" />
                                    <div className="text-center">
                                        <p className="text-sm font-semibold">No preview data</p>
                                        <p className="text-xs text-text-4 mt-1">Select columns and click &quot;Preview Data&quot; to see results</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {previewData.length > 0 && totalRows > 10 && (
                            <div className="mt-3 text-xs text-text-3 text-center">
                                Showing top 10 of {totalRows.toLocaleString()} total records. Export to get all data.
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Saved Reports Modal */}
            <Modal
                isOpen={showSavedPanel}
                onClose={() => setShowSavedPanel(false)}
                title="Saved Reports"
            >
                <div className="space-y-3">
                    {loadingSaved ? (
                        <div className="py-8 flex justify-center"><Spinner size="lg" /></div>
                    ) : savedReports.length === 0 ? (
                        <div className="py-8 text-center text-sm text-text-3">
                            No saved reports yet. Create a report and save it.
                        </div>
                    ) : (
                        savedReports.map(report => (
                            <div
                                key={report.id}
                                className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-surface-2 transition-colors group"
                            >
                                <button
                                    onClick={() => handleLoadReport(report)}
                                    className="flex-1 text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${ENTITY_META[report.entityType]?.color || "bg-gray-400"}`} />
                                        <span className="text-sm font-bold text-text group-hover:text-accent transition-colors">{report.name}</span>
                                        <Badge variant="neutral" size="sm">{report.entityType}</Badge>
                                    </div>
                                    <div className="text-[11px] text-text-4 mt-1 ml-4">
                                        {report.config.columns?.length || 0} columns &middot; Created {format(new Date(report.createdAt), "MMM dd, yyyy")}
                                    </div>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id) }}
                                    disabled={deletingId === report.id}
                                    className="p-2 rounded-lg text-text-4 hover:text-danger hover:bg-danger/10 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    {deletingId === report.id ? <Spinner size="sm" /> : <TrashIcon className="w-4 h-4" />}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </Modal>
        </div>
    )
}
