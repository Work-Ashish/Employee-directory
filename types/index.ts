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

export type DocCategory = "POLICY" | "CONTRACT" | "CERTIFICATE" | "ID_PROOF" | "OTHER"

export interface Document {
    id: string
    title: string
    category: DocCategory
    categoryDisplay?: string
    fileUrl: string
    url: string
    fileType?: string
    uploadDate: string
    createdAt: string
    updatedAt: string
    size?: number | string | null
    isPublic: boolean
    uploadedBy?: string | null
    uploadedByName?: string | null
}
