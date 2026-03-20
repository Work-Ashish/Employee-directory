"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { canAccessModule, Module } from "@/lib/permissions"
import { exportToCSV, exportToPDF } from "@/lib/exportUtils"
import { BulkEmployeeImportModal } from "@/components/ui/BulkEmployeeImportModal"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { confirmDanger, confirmAction, showSuccess } from "@/lib/swal"
import { format } from "date-fns"
import { EmployeeList } from "@/features/employees/components/EmployeeList"
import { EmployeeFormModal } from "@/features/employees/components/EmployeeFormModal"
import { EmployeeAPI } from "@/features/employees/api/client"
import { DepartmentAPI } from "@/features/departments/api/client"
import { TableEmployee, Department, EmployeeApiData } from "@/features/employees/types"
import { Modal } from "@/components/ui/Modal"
import { PageHeader } from "@/components/ui/PageHeader"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Spinner } from "@/components/ui/Spinner"

const employeeSchema = z.object({
    id: z.string().optional(),
    employeeCode: z.string().min(1, "Employee Code is required"),
    firstName: z.string().min(1, "First Name is required"),
    lastName: z.string().min(1, "Last Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    designation: z.string().min(1, "Designation is required"),
    departmentId: z.string().min(1, "Department is required"),
    dateOfJoining: z.string().min(1, "Date of Joining is required"),
    salary: z.number().min(0, "Salary must be positive"),
    status: z.enum(["ACTIVE", "ON_LEAVE", "RESIGNED", "TERMINATED"]),
    role: z.enum(["CEO", "HR", "PAYROLL", "TEAM_LEAD", "EMPLOYEE"]),
    managerId: z.string().optional().nullable(),
    avatarUrl: z.string().optional().nullable(),
}).superRefine((val, ctx) => {
    if (val.role !== "CEO" && !val.managerId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Manager is required for non-CEO employees",
            path: ["managerId"],
        })
    }
})

type EmployeeFormData = z.infer<typeof employeeSchema>

