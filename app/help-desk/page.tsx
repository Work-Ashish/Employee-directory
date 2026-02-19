"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { PlusIcon } from "@radix-ui/react-icons"

const myTickets = [
    { id: "TKT-2024-001", subject: "Laptop battery draining fast", category: "IT Support", priority: "High", status: "In Progress", date: "Feb 18, 2026", color: "from-[#ef4444] to-[#b91c1c]", bg: "bg-[rgba(239,68,68,0.1)]", text: "text-[#ef4444]" },
    { id: "TKT-2024-002", subject: "Salary slip discrepancy", category: "Finance", priority: "Medium", status: "Resolved", date: "Jan 25, 2026", color: "from-[#10b981] to-[#047857]", bg: "bg-[rgba(16,185,129,0.1)]", text: "text-[#10b981]" },
]

export default function HelpDesk() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="flex items-center justify-between mb-[26px]">
                <div>
                    <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Help Desk</h1>
                    <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Submit and track support requests</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 p-[10px_16px] bg-[var(--accent)] text-white rounded-[10px] text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20"
                >
                    <PlusIcon className="w-4 h-4" /> New Ticket
                </button>
            </div>

            <div className="grid grid-cols-[2fr_1fr] gap-[20px]">
                <div className="space-y-4">
                    {/* Ticket List */}
                    {myTickets.map((t, i) => (
                        <div key={i} className="glass p-[20px] flex items-center justify-between group transition-all duration-200 hover:shadow-md hover:-translate-y-1">
                            <div className="flex items-center gap-4">
                                <div className={cn("w-[48px] h-[48px] rounded-[12px] flex items-center justify-center text-[20px] shrink-0", t.bg)}>
                                    {t.category === 'IT Support' ? '💻' : '💰'}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[14px] font-bold text-[var(--text)]">{t.subject}</span>
                                        <span className={cn("text-[10px] font-bold px-[6px] py-[2px] rounded-[6px] uppercase tracking-wider",
                                            t.priority === 'High' ? "bg-red-500/10 text-red-500" : "bg-orange-500/10 text-orange-500"
                                        )}>
                                            {t.priority}
                                        </span>
                                    </div>
                                    <div className="text-[12px] text-[var(--text3)] flex items-center gap-2">
                                        <span className="font-mono">{t.id}</span>
                                        <span className="w-1 h-1 rounded-full bg-[var(--text3)]" />
                                        <span>{t.category}</span>
                                        <span className="w-1 h-1 rounded-full bg-[var(--text3)]" />
                                        <span>{t.date}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={cn("inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-[20px] text-[12px] font-semibold border",
                                    t.status === 'Resolved' ? "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]" : "bg-[var(--blue-dim)] text-[#0a7ea4] border-[rgba(0,122,255,0.25)]"
                                )}>
                                    {t.status === 'Resolved' ? '✓' : '⚡'} {t.status}
                                </span>
                                <button className="text-[12px] font-semibold text-[var(--text3)] hover:text-[var(--accent)] transition-colors">Details →</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-6">
                    <div className="glass p-[22px] bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] text-white">
                        <div className="text-[14px] font-bold mb-3">📞 Urgent Support?</div>
                        <p className="text-[12px] text-white/70 mb-4 leading-relaxed">
                            For critical system failures or security incidents, please contact the emergency hotline immediately.
                        </p>
                        <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                            <span className="text-xl">☎️</span>
                            <div>
                                <div className="text-[11px] uppercase tracking-wider opacity-70">Emergency Hotline</div>
                                <div className="text-[16px] font-bold font-mono">+1 (800) 911-0000</div>
                            </div>
                        </div>
                    </div>

                    <div className="glass p-[22px]">
                        <div className="text-[13.5px] font-bold text-[var(--text)] mb-[16px]">📚 Knowledge Base</div>
                        <ul className="space-y-3">
                            <li className="text-[13px] text-[var(--text2)] hover:text-[var(--accent)] cursor-pointer flex items-center gap-2">
                                <span className="opacity-50">📄</span> How to reset VPN password
                            </li>
                            <li className="text-[13px] text-[var(--text2)] hover:text-[var(--accent)] cursor-pointer flex items-center gap-2">
                                <span className="opacity-50">📄</span> Expense reimbursement policy
                            </li>
                            <li className="text-[13px] text-[var(--text2)] hover:text-[var(--accent)] cursor-pointer flex items-center gap-2">
                                <span className="opacity-50">📄</span> Setting up printer access
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Mock Create Modal (Visual Only) */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[var(--surface)] w-[500px] p-6 rounded-2xl border border-[var(--border)] shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setIsCreateModalOpen(false)}
                            className="absolute top-4 right-4 text-[var(--text3)] hover:text-[var(--text)] text-[20px]"
                        >
                            ✕
                        </button>
                        <h2 className="text-[18px] font-bold text-[var(--text)] mb-1">Create New Ticket</h2>
                        <p className="text-[13px] text-[var(--text3)] mb-6">Describe your issue and we'll route it to the right team.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[12px] font-semibold text-[var(--text2)] mb-1">Subject</label>
                                <input type="text" className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[14px] outline-none focus:border-[var(--accent)]" placeholder="Brief summary of the issue" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[12px] font-semibold text-[var(--text2)] mb-1">Category</label>
                                    <select className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[14px] outline-none focus:border-[var(--accent)]">
                                        <option>IT Support</option>
                                        <option>HR & Payroll</option>
                                        <option>Facilities</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[12px] font-semibold text-[var(--text2)] mb-1">Priority</label>
                                    <select className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[14px] outline-none focus:border-[var(--accent)]">
                                        <option>Low</option>
                                        <option>Medium</option>
                                        <option>High</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-[var(--text2)] mb-1">Description</label>
                                <textarea className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[14px] outline-none focus:border-[var(--accent)] h-[100px]" placeholder="Detailed explanation..."></textarea>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-[13px] font-semibold text-[var(--text2)] hover:bg-[var(--bg)] rounded-lg transition-colors">Cancel</button>
                            <button onClick={() => setIsCreateModalOpen(false)} className="px-6 py-2 bg-[var(--accent)] text-white text-[13px] font-bold rounded-lg shadow-lg shadow-blue-500/20 hover:opacity-90 transition-opacity">Submit Ticket</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
