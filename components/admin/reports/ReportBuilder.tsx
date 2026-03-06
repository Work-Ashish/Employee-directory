"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
    DownloadIcon,
    DoubleArrowRightIcon,
    ReloadIcon,
    PlusIcon,
    TrashIcon,
    FileTextIcon,
    ArchiveIcon,
    CalendarIcon,
    PersonIcon,
    TokensIcon
} from "@radix-ui/react-icons"
import { format } from "date-fns"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Spinner } from "@/components/ui/Spinner"

type EntityType = "EMPLOYEE" | "PAYROLL" | "ATTENDANCE"

interface ColumnDef {
    id: string
    label: string
    entity: EntityType
}

const ENTITY_COLUMNS: ColumnDef[] = [
    // Employee
    { id: "employeeCode", label: "Emp Code", entity: "EMPLOYEE" },
    { id: "firstName", label: "First Name", entity: "EMPLOYEE" },
    { id: "lastName", label: "Last Name", entity: "EMPLOYEE" },
    { id: "email", label: "Email", entity: "EMPLOYEE" },
    { id: "designation", label: "Designation", entity: "EMPLOYEE" },
    { id: "salary", label: "Salary", entity: "EMPLOYEE" },

    // Payroll
    { id: "month", label: "Month", entity: "PAYROLL" },
    { id: "employee.employeeCode", label: "Emp Code", entity: "PAYROLL" },
    { id: "employee.firstName", label: "First Name", entity: "PAYROLL" },
    { id: "netSalary", label: "Net Salary", entity: "PAYROLL" },
    { id: "tax", label: "Tax", entity: "PAYROLL" },

    // Attendance
    { id: "date", label: "Date", entity: "ATTENDANCE" },
    { id: "employee.firstName", label: "Employee", entity: "ATTENDANCE" },
    { id: "checkIn", label: "Check In", entity: "ATTENDANCE" },
    { id: "checkOut", label: "Check Out", entity: "ATTENDANCE" },
    { id: "workHours", label: "Work Hours", entity: "ATTENDANCE" },
]

export function ReportBuilder() {
    const [entityType, setEntityType] = useState<EntityType>("EMPLOYEE")
    const [selectedColumns, setSelectedColumns] = useState<string[]>([])
    const [filters, setFilters] = useState<Record<string, string>>({})
    const [reportName, setReportName] = useState("")
    const [previewData, setPreviewData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    // Reset columns when entity changes
    useEffect(() => {
        const defaults = ENTITY_COLUMNS.filter(c => c.entity === entityType).slice(0, 4).map(c => c.id)
        setSelectedColumns(defaults)
    }, [entityType])

    const handlePreview = async () => {
        if (selectedColumns.length === 0) {
            toast.error("Please select at least one column")
            return
        }

        setLoading(true)
        try {
            const res = await fetch("/api/reports/query", {
                method: "POST",
                body: JSON.stringify({
                    entityType,
                    columns: selectedColumns,
                    filters,
                    limit: 10
                })
            })
            if (res.ok) {
                const result = await res.json()
                const data = result.data || result
                setPreviewData(data.data || (Array.isArray(data) ? data : []))
            }
        } catch (error) {
            toast.error("Failed to fetch preview")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!reportName) return toast.error("Please enter a report name")
        setSaving(true)
        try {
            const res = await fetch("/api/reports/saved", {
                method: "POST",
                body: JSON.stringify({
                    name: reportName,
                    entityType,
                    config: { columns: selectedColumns, filters }
                })
            })
            if (res.ok) {
                toast.success("Report saved successfully")
            }
        } catch (error) {
            toast.error("Failed to save report")
        } finally {
            setSaving(false)
        }
    }

    const handleExport = async () => {
        try {
            const res = await fetch("/api/reports/export", {
                method: "POST",
                body: JSON.stringify({
                    config: { entityType, columns: selectedColumns, filters },
                    format: "CSV"
                })
            })
            if (res.ok) {
                const blob = await res.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `Report_${format(new Date(), "yyyyMMdd")}.csv`
                a.click()
            }
        } catch (error) {
            toast.error("Export failed")
        }
    }

    return (
        <div className="space-y-6 animate-page-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <Card variant="glass" className="p-6 space-y-6">
                        <div>
                            <label className="text-sm font-bold text-text-3 uppercase tracking-tight block mb-2">Report Name</label>
                            <Input
                                type="text"
                                value={reportName}
                                onChange={(e) => setReportName(e.target.value)}
                                placeholder="e.g., Monthly Payroll Summary"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-bold text-text-3 uppercase tracking-tight block mb-2">Entity Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(["EMPLOYEE", "PAYROLL", "ATTENDANCE"] as EntityType[]).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setEntityType(type)}
                                        className={`p-2 rounded-lg border text-xs font-bold transition-all ${entityType === type
                                            ? "bg-accent text-white border-accent"
                                            : "bg-surface text-text-2 border-border hover:border-accent/30"
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-bold text-text-3 uppercase tracking-tight block mb-2">Select Columns</label>
                            <div className="space-y-1 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {ENTITY_COLUMNS.filter(c => c.entity === entityType).map((col) => (
                                    <label key={col.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={selectedColumns.includes(col.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedColumns([...selectedColumns, col.id])
                                                else setSelectedColumns(selectedColumns.filter(id => id !== col.id))
                                            }}
                                            className="accent-accent"
                                        />
                                        <span className="text-base text-text group-hover:text-accent transition-colors">{col.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border">
                            <Button
                                variant="secondary"
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
                <div className="lg:col-span-2 space-y-6">
                    <Card variant="glass" className="p-6 min-h-[400px] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Preview (Top 10)</h3>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleSave}
                                    loading={saving}
                                    leftIcon={<PlusIcon />}
                                >
                                    Save Report
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleExport}
                                    leftIcon={<DownloadIcon />}
                                    className="shadow-lg shadow-blue-500/20"
                                >
                                    Export CSV
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-x-auto rounded-xl border border-border bg-surface">
                            {previewData.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-bg-2">
                                            {selectedColumns.map(col => {
                                                const def = ENTITY_COLUMNS.find(c => c.id === col)
                                                return (
                                                    <th key={col} className="p-3 text-xs font-bold text-text-3 uppercase tracking-tight border-b border-border whitespace-nowrap">
                                                        {def?.label || col}
                                                    </th>
                                                )
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.map((row, i) => (
                                            <tr key={i} className="hover:bg-surface-2/50 transition-colors">
                                                {selectedColumns.map(col => {
                                                    let val = row
                                                    if (col.includes(".")) {
                                                        col.split(".").forEach(p => val = val?.[p])
                                                    } else {
                                                        val = row[col]
                                                    }
                                                    return (
                                                        <td key={col} className="p-3 text-base text-text-2 border-b border-border">
                                                            {typeof val === "object" ? "..." : String(val ?? "-")}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-text-3 space-y-2 py-20">
                                    <ArchiveIcon className="w-8 h-8 opacity-20" />
                                    <p className="text-base italic">Configure columns and click Preview to see data</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
