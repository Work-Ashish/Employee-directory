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
    managerId?: string | null
    avatarUrl?: string | null
    department?: Department
    manager?: { id: string; firstName: string; lastName: string; designation: string; avatarUrl?: string | null } | null
    createdAt?: string
}

export type TableEmployee = {
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
    manager: string | null
    managerAvatarUrl: string | null
    raw: EmployeeApiData
}
