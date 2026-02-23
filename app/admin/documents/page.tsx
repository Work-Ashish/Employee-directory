"use client"

import * as React from "react"
import { Document, DocCategory } from "@/types"
import { DataTable } from "@/components/ui/DataTable"
import { ColumnDef } from "@tanstack/react-table"
import { Modal } from "@/components/ui/Modal"
import { PlusIcon, FileTextIcon, DownloadIcon, TrashIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

const CATEGORY_LABELS: Record<DocCategory, string> = {
    POLICY: "Policy",
    CONTRACT: "Contract",
    PAYSLIP: "Payslip",
    TAX: "Tax",
    IDENTIFICATION: "ID Document",
}

const CATEGORY_COLORS: Record<DocCategory, string> = {
    POLICY: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    CONTRACT: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
    PAYSLIP: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
    TAX: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    IDENTIFICATION: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
}

const EMPTY_FORM = {
    title: "",
    category: "POLICY" as DocCategory,
    url: "",
    size: "",
    isPublic: true,
    employeeId: "",
}

export default function DocumentManagement() {
    const [documents, setDocuments] = React.useState<Document[]>([])
    const [loading, setLoading] = React.useState(true)
    const [activeTab, setActiveTab] = React.useState<"policies" | "employee_files">("policies")
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [editingDoc, setEditingDoc] = React.useState<Document | null>(null)
    const [formData, setFormData] = React.useState(EMPTY_FORM)
    const [saving, setSaving] = React.useState(false)

    const fetchDocuments = React.useCallback(async () => {
        try {
            const res = await fetch("/api/documents")
            if (!res.ok) throw new Error("Failed to fetch documents")
            const data = await res.json()
            setDocuments(data)
        } catch {
            toast.error("Failed to load documents")
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchDocuments()
    }, [fetchDocuments])

    const filteredDocs = activeTab === "policies"
        ? documents.filter(d => d.isPublic)
        : documents.filter(d => !d.isPublic)

    const openCreate = () => {
        setEditingDoc(null)
        setFormData(EMPTY_FORM)
        setIsModalOpen(true)
    }

    const openEdit = (doc: Document) => {
        setEditingDoc(doc)
        setFormData({
            title: doc.title,
            category: doc.category,
            url: doc.url,
            size: doc.size || "",
            isPublic: doc.isPublic,
            employeeId: doc.employeeId || "",
        })
        setIsModalOpen(true)
    }

    const handleSave = async () => {
        if (!formData.title || !formData.url) {
            toast.error("Title and URL are required")
            return
        }

        setSaving(true)
        try {
            const payload = {
                title: formData.title,
                category: formData.category,
                url: formData.url,
                size: formData.size || null,
                isPublic: formData.isPublic,
                employeeId: formData.employeeId || null,
            }

            const url = editingDoc ? `/api/documents/${editingDoc.id}` : "/api/documents"
            const method = editingDoc ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Failed to save document")
            }

            toast.success(editingDoc ? "Document updated" : "Document created")
            setIsModalOpen(false)
            fetchDocuments()
        } catch (error: any) {
            toast.error(error.message || "Failed to save document")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this document?")) return

        try {
            const res = await fetch(`/api/documents/${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Failed to delete document")
            toast.success("Document deleted")
            fetchDocuments()
        } catch {
            toast.error("Failed to delete document")
        }
    }

    const columns: ColumnDef<Document>[] = [
        {
            accessorKey: "title",
            header: "Document Name",
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[rgba(255,59,48,0.08)] flex items-center justify-center text-[var(--red,#ef4444)]">
                        <FileTextIcon />
                    </div>
                    <div>
                        <div className="font-semibold text-[var(--text)]">{row.getValue("title")}</div>
                        <div className="text-[11px] text-[var(--text3)]">{row.original.size || "—"}</div>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "category",
            header: "Category",
            cell: ({ row }) => {
                const cat = row.getValue("category") as DocCategory
                return (
                    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border", CATEGORY_COLORS[cat])}>
                        {CATEGORY_LABELS[cat]}
                    </span>
                )
            },
            filterFn: (row, id, value) => value === row.getValue(id),
        },
        {
            accessorKey: "uploadDate",
            header: "Date Uploaded",
            cell: ({ row }) => (
                <div className="text-[var(--text2)] text-[13px]">
                    {new Date(row.getValue("uploadDate")).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </div>
            ),
        },
        {
            accessorKey: "employee",
            header: "Employee",
            cell: ({ row }) => {
                const emp = row.original.employee
                return (
                    <div className="text-[var(--text2)] text-[13px]">
                        {emp ? `${emp.firstName} ${emp.lastName}` : row.original.isPublic ? "All Employees" : "—"}
                    </div>
                )
            },
        },
        {
            accessorKey: "isPublic",
            header: "Visibility",
            cell: ({ row }) => (
                <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border",
                    row.original.isPublic
                        ? "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]"
                        : "bg-[var(--bg2)] text-[var(--text3)] border-[var(--border)]"
                )}>
                    {row.original.isPublic ? "Public" : "Private"}
                </span>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => openEdit(row.original)}
                        className="text-[12px] text-[var(--accent)] hover:underline"
                    >
                        Edit
                    </button>
                    {row.original.url && row.original.url !== "#" && (
                        <a
                            href={row.original.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-[var(--bg2)] rounded-md text-[var(--text3)] hover:text-[var(--accent)] transition-colors"
                        >
                            <DownloadIcon className="w-3.5 h-3.5" />
                        </a>
                    )}
                    <button
                        onClick={() => handleDelete(row.original.id)}
                        className="p-1.5 hover:bg-[rgba(255,59,48,0.08)] rounded-md text-[var(--text3)] hover:text-[var(--red,#ef4444)] transition-colors"
                    >
                        <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            ),
        },
    ]

    const inputClass = "w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(0,122,255,0.1)] transition-all"
    const labelClass = "block text-[12px] font-semibold text-[var(--text2)] mb-1.5"

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Document Management</h1>
                    <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Securely store and manage company policies and employee records</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 p-[9px_14px] bg-[var(--accent)] text-white rounded-[9px] text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-[0_2px_8px_rgba(0,122,255,0.25)]"
                >
                    <PlusIcon className="w-4 h-4" /> Upload Document
                </button>
            </div>

            <div className="flex gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab("policies")}
                    className={cn(
                        "px-4 py-1.5 text-[13px] font-medium rounded-md transition-all",
                        activeTab === "policies" ? "bg-[var(--bg)] text-[var(--text)] shadow-sm" : "text-[var(--text3)] hover:text-[var(--text2)]"
                    )}
                >
                    Company Policies
                </button>
                <button
                    onClick={() => setActiveTab("employee_files")}
                    className={cn(
                        "px-4 py-1.5 text-[13px] font-medium rounded-md transition-all",
                        activeTab === "employee_files" ? "bg-[var(--bg)] text-[var(--text)] shadow-sm" : "text-[var(--text3)] hover:text-[var(--text2)]"
                    )}
                >
                    Employee Files
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-[var(--text3)]">Loading documents...</div>
            ) : (
                <DataTable
                    columns={columns}
                    data={filteredDocs}
                    searchKey="title"
                    filterFields={[
                        { id: "category", label: "Category", options: ["POLICY", "CONTRACT", "PAYSLIP", "TAX", "IDENTIFICATION"] },
                    ]}
                />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingDoc ? "Edit Document" : "Upload Document"}
            >
                <div className="space-y-4">
                    <div>
                        <label className={labelClass}>Title *</label>
                        <input
                            className={inputClass}
                            value={formData.title}
                            onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                            placeholder="e.g. Employee Handbook 2026"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Category *</label>
                            <select
                                className={inputClass}
                                value={formData.category}
                                onChange={e => setFormData(p => ({ ...p, category: e.target.value as DocCategory }))}
                            >
                                {(Object.keys(CATEGORY_LABELS) as DocCategory[]).map(c => (
                                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>File Size</label>
                            <input
                                className={inputClass}
                                value={formData.size}
                                onChange={e => setFormData(p => ({ ...p, size: e.target.value }))}
                                placeholder="e.g. 2.4 MB"
                            />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Document URL / Path *</label>
                        <input
                            className={inputClass}
                            value={formData.url}
                            onChange={e => setFormData(p => ({ ...p, url: e.target.value }))}
                            placeholder="https://storage.example.com/doc.pdf"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Assign to Employee ID</label>
                            <input
                                className={inputClass}
                                value={formData.employeeId}
                                onChange={e => setFormData(p => ({ ...p, employeeId: e.target.value }))}
                                placeholder="Employee CUID (optional)"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Visibility</label>
                            <select
                                className={inputClass}
                                value={formData.isPublic ? "public" : "private"}
                                onChange={e => setFormData(p => ({ ...p, isPublic: e.target.value === "public" }))}
                            >
                                <option value="public">Public (all employees)</option>
                                <option value="private">Private (assigned employee only)</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 border border-[var(--border)] rounded-lg text-[13px] text-[var(--text2)] hover:bg-[var(--bg2)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {saving ? "Saving..." : editingDoc ? "Update Document" : "Upload Document"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
