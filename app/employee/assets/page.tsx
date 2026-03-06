"use client"

import * as React from "react"
import { Asset, AssetStatus } from "@/types"
import { LaptopIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Spinner } from "@/components/ui/Spinner"

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
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="My Assets"
                description="Equipment and software licenses assigned to you"
            />

            {loading ? (
                <div className="flex items-center justify-center py-20 text-text-3 gap-2">
                    <Spinner /> Loading your assets...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assets.map(asset => (
                        <Card key={asset.id} variant="glass" className="p-6 flex flex-col gap-4 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <LaptopIcon className="w-24 h-24" />
                            </div>

                            <div className="flex items-start justify-between relative z-10">
                                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white",
                                    asset.type === "HARDWARE" ? "bg-blue-500" : asset.type === "SOFTWARE" ? "bg-purple-500" : "bg-amber-500"
                                )}>
                                    <LaptopIcon className="w-5 h-5" />
                                </div>
                                <Badge variant="success" size="sm">
                                    {STATUS_LABELS[asset.status]}
                                </Badge>
                            </div>

                            <div className="relative z-10">
                                <h3 className="text-lg font-bold text-text">{asset.name}</h3>
                                <p className="text-xs text-text-3 font-mono mt-1">SN: {asset.serialNumber}</p>
                            </div>

                            <div className="mt-auto pt-4 border-t border-border flex justify-between items-center relative z-10">
                                <div className="text-[11px] text-text-3">
                                    Assigned: {asset.assignedDate ? new Date(asset.assignedDate).toLocaleDateString() : "\u2014"}
                                </div>
                                <Button variant="danger" size="sm" leftIcon={<ExclamationTriangleIcon />}>
                                    Report Issue
                                </Button>
                            </div>
                        </Card>
                    ))}

                    {assets.length === 0 && (
                        <div className="col-span-full py-12 text-center text-text-3">
                            No assets currently assigned to you.
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
