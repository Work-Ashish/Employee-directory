"use client"

import * as React from "react"
import { Asset, AssetStatus } from "@/types"
import { LaptopIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

const STATUS_LABELS: Record<AssetStatus, string> = {
    AVAILABLE: "Available",
    ASSIGNED: "Assigned",
    MAINTENANCE: "Maintenance",
    RETIRED: "Retired",
}

export default function MyAssets() {
    const [assets, setAssets] = React.useState<Asset[]>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        async function load() {
            try {
                const res = await fetch("/api/assets")
                if (!res.ok) throw new Error("Failed to fetch")
                const data: Asset[] = await res.json()
                setAssets(data.filter(a => a.status === "ASSIGNED"))
            } catch {
                toast.error("Failed to load your assets")
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">My Assets</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Equipment and software licenses assigned to you</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-[var(--text3)]">Loading your assets...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assets.map(asset => (
                        <div key={asset.id} className="glass p-6 flex flex-col gap-4 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <LaptopIcon className="w-24 h-24" />
                            </div>

                            <div className="flex items-start justify-between relative z-10">
                                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white",
                                    asset.type === "HARDWARE" ? "bg-blue-500" : asset.type === "SOFTWARE" ? "bg-purple-500" : "bg-amber-500"
                                )}>
                                    <LaptopIcon className="w-5 h-5" />
                                </div>
                                <span className="px-2 py-1 bg-[var(--green-dim)] text-[#1a9140] text-[10px] font-bold uppercase tracking-wider rounded-md border border-[rgba(52,199,89,0.2)]">
                                    {STATUS_LABELS[asset.status]}
                                </span>
                            </div>

                            <div className="relative z-10">
                                <h3 className="text-[18px] font-bold text-[var(--text)]">{asset.name}</h3>
                                <p className="text-[12px] text-[var(--text3)] font-mono mt-1">SN: {asset.serialNumber}</p>
                            </div>

                            <div className="mt-auto pt-4 border-t border-[var(--border)] flex justify-between items-center relative z-10">
                                <div className="text-[11px] text-[var(--text3)]">
                                    Assigned: {asset.assignedDate ? new Date(asset.assignedDate).toLocaleDateString() : "—"}
                                </div>
                                <button className="text-[11px] text-[var(--red,#ef4444)] flex items-center gap-1 hover:underline">
                                    <ExclamationTriangleIcon /> Report Issue
                                </button>
                            </div>
                        </div>
                    ))}

                    {assets.length === 0 && (
                        <div className="col-span-full py-12 text-center text-[var(--text3)]">
                            No assets currently assigned to you.
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