const getInitials = (first: string, last: string) => `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()

const mapApiToTableData = (apiEmployees: EmployeeApiData[]): TableEmployee[] => {
    return apiEmployees.map((emp) => {
        const statusMap: Record<string, string> = { "ACTIVE": "Active", "ON_LEAVE": "On Leave", "RESIGNED": "Resigned", "TERMINATED": "Terminated" }
        return {
            id: emp.id,
            name: `${emp.firstName} ${emp.lastName}`,
            email: emp.email,
            dept: emp.department?.name || "Unassigned",
            role: emp.designation,
            status: statusMap[emp.status] || emp.status,
            start: format(new Date(emp.dateOfJoining), "MMM d, yyyy"),
            initials: getInitials(emp.firstName, emp.lastName),
            color: emp.department?.color || "from-[#007aff] to-[#5856d6]",
            avatarUrl: emp.avatarUrl || null,
            manager: emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : null,
            managerAvatarUrl: emp.manager?.avatarUrl || null,
            raw: emp,
        }
    })
}

function EmployeesContent() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()

    const page = parseInt(searchParams?.get("page") || "1", 10)
    const limit = parseInt(searchParams?.get("limit") || "10", 10)

    const [totalRows, setTotalRows] = React.useState(0)
    const [pageCount, setPageCount] = React.useState(1)

    const [employees, setEmployees] = React.useState<TableEmployee[]>([])
    const [departments, setDepartments] = React.useState<Department[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [modalMode, setModalMode] = React.useState<"CREATE" | "EDIT" | "VIEW">("CREATE")

    const [credCard, setCredCard] = React.useState<{ username: string; password: string; name: string } | null>(null)
    const [isResettingCreds, setIsResettingCreds] = React.useState<string | null>(null)

    const [managers, setManagers] = React.useState<{id: string, firstName: string, lastName: string, designation: string, department?: {name: string}}[]>([])

    const [isDeptModalOpen, setIsDeptModalOpen] = React.useState(false)
    const [newDeptName, setNewDeptName] = React.useState("")
    const [isDeptCreating, setIsDeptCreating] = React.useState(false)

    const [isBulkImportOpen, setIsBulkImportOpen] = React.useState(false)

    const form = useForm<EmployeeFormData>({
        resolver: zodResolver(employeeSchema),
        defaultValues: { status: "ACTIVE", role: "EMPLOYEE", employeeCode: "", firstName: "", lastName: "", email: "", phone: "", designation: "", departmentId: "", dateOfJoining: new Date().toISOString().split('T')[0], salary: 0, managerId: "" }
    })

    const handleCreateDepartment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newDeptName.trim()) return
        try {
            setIsDeptCreating(true)
            const randomColors = ["from-[#ff9a9e] to-[#fecfef]", "from-[#a18cd1] to-[#fbc2eb]", "from-[#84fab0] to-[#8fd3f4]", "from-[#a6c0fe] to-[#f68084]", "from-[#fccb90] to-[#d57eeb]"]
            const color = randomColors[Math.floor(Math.random() * randomColors.length)]
            const newDept = await DepartmentAPI.create({ name: newDeptName, color })
            setDepartments(prev => [...prev, newDept])
            form.setValue('departmentId', newDept.id)
            toast.success('Department created successfully')
            setIsDeptModalOpen(false)
            setNewDeptName("")
        } catch (err: any) {
            toast.error(err.message || 'An error occurred')
        } finally {
            setIsDeptCreating(false)
        }
    }

    const handleDeleteDepartment = async (deptId: string, deptName: string) => {
        if (!await confirmDanger("Delete Department?", `"${deptName}" will be removed. Employees must be reassigned first.`)) return
        try {
            await DepartmentAPI.delete(deptId)
            showSuccess("Department Deleted", `"${deptName}" has been removed.`)
            setDepartments(prev => prev.filter(d => d.id !== deptId))
        } catch (err: any) {
            toast.error(err.message || 'An error occurred')
        }
    }


    const handleEmployeeAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 2 * 1024 * 1024) return toast.error("File size must be less than 2MB")
        const formData = new FormData()
        formData.append("file", file)
        formData.append("bucket", "avatars")
        try {
            toast.loading("Uploading photo...", { id: "emp-upload" })
            const res = await fetch("/api/upload", { method: "POST", body: formData })
            if (res.ok) {
                const { url } = await res.json()
                form.setValue("avatarUrl", url)
                toast.success("Photo uploaded", { id: "emp-upload" })
            } else toast.error("Upload failed", { id: "emp-upload" })
        } catch {
            toast.error("An error occurred", { id: "emp-upload" })
        }
    }

    // Auth protection
    React.useEffect(() => {
        if (!authLoading && !canAccessModule(user?.role ?? '', Module.EMPLOYEES)) router.push('/')
    }, [user, authLoading, router])

    const fetchData = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const [empRes, deptRes, mgrRes] = await Promise.all([
                EmployeeAPI.fetchEmployees(page, limit),
                DepartmentAPI.list(),
                EmployeeAPI.fetchManagers(),
            ])
            setTotalRows(empRes.total)
            setPageCount(Math.ceil(empRes.total / limit))
            setDepartments(deptRes)
            setManagers(mgrRes || [])
            setEmployees(mapApiToTableData(empRes.results))
        } catch (error) {
            toast.error("An error occurred while fetching data")
        } finally {
            setIsLoading(false)
        }
    }, [page, limit])

    React.useEffect(() => {
        if (!authLoading) fetchData()
    }, [authLoading, fetchData])

    const openCreateModal = () => {
        setModalMode("CREATE")
        form.reset({ status: "ACTIVE", role: "EMPLOYEE", employeeCode: `EMP-${Date.now().toString().slice(-4)}`, firstName: "", lastName: "", email: "", phone: "", designation: "", departmentId: departments[0]?.id || "", dateOfJoining: new Date().toISOString().split('T')[0], salary: 0, managerId: "" })
        setIsModalOpen(true)
    }

    const openEditModal = (empRaw: EmployeeApiData) => {
        setModalMode("EDIT")
        form.reset({ id: empRaw.id, employeeCode: empRaw.employeeCode, firstName: empRaw.firstName, lastName: empRaw.lastName, email: empRaw.email, phone: empRaw.phone || "", designation: empRaw.designation, departmentId: empRaw.departmentId, dateOfJoining: new Date(empRaw.dateOfJoining).toISOString().split('T')[0], salary: empRaw.salary, status: empRaw.status as any, role: (empRaw as any).user?.role || "EMPLOYEE", managerId: empRaw.managerId || "" })
        setIsModalOpen(true)
    }

    const openViewModal = (empRaw: EmployeeApiData) => {
        setModalMode("VIEW")
        form.reset({ employeeCode: empRaw.employeeCode, firstName: empRaw.firstName, lastName: empRaw.lastName, email: empRaw.email, phone: empRaw.phone || "", designation: empRaw.designation, departmentId: empRaw.departmentId, dateOfJoining: new Date(empRaw.dateOfJoining).toISOString().split('T')[0], salary: empRaw.salary, status: empRaw.status as any, role: (empRaw as any).user?.role || "EMPLOYEE", managerId: empRaw.managerId || "" })
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string, name: string) => {
        if (!await confirmDanger("Delete Employee?", `${name} will be permanently removed.`)) return
        try {
            await EmployeeAPI.deleteEmployee(id)
            showSuccess("Employee Deleted", `${name} has been permanently removed.`)
            fetchData()
        } catch {
            toast.error('An error occurred')
        }
    }

    const handleResetCredentials = async (emp: EmployeeApiData) => {
        if (!await confirmAction("Reset Credentials?", `New login credentials will be generated for ${emp.firstName} ${emp.lastName}.`)) return
        setIsResettingCreds(emp.id)
        try {
            const data = await EmployeeAPI.resetCredentials(emp.id)
            showSuccess("Credentials Reset", `New credentials generated for ${emp.firstName} ${emp.lastName}.`)
            setCredCard({ username: data.email, password: data.tempPassword, name: `${emp.firstName} ${emp.lastName}` })
        } catch {
            toast.error('An error occurred')
        } finally {
            setIsResettingCreds(null)
        }
    }

    const onSubmit = async (data: EmployeeFormData) => {
        try {
            const isEdit = modalMode === "EDIT"
            const result = await EmployeeAPI.upsertEmployee(isEdit, data.id, data) as EmployeeApiData & { tempPassword?: string }
            setIsModalOpen(false)
            fetchData()
            if (!isEdit && result.tempPassword) {
                setCredCard({ username: result.employeeCode || result.email, password: result.tempPassword, name: `${result.firstName} ${result.lastName}` })
            } else {
                toast.success(`Employee ${isEdit ? 'updated' : 'created'} successfully`)
            }
        } catch (err: any) {
            toast.error(err.message || 'Operation failed')
        }
    }


    if (authLoading || !canAccessModule(user?.role ?? '', Module.EMPLOYEES)) return null

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="Employee Management"
                description="Manage and organize your employee records"
            />


            <EmployeeList
                employees={employees}
                departments={departments}
                isLoading={isLoading}
                pageCount={pageCount}
                pageIndex={Math.max(0, page - 1)}
                totalRows={totalRows}
                onPageChange={(newPageIndex) => {
                    const params = new URLSearchParams(searchParams?.toString() || "")
                    params.set("page", (newPageIndex + 1).toString())
                    router.push(`${pathname}?${params.toString()}`)
                }}
                onOpenCreateModal={openCreateModal}
                onOpenEditModal={openEditModal}
                onOpenViewModal={openViewModal}
                onResetCredentials={handleResetCredentials}
                onDelete={handleDelete}
                onImportClick={() => setIsBulkImportOpen(true)}
                onExportCSV={() => exportToCSV(employees.map(({ color, initials, raw, ...rest }) => rest), 'employees_list')}
                onExportPDF={() => exportToPDF(['Name', 'Email', 'Department', 'Role', 'Status', 'Start Date'], employees.map(e => [e.name, e.email, e.dept, e.role, e.status, e.start]), 'employees_list', 'Employee Directory Report')}
                isResettingCreds={isResettingCreds}
            />

            <EmployeeFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                modalMode={modalMode}
                form={form}
                departments={departments}
                managers={managers}
                onSubmit={onSubmit}
                handleAvatarUpload={handleEmployeeAvatarUpload}
                onOpenDeptModal={() => setIsDeptModalOpen(true)}
            />

            <BulkEmployeeImportModal
                isOpen={isBulkImportOpen}
                onClose={() => setIsBulkImportOpen(false)}
                departments={departments}
                onSuccess={() => {
                    setIsBulkImportOpen(false)
                    fetchData()
                }}
            />

            <Modal isOpen={isDeptModalOpen} onClose={() => setIsDeptModalOpen(false)} title="Manage Departments">
                <div className="space-y-4">
                    {/* Existing Departments List */}
                    {departments.length > 0 && (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                            <p className="text-[11px] font-bold text-text-3 uppercase tracking-wide">Existing Departments</p>
                            {departments.map(dept => (
                                <div key={dept.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-bg hover:bg-bg-2 transition-colors">
                                    <span className="text-sm font-medium text-text">{dept.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                                        className="text-[11px] font-bold text-danger hover:text-danger hover:bg-danger/10 px-2 py-1 rounded transition-colors"
                                        title="Delete department"
                                    >
                                        🗑 Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="border-t border-border pt-4">
                        <p className="text-[11px] font-bold text-text-3 uppercase tracking-wide mb-3">Create New</p>
                        <form onSubmit={handleCreateDepartment} className="space-y-3">
                            <Input
                                label="Department Name *"
                                required
                                value={newDeptName}
                                onChange={(e) => setNewDeptName(e.target.value)}
                                placeholder="e.g. Marketing"
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="secondary" type="button" onClick={() => setIsDeptModalOpen(false)}>Close</Button>
                                <Button type="submit" disabled={isDeptCreating || !newDeptName.trim()} loading={isDeptCreating}>
                                    {isDeptCreating ? "Creating..." : "Create Department"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!credCard} onClose={() => setCredCard(null)} title="🔑 Employee Login Credentials">
                {credCard && (
                    <div className="space-y-5">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-accent/5 to-purple/5 border border-accent/15">
                            <p className="text-xs text-text-3 mb-3">Share these credentials with <strong className="text-text">{credCard.name}</strong>. The employee will be prompted to change their password on first login.</p>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border">
                                    <div><p className="text-[11px] text-text-3 mb-0.5">Employee ID (Username)</p><p className="text-base font-bold font-mono text-accent">{credCard.username}</p></div>
                                    <Button size="sm" onClick={() => { navigator.clipboard.writeText(credCard.username); toast.success("Username copied!") }}>Copy</Button>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border">
                                    <div><p className="text-[11px] text-text-3 mb-0.5">Temporary Password</p><p className="text-base font-bold font-mono text-accent">{credCard.password}</p></div>
                                    <Button size="sm" onClick={() => { navigator.clipboard.writeText(credCard.password); toast.success("Password copied!") }}>Copy</Button>
                                </div>
                            </div>
                        </div>
                        <p className="text-[11.5px] text-warning flex items-start gap-1.5">⚠️ <span>This password is shown <strong>once only</strong>. Share it now via WhatsApp, Slack, or email. Use the 🔑 button on the employee row to regenerate if needed.</span></p>
                        <div className="flex justify-end gap-2 pt-2 border-t border-border">
                            <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(`Login URL: ${window.location.origin}/login\nUsername: ${credCard.username}\nPassword: ${credCard.password}`); toast.success("All credentials copied!") }}>Copy All</Button>
                            <Button onClick={() => setCredCard(null)}>Done</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}

export default function EmployeesPage() {
    return (
        <React.Suspense fallback={<div className="p-8 text-text-3">Loading workspace...</div>}>
            <EmployeesContent />
        </React.Suspense>
    )
}
