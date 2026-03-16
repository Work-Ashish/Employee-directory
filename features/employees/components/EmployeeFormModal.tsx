"use client"

import * as React from "react"
import { Modal } from "@/components/ui/Modal"
import { PersonIcon } from "@radix-ui/react-icons"
import { UseFormReturn } from "react-hook-form"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"
import { Combobox, ComboboxOption } from "@/components/ui/Combobox"

interface Department {
    id: string
    name: string
}

interface ManagerCandidate {
    id: string
    firstName: string
    lastName: string
    designation: string
    department?: { name: string }
}

interface EmployeeFormModalProps {
    isOpen: boolean
    onClose: () => void
    modalMode: "CREATE" | "EDIT" | "VIEW"
    form: UseFormReturn<any>
    departments: Department[]
    managers: ManagerCandidate[]
    onSubmit: (data: any) => void
    handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
    onOpenDeptModal: () => void
}

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-bold text-text-3 uppercase tracking-widest shrink-0">{label}</span>
            <div className="h-px flex-1 bg-border" />
        </div>
    )
}

export const EmployeeFormModal = React.memo(function EmployeeFormModal({
    isOpen,
    onClose,
    modalMode,
    form,
    departments,
    managers,
    onSubmit,
    handleAvatarUpload,
    onOpenDeptModal,
}: EmployeeFormModalProps) {
    if (!isOpen) return null

    const deptOptions = [
        { value: "", label: "Select Department..." },
        ...departments.map((d) => ({ value: d.id, label: d.name }))
    ]

    const roleOptions = [
        { value: "EMPLOYEE", label: "Employee" },
        { value: "TEAM_LEAD", label: "Team Lead" },
        { value: "HR", label: "HR Manager" },
        { value: "PAYROLL", label: "Payroll Admin" },
        { value: "CEO", label: "CEO" },
    ]

    const managerComboOptions: ComboboxOption[] = managers.map((m) => ({
        value: m.id,
        label: `${m.firstName} ${m.lastName}`,
        description: `${m.designation}${m.department?.name ? ` · ${m.department.name}` : ""}`,
        avatar: null,
    }))

    const selectedRole = form.watch("role")
    const isView = modalMode === "VIEW"

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={modalMode === "CREATE" ? "Add New Employee" : modalMode === "EDIT" ? "Edit Employee" : "Employee Details"}
        >
            {/* Avatar */}
            <div className="flex flex-col items-center mb-5 pt-1">
                <div className="relative group">
                    <div className="w-20 h-20 rounded-full bg-bg-2 border-2 border-border flex items-center justify-center text-text-3 text-2xl font-bold overflow-hidden shadow-sm">
                        {form.watch("avatarUrl") ? (
                            <img src={form.watch("avatarUrl")!} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <PersonIcon className="w-8 h-8 opacity-20" />
                        )}
                    </div>
                    {!isView && (
                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-full">
                            {form.watch("avatarUrl") ? "CHANGE" : "UPLOAD"}
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </label>
                    )}
                </div>
                {!isView && <p className="text-[11px] text-text-3 mt-1.5">Square image, max 2MB</p>}
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* ── Personal Information ── */}
                <div className="space-y-3">
                    <SectionDivider label="Personal Information" />
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label="First Name *"
                            {...form.register('firstName')}
                            disabled={isView}
                            error={form.formState.errors.firstName?.message?.toString()}
                        />
                        <Input
                            label="Last Name *"
                            {...form.register('lastName')}
                            disabled={isView}
                            error={form.formState.errors.lastName?.message?.toString()}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label="Email *"
                            type="email"
                            {...form.register('email')}
                            disabled={isView}
                            error={form.formState.errors.email?.message?.toString()}
                        />
                        <Input
                            label="Phone"
                            {...form.register('phone')}
                            disabled={isView}
                        />
                    </div>
                </div>

                {/* ── Work Details ── */}
                <div className="space-y-3">
                    <SectionDivider label="Work Details" />
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label="Employee Code *"
                            {...form.register('employeeCode')}
                            disabled={isView}
                            error={form.formState.errors.employeeCode?.message?.toString()}
                        />
                        <Input
                            label="Date of Joining *"
                            type="date"
                            {...form.register('dateOfJoining')}
                            disabled={isView}
                            error={form.formState.errors.dateOfJoining?.message?.toString()}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-text-2">Department *</label>
                                {!isView && (
                                    <button
                                        type="button"
                                        onClick={onOpenDeptModal}
                                        className="text-[11px] font-bold text-accent hover:underline"
                                    >
                                        + New
                                    </button>
                                )}
                            </div>
                            <Select
                                options={deptOptions}
                                {...form.register('departmentId')}
                                disabled={isView}
                                error={form.formState.errors.departmentId?.message?.toString()}
                            />
                        </div>
                        <Input
                            label="Designation *"
                            {...form.register('designation')}
                            disabled={isView}
                            error={form.formState.errors.designation?.message?.toString()}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label="Salary (Monthly) *"
                            type="number"
                            {...form.register('salary', { valueAsNumber: true })}
                            disabled={isView}
                            error={form.formState.errors.salary?.message?.toString()}
                        />
                        <div />
                    </div>
                </div>

                {/* ── Access & Reporting ── */}
                <div className="space-y-3">
                    <SectionDivider label="Access & Reporting" />
                    <div className="grid grid-cols-2 gap-3">
                        <Select
                            label="Portal Role *"
                            options={roleOptions}
                            {...form.register('role')}
                            disabled={isView}
                            error={form.formState.errors.role?.message?.toString()}
                        />
                        {selectedRole !== "CEO" ? (
                            <Combobox
                                label="Reporting Manager *"
                                options={managerComboOptions}
                                value={form.watch('managerId') || ''}
                                onValueChange={(val) => form.setValue('managerId', val, { shouldValidate: true })}
                                disabled={isView}
                                error={form.formState.errors.managerId?.message?.toString()}
                                placeholder="Search manager..."
                                searchPlaceholder="Type to search..."
                                emptyMessage="No managers found"
                            />
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-text-2">Reporting Manager</label>
                                <div className="flex items-center justify-center h-[42px] rounded-lg bg-bg-2/50 border border-dashed border-border">
                                    <span className="text-[11px] text-text-3 font-medium">Not required for CEO</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Actions ── */}
                {!isView && (
                    <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-border">
                        <Button variant="secondary" type="button" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? "Saving..." : modalMode === "CREATE" ? "Create Employee" : "Save Changes"}
                        </Button>
                    </div>
                )}
            </form>
        </Modal>
    )
})
