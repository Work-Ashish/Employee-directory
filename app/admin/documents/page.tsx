"use client"

import * as React from "react"
import { DocCategory } from "@/types"
import { Modal } from "@/components/ui/Modal"
import { PlusIcon, FileTextIcon, DownloadIcon, TrashIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ─── Constants ──────────────────────────────────────────────

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

const CATEGORY_ICONS: Record<DocCategory, string> = {
    POLICY: "📋",
    CONTRACT: "📝",
    PAYSLIP: "💵",
    TAX: "🧾",
    IDENTIFICATION: "🪪",
}

// ─── Types ──────────────────────────────────────────────────

interface Employee {
    id: string
    firstName: string
    lastName: string
    employeeCode: string
    designation: string
    department?: { name: string; color: string }
}

interface Document {
    id: string
    title: string
    category: DocCategory
    url: string
    uploadDate: string
    size?: string | null
    isPublic: boolean
    employeeId?: string | null
    employee?: Employee | null
}

// ─── Component ──────────────────────────────────────────────

export default function DocumentManagement() {
    const [documents, setDocuments] = React.useState<Document[]>([])
    const [employees, setEmployees] = React.useState<Employee[]>([])
    const [loadingDocs, setLoadingDocs] = React.useState(true)
    const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null)
    const [empSearch, setEmpSearch] = React.useState("")
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [selectedDoc, setSelectedDoc] = React.useState<Document | null>(null)
    const [saving, setSaving] = React.useState(false)

    // Upload form state
    const [uploadTarget, setUploadTarget] = React.useState<"all" | "selected">("all")
    const [selectedEmpIds, setSelectedEmpIds] = React.useState<Set<string>>(new Set())
    const [empSearchModal, setEmpSearchModal] = React.useState("")
    const [isDragging, setIsDragging] = React.useState(false)
    const [droppedFileName, setDroppedFileName] = React.useState<string | null>(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const [form, setForm] = React.useState({
        title: "",
        category: "POLICY" as DocCategory,
        url: "",
        size: "",
    })
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null)

    // ─── Data Fetching ───────────────────────────────────────

    const fetchAll = React.useCallback(async () => {
        setLoadingDocs(true)
        try {
            const [docsRes, empsRes] = await Promise.all([
                fetch("/api/documents", { cache: "no-store" }),
                fetch("/api/employees?limit=100", { cache: "no-store" }),
            ])
            if (docsRes.ok) {
                const docJson = await docsRes.json()
                setDocuments(Array.isArray(docJson) ? docJson : docJson.data || [])
            }
            if (empsRes.ok) {
                const empJson = await empsRes.json()
                setEmployees(Array.isArray(empJson) ? empJson : empJson.data || [])
            }
        } catch {
            toast.error("Failed to load data")
        } finally {
            setLoadingDocs(false)
        }
    }, [])

    React.useEffect(() => { fetchAll() }, [fetchAll])

    // ─── Derived ─────────────────────────────────────────────

    const companyPolicies = documents.filter(d => d.isPublic && !d.employeeId)

    const getEmpDocs = (empId: string) =>
        documents.filter(d => d.employeeId === empId)

    const filteredEmployees = employees.filter(e =>
        `${e.firstName} ${e.lastName} ${e.employeeCode}`.toLowerCase().includes(empSearch.toLowerCase())
    )

    const filteredModalEmployees = employees.filter(e =>
        `${e.firstName} ${e.lastName} ${e.employeeCode}`.toLowerCase().includes(empSearchModal.toLowerCase())
    )

    const viewedDocs = selectedEmployee
        ? getEmpDocs(selectedEmployee.id)
        : companyPolicies

    // Clear selected doc when changing employee/section
    React.useEffect(() => { setSelectedDoc(null) }, [selectedEmployee])

    // ─── Preview helper ──────────────────────────────────────
    const getPreviewType = (url: string): "pdf" | "image" | "none" => {
        if (!url) return "none"
        if (url.startsWith("data:image") || /\.(png|jpe?g|gif|webp|svg)$/i.test(url)) return "image"
        if (url.startsWith("data:application/pdf") || /\.pdf$/i.test(url)) return "pdf"
        return "none"
    }

    // ─── File Handling ───────────────────────────────────────

    const processFile = (file: File) => {
        const sizeKB = file.size / 1024
        const sizeStr = sizeKB < 1024
            ? `${sizeKB.toFixed(1)} KB`
            : `${(sizeKB / 1024).toFixed(2)} MB`

        setSelectedFile(file)
        setForm(p => ({
            ...p,
            size: sizeStr,
            title: p.title || file.name.replace(/\.[^/.]+$/, ""),
        }))
        setDroppedFileName(file.name)
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (file) processFile(file)
    }

    // ─── Upload ──────────────────────────────────────────────

    const handleUpload = async () => {
        if (!form.title || (!selectedFile && !form.url)) {
            toast.error("Please provide a title and file")
            return
        }

        setSaving(true)
        try {
            let fileUrl = form.url

            // If a local file was selected, upload it first
            if (selectedFile) {
                toast.loading("Uploading file to storage...", { id: "doc-upload" })
                const uploadFormData = new FormData()
                uploadFormData.append("file", selectedFile)
                uploadFormData.append("bucket", "documents")

                const uploadRes = await fetch("/api/upload", {
                    method: "POST",
                    body: uploadFormData
                })

                if (!uploadRes.ok) throw new Error("File upload failed")
                const uploadData = await uploadRes.json()
                fileUrl = uploadData.url
            }

            let payload: any

            if (uploadTarget === "all") {
                // One public document (company-wide policy)
                payload = {
                    title: form.title,
                    category: form.category,
                    url: fileUrl,
                    size: form.size || null,
                    isPublic: true,
                }
                const res = await fetch("/api/documents", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                })
                if (!res.ok) throw new Error("Failed to save document metadata")
                toast.success("Policy uploaded for all employees", { id: "doc-upload" })
            } else {
                const ids = Array.from(selectedEmpIds)
                if (ids.length === 0) {
                    toast.error("Select at least one employee")
                    setSaving(false)
                    return
                }
                payload = {
                    title: form.title,
                    category: form.category,
                    url: fileUrl,
                    size: form.size || null,
                    isPublic: false,
                    employeeIds: ids,
                }
                const res = await fetch("/api/documents", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                })
                if (!res.ok) throw new Error("Failed to save document metadata")
                toast.success(`Document sent to ${ids.length} employee${ids.length > 1 ? "s" : ""}`, { id: "doc-upload" })
            }

            setIsModalOpen(false)
            resetForm()
            fetchAll()
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Upload failed", { id: "doc-upload" })
        } finally {
            setSaving(false)
        }
    }

    const resetForm = () => {
        setForm({ title: "", category: "POLICY", url: "", size: "" })
        setSelectedFile(null)
        setDroppedFileName(null)
        setUploadTarget("all")
        setSelectedEmpIds(new Set())
        setEmpSearchModal("")
    }

    const toggleEmpId = (id: string) => {
        setSelectedEmpIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const handleDelete = async (docId: string) => {
        if (!confirm("Delete this document?")) return
        try {
            const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" })
            if (!res.ok) throw new Error()
            toast.success("Deleted")
            fetchAll()
        } catch {
            toast.error("Failed to delete")
        }
    }

    // ─── Sub-components ──────────────────────────────────────

    const DocCard = ({ doc }: { doc: Document }) => {
        const isActive = selectedDoc?.id === doc.id
        return (
            <div
                onClick={() => setSelectedDoc(isActive ? null : doc)}
                className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all group",
                    isActive
                        ? "border-[var(--accent)] bg-[rgba(0,122,255,0.06)]"
                        : "border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--surface)]"
                )}
            >
                <div className="w-10 h-10 rounded-lg bg-[rgba(0,122,255,0.06)] flex items-center justify-center text-[20px] shrink-0">
                    {CATEGORY_ICONS[doc.category]}
                </div>
                <div className="flex-1 min-w-0">
                    <div className={cn("text-[13px] font-semibold truncate", isActive ? "text-[var(--accent)]" : "text-[var(--text)]")}>{doc.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md border", CATEGORY_COLORS[doc.category])}>
                            {CATEGORY_LABELS[doc.category]}
                        </span>
                        {doc.size && <span className="text-[10px] text-[var(--text3)]">{doc.size}</span>}
                        <span className="text-[10px] text-[var(--text3)]">{new Date(doc.uploadDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {doc.url && doc.url !== "#" && (
                        <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={doc.title}
                            onClick={e => e.stopPropagation()}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text3)] hover:text-[var(--accent)] hover:bg-[rgba(0,122,255,0.08)] transition-all"
                        >
                            <DownloadIcon className="w-3.5 h-3.5" />
                        </a>
                    )}
                    <button
                        onClick={e => { e.stopPropagation(); handleDelete(doc.id) }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text3)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    >
                        <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        )
    }

    // ─── Render ──────────────────────────────────────────────

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col gap-0 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Document Management</h1>
                    <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Browse employee files and broadcast company policies</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true) }}
                    className="flex items-center gap-2 p-[9px_14px] bg-[var(--accent)] text-white rounded-[9px] text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-[0_2px_8px_rgba(0,122,255,0.25)]"
                >
                    <PlusIcon className="w-4 h-4" /> Upload Document
                </button>
            </div>

            {/* Two-Panel Layout */}
            <div className="flex gap-4 flex-1 min-h-0">
                {/* Left: Employee List */}
                <div className="w-[280px] shrink-0 flex flex-col gap-3">
                    {/* Company Policies button */}
                    <button
                        onClick={() => setSelectedEmployee(null)}
                        className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                            !selectedEmployee
                                ? "border-[var(--accent)] bg-[rgba(0,122,255,0.06)] text-[var(--accent)]"
                                : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--bg2)] text-[var(--text)]"
                        )}
                    >
                        <div className="w-9 h-9 rounded-lg bg-[rgba(0,122,255,0.1)] flex items-center justify-center text-[18px]">🏢</div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold">Company Policies</div>
                            <div className="text-[11px] text-[var(--text3)]">{companyPolicies.length} document{companyPolicies.length !== 1 ? "s" : ""}</div>
                        </div>
                    </button>

                    {/* Search */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text3)]" />
                        <input
                            value={empSearch}
                            onChange={e => setEmpSearch(e.target.value)}
                            placeholder="Search employees..."
                            className="w-full pl-8 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[13px] text-[var(--text)] outline-none focus:border-[var(--accent)] transition-all"
                        />
                    </div>

                    {/* Employee cards */}
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                        {loadingDocs ? (
                            Array(6).fill(0).map((_, i) => (
                                <div key={i} className="h-14 rounded-xl bg-[var(--surface)] animate-pulse" />
                            ))
                        ) : filteredEmployees.map(emp => {
                            const docCount = getEmpDocs(emp.id).length
                            const initials = `${emp.firstName[0]}${emp.lastName[0]}`
                            const isSelected = selectedEmployee?.id === emp.id
                            return (
                                <button
                                    key={emp.id}
                                    onClick={() => setSelectedEmployee(emp)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all",
                                        isSelected
                                            ? "border-[var(--accent)] bg-[rgba(0,122,255,0.06)]"
                                            : "border-transparent hover:border-[var(--border)] hover:bg-[var(--surface)]"
                                    )}
                                >
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#007aff] to-[#5856d6] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                                        {initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={cn("text-[12.5px] font-semibold truncate", isSelected ? "text-[var(--accent)]" : "text-[var(--text)]")}>
                                            {emp.firstName} {emp.lastName}
                                        </div>
                                        <div className="text-[11px] text-[var(--text3)] truncate">{emp.employeeCode}</div>
                                    </div>
                                    {docCount > 0 && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[rgba(0,122,255,0.1)] text-[var(--accent)]">
                                            {docCount}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                        {!loadingDocs && filteredEmployees.length === 0 && (
                            <div className="text-center text-[12px] text-[var(--text3)] py-8">No employees found</div>
                        )}
                    </div>
                </div>

                {/* Right: Document View + Preview */}
                <div className="flex-1 flex gap-4 min-h-0 min-w-0">
                    {/* Document List */}
                    <div className={cn("glass rounded-2xl p-5 flex flex-col min-h-0 transition-all duration-300", selectedDoc ? "w-[320px] shrink-0" : "flex-1")}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                {selectedEmployee ? (
                                    <>
                                        <h2 className="text-[16px] font-bold text-[var(--text)]">
                                            {selectedEmployee.firstName} {selectedEmployee.lastName}
                                        </h2>
                                        <p className="text-[12px] text-[var(--text3)]">{selectedEmployee.employeeCode} · {selectedEmployee.designation}</p>
                                    </>
                                ) : (
                                    <>
                                        <h2 className="text-[16px] font-bold text-[var(--text)]">Company Policies</h2>
                                        <p className="text-[12px] text-[var(--text3)]">Documents visible to all employees</p>
                                    </>
                                )}
                            </div>
                            <div className="text-[12px] text-[var(--text3)]">{viewedDocs.length} doc{viewedDocs.length !== 1 ? "s" : ""}</div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                            {loadingDocs ? (
                                Array(4).fill(0).map((_, i) => (
                                    <div key={i} className="h-16 rounded-xl bg-[var(--bg2)] animate-pulse" />
                                ))
                            ) : viewedDocs.length > 0 ? (
                                viewedDocs.map(doc => <DocCard key={doc.id} doc={doc} />)
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
                                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg2)] flex items-center justify-center text-[32px]">📂</div>
                                    <div className="text-[14px] font-semibold text-[var(--text2)]">No documents yet</div>
                                    <div className="text-[12px] text-[var(--text3)]">
                                        {selectedEmployee ? `Upload documents for ${selectedEmployee.firstName} using the button above` : "Upload a company policy to get started"}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Preview Pane */}
                    {selectedDoc && (
                        <div className="flex-1 glass rounded-2xl flex flex-col min-h-0 overflow-hidden">
                            {/* Preview Header */}
                            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] shrink-0">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[18px]">{CATEGORY_ICONS[selectedDoc.category]}</span>
                                    <div className="min-w-0">
                                        <div className="text-[13px] font-bold text-[var(--text)] truncate">{selectedDoc.title}</div>
                                        <div className="text-[11px] text-[var(--text3)]">{selectedDoc.size} · {new Date(selectedDoc.uploadDate).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {selectedDoc.url && selectedDoc.url !== "#" && (
                                        <a
                                            href={selectedDoc.url}
                                            download={selectedDoc.title}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-[12px] font-semibold hover:opacity-90 transition-opacity"
                                        >
                                            <DownloadIcon className="w-3 h-3" /> Download
                                        </a>
                                    )}
                                    <button
                                        onClick={() => setSelectedDoc(null)}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text3)] hover:bg-[var(--bg2)] transition-colors text-[18px] leading-none"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            {/* Preview Body */}
                            <div className="flex-1 min-h-0 overflow-auto bg-[var(--bg)]">
                                {(() => {
                                    const type = getPreviewType(selectedDoc.url)
                                    if (type === "pdf") {
                                        return (
                                            <iframe
                                                src={selectedDoc.url}
                                                className="w-full h-full border-0"
                                                title={selectedDoc.title}
                                            />
                                        )
                                    }
                                    if (type === "image") {
                                        return (
                                            <div className="flex items-center justify-center h-full p-4">
                                                <img
                                                    src={selectedDoc.url}
                                                    alt={selectedDoc.title}
                                                    className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                                                />
                                            </div>
                                        )
                                    }
                                    return (
                                        <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
                                            <div className="text-[48px]">{CATEGORY_ICONS[selectedDoc.category]}</div>
                                            <div className="text-[14px] font-semibold text-[var(--text2)]">{selectedDoc.title}</div>
                                            <div className="text-[12px] text-[var(--text3)] max-w-[260px]">
                                                Preview is not available for this file type. Use the download button to open it.
                                            </div>
                                            {selectedDoc.url && selectedDoc.url !== "#" && (
                                                <a
                                                    href={selectedDoc.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white text-[13px] font-semibold rounded-lg hover:opacity-90 transition-opacity"
                                                >
                                                    <DownloadIcon className="w-4 h-4" /> Open / Download
                                                </a>
                                            )}
                                        </div>
                                    )
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Upload Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Upload Document"
            >
                <div className="space-y-4">
                    {/* Title & Category */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[12px] font-semibold text-[var(--text2)] mb-1.5">Title *</label>
                            <input
                                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[13px] outline-none focus:border-[var(--accent)] transition-all"
                                value={form.title}
                                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                placeholder="e.g. Employee Handbook 2026"
                            />
                        </div>
                        <div>
                            <label className="block text-[12px] font-semibold text-[var(--text2)] mb-1.5">Category *</label>
                            <select
                                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[13px] outline-none focus:border-[var(--accent)] transition-all"
                                value={form.category}
                                onChange={e => setForm(p => ({ ...p, category: e.target.value as DocCategory }))}
                            >
                                {(Object.keys(CATEGORY_LABELS) as DocCategory[]).map(c => (
                                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Drag & Drop Zone */}
                    <div>
                        <label className="block text-[12px] font-semibold text-[var(--text2)] mb-1.5">File *</label>
                        <div
                            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200",
                                isDragging ? "border-[var(--accent)] bg-[rgba(0,122,255,0.06)]"
                                    : droppedFileName ? "border-[rgba(52,199,89,0.5)] bg-[var(--green-dim)]"
                                        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[rgba(0,122,255,0.03)]"
                            )}
                        >
                            <input ref={fileInputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
                            {droppedFileName ? (
                                <div className="flex flex-col items-center gap-1.5">
                                    <div className="w-9 h-9 rounded-full bg-[var(--green-dim)] flex items-center justify-center">
                                        <FileTextIcon className="w-4 h-4 text-[#1a9140]" />
                                    </div>
                                    <div className="text-[13px] font-semibold text-[#1a9140]">{droppedFileName}</div>
                                    <div className="text-[11px] text-[var(--text3)]">{form.size} · Click to replace</div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-1.5">
                                    <div className="w-9 h-9 rounded-full bg-[var(--bg2)] flex items-center justify-center">
                                        <DownloadIcon className="w-4 h-4 text-[var(--text3)] rotate-180" />
                                    </div>
                                    <div className="text-[13px] font-semibold text-[var(--text2)]">
                                        {isDragging ? "Drop file here" : "Drag & drop or click to upload"}
                                    </div>
                                    <div className="text-[11px] text-[var(--text3)]">PDF, DOCX, XLSX, PNG — any format</div>
                                </div>
                            )}
                        </div>
                        {!droppedFileName && (
                            <input
                                className="mt-2 w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] outline-none focus:border-[var(--accent)] transition-all"
                                value={form.url}
                                onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                                placeholder="Or paste a URL: https://storage.example.com/doc.pdf"
                            />
                        )}
                    </div>

                    {/* Recipients */}
                    <div>
                        <label className="block text-[12px] font-semibold text-[var(--text2)] mb-2">Send To *</label>
                        <div className="flex gap-2 mb-3">
                            <button
                                type="button"
                                onClick={() => setUploadTarget("all")}
                                className={cn(
                                    "flex-1 py-2 rounded-lg text-[13px] font-semibold border transition-all",
                                    uploadTarget === "all"
                                        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                                        : "border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg2)]"
                                )}
                            >
                                🏢 All Employees
                            </button>
                            <button
                                type="button"
                                onClick={() => setUploadTarget("selected")}
                                className={cn(
                                    "flex-1 py-2 rounded-lg text-[13px] font-semibold border transition-all",
                                    uploadTarget === "selected"
                                        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                                        : "border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg2)]"
                                )}
                            >
                                👤 Select Employees
                            </button>
                        </div>

                        {uploadTarget === "selected" && (
                            <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                                <div className="p-2 border-b border-[var(--border)] bg-[var(--surface)]">
                                    <div className="relative">
                                        <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text3)]" />
                                        <input
                                            value={empSearchModal}
                                            onChange={e => setEmpSearchModal(e.target.value)}
                                            placeholder="Search employees..."
                                            className="w-full pl-7 pr-3 py-1.5 rounded-md bg-[var(--bg)] border border-[var(--border)] text-[12px] outline-none focus:border-[var(--accent)]"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[180px] overflow-y-auto">
                                    {/* Select All row */}
                                    <label className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--surface)] cursor-pointer border-b border-[var(--border)]">
                                        <input
                                            type="checkbox"
                                            checked={selectedEmpIds.size === employees.length}
                                            onChange={e => {
                                                if (e.target.checked) setSelectedEmpIds(new Set(employees.map(emp => emp.id)))
                                                else setSelectedEmpIds(new Set())
                                            }}
                                            className="rounded"
                                        />
                                        <span className="text-[12px] font-semibold text-[var(--text)]">Select All ({employees.length})</span>
                                    </label>
                                    {filteredModalEmployees.map(emp => (
                                        <label key={emp.id} className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--surface)] cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedEmpIds.has(emp.id)}
                                                onChange={() => toggleEmpId(emp.id)}
                                                className="rounded"
                                            />
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#007aff] to-[#5856d6] flex items-center justify-center text-[9px] font-bold text-white">
                                                {emp.firstName[0]}{emp.lastName[0]}
                                            </div>
                                            <div>
                                                <div className="text-[12px] font-semibold text-[var(--text)]">{emp.firstName} {emp.lastName}</div>
                                                <div className="text-[10px] text-[var(--text3)]">{emp.employeeCode}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                {selectedEmpIds.size > 0 && (
                                    <div className="px-3 py-2 bg-[rgba(0,122,255,0.05)] border-t border-[var(--border)] text-[11px] font-semibold text-[var(--accent)]">
                                        {selectedEmpIds.size} employee{selectedEmpIds.size > 1 ? "s" : ""} selected
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 border border-[var(--border)] rounded-lg text-[13px] text-[var(--text2)] hover:bg-[var(--bg2)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={saving}
                            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {saving ? "Uploading..." : "Upload Document"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
