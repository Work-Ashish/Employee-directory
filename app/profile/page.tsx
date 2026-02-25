"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import { toast } from "sonner"
import {
    PersonIcon, IdCardIcon, HomeIcon, BackpackIcon, LaptopIcon,
    EyeOpenIcon, EyeClosedIcon, Pencil1Icon, CheckIcon, Cross2Icon,
    ReaderIcon, PlusIcon, TrashIcon
} from "@radix-ui/react-icons"

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
    category?: string; costCenter?: string; division?: string; grade?: string; location?: string; previousEmployment?: string
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
                <span className="text-[11px] font-semibold text-[var(--text3)] uppercase tracking-[0.08em]">{label}</span>
                <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-[var(--text)]">{display}</span>
                    {masked && value && (
                        <button onClick={() => setShowMasked(!showMasked)} className="text-[var(--text4)] hover:text-[var(--text)] transition-colors">
                            {showMasked ? <EyeClosedIcon className="w-3.5 h-3.5" /> : <EyeOpenIcon className="w-3.5 h-3.5" />}
                        </button>
                    )}
                </div>
            </div>
        )
    }

    // ─── Edit mode ───
    const inputCls = "w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] placeholder-[var(--text4)] outline-none transition-all focus:border-[var(--accent)] focus:shadow-[0_0_0_2px_var(--glow)]"

    return (
        <div className={cn("flex flex-col gap-1.5", span === 2 && "md:col-span-2")}>
            <label className="text-[11px] font-semibold text-[var(--text3)] uppercase tracking-[0.08em]">{label}</label>
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
                    className={cn("w-11 h-6 rounded-full transition-colors relative", value ? "bg-[var(--accent)]" : "bg-[var(--border)]")}
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
            <h4 className="text-[12px] font-bold text-[var(--accent)] uppercase tracking-[0.1em] mb-4 pb-2 border-b border-[var(--border)]">{title}</h4>
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
    { id: "employment", label: "Employment & Job", icon: <BackpackIcon className="w-4 h-4" />, editable: false },
    { id: "assets", label: "Assets", icon: <LaptopIcon className="w-4 h-4" />, editable: false },
]

