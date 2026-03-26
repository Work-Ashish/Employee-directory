"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api-client"
import { toast } from "sonner"
import {
    PersonIcon, IdCardIcon, HomeIcon, BackpackIcon, LaptopIcon,
    EyeOpenIcon, EyeClosedIcon, Pencil1Icon, CheckIcon, Cross2Icon,
    PlusIcon, TrashIcon
} from "@radix-ui/react-icons"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { Spinner } from "@/components/ui/Spinner"
import { EmptyState } from "@/components/ui/EmptyState"

/* ─────────────────── Types ─────────────────── */
interface Education { id: string; degree: string; institute: string; duration?: string; grade?: string }
interface Asset { id: string; name: string; type: string; serialNumber: string; status: string; assignedDate?: string; image?: string }
interface Profile {
    id: string; employeeCode: string; firstName: string; lastName: string; email: string; phone?: string
    designation: string; dateOfJoining: string; salary: number; status: string; avatarUrl?: string; address?: string
    department: { id: string; name: string }
    manager?: { firstName: string; lastName: string; designation: string }
    educations: Education[]; assets: Asset[]; documents: any[]
    dateOfBirth?: string; gender?: string; bloodGroup?: string; nationality?: string; maritalStatus?: string
    marriageDate?: string; spouse?: string; placeOfBirth?: string; residentialStatus?: string; fatherName?: string
    religion?: string; physicallyChallenged?: boolean; internationalEmployee?: boolean
    hobby?: string; caste?: string; height?: string; weight?: string; identificationMark?: string
    contactAddress?: string; contactCity?: string; contactState?: string; contactPincode?: string
    permanentAddress?: string; permanentCity?: string; permanentState?: string; permanentPincode?: string
    bankName?: string; bankAccountNumber?: string; bankBranch?: string; ifscCode?: string
    pfAccountNumber?: string; aadhaarNumber?: string; panNumber?: string
    fatherDob?: string; fatherBloodGroup?: string; fatherGender?: string; fatherNationality?: string
    emergencyContactName?: string; emergencyContactPhone?: string; emergencyContactRelation?: string
    category?: string; costCenter?: string; division?: string; grade?: string; location?: string; previousEmployment?: string; previousCtc?: number
    previousExperienceYears?: number; totalExperienceYears?: number
    passportNumber?: string; passportExpiry?: string; visaNumber?: string; visaExpiry?: string
}

/* ─────────────────── Helpers ─────────────────── */
const fmtDate = (v: any) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"
const fmtDateInput = (v: any) => v ? new Date(v).toISOString().split("T")[0] : ""
const maskValue = (v: string | undefined | null) => v ? v.replace(/.(?=.{4})/g, "•") : "—"

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
const GENDERS = ["Male", "Female", "Other"]
const MARITAL_STATUS = ["Single", "Married", "Divorced", "Widowed"]

