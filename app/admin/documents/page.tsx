"use client"

import * as React from "react"
import { DocCategory } from "@/types"
import { Modal } from "@/components/ui/Modal"
import { PlusIcon, FileTextIcon, DownloadIcon, TrashIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons"
import { cn, extractArray } from "@/lib/utils"
import { DocumentAPI, Document } from "@/features/documents/api/client"
import { EmployeeAPI } from "@/features/employees/api/client"
import { toast } from "sonner"
import { confirmDanger, confirmAction, showSuccess } from "@/lib/swal"
import { PageHeader } from "@/components/ui/PageHeader"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { EmptyState } from "@/components/ui/EmptyState"
import { Spinner } from "@/components/ui/Spinner"

// ─── Constants ──────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
    POLICY: "Policy",
    CONTRACT: "Contract",
    CERTIFICATE: "Certificate",
    ID_PROOF: "ID Proof",
    OTHER: "Other",
}

const CATEGORY_COLORS: Record<string, string> = {
    POLICY: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    CONTRACT: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
    CERTIFICATE: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
    ID_PROOF: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    OTHER: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20",
}

const CATEGORY_ICONS: Record<string, string> = {
    POLICY: "📋",
    CONTRACT: "📝",
    CERTIFICATE: "🎓",
    ID_PROOF: "🪪",
    OTHER: "📄",
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

// Document type imported from features/documents/api/client

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
            const [docData, empData] = await Promise.all([
                DocumentAPI.list(),
                EmployeeAPI.fetchEmployees(1, 100),
            ])
            const rawDocs = (docData.results || extractArray(docData)) as any[]
            setDocuments(rawDocs.map((d: any) => ({
                ...d,
                url: d.url || d.fileUrl || "",
                uploadDate: d.uploadDate || d.createdAt || "",
                employeeId: d.isPublic ? null : (d.employeeId || d.uploadedBy || null),
            })))
            setEmployees(empData.results || [])
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

                if (!uploadRes.ok) {
                    const uploadErr = await uploadRes.json()
                    throw new Error(uploadErr.error || "File upload failed")
                }
                const uploadData = await uploadRes.json()
                fileUrl = uploadData.url
            }

            let payload: any

            const basePayload = {
                title: form.title,
                category: form.category,
                fileUrl: fileUrl,
                isPublic: uploadTarget === "all",
            }

            if (uploadTarget === "all") {
                await DocumentAPI.create(basePayload)
                toast.success("Policy uploaded for all employees", { id: "doc-upload" })
            } else {
                const ids = Array.from(selectedEmpIds)
                if (ids.length === 0) {
                    toast.error("Select at least one employee")
                    setSaving(false)
                    return
                }
                // Create one document per employee (Django has no bulk employee assignment)
                await Promise.allSettled(
                    ids.map(empId => DocumentAPI.create({ ...basePayload, isPublic: false, uploadedById: empId }))
                )
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
        if (!await confirmDanger("Delete Document?", "This document will be permanently removed.")) return
        try {
            await DocumentAPI.delete(docId)
            showSuccess("Deleted", "Document removed successfully")
            fetchAll()
        } catch (error: any) {
            toast.error(error.message || "Failed to delete")
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
                        ? "border-accent bg-accent/5"
                        : "border-border bg-bg hover:bg-surface"
                )}
            >
                <div className="w-10 h-10 rounded-lg bg-accent/5 flex items-center justify-center text-[20px] shrink-0">
                    {CATEGORY_ICONS[doc.category]}
                </div>
                <div className="flex-1 min-w-0">
                    <div className={cn("text-base font-semibold truncate", isActive ? "text-accent" : "text-text")}>{doc.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md border", CATEGORY_COLORS[doc.category])}>
                            {CATEGORY_LABELS[doc.category]}
                        </span>
                        {Number(doc.size) > 0 ? <span className="text-[10px] text-text-3">{doc.size}</span> : null}
                        <span className="text-[10px] text-text-3">{new Date(doc.uploadDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
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
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-3 hover:text-accent hover:bg-accent/[0.08] transition-all"
                        >
                            <DownloadIcon className="w-3.5 h-3.5" />
                        </a>
                    )}
                    <button
                        onClick={e => { e.stopPropagation(); handleDelete(doc.id) }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-text-3 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    >
                        <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        )
    }

    // ─── Render ──────────────────────────────────────────────

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col gap-0 animate-page-in">
            {/* Header */}
            <PageHeader
                title="Document Management"
                description="Browse employee files and broadcast company policies"
                actions={
                    <Button
                        onClick={() => { resetForm(); setIsModalOpen(true) }}
                        leftIcon={<PlusIcon className="w-4 h-4" />}
                    >
                        Upload Document
                    </Button>
                }
            />

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
                                ? "border-accent bg-accent/5 text-accent"
                                : "border-border bg-surface hover:bg-bg-2 text-text"
                        )}
                    >
                        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-[18px]">🏢</div>
                        <div className="flex-1 min-w-0">
                            <div className="text-base font-semibold">Company Policies</div>
                            <div className="text-xs text-text-3">{companyPolicies.length} document{companyPolicies.length !== 1 ? "s" : ""}</div>
                        </div>
                    </button>

                    {/* Search */}
                    <Input
                        value={empSearch}
                        onChange={e => setEmpSearch(e.target.value)}
                        placeholder="Search employees..."
                        leftIcon={<MagnifyingGlassIcon className="w-3.5 h-3.5" />}
                    />

                    {/* Employee cards */}
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                        {loadingDocs ? (
                            Array(6).fill(0).map((_, i) => (
                                <div key={i} className="h-14 rounded-xl bg-surface animate-pulse" />
                            ))
                        ) : filteredEmployees.map(emp => {
                            const docCount = getEmpDocs(emp.id).length
                            const isSelected = selectedEmployee?.id === emp.id
                            return (
                                <button
                                    key={emp.id}
                                    onClick={() => setSelectedEmployee(emp)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all",
                                        isSelected
                                            ? "border-accent bg-accent/5"
                                            : "border-transparent hover:border-border hover:bg-surface"
                                    )}
                                >
                                    <Avatar name={`${emp.firstName} ${emp.lastName}`} size="default" />
                                    <div className="flex-1 min-w-0">
                                        <div className={cn("text-sm font-semibold truncate", isSelected ? "text-accent" : "text-text")}>
                                            {emp.firstName} {emp.lastName}
                                        </div>
                                        <div className="text-xs text-text-3 truncate">{emp.employeeCode}</div>
                                    </div>
                                    {docCount > 0 && (
                                        <Badge variant="default" size="sm">
                                            {docCount}
                                        </Badge>
                                    )}
                                </button>
                            )
                        })}
                        {!loadingDocs && filteredEmployees.length === 0 && (
                            <div className="text-center text-sm text-text-3 py-8">No employees found</div>
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
                                        <h2 className="text-lg font-bold text-text">
                                            {selectedEmployee.firstName} {selectedEmployee.lastName}
                                        </h2>
                                        <p className="text-sm text-text-3">{selectedEmployee.employeeCode} · {selectedEmployee.designation}</p>
                                    </>
                                ) : (
                                    <>
                                        <h2 className="text-lg font-bold text-text">Company Policies</h2>
                                        <p className="text-sm text-text-3">Documents visible to all employees</p>
                                    </>
                                )}
                            </div>
                            <div className="text-sm text-text-3">{viewedDocs.length} doc{viewedDocs.length !== 1 ? "s" : ""}</div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                            {loadingDocs ? (
                                Array(4).fill(0).map((_, i) => (
                                    <div key={i} className="h-16 rounded-xl bg-bg-2 animate-pulse" />
                                ))
                            ) : viewedDocs.length > 0 ? (
                                viewedDocs.map(doc => <DocCard key={doc.id} doc={doc} />)
                            ) : (
                                <EmptyState
                                    icon={<span className="text-[32px]">📂</span>}
                                    title="No documents yet"
                                    description={selectedEmployee ? `Upload documents for ${selectedEmployee.firstName} using the button above` : "Upload a company policy to get started"}
                                />
                            )}
                        </div>
                    </div>

                    {/* Preview Pane */}
                    {selectedDoc && (
                        <div className="flex-1 glass rounded-2xl flex flex-col min-h-0 overflow-hidden">
                            {/* Preview Header */}
                            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[18px]">{CATEGORY_ICONS[selectedDoc.category]}</span>
                                    <div className="min-w-0">
                                        <div className="text-base font-bold text-text truncate">{selectedDoc.title}</div>
                                        <div className="text-xs text-text-3">{selectedDoc.size && Number(selectedDoc.size) > 0 ? `${selectedDoc.size} · ` : ""}{new Date(selectedDoc.uploadDate).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {selectedDoc.url && selectedDoc.url !== "#" && (
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            leftIcon={<DownloadIcon className="w-3 h-3" />}
                                            onClick={() => window.open(selectedDoc.url, '_blank')}
                                        >
                                            Download
                                        </Button>
                                    )}
                                    <button
                                        onClick={() => setSelectedDoc(null)}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-text-3 hover:bg-bg-2 transition-colors text-[18px] leading-none"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            {/* Preview Body */}
                            <div className="flex-1 min-h-0 overflow-auto bg-bg">
                                {(() => {
                                    const type = getPreviewType(selectedDoc.url)
                                    if (type === "pdf") {
                                        return (
                                            <div className="w-full h-full flex flex-col">
                                                <iframe
                                                    src={selectedDoc.url}
                                                    className="w-full flex-1 border-0"
                                                    title={selectedDoc.title}
                                                    onError={() => {}}
                                                />
                                                <div className="p-3 bg-surface border-t border-border text-center">
                                                    <a href={selectedDoc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">
                                                        Open in new tab if preview doesn't load
                                                    </a>
                                                </div>
                                            </div>
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
                                        <EmptyState
                                            icon={<span className="text-[48px]">{CATEGORY_ICONS[selectedDoc.category]}</span>}
                                            title={selectedDoc.title}
                                            description="Preview is not available for this file type. Use the download button to open it."
                                            action={
                                                selectedDoc.url && selectedDoc.url !== "#" ? (
                                                    <Button
                                                        leftIcon={<DownloadIcon className="w-4 h-4" />}
                                                        onClick={() => window.open(selectedDoc.url, '_blank')}
                                                    >
                                                        Open / Download
                                                    </Button>
                                                ) : undefined
                                            }
                                            className="h-full"
                                        />
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
                        <Input
                            label="Title *"
                            value={form.title}
                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                            placeholder="e.g. Employee Handbook 2026"
                        />
                        <Select
                            label="Category *"
                            value={form.category}
                            onChange={e => setForm(p => ({ ...p, category: e.target.value as DocCategory }))}
                            options={(Object.keys(CATEGORY_LABELS) as DocCategory[]).map(c => ({ value: c, label: CATEGORY_LABELS[c] }))}
                        />
                    </div>

                    {/* Drag & Drop Zone */}
                    <div>
                        <label className="block text-sm font-medium text-text-2 mb-1.5">File *</label>
                        <div
                            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200",
                                isDragging ? "border-accent bg-accent/5"
                                    : droppedFileName ? "border-success/50 bg-success/10"
                                        : "border-border bg-surface hover:border-accent hover:bg-accent/[0.03]"
                            )}
                        >
                            <input ref={fileInputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
                            {droppedFileName ? (
                                <div className="flex flex-col items-center gap-1.5">
                                    <div className="w-9 h-9 rounded-full bg-success/10 flex items-center justify-center">
                                        <FileTextIcon className="w-4 h-4 text-success" />
                                    </div>
                                    <div className="text-base font-semibold text-success">{droppedFileName}</div>
                                    <div className="text-xs text-text-3">{form.size} · Click to replace</div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-1.5">
                                    <div className="w-9 h-9 rounded-full bg-bg-2 flex items-center justify-center">
                                        <DownloadIcon className="w-4 h-4 text-text-3 rotate-180" />
                                    </div>
                                    <div className="text-base font-semibold text-text-2">
                                        {isDragging ? "Drop file here" : "Drag & drop or click to upload"}
                                    </div>
                                    <div className="text-xs text-text-3">PDF, DOCX, XLSX, PNG — any format</div>
                                </div>
                            )}
                        </div>
                        {!droppedFileName && (
                            <Input
                                wrapperClassName="mt-2"
                                value={form.url}
                                onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                                placeholder="Or paste a document URL"
                                className="text-sm"
                            />
                        )}
                    </div>

                    {/* Recipients */}
                    <div>
                        <label className="block text-sm font-medium text-text-2 mb-2">Send To *</label>
                        <div className="flex gap-2 mb-3">
                            <Button
                                type="button"
                                variant={uploadTarget === "all" ? "primary" : "secondary"}
                                className="flex-1"
                                onClick={() => setUploadTarget("all")}
                            >
                                🏢 All Employees
                            </Button>
                            <Button
                                type="button"
                                variant={uploadTarget === "selected" ? "primary" : "secondary"}
                                className="flex-1"
                                onClick={() => setUploadTarget("selected")}
                            >
                                👤 Select Employees
                            </Button>
                        </div>

                        {uploadTarget === "selected" && (
                            <div className="border border-border rounded-xl overflow-hidden">
                                <div className="p-2 border-b border-border bg-surface">
                                    <Input
                                        value={empSearchModal}
                                        onChange={e => setEmpSearchModal(e.target.value)}
                                        placeholder="Search employees..."
                                        leftIcon={<MagnifyingGlassIcon className="w-3 h-3" />}
                                        className="text-sm"
                                    />
                                </div>
                                <div className="max-h-[180px] overflow-y-auto">
                                    {/* Select All row */}
                                    <label className="flex items-center gap-3 px-3 py-2 hover:bg-surface cursor-pointer border-b border-border">
                                        <input
                                            type="checkbox"
                                            checked={selectedEmpIds.size === employees.length}
                                            onChange={e => {
                                                if (e.target.checked) setSelectedEmpIds(new Set(employees.map(emp => emp.id)))
                                                else setSelectedEmpIds(new Set())
                                            }}
                                            className="rounded"
                                        />
                                        <span className="text-sm font-semibold text-text">Select All ({employees.length})</span>
                                    </label>
                                    {filteredModalEmployees.map(emp => (
                                        <label key={emp.id} className="flex items-center gap-3 px-3 py-2 hover:bg-surface cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedEmpIds.has(emp.id)}
                                                onChange={() => toggleEmpId(emp.id)}
                                                className="rounded"
                                            />
                                            <Avatar name={`${emp.firstName} ${emp.lastName}`} size="xs" />
                                            <div>
                                                <div className="text-sm font-semibold text-text">{emp.firstName} {emp.lastName}</div>
                                                <div className="text-[10px] text-text-3">{emp.employeeCode}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                {selectedEmpIds.size > 0 && (
                                    <div className="px-3 py-2 bg-accent/5 border-t border-border text-xs font-semibold text-accent">
                                        {selectedEmpIds.size} employee{selectedEmpIds.size > 1 ? "s" : ""} selected
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpload} loading={saving}>
                            {saving ? "Uploading..." : "Upload Document"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
