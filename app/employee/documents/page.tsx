"use client"

import * as React from "react"
import { Document, DocCategory } from "@/types"
import { FileTextIcon, DownloadIcon } from "@radix-ui/react-icons"
import { extractArray, cn } from "@/lib/utils"
import { DocumentAPI } from "@/features/documents/api/client"
import { toast } from "sonner"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Spinner } from "@/components/ui/Spinner"

const CATEGORY_LABELS: Record<string, string> = {
    POLICY: "Policy",
    CONTRACT: "Contract",
    CERTIFICATE: "Certificate",
    ID_PROOF: "ID Proof",
    OTHER: "Other",
}

export default function MyDocuments() {
    const [documents, setDocuments] = React.useState<Document[]>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        async function load() {
            try {
                const data = await DocumentAPI.list()
                const rawDocs = (data as any)?.results || extractArray<any>(data)
                setDocuments(rawDocs.map((d: any) => ({
                    ...d,
                    url: d.url || d.fileUrl || "",
                    uploadDate: d.uploadDate || d.createdAt || new Date().toISOString(),
                })))
            } catch (err: any) {
                const errMsg = err?.message || err?.data?.detail || ""
                const msg = errMsg.includes("Tenant not found") || errMsg.includes("tenant")
                    ? "Tenant not found — please log out and log back in"
                    : err?.status === 401 || errMsg.includes("401")
                        ? "Session expired — please log in again"
                        : "Failed to load documents"
                toast.error(msg)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const policies = documents.filter(d => d.isPublic)
    const myDocs = documents.filter(d => !d.isPublic)

    const DocCard = ({ doc }: { doc: Document }) => (
        <Card variant="glass" className="p-4 flex items-center gap-4 hover:border-accent transition-colors group cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center text-danger group-hover:scale-110 transition-transform">
                <FileTextIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-text truncate">{doc.title}</h4>
                <p className="text-[11px] text-text-3 mt-0.5">
                    {CATEGORY_LABELS[doc.category]} &bull; {new Date(doc.uploadDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    {doc.size && ` \u2022 ${doc.size}`}
                </p>
            </div>
            {doc.url && doc.url !== "#" && (
                <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-text-3 hover:text-accent hover:bg-bg-2 rounded-full transition-all"
                >
                    <DownloadIcon />
                </a>
            )}
        </Card>
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-text-3 gap-2">
                <Spinner /> Loading documents...
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-page-in">
            <PageHeader
                title="Documents"
                description="Access company policies and your personal records"
            />

            <section>
                <h3 className="text-sm font-bold text-text-2 uppercase tracking-wider mb-4 flex items-center gap-2">
                    Company Policies
                    <Badge variant="neutral" size="sm">{policies.length}</Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {policies.map(doc => <DocCard key={doc.id} doc={doc} />)}
                    {policies.length === 0 && (
                        <div className="col-span-full py-8 text-center text-text-3 bg-surface border border-dashed border-border rounded-xl">
                            No company policies available.
                        </div>
                    )}
                </div>
            </section>

            <section>
                <h3 className="text-sm font-bold text-text-2 uppercase tracking-wider mb-4 flex items-center gap-2">
                    Personal Files
                    <Badge variant="neutral" size="sm">{myDocs.length}</Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myDocs.map(doc => <DocCard key={doc.id} doc={doc} />)}
                    {myDocs.length === 0 && (
                        <div className="col-span-full py-8 text-center text-text-3 bg-surface border border-dashed border-border rounded-xl">
                            No personal documents found.
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