/* ─────────────────── Reusable: FormField ─────────────────── */
function FormField({ label, name, value, editing, onChange, type = "text", options, masked, placeholder, readOnly, span }: {
    label: string; name: string; value: any; editing: boolean; onChange?: (name: string, value: any) => void
    type?: "text" | "select" | "date" | "toggle" | "masked" | "textarea"; options?: string[]
    masked?: boolean; placeholder?: string; readOnly?: boolean; span?: number
}) {
    const [showMasked, setShowMasked] = React.useState(false)

    // ─── View mode ───
    if (!editing || readOnly) {
        let display: string
        if (type === "date") display = fmtDate(value)
        else if (type === "toggle") display = value ? "Yes" : "No"
        else if (masked && !showMasked) display = maskValue(value)
        else display = value ?? "—"

        return (
            <div className={cn("flex flex-col gap-1.5", span === 2 && "md:col-span-2")}>
                <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider">{label}</span>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text">{display}</span>
                    {masked && value && (
                        <button onClick={() => setShowMasked(!showMasked)} className="text-text-4 hover:text-text transition-colors">
                            {showMasked ? <EyeClosedIcon className="w-3.5 h-3.5" /> : <EyeOpenIcon className="w-3.5 h-3.5" />}
                        </button>
                    )}
                </div>
            </div>
        )
    }

    // ─── Edit mode ───
    const inputCls = "w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder-text-4 outline-none transition-all focus:border-accent focus:shadow-[0_0_0_2px_var(--glow)]"

    return (
        <div className={cn("flex flex-col gap-1.5", span === 2 && "md:col-span-2")}>
            <label className="text-[11px] font-semibold text-text-3 uppercase tracking-wider">{label}</label>
            {type === "select" ? (
                <select value={value ?? ""} onChange={e => onChange?.(name, e.target.value)} className={inputCls}>
                    <option value="">Select...</option>
                    {options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            ) : type === "date" ? (
                <input type="date" value={fmtDateInput(value)} onChange={e => onChange?.(name, e.target.value)} className={inputCls} />
            ) : type === "toggle" ? (
                <button
                    onClick={() => onChange?.(name, !value)}
                    className={cn("w-11 h-6 rounded-full transition-colors relative", value ? "bg-accent" : "bg-border")}
                >
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform", value ? "left-[22px]" : "left-0.5")} />
                </button>
            ) : type === "textarea" ? (
                <textarea value={value ?? ""} onChange={e => onChange?.(name, e.target.value)} rows={2} placeholder={placeholder} className={inputCls} />
            ) : (
                <input type="text" value={value ?? ""} onChange={e => onChange?.(name, e.target.value)} placeholder={placeholder} className={inputCls} />
            )}
        </div>
    )
}

/* ─────────────────── Reusable: FormSection ─────────────────── */
function FormSection({ title, children, columns = 3 }: { title: string; children: React.ReactNode; columns?: number }) {
    return (
        <div className="mb-6">
            <h4 className="text-xs font-bold text-accent uppercase tracking-widest mb-4 pb-2 border-b border-border">{title}</h4>
            <div className={cn("grid gap-x-8 gap-y-5", columns === 3 ? "grid-cols-1 md:grid-cols-3" : columns === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                {children}
            </div>
        </div>
    )
}

/* ─────────────────── Tab Config ─────────────────── */
const TABS = [
    { id: "personal", label: "Personal", icon: <PersonIcon className="w-4 h-4" />, editable: true },
    { id: "accounts", label: "Accounts & Statutory", icon: <IdCardIcon className="w-4 h-4" />, editable: true },
    { id: "family", label: "Family", icon: <HomeIcon className="w-4 h-4" />, editable: true },
    { id: "employment", label: "Employment & Job", icon: <BackpackIcon className="w-4 h-4" />, editable: true },
    { id: "assets", label: "Assets", icon: <LaptopIcon className="w-4 h-4" />, editable: false },
]

/* ─────────────────── Main Page ─────────────────── */
export default function ProfilePage() {
    const [profile, setProfile] = React.useState<Profile | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [activeTab, setActiveTab] = React.useState("personal")
    const [editing, setEditing] = React.useState(false)
    const [formData, setFormData] = React.useState<Record<string, any>>({})
    const [saving, setSaving] = React.useState(false)

    React.useEffect(() => {
        api.get('/employees/profile/')
            .then(({ data }) => { setProfile(data as any); setFormData(data as any) })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const handleChange = (name: string, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const EDITABLE_FIELDS = new Set([
        // Personal
        "phone", "dateOfBirth", "gender", "bloodGroup", "nationality", "maritalStatus",
        "religion", "caste", "fatherName", "spouse",
        // Emergency
        "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation",
        // Passport & visa
        "passportNumber", "passportExpiry", "visaNumber", "visaExpiry",
        // Address
        "contactAddress", "contactCity", "contactState", "contactPincode",
        "permanentAddress", "permanentCity", "permanentState", "permanentPincode",
        // Banking & statutory
        "bankName", "bankAccountNumber", "bankBranch", "ifscCode",
        "pfAccountNumber", "aadhaarNumber", "panNumber",
        // Employment
        "previousEmployment", "previousExperienceYears", "totalExperienceYears",
    ])

    const handleSave = async () => {
        setSaving(true)
        try {
            const payload: Record<string, unknown> = {}
            for (const key of EDITABLE_FIELDS) {
                if (formData[key] !== undefined) payload[key] = formData[key]
            }
            const { data: updated } = await api.put('/employees/profile/', payload) as any
            setProfile({ ...profile!, ...updated })
            setFormData({ ...profile!, ...updated })
            setEditing(false)
            toast.success("Profile updated successfully")
        } catch {
            toast.error("Failed to update profile")
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => {
        setFormData(profile as any)
        setEditing(false)
    }

    const currentTab = TABS.find(t => t.id === activeTab)!

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Spinner size="lg" className="w-8 h-8 text-accent" />
            </div>
        )
    }

    if (!profile) {
        return (
            <EmptyState
                icon={<span className="text-[60px]">🔒</span>}
                title="Profile Not Found"
                description="Your employee profile is not linked. Contact your administrator."
                className="h-[60vh]"
            />
        )
    }

    const fullName = `${profile.firstName} ${profile.lastName}`

    return (
        <div className="max-w-[1000px] mx-auto p-6 space-y-6">
            {/* Header Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center gap-5">
                        <Avatar src={profile.avatarUrl} name={fullName} size="xl" className="w-[72px] h-[72px] text-[22px] shadow-lg" />
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl font-extrabold text-text tracking-tight">{fullName}</h1>
                            <p className="text-sm text-text-3 mt-0.5">{profile.designation} · {profile.department.name}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                                <Badge size="sm" className="font-mono">{profile.employeeCode}</Badge>
                                <span className="text-[11px] text-text-4">Joined {fmtDate(profile.dateOfJoining)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tab Bar + Edit Button */}
            <div className="flex items-center justify-between border-b border-border">
                <div className="flex gap-0 overflow-x-auto">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setEditing(false); setFormData(profile as any) }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                                activeTab === tab.id
                                    ? "text-accent border-accent"
                                    : "text-text-3 border-transparent hover:text-text hover:border-border"
                            )}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
                {currentTab.editable && (
                    <div className="flex items-center gap-2 pb-1">
                        {editing ? (
                            <>
                                <Button variant="secondary" size="sm" onClick={handleCancel} leftIcon={<Cross2Icon className="w-3.5 h-3.5" />}>
                                    Cancel
                                </Button>
                                <Button size="sm" onClick={handleSave} loading={saving} leftIcon={<CheckIcon className="w-3.5 h-3.5" />}>
                                    {saving ? "Saving..." : "Save"}
                                </Button>
                            </>
                        ) : (
                            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} leftIcon={<Pencil1Icon className="w-3.5 h-3.5" />} className="text-accent bg-accent/10 hover:bg-accent/20">
                                Edit
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Tab Content */}
            <Card>
                <CardContent className="p-6">
                    {activeTab === "personal" && (
                        <TabPersonal profile={profile} formData={formData} editing={editing} onChange={handleChange} />
                    )}
                    {activeTab === "accounts" && (
                        <TabAccounts profile={profile} formData={formData} editing={editing} onChange={handleChange} />
                    )}
                    {activeTab === "family" && (
                        <TabFamily profile={profile} formData={formData} editing={editing} onChange={handleChange} />
                    )}
                    {activeTab === "employment" && (
                        <TabEmployment profile={profile} formData={formData} editing={editing} onChange={handleChange} />
                    )}
                    {activeTab === "assets" && (
                        <TabAssets profile={profile} />
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

/* ══════════════════════════════════════════════════════════════
   TAB 1: PERSONAL
   ══════════════════════════════════════════════════════════════ */
function TabPersonal({ profile, formData, editing, onChange }: { profile: Profile; formData: any; editing: boolean; onChange: (n: string, v: any) => void }) {
    return (
        <>
            <FormSection title="Profile Overview">
                <FormField label="Full Name" name="_name" value={`${profile.firstName} ${profile.lastName}`} editing={false} readOnly />
                <FormField label="Employee ID" name="_code" value={profile.employeeCode} editing={false} readOnly />
                <FormField label="Company Email" name="_email" value={profile.email} editing={false} readOnly />
                <FormField label="Phone" name="phone" value={editing ? formData.phone : profile.phone} editing={editing} onChange={onChange} masked={!editing} placeholder="Enter phone number" />
                <FormField label="Date of Joining" name="_doj" value={profile.dateOfJoining} editing={false} readOnly type="date" />
                <FormField label="Location" name="location" value={editing ? formData.location : profile.location} editing={false} readOnly />
            </FormSection>

            <FormSection title="Emergency Contact">
                <FormField label="Contact Name" name="emergencyContactName" value={editing ? formData.emergencyContactName : profile.emergencyContactName} editing={editing} onChange={onChange} placeholder="e.g. Rajesh Kumar" />
                <FormField label="Contact Phone" name="emergencyContactPhone" value={editing ? formData.emergencyContactPhone : profile.emergencyContactPhone} editing={editing} onChange={onChange} placeholder="e.g. +91 98765 43210" />
                <FormField label="Relation" name="emergencyContactRelation" value={editing ? formData.emergencyContactRelation : profile.emergencyContactRelation} editing={editing} onChange={onChange} placeholder="e.g. Father, Spouse" />
            </FormSection>

            <FormSection title="Personal Details">
                <FormField label="Date of Birth" name="dateOfBirth" value={editing ? formData.dateOfBirth : profile.dateOfBirth} editing={editing} onChange={onChange} type="date" />
                <FormField label="Gender" name="gender" value={editing ? formData.gender : profile.gender} editing={editing} onChange={onChange} type="select" options={GENDERS} />
                <FormField label="Blood Group" name="bloodGroup" value={editing ? formData.bloodGroup : profile.bloodGroup} editing={editing} onChange={onChange} type="select" options={BLOOD_GROUPS} />
                <FormField label="Nationality" name="nationality" value={editing ? formData.nationality : profile.nationality} editing={editing} onChange={onChange} placeholder="e.g. Indian" />
                <FormField label="Marital Status" name="maritalStatus" value={editing ? formData.maritalStatus : profile.maritalStatus} editing={editing} onChange={onChange} type="select" options={MARITAL_STATUS} />
                <FormField label="Marriage Date" name="marriageDate" value={profile.marriageDate} editing={false} readOnly type="date" />
                <FormField label="Spouse" name="spouse" value={editing ? formData.spouse : profile.spouse} editing={editing} onChange={onChange} placeholder="Spouse name" />
                <FormField label="Father Name" name="fatherName" value={editing ? formData.fatherName : profile.fatherName} editing={editing} onChange={onChange} />
                <FormField label="Religion" name="religion" value={editing ? formData.religion : profile.religion} editing={editing} onChange={onChange} />
                <FormField label="Place of Birth" name="placeOfBirth" value={profile.placeOfBirth} editing={false} readOnly />
                <FormField label="Residential Status" name="residentialStatus" value={profile.residentialStatus} editing={false} readOnly />
                <FormField label="Hobby" name="hobby" value={profile.hobby} editing={false} readOnly />
                <FormField label="Height" name="height" value={profile.height} editing={false} readOnly />
                <FormField label="Weight" name="weight" value={profile.weight} editing={false} readOnly />
                <FormField label="Identification Mark" name="identificationMark" value={profile.identificationMark} editing={false} readOnly />
                <FormField label="Physically Challenged" name="physicallyChallenged" value={profile.physicallyChallenged} editing={false} readOnly type="toggle" />
                <FormField label="International Employee" name="internationalEmployee" value={profile.internationalEmployee} editing={false} readOnly type="toggle" />
            </FormSection>

            <FormSection title="Contact Address">
                <FormField label="Address" name="contactAddress" value={editing ? formData.contactAddress : (profile.contactAddress || profile.address)} editing={editing} onChange={onChange} span={2} placeholder="Street address" />
                <FormField label="City" name="contactCity" value={editing ? formData.contactCity : profile.contactCity} editing={editing} onChange={onChange} />
                <FormField label="State" name="contactState" value={editing ? formData.contactState : profile.contactState} editing={editing} onChange={onChange} />
                <FormField label="Pincode" name="contactPincode" value={editing ? formData.contactPincode : profile.contactPincode} editing={editing} onChange={onChange} />
            </FormSection>

            <FormSection title="Permanent Address">
                <FormField label="Address" name="permanentAddress" value={editing ? formData.permanentAddress : profile.permanentAddress} editing={editing} onChange={onChange} span={2} placeholder="Street address" />
                <FormField label="City" name="permanentCity" value={editing ? formData.permanentCity : profile.permanentCity} editing={editing} onChange={onChange} />
                <FormField label="State" name="permanentState" value={editing ? formData.permanentState : profile.permanentState} editing={editing} onChange={onChange} />
                <FormField label="Pincode" name="permanentPincode" value={editing ? formData.permanentPincode : profile.permanentPincode} editing={editing} onChange={onChange} />
            </FormSection>

            <FormSection title="Education" columns={1}>
                {profile.educations.length === 0 ? (
                    <p className="text-sm text-text-3">No education records found.</p>
                ) : (
                    <div className="space-y-4">
                        {profile.educations.map(edu => (
                            <div key={edu.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-bg-2 border border-border">
                                <FormField label="Degree" name="_" value={edu.degree} editing={false} readOnly />
                                <FormField label="Institute" name="_" value={edu.institute} editing={false} readOnly />
                                <FormField label="Duration" name="_" value={edu.duration} editing={false} readOnly />
                                <FormField label="Grade" name="_" value={edu.grade} editing={false} readOnly />
                            </div>
                        ))}
                    </div>
                )}
            </FormSection>
        </>
    )
}

/* ══════════════════════════════════════════════════════════════
   TAB 2: ACCOUNTS & STATUTORY
   ══════════════════════════════════════════════════════════════ */

/* ─── Doc Upload Field ─── */
function DocUploadField({ label, docType, doc, onUpload, onDelete, mandatory }: {
    label: string; docType: string; doc: any; onUpload: (docType: string, file: File) => void
    onDelete: (docId: string) => void; mandatory?: boolean
}) {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = React.useState(false)

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        await onUpload(docType, file)
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ""
    }

    return (
        <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider flex items-center gap-1">
                {label}
                {mandatory && <span className="text-danger text-sm">*</span>}
            </span>

            {doc ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-bg-2">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{
                        background: doc.url?.endsWith('.pdf') ? 'rgba(255,59,48,0.1)' : 'rgba(52,199,89,0.1)'
                    }}>
                        {doc.url?.endsWith('.pdf') ? '📄' : '🖼️'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text truncate">{doc.title}</div>
                        <div className="text-[11px] text-text-4">{doc.size} · Uploaded {new Date(doc.uploadDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-md hover:bg-bg transition-colors text-accent" title="View">
                            <EyeOpenIcon className="w-4 h-4" />
                        </a>
                        <button onClick={() => onDelete(doc.id)}
                            className="p-1.5 rounded-md hover:bg-danger/10 transition-colors text-danger" title="Remove">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className={cn(
                        "flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed transition-colors text-sm font-medium",
                        uploading
                            ? "border-accent bg-accent/5 text-accent cursor-wait"
                            : "border-border hover:border-accent text-text-3 hover:text-accent cursor-pointer"
                    )}
                >
                    {uploading ? (
                        <>
                            <Spinner size="sm" className="text-accent" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <PlusIcon className="w-4 h-4" />
                            Upload {label}
                        </>
                    )}
                </button>
            )}

            <input
                ref={inputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFile}
                className="hidden"
            />
            {!doc && <span className="text-[10px] text-text-4">PDF, JPG, or PNG · Max 5MB</span>}
        </div>
    )
}

function TabAccounts({ profile, formData, editing, onChange }: { profile: Profile; formData: any; editing: boolean; onChange: (n: string, v: any) => void }) {
    const [docs, setDocs] = React.useState<Record<string, any>>({})

    React.useEffect(() => {
        api.get('/documents/')
            .then(({ data }) => {
                const items = (data as any)?.results || (Array.isArray(data) ? data : [])
                const grouped: Record<string, any> = {}
                for (const doc of items) {
                    // Match KYC docs by title prefix (e.g. "aadhaar - file.pdf" → key "aadhaar")
                    const titleKey = (doc.title || "").split(" - ")[0].toLowerCase().trim()
                    const key = titleKey && ["aadhaar", "pan", "bank_proof"].includes(titleKey)
                        ? titleKey
                        : doc.category || doc.title || ""
                    if (key) grouped[key] = { ...doc, url: doc.url || doc.fileUrl }
                }
                setDocs(grouped)
            })
            .catch(() => { })
    }, [])

    const handleUpload = async (docType: string, file: File) => {
        const fd = new FormData()
        fd.append("file", file)
        fd.append("bucket", "documents")
        try {
            // Step 1: Upload file to storage
            const res = await fetch("/api/upload", { method: "POST", body: fd })
            if (!res.ok) {
                const err = await res.json()
                toast.error(err.error || "Upload failed")
                return
            }
            const uploaded = await res.json()

            // Step 2: Create document record in Django
            const categoryMap: Record<string, string> = {
                aadhaar: "ID_PROOF", pan: "ID_PROOF", bank_proof: "OTHER",
            }
            const doc = {
                title: `${docType} - ${file.name}`,
                fileUrl: uploaded.url,
                fileType: file.type,
                size: file.size,
                category: categoryMap[docType] || "OTHER",
                isPublic: false,
            }
            try {
                const { data: saved } = await api.post('/documents/', doc) as any
                const displayDoc = {
                    id: saved?.id || `temp-${Date.now()}`,
                    title: file.name,
                    url: uploaded.url,
                    size: `${(file.size / 1024).toFixed(1)} KB`,
                    uploadDate: new Date().toISOString(),
                }
                setDocs(prev => ({ ...prev, [docType]: displayDoc }))
            } catch {
                setDocs(prev => ({ ...prev, [docType]: {
                    id: `temp-${Date.now()}`, title: file.name, url: uploaded.url,
                    size: `${(file.size / 1024).toFixed(1)} KB`, uploadDate: new Date().toISOString(),
                } }))
            }
            toast.success(`${file.name} uploaded successfully`)
        } catch {
            toast.error("Upload failed")
        }
    }

    const handleDelete = async (docId: string) => {
        try {
            await api.delete(`/documents/${docId}/`)
            setDocs(prev => {
                const next = { ...prev }
                for (const key of Object.keys(next)) {
                    if (next[key]?.id === docId) delete next[key]
                }
                return next
            })
            toast.success("Document removed")
        } catch {
            toast.error("Failed to remove document")
        }
    }

    return (
        <>
            <FormSection title="Bank Account">
                <FormField label="Bank Name" name="bankName" value={editing ? formData.bankName : profile.bankName} editing={editing} onChange={onChange} placeholder="e.g. State Bank of India" />
                <FormField label="Account Number" name="bankAccountNumber" value={editing ? formData.bankAccountNumber : profile.bankAccountNumber} editing={editing} onChange={onChange} masked={!editing} placeholder="Account number" />
                <FormField label="Branch" name="bankBranch" value={editing ? formData.bankBranch : profile.bankBranch} editing={editing} onChange={onChange} />
                <FormField label="IFSC Code" name="ifscCode" value={editing ? formData.ifscCode : profile.ifscCode} editing={editing} onChange={onChange} placeholder="e.g. SBIN0001234" />
            </FormSection>

            <FormSection title="Bank Proof Document" columns={1}>
                <DocUploadField label="Bank Proof" docType="bank_proof" doc={docs.bank_proof} onUpload={handleUpload} onDelete={handleDelete} mandatory />
            </FormSection>

            <FormSection title="PF Account">
                <FormField label="PF Account Number" name="pfAccountNumber" value={editing ? formData.pfAccountNumber : profile.pfAccountNumber} editing={editing} onChange={onChange} masked={!editing} placeholder="PF/UAN number" />
            </FormSection>

            <FormSection title="Government IDs" columns={2}>
                <FormField label="Aadhaar Number" name="aadhaarNumber" value={editing ? formData.aadhaarNumber : profile.aadhaarNumber} editing={editing} onChange={onChange} masked={!editing} placeholder="12-digit Aadhaar" />
                <FormField label="PAN Number" name="panNumber" value={editing ? formData.panNumber : profile.panNumber} editing={editing} onChange={onChange} masked={!editing} placeholder="e.g. ABCDE1234F" />
            </FormSection>

            <FormSection title="KYC Documents" columns={2}>
                <DocUploadField label="Aadhaar Card" docType="aadhaar" doc={docs.aadhaar} onUpload={handleUpload} onDelete={handleDelete} mandatory />
                <DocUploadField label="PAN Card" docType="pan" doc={docs.pan} onUpload={handleUpload} onDelete={handleDelete} mandatory />
            </FormSection>
        </>
    )
}

/* ══════════════════════════════════════════════════════════════
   TAB 3: FAMILY
   ══════════════════════════════════════════════════════════════ */
function TabFamily({ profile, formData, editing, onChange }: { profile: Profile; formData: any; editing: boolean; onChange: (n: string, v: any) => void }) {
    return (
        <>
            <FormSection title="Father Details">
                <FormField label="Name" name="fatherName" value={editing ? formData.fatherName : profile.fatherName} editing={editing} onChange={onChange} />
                <FormField label="Date of Birth" name="fatherDob" value={profile.fatherDob} editing={false} readOnly type="date" />
                <FormField label="Blood Group" name="fatherBloodGroup" value={profile.fatherBloodGroup} editing={false} readOnly />
                <FormField label="Gender" name="fatherGender" value={profile.fatherGender} editing={false} readOnly />
                <FormField label="Nationality" name="fatherNationality" value={profile.fatherNationality} editing={false} readOnly />
            </FormSection>

            <FormSection title="Emergency Contact">
                <FormField label="Name" name="emergencyContactName" value={editing ? formData.emergencyContactName : profile.emergencyContactName} editing={editing} onChange={onChange} />
                <FormField label="Phone" name="emergencyContactPhone" value={editing ? formData.emergencyContactPhone : profile.emergencyContactPhone} editing={editing} onChange={onChange} />
                <FormField label="Relation" name="emergencyContactRelation" value={editing ? formData.emergencyContactRelation : profile.emergencyContactRelation} editing={editing} onChange={onChange} placeholder="e.g. Father, Spouse" />
            </FormSection>

            <FormSection title="Passport">
                <FormField label="Passport Number" name="passportNumber" value={editing ? formData.passportNumber : profile.passportNumber} editing={editing} onChange={onChange} masked={!editing} />
                <FormField label="Expiry Date" name="passportExpiry" value={editing ? formData.passportExpiry : profile.passportExpiry} editing={editing} onChange={onChange} type="date" />
            </FormSection>

            <FormSection title="Visa">
                <FormField label="Visa Type" name="visaNumber" value={editing ? formData.visaNumber : profile.visaNumber} editing={editing} onChange={onChange} placeholder="e.g. H1B, Work Permit" />
                <FormField label="Expiry Date" name="visaExpiry" value={editing ? formData.visaExpiry : profile.visaExpiry} editing={editing} onChange={onChange} type="date" />
            </FormSection>
        </>
    )
}

/* ══════════════════════════════════════════════════════════════
   TAB 4: EMPLOYMENT & JOB (read-only)
   ══════════════════════════════════════════════════════════════ */
function TabEmployment({ profile, formData, editing, onChange }: { profile: Profile; formData: any; editing: boolean; onChange: (n: string, v: any) => void }) {
    return (
        <>
            <div className="rounded-xl bg-accent/5 border border-accent/15 p-5 mb-6">
                <h4 className="text-xs font-bold text-accent uppercase tracking-widest mb-4">Current Position</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-5">
                    <FormField label="Category" name="_" value={profile.category} editing={false} readOnly />
                    <FormField label="Cost Center" name="_" value={profile.costCenter} editing={false} readOnly />
                    <FormField label="Department" name="_" value={profile.department.name} editing={false} readOnly />
                    <FormField label="Designation" name="_" value={profile.designation} editing={false} readOnly />
                    <FormField label="Division" name="_" value={profile.division} editing={false} readOnly />
                    <FormField label="Grade" name="_" value={profile.grade} editing={false} readOnly />
                    <FormField label="Location" name="_" value={profile.location} editing={false} readOnly />
                    <FormField label="Date of Joining" name="_" value={profile.dateOfJoining} editing={false} readOnly type="date" />
                    <FormField label="Status" name="_" value={profile.status} editing={false} readOnly />
                </div>

                {profile.manager && (
                    <>
                        <hr className="border-accent/15 my-5" />
                        <h4 className="text-xs font-bold text-text-3 uppercase tracking-widest mb-3">Reporting Manager</h4>
                        <p className="text-sm font-semibold text-text">
                            {profile.manager.firstName} {profile.manager.lastName}
                            <span className="text-xs text-text-3 font-normal ml-2">({profile.manager.designation})</span>
                        </p>
                    </>
                )}
            </div>

            <FormSection title="Previous Employment">
                <FormField label="Previous Employer" name="previousEmployment" value={editing ? formData.previousEmployment : profile.previousEmployment} editing={editing} onChange={onChange} placeholder="e.g. Infosys Ltd" />
                <FormField label="Previous Experience (Years)" name="previousExperienceYears" value={editing ? formData.previousExperienceYears : profile.previousExperienceYears} editing={editing} onChange={onChange} placeholder="e.g. 3.5" />
                <FormField label="Total Experience (Years)" name="totalExperienceYears" value={editing ? formData.totalExperienceYears : profile.totalExperienceYears} editing={editing} onChange={onChange} placeholder="e.g. 5.0" />
            </FormSection>
        </>
    )
}

/* ══════════════════════════════════════════════════════════════
   TAB 5: ASSETS (read-only)
   ══════════════════════════════════════════════════════════════ */
function TabAssets({ profile }: { profile: Profile }) {
    if (profile.assets.length === 0) {
        return <EmptyState title="No assets assigned" className="py-4" />
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.assets.map(asset => (
                <div key={asset.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-bg-2 hover:bg-bg transition-colors">
                    <div className="w-11 h-11 rounded-lg bg-accent/10 flex items-center justify-center text-xl shrink-0">
                        {asset.type === "HARDWARE" ? "💻" : asset.type === "SOFTWARE" ? "📦" : "🔌"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-text truncate">{asset.name}</div>
                        <div className="text-[11px] text-text-3">S/N: {asset.serialNumber}</div>
                        {asset.assignedDate && <div className="text-[10px] text-text-4 mt-0.5">Assigned {fmtDate(asset.assignedDate)}</div>}
                    </div>
                    <Badge
                        variant={asset.status === "ASSIGNED" ? "success" : "warning"}
                        size="sm"
                        className="uppercase shrink-0"
                    >
                        {asset.status}
                    </Badge>
                </div>
            ))}
        </div>
    )
}
