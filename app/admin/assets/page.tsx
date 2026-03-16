"use client"

import * as React from "react"
import { Asset } from "@/features/assets/api/client"
type AssetType = "HARDWARE" | "SOFTWARE" | "ACCESSORY"
type AssetStatus = "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "RETIRED"
import { DataTable } from "@/components/ui/DataTable"
import { ColumnDef } from "@tanstack/react-table"
import { Modal } from "@/components/ui/Modal"
import { CsvImportModal } from "@/components/ui/CsvImportModal"
import { PlusIcon, LaptopIcon, CubeIcon, ExclamationTriangleIcon, TrashIcon } from "@radix-ui/react-icons"
import { cn, extractArray } from "@/lib/utils"
import { AssetAPI } from "@/features/assets/api/client"
import { EmployeeAPI } from "@/features/employees/api/client"
import { toast } from "sonner"
import { PageHeader } from "@/components/ui/PageHeader"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Badge } from "@/components/ui/Badge"
import { StatCard } from "@/components/ui/StatCard"
import { Spinner } from "@/components/ui/Spinner"

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

const STATUS_BADGE_VARIANT: Record<AssetStatus, "success" | "info" | "warning" | "neutral"> = {
    AVAILABLE: "success",
    ASSIGNED: "info",
    MAINTENANCE: "warning",
    RETIRED: "neutral",
}

const StatusBadge = ({ status }: { status: AssetStatus }) => {
    return (
        <Badge variant={STATUS_BADGE_VARIANT[status]} dot>
            {STATUS_LABELS[status]}
        </Badge>
    )
}

const EMPTY_FORM = {
    name: "",
    type: "HARDWARE" as AssetType,
    serialNumber: "",
    status: "AVAILABLE" as AssetStatus,
    purchaseDate: "",
    value: "",
    assignedToId: "",
    image: "",
}