/* ─────────────────── Main Page ─────────────────── */
export default function ProfilePage() {
    const { user } = useAuth()
    const [profile, setProfile] = React.useState<Profile | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [activeTab, setActiveTab] = React.useState("personal")
    const [editing, setEditing] = React.useState(false)
    const [formData, setFormData] = React.useState<Record<string, any>>({})
    const [saving, setSaving] = React.useState(false)

    React.useEffect(() => {
        fetch("/api/employee/profile")
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => { setProfile(data); setFormData(data) })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const handleChange = (name: string, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch("/api/employee/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })
            if (!res.ok) throw new Error()
            const updated = await res.json()
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
                <div className="animate-spin w-8 h-8 border-[3px] border-[var(--accent)] border-t-transparent rounded-full" />
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="text-[60px]">🔒</div>
                <h2 className="text-[18px] font-bold text-[var(--text)]">Profile Not Found</h2>
                <p className="text-[13px] text-[var(--text3)]">Your employee profile is not linked. Contact your administrator.</p>
            </div>
        )
    }

    const fullName = `${profile.firstName} ${profile.lastName}`
    const initials = `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()

    return (
        <div className="max-w-[1000px] mx-auto p-6 space-y-6">
            {/* ═══ Header Card ═══ */}
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
                <div className="flex items-center gap-5">
                    <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-[var(--accent)] to-[#5856d6] flex items-center justify-center text-[22px] font-bold text-white shrink-0 overflow-hidden shadow-lg">
                        {profile.avatarUrl ? (
                            <img src={profile.avatarUrl} className="w-full h-full object-cover" alt="avatar" />
                        ) : initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-[22px] font-extrabold text-[var(--text)] tracking-tight">{fullName}</h1>
                        <p className="text-[13px] text-[var(--text3)] mt-0.5">{profile.designation} · {profile.department.name}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] font-mono text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-md">{profile.employeeCode}</span>
                            <span className="text-[11px] text-[var(--text4)]">Joined {fmtDate(profile.dateOfJoining)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ Tab Bar + Edit Button ═══ */}
            <div className="flex items-center justify-between border-b border-[var(--border)]">
                <div className="flex gap-0 overflow-x-auto">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setEditing(false); setFormData(profile as any) }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-[13px] font-medium border-b-2 transition-all whitespace-nowrap",
                                activeTab === tab.id
                                    ? "text-[var(--accent)] border-[var(--accent)]"
                                    : "text-[var(--text3)] border-transparent hover:text-[var(--text)] hover:border-[var(--border)]"
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
                                <button onClick={handleCancel} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[var(--text3)] bg-[var(--bg2)] rounded-lg hover:bg-[var(--border)] transition-colors">
                                    <Cross2Icon className="w-3.5 h-3.5" /> Cancel
                                </button>
                                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-[var(--accent)] rounded-lg hover:brightness-110 transition-all disabled:opacity-50">
                                    <CheckIcon className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[var(--accent)] bg-[var(--accent)]/10 rounded-lg hover:bg-[var(--accent)]/20 transition-colors">
                                <Pencil1Icon className="w-3.5 h-3.5" /> Edit
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ═══ Tab Content ═══ */}
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
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
                    <TabEmployment profile={profile} />
                )}
                {activeTab === "assets" && (
                    <TabAssets profile={profile} />
                )}
            </div>
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

            <FormSection title="Personal Details">
                <FormField label="Date of Birth" name="dateOfBirth" value={editing ? formData.dateOfBirth : profile.dateOfBirth} editing={editing} onChange={onChange} type="date" />
                <FormField label="Gender" name="gender" value={editing ? formData.gender : profile.gender} editing={editing} onChange={onChange} type="select" options={GENDERS} />
                <FormField label="Blood Group" name="bloodGroup" value={editing ? formData.bloodGroup : profile.bloodGroup} editing={editing} onChange={onChange} type="select" options={BLOOD_GROUPS} />
                <FormField label="Nationality" name="nationality" value={editing ? formData.nationality : profile.nationality} editing={editing} onChange={onChange} placeholder="e.g. Indian" />
                <FormField label="Marital Status" name="maritalStatus" value={editing ? formData.maritalStatus : profile.maritalStatus} editing={editing} onChange={onChange} type="select" options={MARITAL_STATUS} />
                <FormField label="Marriage Date" name="marriageDate" value={editing ? formData.marriageDate : profile.marriageDate} editing={editing} onChange={onChange} type="date" />
                <FormField label="Spouse" name="spouse" value={editing ? formData.spouse : profile.spouse} editing={editing} onChange={onChange} placeholder="Spouse name" />
                <FormField label="Father Name" name="fatherName" value={editing ? formData.fatherName : profile.fatherName} editing={editing} onChange={onChange} />
                <FormField label="Religion" name="religion" value={editing ? formData.religion : profile.religion} editing={editing} onChange={onChange} />
                <FormField label="Place of Birth" name="placeOfBirth" value={editing ? formData.placeOfBirth : profile.placeOfBirth} editing={editing} onChange={onChange} />
                <FormField label="Residential Status" name="residentialStatus" value={editing ? formData.residentialStatus : profile.residentialStatus} editing={editing} onChange={onChange} />
                <FormField label="Hobby" name="hobby" value={editing ? formData.hobby : profile.hobby} editing={editing} onChange={onChange} />
                <FormField label="Height" name="height" value={editing ? formData.height : profile.height} editing={editing} onChange={onChange} placeholder="e.g. 5'10&quot;" />
                <FormField label="Weight" name="weight" value={editing ? formData.weight : profile.weight} editing={editing} onChange={onChange} placeholder="e.g. 70kg" />
                <FormField label="Identification Mark" name="identificationMark" value={editing ? formData.identificationMark : profile.identificationMark} editing={editing} onChange={onChange} />
                <FormField label="Physically Challenged" name="physicallyChallenged" value={editing ? formData.physicallyChallenged : profile.physicallyChallenged} editing={editing} onChange={onChange} type="toggle" />
                <FormField label="International Employee" name="internationalEmployee" value={editing ? formData.internationalEmployee : profile.internationalEmployee} editing={editing} onChange={onChange} type="toggle" />
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
                    <p className="text-[13px] text-[var(--text3)]">No education records found.</p>
                ) : (
                    <div className="space-y-4">
                        {profile.educations.map(edu => (
                            <div key={edu.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-[var(--bg2)] border border-[var(--border)]">
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
            <span className="text-[11px] font-semibold text-[var(--text3)] uppercase tracking-[0.08em] flex items-center gap-1">
                {label}
                {mandatory && <span className="text-[var(--red)] text-[13px]">*</span>}
            </span>

            {doc ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)]">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[18px]" style={{
                        background: doc.url?.endsWith('.pdf') ? 'rgba(255,59,48,0.1)' : 'rgba(52,199,89,0.1)'
                    }}>
                        {doc.url?.endsWith('.pdf') ? '📄' : '🖼️'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[var(--text)] truncate">{doc.title}</div>
                        <div className="text-[11px] text-[var(--text4)]">{doc.size} · Uploaded {new Date(doc.uploadDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-md hover:bg-[var(--bg)] transition-colors text-[var(--accent)]" title="View">
                            <EyeOpenIcon className="w-4 h-4" />
                        </a>
                        <button onClick={() => onDelete(doc.id)}
                            className="p-1.5 rounded-md hover:bg-[rgba(255,59,48,0.1)] transition-colors text-[var(--red)]" title="Remove">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className={cn(
                        "flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed transition-colors text-[13px] font-medium",
                        uploading
                            ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)] cursor-wait"
                            : "border-[var(--border)] hover:border-[var(--accent)] text-[var(--text3)] hover:text-[var(--accent)] cursor-pointer"
                    )}
                >
                    {uploading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
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
            {!doc && <span className="text-[10px] text-[var(--text4)]">PDF, JPG, or PNG · Max 5MB</span>}
        </div>
    )
}

function TabAccounts({ profile, formData, editing, onChange }: { profile: Profile; formData: any; editing: boolean; onChange: (n: string, v: any) => void }) {
    const [docs, setDocs] = React.useState<Record<string, any>>({})

    React.useEffect(() => {
        fetch("/api/employee/documents")
            .then(r => r.ok ? r.json() : {})
            .then(setDocs)
            .catch(() => { })
    }, [])

    const handleUpload = async (docType: string, file: File) => {
        const fd = new FormData()
        fd.append("file", file)
        fd.append("docType", docType)
        try {
            const res = await fetch("/api/employee/documents", { method: "POST", body: fd })
            if (!res.ok) {
                const err = await res.json()
                toast.error(err.error || "Upload failed")
                return
            }
            const doc = await res.json()
            setDocs(prev => ({ ...prev, [docType]: doc }))
            toast.success(`${doc.title} uploaded successfully`)
        } catch {
            toast.error("Upload failed")
        }
    }

    const handleDelete = async (docId: string) => {
        try {
            const res = await fetch(`/api/employee/documents?id=${docId}`, { method: "DELETE" })
            if (!res.ok) throw new Error()
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
                <FormField label="Date of Birth" name="fatherDob" value={editing ? formData.fatherDob : profile.fatherDob} editing={editing} onChange={onChange} type="date" />
                <FormField label="Blood Group" name="fatherBloodGroup" value={editing ? formData.fatherBloodGroup : profile.fatherBloodGroup} editing={editing} onChange={onChange} type="select" options={BLOOD_GROUPS} />
                <FormField label="Gender" name="fatherGender" value={editing ? formData.fatherGender : profile.fatherGender} editing={editing} onChange={onChange} type="select" options={GENDERS} />
                <FormField label="Nationality" name="fatherNationality" value={editing ? formData.fatherNationality : profile.fatherNationality} editing={editing} onChange={onChange} />
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
                <FormField label="Visa Number" name="visaNumber" value={editing ? formData.visaNumber : profile.visaNumber} editing={editing} onChange={onChange} masked={!editing} />
                <FormField label="Expiry Date" name="visaExpiry" value={editing ? formData.visaExpiry : profile.visaExpiry} editing={editing} onChange={onChange} type="date" />
            </FormSection>
        </>
    )
}

/* ══════════════════════════════════════════════════════════════
   TAB 4: EMPLOYMENT & JOB (read-only)
   ══════════════════════════════════════════════════════════════ */
function TabEmployment({ profile }: { profile: Profile }) {
    return (
        <>
            <div className="rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/15 p-5 mb-6">
                <h4 className="text-[12px] font-bold text-[var(--accent)] uppercase tracking-[0.1em] mb-4">Current Position</h4>
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
                        <hr className="border-[var(--accent)]/15 my-5" />
                        <h4 className="text-[12px] font-bold text-[var(--text3)] uppercase tracking-[0.1em] mb-3">Reporting Manager</h4>
                        <p className="text-[14px] font-semibold text-[var(--text)]">
                            {profile.manager.firstName} {profile.manager.lastName}
                            <span className="text-[12px] text-[var(--text3)] font-normal ml-2">({profile.manager.designation})</span>
                        </p>
                    </>
                )}
            </div>

            <FormSection title="Previous Employment" columns={1}>
                <p className="text-[14px] text-[var(--text)]">{profile.previousEmployment || "N/A"}</p>
            </FormSection>
        </>
    )
}

/* ══════════════════════════════════════════════════════════════
   TAB 5: ASSETS (read-only)
   ══════════════════════════════════════════════════════════════ */
function TabAssets({ profile }: { profile: Profile }) {
    if (profile.assets.length === 0) {
        return <p className="text-[13px] text-[var(--text3)] py-4">No assets assigned.</p>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.assets.map(asset => (
                <div key={asset.id} className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg2)] hover:bg-[var(--bg)] transition-colors">
                    <div className="w-11 h-11 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[20px] shrink-0">
                        {asset.type === "HARDWARE" ? "💻" : asset.type === "SOFTWARE" ? "📦" : "🔌"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-[var(--text)] truncate">{asset.name}</div>
                        <div className="text-[11px] text-[var(--text3)]">S/N: {asset.serialNumber}</div>
                        {asset.assignedDate && <div className="text-[10px] text-[var(--text4)] mt-0.5">Assigned {fmtDate(asset.assignedDate)}</div>}
                    </div>
                    <span className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shrink-0",
                        asset.status === "ASSIGNED" ? "bg-[var(--green)]/10 text-[var(--green)]" : "bg-[var(--amber)]/10 text-[var(--amber)]"
                    )}>
                        {asset.status}
                    </span>
                </div>
            ))}
        </div>
    )
}
