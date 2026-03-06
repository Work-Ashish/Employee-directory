"use client"

import { cn } from "@/lib/utils"
import { FileTextIcon, DownloadIcon } from "@radix-ui/react-icons"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { PageHeader } from "@/components/ui/PageHeader"
import { Button } from "@/components/ui/Button"

const documents = [
    { name: "Employment Contract.pdf", type: "Contract", date: "Jan 10, 2024", size: "2.4 MB", category: "Personal" },
    { name: "Offer Letter.pdf", type: "Contract", date: "Jan 05, 2024", size: "1.1 MB", category: "Personal" },
    { name: "Form 16 (2025-26).pdf", type: "Tax", date: "May 15, 2025", size: "850 KB", category: "Finance" },
    { name: "Salary Slips 2025.zip", type: "Payroll", date: "Jan 01, 2026", size: "12 MB", category: "Finance" },
    { name: "Company Handbook 2026.pdf", type: "Policy", date: "Jan 01, 2026", size: "5.6 MB", category: "Company" },
    { name: "IT Security Policy.pdf", type: "Policy", date: "Dec 15, 2025", size: "2.5 MB", category: "Company" },
    { name: "Holiday List 2026.pdf", type: "General", date: "Jan 01, 2026", size: "500 KB", category: "Company" },
]

export default function Documents() {
    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="Documents Vault"
                description="Securely access your personal and company documents"
            />

            <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6">
                {/* Sidebar / Folders */}
                <Card variant="glass" className="self-start">
                    <CardContent className="p-4">
                        <div className="text-xs font-bold text-text-3 uppercase tracking-wider mb-3 px-2">Folders</div>
                        <ul className="space-y-1">
                            <li className="flex items-center justify-between p-2 rounded-lg bg-surface-2 text-accent font-semibold text-sm cursor-pointer">
                                <span className="flex items-center gap-2">📂 All Documents</span>
                                <Badge variant="neutral" size="sm">7</Badge>
                            </li>
                            <li className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-2 text-text-2 text-sm cursor-pointer transition-colors">
                                <span className="flex items-center gap-2">👤 Personal</span>
                                <Badge variant="neutral" size="sm">2</Badge>
                            </li>
                            <li className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-2 text-text-2 text-sm cursor-pointer transition-colors">
                                <span className="flex items-center gap-2">💰 Finance & Tax</span>
                                <Badge variant="neutral" size="sm">2</Badge>
                            </li>
                            <li className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-2 text-text-2 text-sm cursor-pointer transition-colors">
                                <span className="flex items-center gap-2">🏢 Company Policies</span>
                                <Badge variant="neutral" size="sm">3</Badge>
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                {/* File List */}
                <div className="space-y-4">
                    <div className="text-sm font-bold text-text border-b border-border pb-2 flex justify-between items-center">
                        <span>Recent Files</span>
                        <div className="flex gap-2 text-text-3">
                            <span className="cursor-pointer hover:text-text">Grid</span>
                            <span>|</span>
                            <span className="cursor-pointer hover:text-text text-text">List</span>
                        </div>
                    </div>

                    {/* Desktop Table */}
                    <Card className="hidden md:block overflow-hidden shadow-sm">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-surface-2 backdrop-blur-md">
                                    <th className="p-3 text-[11.5px] font-bold text-text-3 text-left uppercase tracking-wider">Name</th>
                                    <th className="p-3 text-[11.5px] font-bold text-text-3 text-left uppercase tracking-wider">Category</th>
                                    <th className="p-3 text-[11.5px] font-bold text-text-3 text-left uppercase tracking-wider">Date Added</th>
                                    <th className="p-3 text-[11.5px] font-bold text-text-3 text-left uppercase tracking-wider">Size</th>
                                    <th className="p-3 text-[11.5px] font-bold text-text-3 text-right uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.map((doc, i) => (
                                    <tr key={i} className="group hover:bg-accent/[0.03] transition-colors duration-200 border-b border-[#0000000a] last:border-0 animate-page-in" style={{ animationDelay: `${i * 0.05}s` }}>
                                        <td className="p-3 text-sm text-text">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center text-danger">
                                                    <FileTextIcon className="w-4 h-4" />
                                                </div>
                                                <span className="font-semibold">{doc.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-sm text-text-2">
                                            <Badge variant="neutral" size="sm">{doc.category}</Badge>
                                        </td>
                                        <td className="p-3 text-sm text-text-3">{doc.date}</td>
                                        <td className="p-3 text-sm text-text-3 font-mono">{doc.size}</td>
                                        <td className="p-3 text-right">
                                            <button className="text-text-3 hover:text-accent p-2 rounded-full hover:bg-surface-2 transition-colors">
                                                <DownloadIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>

                    {/* Mobile Card Stack */}
                    <div className="md:hidden space-y-3">
                        {documents.map((doc, i) => (
                            <Card key={i} variant="glass" className="p-4 flex items-center justify-between animate-page-in" style={{ animationDelay: `${i * 0.05}s` }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center text-danger">
                                        <FileTextIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-text truncate max-w-[180px]">{doc.name}</div>
                                        <div className="text-xs text-text-3 flex gap-2">
                                            <span>{doc.date}</span>
                                            <span>•</span>
                                            <span>{doc.size}</span>
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="rounded-full bg-bg-2 text-text-2">
                                    <DownloadIcon className="w-4 h-4" />
                                </Button>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
