"use client"

import * as React from "react"
import { Asset, AssetStatus, AssetType } from "@/types"
import { DataTable } from "@/components/ui/DataTable"
import { ColumnDef } from "@tanstack/react-table"
import { Modal } from "@/components/ui/Modal"
import { PlusIcon, LaptopIcon, CubeIcon, ExclamationTriangleIcon, TrashIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

const STATUS_LABELS: Record<AssetStatus, string> = {
    AVAILABLE: "Available",
    ASSIGNED: "Assigned",
    MAINTENANCE: "Maintenance",
    RETIRED: "Retired",
}

const TYPE_LABELS: Record<AssetType, string> = {
    HARDWARE: "Hardware",
    SOFTWARE: "Software",
    ACCESSORY: "Accessory",
}

const StatusBadge = ({ status }: { status: AssetStatus }) => {
    const styles: Record<AssetStatus, string> = {
        AVAILABLE: "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]",
        ASSIGNED: "bg-[var(--blue-dim)] text-[#007aff] border-[rgba(0,122,255,0.25)]",
        MAINTENANCE: "bg-[var(--amber-dim)] text-[#b86c00] border-[rgba(255,149,0,0.25)]",
        RETIRED: "bg-[var(--bg2)] text-[var(--text3)] border-[var(--border)]",
    }
    return (
        <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold border", styles[status])}>
            ● {STATUS_LABELS[status]}
        </span>
    )
}

const StatCard = ({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) => (
    <div className="glass p-5 flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white text-[20px]", color)}>
            {icon}
        </div>
        <div>
            <div className="text-[24px] font-extrabold text-[var(--text)]">{value}</div>
            <div className="text-[12px] text-[var(--text3)] uppercase tracking-wider font-semibold">{label}</div>
        </div>
    </div>
)

const EMPTY_FORM = {
    name: "",
    type: "HARDWARE" as AssetType,
    serialNumber: "",
    status: "AVAILABLE" as AssetStatus,
    purchaseDate: "",
    value: "",
    assignedToId: "",
}

