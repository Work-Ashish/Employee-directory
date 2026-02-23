export type AssetType = "HARDWARE" | "SOFTWARE" | "ACCESSORY"
export type AssetStatus = "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "RETIRED"

export interface Asset {
    id: string
    name: string
    type: AssetType
    serialNumber: string
    status: AssetStatus
    purchaseDate: string
    value: number
    image?: string | null
    assignedToId?: string | null
    assignedTo?: {
        id: string
        firstName: string
        lastName: string
        employeeCode: string
    } | null
    assignedDate?: string | null
    createdAt: string
    updatedAt: string
}

export type DocCategory = "POLICY" | "CONTRACT" | "PAYSLIP" | "TAX" | "IDENTIFICATION"

export interface Document {
    id: string
    title: string
    category: DocCategory
    url: string
    uploadDate: string
    size?: string | null
    isPublic: boolean
    employeeId?: string | null
    employee?: {
        id: string
        firstName: string
        lastName: string
        employeeCode: string
    } | null
}