export default function AssetManagement() {
    const [assets, setAssets] = React.useState<Asset[]>([])
    const [loading, setLoading] = React.useState(true)
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [editingAsset, setEditingAsset] = React.useState<Asset | null>(null)
    const [formData, setFormData] = React.useState(EMPTY_FORM)
    const [saving, setSaving] = React.useState(false)
    const [employees, setEmployees] = React.useState<any[]>([])
    const [isImportOpen, setIsImportOpen] = React.useState(false)

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const formDataUpload = new FormData()
        formDataUpload.append("file", file)
        formDataUpload.append("bucket", "assets")

        try {
            toast.loading("Uploading image...", { id: "asset-upload" })
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formDataUpload
            })

            if (res.ok) {
                const { url } = await res.json()
                setFormData(prev => ({ ...prev, image: url }))
                toast.success("Image uploaded", { id: "asset-upload" })
            } else {
                const err = await res.json()
                toast.error(err.error || "Upload failed", { id: "asset-upload" })
            }
        } catch (error) {
            toast.error("An error occurred")
        }
    }

    const fetchAssets = React.useCallback(async () => {
        try {
            const data = await AssetAPI.list()
            setAssets(data.results || extractArray(data))
        } catch {
            toast.error("Failed to load assets")
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchEmployees = React.useCallback(async () => {
        try {
            const empData = await EmployeeAPI.fetchEmployees(1, 100)
            setEmployees(empData.results || [])
        } catch {
            console.error("Failed to fetch employees")
        }
    }, [])

    React.useEffect(() => {
        fetchAssets()
        fetchEmployees()
    }, [fetchAssets, fetchEmployees])

    const openCreate = () => {
        setEditingAsset(null)
        setFormData(EMPTY_FORM)
        setIsModalOpen(true)
    }

    const openEdit = (asset: Asset) => {
        setEditingAsset(asset)
        setFormData({
            name: asset.name,
            type: asset.type as AssetType,
            serialNumber: asset.serialNumber,
            status: asset.status as AssetStatus,
            purchaseDate: asset.purchaseDate ? asset.purchaseDate.split("T")[0] : "",
            value: String(asset.value),
            assignedToId: asset.assignedToId || "",
            image: asset.image || "",
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
                image: formData.image || null,
            }

            if (editingAsset) {
                await AssetAPI.update(editingAsset.id, payload)
            } else {
                await AssetAPI.create(payload)
            }

            toast.success(editingAsset ? "Asset updated" : "Asset created")
            setIsModalOpen(false)
            fetchAssets()
        } catch (error: any) {
            console.error("Asset save error:", error)
            toast.error(error.message || "Failed to save asset")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this asset?")) return

        try {
            await AssetAPI.delete(id)
            toast.success("Asset deleted")
            fetchAssets()
        } catch (error: any) {
            toast.error(error.message || "Failed to delete asset")
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
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-bg-2 border border-border overflow-hidden flex items-center justify-center text-[10px] text-text-3">
                        {row.original.image ? (
                            <img src={row.original.image} className="w-full h-full object-cover" />
                        ) : (
                            "No Img"
                        )}
                    </div>
                    <div className="font-semibold text-text">{row.getValue("name")}</div>
                </div>
            ),
        },
        {
            accessorKey: "type",
            header: "Type",
            cell: ({ row }) => <div className="text-text-2">{TYPE_LABELS[row.getValue("type") as AssetType]}</div>,
            filterFn: (row, id, value) => value === row.getValue(id),
        },
        {
            accessorKey: "serialNumber",
            header: "Serial No.",
            cell: ({ row }) => <div className="font-mono text-sm text-text-3">{row.getValue("serialNumber")}</div>,
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
                const name = typeof employee === "string"
                    ? employee
                    : employee ? `${employee.firstName} ${employee.lastName}` : "—"
                return <div className="text-text-2">{name}</div>
            },
        },
        {
            accessorKey: "value",
            header: "Value",
            cell: ({ row }) => <div className="text-text-2">${row.getValue<number>("value").toLocaleString()}</div>,
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <Button variant="link" size="sm" onClick={() => openEdit(row.original)}>
                        Edit
                    </Button>
                    <Button variant="danger" size="sm" leftIcon={<TrashIcon className="w-3 h-3" />} onClick={() => handleDelete(row.original.id)}>
                        Delete
                    </Button>
                </div>
            ),
        },
    ]

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="Asset Management"
                description="Track and manage company hardware and licenses"
                actions={
                    <>
                        <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
                            📥 Import CSV
                        </Button>
                        <Button leftIcon={<PlusIcon className="w-4 h-4" />} onClick={openCreate}>
                            Add Asset
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-4 gap-4">
                <StatCard label="Total Assets" value={loading ? "—" : assets.length} icon={<CubeIcon />} />
                <StatCard label="Assigned" value={loading ? "—" : assignedCount} icon={<LaptopIcon />} />
                <StatCard label="In Repair" value={loading ? "—" : maintenanceCount} icon={<ExclamationTriangleIcon />} />
                <StatCard label="Total Value" value={loading ? "—" : `$${totalValue.toLocaleString()}`} icon={<span>$</span>} />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-text-3">
                    <Spinner size="lg" className="mr-2" /> Loading assets...
                </div>
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
                <div className="space-y-4 pt-4">
                    <div className="flex flex-col items-center mb-6">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-xl bg-bg-2 border-2 border-border flex items-center justify-center text-text-3 overflow-hidden">
                                {formData.image ? (
                                    <img src={formData.image} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-[10px] font-bold opacity-30">NO IMAGE</span>
                                )}
                            </div>
                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-xl">
                                {formData.image ? "CHANGE" : "UPLOAD"}
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        </div>
                    </div>

                    <Input
                        label="Name *"
                        value={formData.name}
                        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. MacBook Pro 16"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Select
                            label="Type *"
                            value={formData.type}
                            onChange={e => setFormData(p => ({ ...p, type: e.target.value as AssetType }))}
                            options={(Object.keys(TYPE_LABELS) as AssetType[]).map(t => ({ value: t, label: TYPE_LABELS[t] }))}
                        />
                        <Input
                            label="Serial Number *"
                            value={formData.serialNumber}
                            onChange={e => setFormData(p => ({ ...p, serialNumber: e.target.value }))}
                            placeholder="e.g. SN-12345"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Select
                            label="Status *"
                            value={formData.status}
                            onChange={e => setFormData(p => ({ ...p, status: e.target.value as AssetStatus }))}
                            options={(Object.keys(STATUS_LABELS) as AssetStatus[]).map(s => ({ value: s, label: STATUS_LABELS[s] }))}
                        />
                        <Input
                            label="Purchase Date *"
                            type="date"
                            value={formData.purchaseDate}
                            onChange={e => setFormData(p => ({ ...p, purchaseDate: e.target.value }))}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label="Value ($) *"
                            type="number"
                            value={formData.value}
                            onChange={e => setFormData(p => ({ ...p, value: e.target.value }))}
                            placeholder="0.00"
                            min={0}
                            step={0.01}
                        />
                        <Select
                            label="Assign to Employee"
                            value={formData.assignedToId}
                            onChange={e => setFormData(p => ({ ...p, assignedToId: e.target.value }))}
                        >
                            <option value="">Unassigned (optional)</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.firstName} {emp.lastName} {emp.employeeCode ? `(${emp.employeeCode})` : ''}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} loading={saving}>
                            {saving ? "Saving..." : editingAsset ? "Update Asset" : "Create Asset"}
                        </Button>
                    </div>
                </div>
            </Modal>
            <CsvImportModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                title="Assets"
                templateHeaders={["name", "serialNumber", "type", "status", "purchaseDate", "value", "assignedToCode"]}
                apiEndpoint="/api/admin/assets/import"
                onSuccess={fetchAssets}
            />
        </div>
    )
}
