"use client"

import { cn } from "@/lib/utils"
import { FileTextIcon, DownloadIcon } from "@radix-ui/react-icons"

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
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Documents Vault</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Securely access your personal and company documents</p>
            </div>

            <div className="grid grid-cols-[250px_1fr] gap-6">
                {/* Sidebar / Folders */}
                <div className="glass p-4 self-start">
                    <div className="text-[12px] font-bold text-[var(--text3)] uppercase tracking-[0.5px] mb-3 px-2">Folders</div>
                    <ul className="space-y-1">
                        <li className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface2)] text-[var(--accent)] font-semibold text-[13.5px] cursor-pointer">
                            <span className="flex items-center gap-2">📂 All Documents</span>
                            <span className="text-[11px] bg-[var(--bg)] px-2 py-0.5 rounded-full text-[var(--text2)]">7</span>
                        </li>
                        <li className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--surface2)] text-[var(--text2)] text-[13.5px] cursor-pointer transition-colors">
                            <span className="flex items-center gap-2">👤 Personal</span>
                            <span className="text-[11px] bg-[var(--bg)] px-2 py-0.5 rounded-full text-[var(--text2)]">2</span>
                        </li>
                        <li className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--surface2)] text-[var(--text2)] text-[13.5px] cursor-pointer transition-colors">
                            <span className="flex items-center gap-2">💰 Finance & Tax</span>
                            <span className="text-[11px] bg-[var(--bg)] px-2 py-0.5 rounded-full text-[var(--text2)]">2</span>
                        </li>
                        <li className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--surface2)] text-[var(--text2)] text-[13.5px] cursor-pointer transition-colors">
                            <span className="flex items-center gap-2">🏢 Company Policies</span>
                            <span className="text-[11px] bg-[var(--bg)] px-2 py-0.5 rounded-full text-[var(--text2)]">3</span>
                        </li>
                    </ul>
                </div>

                {/* File Grid */}
                <div className="space-y-4">
                    <div className="text-[14px] font-bold text-[var(--text)] border-b border-[var(--border)] pb-2 flex justify-between items-center">
                        <span>Recent Files</span>
                        <div className="flex gap-2 text-[var(--text3)]">
                            <span className="cursor-pointer hover:text-[var(--text)]">Grid</span>
                            <span>|</span>
                            <span className="cursor-pointer hover:text-[var(--text)] text-[var(--text)]">List</span>
                        </div>
                    </div>

                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] overflow-hidden shadow-sm">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--surface2)] backdrop-blur-md">
                                    <th className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">Name</th>
                                    <th className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">Category</th>
                                    <th className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">Date Added</th>
                                    <th className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-left uppercase tracking-[0.5px]">Size</th>
                                    <th className="p-[11px_18px] text-[11.5px] font-bold text-[var(--text3)] text-right uppercase tracking-[0.5px]">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.map((doc, i) => (
                                    <tr key={i} className="group hover:bg-[rgba(0,122,255,0.03)] transition-colors duration-200 border-b border-[#0000000a] last:border-0 animate-[fadeRow_0.3s_both]" style={{ animationDelay: `${i * 0.05}s` }}>
                                        <td className="p-[13px_18px] text-[13.5px] text-[var(--text)]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-[rgba(255,59,48,0.1)] flex items-center justify-center text-[var(--red)]">
                                                    <FileTextIcon className="w-4 h-4" />
                                                </div>
                                                <span className="font-semibold">{doc.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-[13px_18px] text-[13px] text-[var(--text2)]">
                                            <span className="inline-block px-[8px] py-[2px] bg-[var(--surface2)] rounded-md border border-[var(--border)] text-[11px]">
                                                {doc.category}
                                            </span>
                                        </td>
                                        <td className="p-[13px_18px] text-[13px] text-[var(--text3)]">{doc.date}</td>
                                        <td className="p-[13px_18px] text-[13px] text-[var(--text3)] font-mono">{doc.size}</td>
                                        <td className="p-[13px_18px] text-right">
                                            <button className="text-[var(--text3)] hover:text-[var(--accent)] p-2 rounded-full hover:bg-[var(--surface2)] transition-colors">
                                                <DownloadIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
