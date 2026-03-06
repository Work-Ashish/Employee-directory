"use client"

import * as React from "react"
import { Modal } from "@/components/ui/Modal"
import { PersonIcon } from "@radix-ui/react-icons"
import { UseFormReturn } from "react-hook-form"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"
import { Avatar } from "@/components/ui/Avatar"

interface Department {
    id: string
    name: string
}

interface EmployeeFormModalProps {
    isOpen: boolean
    onClose: () => void
    modalMode: "CREATE" | "EDIT" | "VIEW"
    form: UseFormReturn<any>
    departments: Department[]
    onSubmit: (data: any) => void
    handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
    onOpenDeptModal: () => void
}

export const EmployeeFormModal = React.memo(function EmployeeFormModal({
    isOpen,
    onClose,
    modalMode,
    form,
    departments,
    onSubmit,
    handleAvatarUpload,
    onOpenDeptModal,
}: EmployeeFormModalProps) {
    if (!isOpen) return null

    const deptOptions = [
        { value: "", label: "Select Department..." },
        ...departments.map((d) => ({ value: d.id, label: d.name }))
    ]

    const statusOptions = [
        { value: "ACTIVE", label: "Active" },
        { value: "ON_LEAVE", label: "On Leave" },
        { value: "RESIGNED", label: "Resigned" },
        { value: "TERMINATED", label: "Terminated" },
    ]

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={modalMode === "CREATE" ? "Add New Employee" : modalMode === "EDIT" ? "Edit Employee" : "View Employee"}
        >
            <div className="flex flex-col items-center mb-6 pt-2">
                <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-bg-2 border-2 border-border flex items-center justify-center text-text-3 text-2xl font-bold overflow-hidden">
                        {form.watch("avatarUrl") ? (
                            <img src={form.watch("avatarUrl")!} className="w-full h-full object-cover" />
                        ) : (
                            <PersonIcon className="w-10 h-10 opacity-20" />
                        )}
                    </div>
                    {modalMode !== "VIEW" && (
                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs font-bold opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-full">
                            {form.watch("avatarUrl") ? "CHANGE" : "UPLOAD"}
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </label>
                    )}
                </div>
                {modalMode !== "VIEW" && <p className="text-xs text-text-3 mt-2">Recommended: Square image, max 2MB</p>}
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="First Name *"
                        {...form.register('firstName')}
                        disabled={modalMode === "VIEW"}
                        error={form.formState.errors.firstName?.message?.toString()}
                    />
                    <Input
                        label="Last Name *"
                        {...form.register('lastName')}
                        disabled={modalMode === "VIEW"}
                        error={form.formState.errors.lastName?.message?.toString()}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Employee Code *"
                        {...form.register('employeeCode')}
                        disabled={modalMode === "VIEW"}
                        error={form.formState.errors.employeeCode?.message?.toString()}
                    />
                    <Input
                        label="Date Of Joining *"
                        type="date"
                        {...form.register('dateOfJoining')}
                        disabled={modalMode === "VIEW"}
                        error={form.formState.errors.dateOfJoining?.message?.toString()}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Email *"
                        type="email"
                        {...form.register('email')}
                        disabled={modalMode === "VIEW"}
                        error={form.formState.errors.email?.message?.toString()}
                    />
                    <Input
                        label="Phone"
                        {...form.register('phone')}
                        disabled={modalMode === "VIEW"}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-text-2">Department *</label>
                            {modalMode !== "VIEW" && (
                                <button
                                    type="button"
                                    onClick={onOpenDeptModal}
                                    className="text-xs font-semibold text-accent hover:underline"
                                >
                                    + New
                                </button>
                            )}
                        </div>
                        <Select
                            options={deptOptions}
                            {...form.register('departmentId')}
                            disabled={modalMode === "VIEW"}
                            error={form.formState.errors.departmentId?.message?.toString()}
                        />
                    </div>
                    <Input
                        label="Designation *"
                        {...form.register('designation')}
                        disabled={modalMode === "VIEW"}
                        error={form.formState.errors.designation?.message?.toString()}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Salary (Monthly) *"
                        type="number"
                        {...form.register('salary', { valueAsNumber: true })}
                        disabled={modalMode === "VIEW"}
                        error={form.formState.errors.salary?.message?.toString()}
                    />
                    <Select
                        label="Status *"
                        options={statusOptions}
                        {...form.register('status')}
                        disabled={modalMode === "VIEW"}
                    />
                </div>

                {modalMode !== "VIEW" && (
                    <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border">
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
