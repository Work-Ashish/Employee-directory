"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"
import { DataTable } from "@/components/ui/DataTable"
import { ColumnDef } from "@tanstack/react-table"
import { CaretSortIcon, DownloadIcon, PlusIcon, PersonIcon } from "@radix-ui/react-icons"
import { exportToCSV, exportToPDF } from "@/lib/exportUtils"
import { read, utils } from 'xlsx'
import { Modal } from "@/components/ui/Modal"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { format } from "date-fns"

// ----------------------------------------------------------------------------
// Zod Schema for Validation
// ----------------------------------------------------------------------------
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
    avatarUrl: z.string().optional().nullable(),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export type Department = {
    id: string
    name: string
    color: string
}

export type EmployeeApiData = {
    id: string
    employeeCode: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
    designation: string
    departmentId: string
    dateOfJoining: string
    salary: number
    status: string
    avatarUrl?: string | null
    department?: Department
    createdAt?: string
}

type TableEmployee = {
    id: string
    name: string
    email: string
    dept: string
    role: string
    status: string
    start: string
    initials: string
    color: string
    avatarUrl: string | null
    raw: EmployeeApiData // Keep raw data for editing
}

// ----------------------------------------------------------------------------
// Utility Functions
// ----------------------------------------------------------------------------
const getInitials = (first: string, last: string) => {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

const mapApiToTableData = (apiEmployees: EmployeeApiData[]): TableEmployee[] => {
    return apiEmployees.map((emp) => {
        const statusMap: Record<string, string> = {
            "ACTIVE": "Active",
            "ON_LEAVE": "On Leave",
            "RESIGNED": "Resigned",
            "TERMINATED": "Terminated",
        }

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
            raw: emp,
        }
    })
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function EmployeesPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()

    const [employees, setEmployees] = React.useState<TableEmployee[]>([])
    const [departments, setDepartments] = React.useState<Department[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [modalMode, setModalMode] = React.useState<"CREATE" | "EDIT" | "VIEW">("CREATE")
    const [selectedEmployee, setSelectedEmployee] = React.useState<EmployeeApiData | null>(null)

    // Credential card shown after creating a new employee
    const [credCard, setCredCard] = React.useState<{ username: string; password: string; name: string } | null>(null)
    const [isResettingCreds, setIsResettingCreds] = React.useState<string | null>(null)

    const [isDeptModalOpen, setIsDeptModalOpen] = React.useState(false)
    const [newDeptName, setNewDeptName] = React.useState("")
    const [isDeptCreating, setIsDeptCreating] = React.useState(false)

    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const form = useForm<EmployeeFormData>({
        resolver: zodResolver(employeeSchema),
        defaultValues: {
            status: "ACTIVE",
            employeeCode: "",
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            designation: "",
            departmentId: "",
            dateOfJoining: new Date().toISOString().split('T')[0],
            salary: 0,
        }
    })

    const handleCreateDepartment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newDeptName.trim()) return

        try {
            setIsDeptCreating(true)
            const randomColors = [
                "from-[#ff9a9e] to-[#fecfef]",
                "from-[#a18cd1] to-[#fbc2eb]",
                "from-[#84fab0] to-[#8fd3f4]",
                "from-[#a6c0fe] to-[#f68084]",
                "from-[#fccb90] to-[#d57eeb]"
            ]
            const color = randomColors[Math.floor(Math.random() * randomColors.length)]
            const res = await fetch('/api/departments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newDeptName, color })
            })

            if (res.ok) {
                const newDept = await res.json()
                setDepartments(prev => [...prev, newDept])
                form.setValue('departmentId', newDept.id)
                toast.success('Department created successfully')
                setIsDeptModalOpen(false)
                setNewDeptName("")
            } else {
                const errorData = await res.json()
                toast.error(errorData.details || errorData.error || 'Failed to create department')
            }
        } catch (error: any) {
            toast.error(error.message || 'An error occurred')
        } finally {
            setIsDeptCreating(false)
        }
    }

    const handleEmployeeAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 2 * 1024 * 1024) {
            toast.error("File size must be less than 2MB")
            return
        }

        const formData = new FormData()
        formData.append("file", file)
        formData.append("bucket", "avatars")

        try {
            toast.loading("Uploading photo...", { id: "emp-upload" })
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData
            })

            if (res.ok) {
                const { url } = await res.json()
                form.setValue("avatarUrl", url)
                toast.success("Photo uploaded", { id: "emp-upload" })
            } else {
                toast.error("Upload failed", { id: "emp-upload" })
            }
        } catch (error) {
            toast.error("An error occurred", { id: "emp-upload" })
        }
    }

    // Auth protection
    React.useEffect(() => {
        if (!authLoading && user?.role === 'EMPLOYEE') {
            router.push('/')
        }
    }, [user, authLoading, router])

    // Data Fetching
    const fetchData = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const [empRes, deptRes] = await Promise.all([
                fetch('/api/employees?limit=100'),
                fetch('/api/departments')
            ])

            if (empRes.ok && deptRes.ok) {
                const empJson = await empRes.json()
                const empData: EmployeeApiData[] = Array.isArray(empJson) ? empJson : empJson.data || []
                const deptData: Department[] = await deptRes.json()
                setDepartments(deptData)
                setEmployees(mapApiToTableData(empData))
            } else {
                console.error("Failed to load data", { empStatus: empRes.status, deptStatus: deptRes.status })
                toast.error("Failed to load data")
            }
        } catch (error) {
            console.error("Fetch error:", error)
            toast.error("An error occurred while fetching data")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        if (!authLoading) {
            fetchData()
        }
    }, [authLoading, fetchData])

    // Handlers
    const openCreateModal = () => {
        setModalMode("CREATE")
        setSelectedEmployee(null)
        form.reset({
            status: "ACTIVE",
            employeeCode: `EMP-${Date.now().toString().slice(-4)}`,
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            designation: "",
            departmentId: departments[0]?.id || "",
            dateOfJoining: new Date().toISOString().split('T')[0],
            salary: 0,
        })
        setIsModalOpen(true)
    }

    const openEditModal = (empRaw: EmployeeApiData) => {
        setModalMode("EDIT")
        setSelectedEmployee(empRaw)
        form.reset({
            id: empRaw.id,
            employeeCode: empRaw.employeeCode,
            firstName: empRaw.firstName,
            lastName: empRaw.lastName,
            email: empRaw.email,
            phone: empRaw.phone || "",
            designation: empRaw.designation,
            departmentId: empRaw.departmentId,
            dateOfJoining: new Date(empRaw.dateOfJoining).toISOString().split('T')[0],
            salary: empRaw.salary,
            status: empRaw.status as any,
        })
        setIsModalOpen(true)
    }

    const openViewModal = (empRaw: EmployeeApiData) => {
        setModalMode("VIEW")
        setSelectedEmployee(empRaw)
        form.reset({
            employeeCode: empRaw.employeeCode,
            firstName: empRaw.firstName,
            lastName: empRaw.lastName,
            email: empRaw.email,
            phone: empRaw.phone || "",
            designation: empRaw.designation,
            departmentId: empRaw.departmentId,
            dateOfJoining: new Date(empRaw.dateOfJoining).toISOString().split('T')[0],
            salary: empRaw.salary,
            status: empRaw.status as any,
        })
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete ${name}?`)) return
        try {
            const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Employee deleted successfully')
                fetchData()
            } else {
                toast.error('Failed to delete employee')
            }
        } catch (error) {
            toast.error('An error occurred')
        }
    }

    const handleResetCredentials = async (emp: EmployeeApiData) => {
        if (!window.confirm(`Reset login credentials for ${emp.firstName} ${emp.lastName}?`)) return
        setIsResettingCreds(emp.id)
        try {
            const res = await fetch(`/api/employees/${emp.id}/credentials`, { method: 'POST' })
            if (res.ok) {
                const data = await res.json()
                setCredCard({
                    username: data.username,
                    password: data.tempPassword,
                    name: `${emp.firstName} ${emp.lastName}`,
                })
            } else {
                toast.error('Failed to reset credentials')
            }
        } catch {
            toast.error('An error occurred')
        } finally {
            setIsResettingCreds(null)
        }
    }

    const onSubmit = async (data: EmployeeFormData) => {
        try {
            const isEdit = modalMode === "EDIT"
            const url = isEdit ? `/api/employees/${data.id}` : '/api/employees'
            const method = isEdit ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (res.ok) {
                const result = await res.json()
                setIsModalOpen(false)
                fetchData()
                if (!isEdit && result.tempPassword) {
                    // Show credential card for new employee
                    setCredCard({
                        username: result.employeeCode,
                        password: result.tempPassword,
                        name: `${result.firstName} ${result.lastName}`,
                    })
                } else {
                    toast.success(`Employee ${isEdit ? 'updated' : 'created'} successfully`)
                }
            } else {
                const err = await res.json()
                toast.error(err.details || err.error || 'Operation failed')
            }
        } catch (error) {
            toast.error('An error occurred')
        }
    }

    // Export & Import
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const data = await file.arrayBuffer()
            const workbook = read(data, { type: 'array' })
            const worksheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = utils.sheet_to_json(worksheet) as any[]

            if (jsonData.length === 0) {
                toast.error("File is empty")
                return
            }

            toast.loading("Importing employees...", { id: "import" })

            let successCount = 0
            for (const row of jsonData) {
                const deptName = String(row['Department'] || row['dept'] || '').toLowerCase()
                const dept = departments.find(d => d.name.toLowerCase() === deptName)

                const nameParts = String(row['Name'] || row['name'] || '').split(' ')

                let isoDate = new Date().toISOString().split('T')[0]
                const rawDate = row['Start Date'] || row['Date Of Joining'] || row['startDate'] || row['start']
                if (rawDate) {
                    try { isoDate = new Date(rawDate).toISOString().split('T')[0] } catch (e) { }
                }

                const empData = {
                    employeeCode: row['Employee Code'] || row['employeeCode'] || `EMP-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`,
                    firstName: row['First Name'] || row['firstName'] || nameParts[0] || 'Unknown',
                    lastName: row['Last Name'] || row['lastName'] || nameParts.slice(1).join(' ') || 'User',
                    email: row['Email'] || row['email'] || `user${Math.floor(Math.random() * 1000)}@example.com`,
                    phone: String(row['Phone'] || row['phone'] || ''),
                    designation: row['Role'] || row['role'] || row['Position'] || row['designation'] || 'Employee',
                    departmentId: dept ? dept.id : (departments[0]?.id || ""),
                    dateOfJoining: isoDate,
                    salary: parseFloat(row['Salary'] || row['salary']) || 0,
                    status: "ACTIVE",
                }

                const res = await fetch('/api/employees', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(empData),
                })

                if (res.ok) successCount++
                else console.error("Failed to import row", await res.text())
            }

            toast.success(`Successfully imported ${successCount} employees`, { id: "import" })
            fetchData()
        } catch (error) {
            console.error(error)
            toast.error("Failed to import file", { id: "import" })
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleExportCSV = () => {
        const exportData = employees.map(({ color, initials, raw, ...rest }) => rest);
        exportToCSV(exportData, 'employees_list');
    }

    const handleExportPDF = () => {
        const headers = ['Name', 'Email', 'Department', 'Role', 'Status', 'Start Date'];
        const data = employees.map(e => [e.name, e.email, e.dept, e.role, e.status, e.start]);
        exportToPDF(headers, data, 'employees_list', 'Employee Directory Report');
    }

    // Columns Definition
    const columns = React.useMemo<ColumnDef<TableEmployee>[]>(() => [
        {
            accessorKey: "name",
            header: ({ column }) => {
                return (
                    <button
                        className="flex items-center gap-1 hover:text-[var(--text)] transition-colors"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Name
                        <CaretSortIcon className="w-3 h-3" />
                    </button>
                )
            },
            cell: ({ row }) => (
                <div className="flex items-center gap-[11px] text-[13.5px] text-[var(--text)]">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0 overflow-hidden",
                        !row.original.avatarUrl && (row.original.color || "bg-gray-400"))}>
                        {row.original.avatarUrl ? (
                            <img src={row.original.avatarUrl} className="w-full h-full object-cover" />
                        ) : (
                            row.original.initials
                        )}
                    </div>
                    <span className="font-semibold">{row.getValue("name")}</span>
                </div>
            ),
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => <div className="text-[13px] text-[var(--text3)]">{row.getValue("email")}</div>,
        },
        {
            accessorKey: "dept",
            header: "Department",
            cell: ({ row }) => (
                <span className="inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold bg-[rgba(0,122,255,0.08)] text-[var(--accent)] border border-[rgba(0,122,255,0.18)]">
                    {row.getValue("dept")}
                </span>
            ),
        },
        {
            accessorKey: "role",
            header: "Position",
            cell: ({ row }) => <div className="text-[13.5px] text-[var(--text)]">{row.getValue("role")}</div>,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as string
                return (
                    <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold border",
                        status === 'Active'
                            ? "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]"
                            : status === 'On Leave'
                                ? "bg-[var(--amber-dim)] text-[#b86c00] border-[rgba(255,149,0,0.25)]"
                                : status === 'Resigned'
                                    ? "bg-[var(--bg2)] text-[var(--text3)] border-[var(--border)]"
                                    : "bg-[var(--red-dim)] text-[var(--red)] border-[rgba(255,59,48,0.25)]"
                    )}>
                        ● {status}
                    </span>
                )
            },
        },
        {
            accessorKey: "start",
            header: "Start Date",
            cell: ({ row }) => <div className="text-[13px] text-[var(--text3)] font-mono">{row.getValue("start")}</div>,
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const emp = row.original.raw
                return (
                    <div className="flex items-center gap-[6px] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                            title="View"
                            onClick={() => openViewModal(emp)}
                            className="w-[30px] h-[30px] rounded-[8px] border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center text-[13px] text-[var(--text3)] transition-all duration-200 hover:bg-[rgba(0,122,255,0.08)] hover:border-[rgba(0,122,255,0.25)] hover:text-[var(--accent)] hover:scale-110">👁</button>
                        <button
                            title="Edit"
                            onClick={() => openEditModal(emp)}
                            className="w-[30px] h-[30px] rounded-[8px] border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center text-[13px] text-[var(--text3)] transition-all duration-200 hover:bg-[rgba(0,122,255,0.08)] hover:border-[rgba(0,122,255,0.25)] hover:text-[var(--accent)] hover:scale-110">✏</button>
                        <button
                            title="Reset Login Credentials"
                            onClick={() => handleResetCredentials(emp)}
                            disabled={isResettingCreds === emp.id}
                            className="w-[30px] h-[30px] rounded-[8px] border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center text-[13px] text-[var(--text3)] transition-all duration-200 hover:bg-[rgba(255,149,0,0.08)] hover:border-[rgba(255,149,0,0.3)] hover:text-amber-500 hover:scale-110 disabled:opacity-40">🔑</button>
                        <button
                            title="Delete"
                            onClick={() => handleDelete(emp.id, `${emp.firstName} ${emp.lastName}`)}
                            className="w-[30px] h-[30px] rounded-[8px] border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center text-[13px] text-[var(--text3)] transition-all duration-200 hover:bg-[rgba(255,59,48,0.08)] hover:border-[rgba(255,59,48,0.25)] hover:text-[var(--red)] hover:scale-110">🗑</button>
                    </div>
                )
            },
        },
    ], [departments, isResettingCreds]) // Re-memoize if needed but dependencies are handled natively here mostly

    if (authLoading || user?.role === 'EMPLOYEE') return null

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Employee Management</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Manage and organize your employee records</p>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".xlsx, .xls, .csv"
            />

            {!isLoading ? (
                <DataTable
                    columns={columns}
                    data={employees}
                    searchKey="name"
                    filterFields={[
                        { id: "dept", label: "Departments", options: departments.map(d => d.name) },
                        { id: "status", label: "Status", options: ["Active", "On Leave", "Resigned", "Terminated"] }
                    ]}
                    actions={
                        <>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 p-[9px_14px] bg-[var(--surface)] border border-[var(--border)] rounded-[9px] text-[13px] text-[var(--text2)] hover:bg-[var(--bg2)] transition-colors"
                            >
                                <DownloadIcon className="w-3.5 h-3.5 rotate-180" /> Import
                            </button>
                            <button
                                onClick={handleExportCSV}
                                className="flex items-center gap-2 p-[9px_14px] bg-[var(--surface)] border border-[var(--border)] rounded-[9px] text-[13px] text-[var(--text2)] hover:bg-[var(--bg2)] transition-colors"
                            >
                                <DownloadIcon className="w-3.5 h-3.5" /> CSV
                            </button>
                            <button
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 p-[9px_14px] bg-[var(--surface)] border border-[var(--border)] rounded-[9px] text-[13px] text-[var(--text2)] hover:bg-[var(--bg2)] transition-colors"
                            >
                                <DownloadIcon className="w-3.5 h-3.5" /> PDF
                            </button>
                            <button
                                onClick={openCreateModal}
                                className="flex items-center gap-2 p-[9px_14px] bg-[var(--accent)] text-white rounded-[9px] text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-[0_2px_8px_rgba(0,122,255,0.25)]">
                                <PlusIcon className="w-4 h-4" /> Add Employee
                            </button>
                        </>
                    }
                />
            ) : (
                <div className="h-[400px] w-full flex items-center justify-center text-[var(--text3)]">
                    Loading Data...
                </div>
            )}

            {/* Employee Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalMode === "CREATE" ? "Add New Employee" : modalMode === "EDIT" ? "Edit Employee" : "View Employee"}
            >
                <div className="flex flex-col items-center mb-6 pt-2">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-[var(--bg2)] border-2 border-[var(--border)] flex items-center justify-center text-[var(--text3)] text-[24px] font-bold overflow-hidden">
                            {form.watch("avatarUrl") ? (
                                <img src={form.watch("avatarUrl")!} className="w-full h-full object-cover" />
                            ) : (
                                <PersonIcon className="w-10 h-10 opacity-20" />
                            )}
                        </div>
                        {modalMode !== "VIEW" && (
                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-full">
                                {form.watch("avatarUrl") ? "CHANGE" : "UPLOAD"}
                                <input type="file" className="hidden" accept="image/*" onChange={handleEmployeeAvatarUpload} />
                            </label>
                        )}
                    </div>
                    {modalMode !== "VIEW" && <p className="text-[11px] text-[var(--text3)] mt-2">Recommended: Square image, max 2MB</p>}
                </div>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">First Name *</label>
                            <input
                                {...form.register('firstName')}
                                disabled={modalMode === "VIEW"}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                            />
                            {form.formState.errors.firstName && <span className="text-[11px] text-red-500">{form.formState.errors.firstName.message}</span>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Last Name *</label>
                            <input
                                {...form.register('lastName')}
                                disabled={modalMode === "VIEW"}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                            />
                            {form.formState.errors.lastName && <span className="text-[11px] text-red-500">{form.formState.errors.lastName.message}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Employee Code *</label>
                            <input
                                {...form.register('employeeCode')}
                                disabled={modalMode === "VIEW"}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                            />
                            {form.formState.errors.employeeCode && <span className="text-[11px] text-red-500">{form.formState.errors.employeeCode.message}</span>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Date Of Joining *</label>
                            <input
                                type="date"
                                {...form.register('dateOfJoining')}
                                disabled={modalMode === "VIEW"}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                            />
                            {form.formState.errors.dateOfJoining && <span className="text-[11px] text-red-500">{form.formState.errors.dateOfJoining.message}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Email *</label>
                            <input
                                type="email"
                                {...form.register('email')}
                                disabled={modalMode === "VIEW"}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                            />
                            {form.formState.errors.email && <span className="text-[11px] text-red-500">{form.formState.errors.email.message}</span>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Phone</label>
                            <input
                                {...form.register('phone')}
                                disabled={modalMode === "VIEW"}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-[12px] font-semibold text-[var(--text2)]">Department *</label>
                                {modalMode !== "VIEW" && (
                                    <button
                                        type="button"
                                        onClick={() => setIsDeptModalOpen(true)}
                                        className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                                    >
                                        + New
                                    </button>
                                )}
                            </div>
                            <select
                                {...form.register('departmentId')}
                                disabled={modalMode === "VIEW"}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                            >
                                <option value="">Select Department...</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                            {form.formState.errors.departmentId && <span className="text-[11px] text-red-500">{form.formState.errors.departmentId.message}</span>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Designation *</label>
                            <input
                                {...form.register('designation')}
                                disabled={modalMode === "VIEW"}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                            />
                            {form.formState.errors.designation && <span className="text-[11px] text-red-500">{form.formState.errors.designation.message}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Salary (Monthly) *</label>
                            <input
                                type="number"
                                {...form.register('salary', { valueAsNumber: true })}
                                disabled={modalMode === "VIEW"}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                            />
                            {form.formState.errors.salary && <span className="text-[11px] text-red-500">{form.formState.errors.salary.message}</span>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[12px] font-semibold text-[var(--text2)]">Status *</label>
                            <select
                                {...form.register('status')}
                                disabled={modalMode === "VIEW"}
                                className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="ON_LEAVE">On Leave</option>
                                <option value="RESIGNED">Resigned</option>
                                <option value="TERMINATED">Terminated</option>
                            </select>
                        </div>
                    </div>

                    {modalMode !== "VIEW" && (
                        <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-[var(--border)]">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-[13px] font-semibold bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg2)] text-[var(--text2)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={form.formState.isSubmitting}
                                className="px-4 py-2 text-[13px] font-semibold text-white bg-[var(--accent)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {form.formState.isSubmitting ? "Saving..." : modalMode === "CREATE" ? "Create Employee" : "Save Changes"}
                            </button>
                        </div>
                    )}
                </form>
            </Modal>

            {/* Create Department Modal inside Employees Page */}
            <Modal
                isOpen={isDeptModalOpen}
                onClose={() => setIsDeptModalOpen(false)}
                title="Create New Department"
            >
                <form onSubmit={handleCreateDepartment} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-[var(--text2)]">Department Name *</label>
                        <input
                            required
                            value={newDeptName}
                            onChange={(e) => setNewDeptName(e.target.value)}
                            className="w-full p-2 border border-[var(--border)] rounded-md text-[13px] bg-[var(--bg)] outline-none focus:border-[var(--accent)]"
                            placeholder="e.g. Marketing"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-[var(--border)]">
                        <button
                            type="button"
                            onClick={() => setIsDeptModalOpen(false)}
                            className="px-4 py-2 text-[13px] font-semibold bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg2)] text-[var(--text2)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isDeptCreating || !newDeptName.trim()}
                            className="px-4 py-2 text-[13px] font-semibold text-white bg-[var(--accent)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {isDeptCreating ? "Creating..." : "Create Department"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Credential Card Modal – shown after creating/resetting employee credentials */}
            <Modal
                isOpen={!!credCard}
                onClose={() => setCredCard(null)}
                title="🔑 Employee Login Credentials"
            >
                {credCard && (
                    <div className="space-y-5">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-[rgba(0,122,255,0.06)] to-[rgba(88,86,214,0.06)] border border-[rgba(0,122,255,0.15)]">
                            <p className="text-[12px] text-[var(--text3)] mb-3">
                                Share these credentials with <strong className="text-[var(--text)]">{credCard.name}</strong>. The employee will be prompted to change their password on first login.
                            </p>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
                                    <div>
                                        <p className="text-[11px] text-[var(--text3)] mb-0.5">Employee ID (Username)</p>
                                        <p className="text-[15px] font-bold font-mono text-[var(--accent)]">{credCard.username}</p>
                                    </div>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(credCard.username); toast.success("Username copied!") }}
                                        className="text-[11px] px-2.5 py-1 rounded-md bg-[var(--accent)] text-white font-semibold hover:opacity-80"
                                    >Copy</button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
                                    <div>
                                        <p className="text-[11px] text-[var(--text3)] mb-0.5">Temporary Password</p>
                                        <p className="text-[15px] font-bold font-mono text-[var(--accent)]">{credCard.password}</p>
                                    </div>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(credCard.password); toast.success("Password copied!") }}
                                        className="text-[11px] px-2.5 py-1 rounded-md bg-[var(--accent)] text-white font-semibold hover:opacity-80"
                                    >Copy</button>
                                </div>
                            </div>
                        </div>

                        <p className="text-[11.5px] text-amber-500 flex items-start gap-1.5">
                            ⚠️ <span>This password is shown <strong>once only</strong>. Share it now via WhatsApp, Slack, or email. Use the 🔑 button on the employee row to regenerate if needed.</span>
                        </p>

                        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                            <button
                                onClick={() => {
                                    const text = `Login URL: ${window.location.origin}/login\nUsername: ${credCard.username}\nPassword: ${credCard.password}`
                                    navigator.clipboard.writeText(text)
                                    toast.success("All credentials copied!")
                                }}
                                className="px-4 py-2 text-[13px] font-semibold bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg2)] text-[var(--text2)] transition-colors"
                            >
                                Copy All
                            </button>
                            <button
                                onClick={() => setCredCard(null)}
                                className="px-4 py-2 text-[13px] font-semibold text-white bg-[var(--accent)] rounded-lg hover:opacity-90 transition-opacity"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
