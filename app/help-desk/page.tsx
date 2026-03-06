"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { PlusIcon } from "@radix-ui/react-icons"
import { PageHeader } from "@/components/ui/PageHeader"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Card, CardContent, CardTitle } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/Dialog"

const myTickets = [
    { id: "TKT-2024-001", subject: "Laptop battery draining fast", category: "IT Support", priority: "High", status: "In Progress", date: "Feb 18, 2026", color: "from-[#ef4444] to-[#b91c1c]", bg: "bg-[rgba(239,68,68,0.1)]", text: "text-[#ef4444]" },
    { id: "TKT-2024-002", subject: "Salary slip discrepancy", category: "Finance", priority: "Medium", status: "Resolved", date: "Jan 25, 2026", color: "from-[#10b981] to-[#047857]", bg: "bg-[rgba(16,185,129,0.1)]", text: "text-[#10b981]" },
]

export default function HelpDesk() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="Help Desk"
                description="Submit and track support requests"
                actions={
                    <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<PlusIcon className="w-4 h-4" />}>
                        New Ticket
                    </Button>
                }
            />

            <div className="grid grid-cols-[2fr_1fr] gap-5">
                <div className="space-y-4">
                    {/* Ticket List */}
                    {myTickets.map((t, i) => (
                        <Card key={i} variant="glass" className="p-5 flex items-center justify-between group transition-all duration-200 hover:shadow-md hover:-translate-y-1">
                            <div className="flex items-center gap-4">
                                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0", t.bg)}>
                                    {t.category === 'IT Support' ? '💻' : '💰'}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-bold text-text">{t.subject}</span>
                                        <Badge
                                            variant={t.priority === 'High' ? "danger" : "warning"}
                                            size="sm"
                                            className="uppercase tracking-wider"
                                        >
                                            {t.priority}
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-text-3 flex items-center gap-2">
                                        <span className="font-mono">{t.id}</span>
                                        <span className="w-1 h-1 rounded-full bg-text-3" />
                                        <span>{t.category}</span>
                                        <span className="w-1 h-1 rounded-full bg-text-3" />
                                        <span>{t.date}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Badge
                                    variant={t.status === 'Resolved' ? "success" : "info"}
                                    dot
                                >
                                    {t.status}
                                </Badge>
                                <button className="text-xs font-semibold text-text-3 hover:text-accent transition-colors">Details →</button>
                            </div>
                        </Card>
                    ))}
                </div>

                <div className="space-y-6">
                    <Card className="p-6 bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] text-white border-0">
                        <div className="text-sm font-bold mb-3">📞 Urgent Support?</div>
                        <p className="text-xs text-white/70 mb-4 leading-relaxed">
                            For critical system failures or security incidents, please contact the emergency hotline immediately.
                        </p>
                        <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                            <span className="text-xl">☎️</span>
                            <div>
                                <div className="text-[11px] uppercase tracking-wider opacity-70">Emergency Hotline</div>
                                <div className="text-base font-bold font-mono">+1 (800) 911-0000</div>
                            </div>
                        </div>
                    </Card>

                    <Card variant="glass" className="p-6">
                        <CardTitle className="text-sm mb-4">📚 Knowledge Base</CardTitle>
                        <ul className="space-y-3">
                            <li className="text-sm text-text-2 hover:text-accent cursor-pointer flex items-center gap-2">
                                <span className="opacity-50">📄</span> How to reset VPN password
                            </li>
                            <li className="text-sm text-text-2 hover:text-accent cursor-pointer flex items-center gap-2">
                                <span className="opacity-50">📄</span> Expense reimbursement policy
                            </li>
                            <li className="text-sm text-text-2 hover:text-accent cursor-pointer flex items-center gap-2">
                                <span className="opacity-50">📄</span> Setting up printer access
                            </li>
                        </ul>
                    </Card>
                </div>
            </div>

            {/* Create Ticket Dialog */}
            <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
                <DialogHeader>
                    <DialogTitle>Create New Ticket</DialogTitle>
                    <DialogDescription>Describe your issue and we'll route it to the right team.</DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-4">
                    <Input label="Subject" placeholder="Brief summary of the issue" />
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Category">
                            <option>IT Support</option>
                            <option>HR & Payroll</option>
                            <option>Facilities</option>
                        </Select>
                        <Select label="Priority">
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                        </Select>
                    </div>
                    <Textarea label="Description" placeholder="Detailed explanation..." className="h-24" />
                </DialogBody>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                    <Button onClick={() => setIsCreateModalOpen(false)}>Submit Ticket</Button>
                </DialogFooter>
            </Dialog>
        </div>
    )
}