export default function AssetManagement() {
    const [assets, setAssets] = React.useState<Asset[]>([])
    const [loading, setLoading] = React.useState(true)
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [editingAsset, setEditingAsset] = React.useState<Asset | null>(null)
    const [formData, setFormData] = React.useState(EMPTY_FORM)
    const [saving, setSaving] = React.useState(false)

    const fetchAssets = React.useCallback(async () => {
        try {
            const res = await fetch("/api/assets")
            if (!res.ok) throw new Error("Failed to fetch assets")
            const data = await res.json()
            setAssets(data)
        } catch {
            toast.error("Failed to load assets")
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchAssets()
    }, [fetchAssets])

    const openCreate = () => {
        setEditingAsset(null)
        setFormData(EMPTY_FORM)
        setIsModalOpen(true)
    }

    const openEdit = (asset: Asset) => {
        setEditingAsset(asset)
        setFormData({
            name: asset.name,
            type: asset.type,
            serialNumber: asset.serialNumber,
            status: asset.status,
            purchaseDate: asset.purchaseDate ? asset.purchaseDate.split("T")[0] : "",
            value: String(asset.value),
            assignedToId: asset.assignedToId || "",
        })
        setIsModalOpen(true)
    }

    const handleSave = async () => {
        if (!formData.name || !formData.serialNumber || !formData.purchaseDate || !formData.value) {
            toast.error("Please fill in all required fields")
            return
        }

        setSaving(true)
        try {
            const payload = {
                name: formData.name,
                type: formData.type,
                serialNumber: formData.serialNumber,
                status: formData.status,
                purchaseDate: formData.purchaseDate,
                value: formData.value,
                assignedToId: formData.assignedToId || null,
                assignedDate: formData.assignedToId ? new Date().toISOString() : null,
            }

            const url = editingAsset ? `/api/assets/${editingAsset.id}` : "/api/assets"
            const method = editingAsset ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Failed to save asset")
            }

            toast.success(editingAsset ? "Asset updated" : "Asset created")
            setIsModalOpen(false)
            fetchAssets()
        } catch (error: any) {
            toast.error(error.message || "Failed to save asset")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this asset?")) return

        try {
            const res = await fetch(`/api/assets/${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Failed to delete asset")
            toast.success("Asset deleted")
            fetchAssets()
        } catch {
            toast.error("Failed to delete asset")
        }
    }

    const totalValue = assets.reduce((sum, a) => sum + a.value, 0)
    const assignedCount = assets.filter(a => a.status === "ASSIGNED").length
    const maintenanceCount = assets.filter(a => a.status === "MAINTENANCE").length

    const columns: ColumnDef<Asset>[] = [
        {
            accessorKey: "name",
            header: "Asset Name",
            cell: ({ row }) => (
                <div className="font-semibold text-[var(--text)]">{row.getValue("name")}</div>
            ),
        },
        {
            accessorKey: "type",
            header: "Type",
            cell: ({ row }) => <div className="text-[var(--text2)]">{TYPE_LABELS[row.getValue("type") as AssetType]}</div>,
            filterFn: (row, id, value) => value === row.getValue(id),
        },
        {
            accessorKey: "serialNumber",
            header: "Serial No.",
            cell: ({ row }) => <div className="font-mono text-[12px] text-[var(--text3)]">{row.getValue("serialNumber")}</div>,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
            filterFn: (row, id, value) => value === row.getValue(id),
        },
        {
            accessorKey: "assignedTo",
            header: "Assigned To",
            cell: ({ row }) => {
                const employee = row.original.assignedTo
                return (
                    <div className="text-[var(--text2)]">
                        {employee ? `${employee.firstName} ${employee.lastName}` : "—"}
                    </div>
                )
            },
        },
        {
            accessorKey: "value",
            header: "Value",
            cell: ({ row }) => <div className="text-[var(--text2)]">${row.getValue<number>("value").toLocaleString()}</div>,
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => openEdit(row.original)}
                        className="text-[12px] text-[var(--accent)] hover:underline"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDelete(row.original.id)}
                        className="text-[12px] text-[var(--red,#ef4444)] hover:underline flex items-center gap-1"
                    >
                        <TrashIcon className="w-3 h-3" /> Delete
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
                    <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Asset Management</h1>
                    <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Track and manage company hardware and licenses</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 p-[9px_14px] bg-[var(--accent)] text-white rounded-[9px] text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-[0_2px_8px_rgba(0,122,255,0.25)]"
                >
                    <PlusIcon className="w-4 h-4" /> Add Asset
                </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
                <StatCard label="Total Assets" value={loading ? "—" : assets.length} icon={<CubeIcon />} color="bg-gradient-to-br from-blue-500 to-blue-600" />
                <StatCard label="Assigned" value={loading ? "—" : assignedCount} icon={<LaptopIcon />} color="bg-gradient-to-br from-green-500 to-emerald-600" />
                <StatCard label="In Repair" value={loading ? "—" : maintenanceCount} icon={<ExclamationTriangleIcon />} color="bg-gradient-to-br from-amber-500 to-orange-600" />
                <StatCard label="Total Value" value={loading ? "—" : `$${totalValue.toLocaleString()}`} icon="$" color="bg-gradient-to-br from-purple-500 to-indigo-600" />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-[var(--text3)]">Loading assets...</div>
            ) : (
                <DataTable
                    columns={columns}
                    data={assets}
                    searchKey="name"
                    filterFields={[
                        { id: "type", label: "Type", options: ["HARDWARE", "SOFTWARE", "ACCESSORY"] },
                        { id: "status", label: "Status", options: ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"] },
                    ]}
                />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingAsset ? "Edit Asset" : "Add New Asset"}
            >
                <div className="space-y-4">
                    <div>
                        <label className={labelClass}>Name *</label>
                        <input
                            className={inputClass}
                            value={formData.name}
                            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                            placeholder="e.g. MacBook Pro 16"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Type *</label>
                            <select
                                className={inputClass}
                                value={formData.type}
                                onChange={e => setFormData(p => ({ ...p, type: e.target.value as AssetType }))}
                            >
                                {(Object.keys(TYPE_LABELS) as AssetType[]).map(t => (
                                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Serial Number *</label>
                            <input
                                className={inputClass}
                                value={formData.serialNumber}
                                onChange={e => setFormData(p => ({ ...p, serialNumber: e.target.value }))}
                                placeholder="e.g. SN-12345"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Status *</label>
                            <select
                                className={inputClass}
                                value={formData.status}
                                onChange={e => setFormData(p => ({ ...p, status: e.target.value as AssetStatus }))}
                            >
                                {(Object.keys(STATUS_LABELS) as AssetStatus[]).map(s => (
                                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Purchase Date *</label>
                            <input
                                type="date"
                                className={inputClass}
                                value={formData.purchaseDate}
                                onChange={e => setFormData(p => ({ ...p, purchaseDate: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Value ($) *</label>
                            <input
                                type="number"
                                className={inputClass}
                                value={formData.value}
                                onChange={e => setFormData(p => ({ ...p, value: e.target.value }))}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Assign to Employee ID</label>
                            <input
                                className={inputClass}
                                value={formData.assignedToId}
                                onChange={e => setFormData(p => ({ ...p, assignedToId: e.target.value }))}
                                placeholder="Employee CUID (optional)"
                            />
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
                            {saving ? "Saving..." : editingAsset ? "Update Asset" : "Create Asset"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
