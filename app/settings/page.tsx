"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { PersonIcon, LockClosedIcon, BlendingModeIcon } from "@radix-ui/react-icons"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { Card, CardContent, CardTitle } from "@/components/ui/Card"
import { PageHeader } from "@/components/ui/PageHeader"
import { Spinner } from "@/components/ui/Spinner"

const profileSchema = z.object({
    name: z.string().min(1, "Name is required"),
    bio: z.string().optional(),
    accentColor: z.string().optional(),
})

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

export default function SettingsPage() {
    const { theme, setTheme } = useTheme()
    const [isLoading, setIsLoading] = React.useState(true)
    const [user, setUser] = React.useState<any>(null)

    const profileForm = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: "",
            bio: "",
            accentColor: "blue",
        },
    })

    const passwordForm = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    })

    const fetchUser = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const res = await fetch("/api/user/profile")
            if (res.ok) {
                const data = await res.json()
                setUser(data)
                profileForm.reset({
                    name: data.name || "",
                    bio: data.bio || "",
                    accentColor: data.accentColor || "blue",
                })
                if (data.accentColor) {
                    applyAccentColor(data.accentColor)
                }
            }
        } catch (error) {
            console.error("Fetch user error:", error)
            toast.error("Failed to load settings")
        } finally {
            setIsLoading(false)
        }
    }, [profileForm])

    React.useEffect(() => {
        fetchUser()
    }, [fetchUser])

    const applyAccentColor = (color: string) => {
        const colors: Record<string, string> = {
            blue: '#007aff',
            purple: '#af52de',
            pink: '#ff2d55',
            amber: '#ff9500',
            green: '#34c759',
            cyan: '#5ac8fa',
        }
        const hex = colors[color] || colors.blue
        document.documentElement.style.setProperty('--accent', hex)
        document.documentElement.style.setProperty('--glow', `${hex}20`)

        // Convert hex to rgb for rgba usage
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`)
    }

    const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
        try {
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...data, avatar: user?.avatar }),
            })
            if (res.ok) {
                toast.success("Profile updated successfully")
                fetchUser()
            } else {
                toast.error("Failed to update profile")
            }
        } catch (error) {
            toast.error("An error occurred")
        }
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
            toast.loading("Uploading avatar...", { id: "avatar-upload" })
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData
            })

            if (res.ok) {
                const { url } = await res.json()
                // Update profile with the new avatar URL
                const updateRes = await fetch("/api/user/profile", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...profileForm.getValues(), avatar: url })
                })

                if (updateRes.ok) {
                    toast.success("Avatar updated successfully", { id: "avatar-upload" })
                    fetchUser()
                } else {
                    toast.error("Failed to save avatar reference", { id: "avatar-upload" })
                }
            } else {
                toast.error("Failed to upload image", { id: "avatar-upload" })
            }
        } catch (error) {
            toast.error("An error occurred during upload", { id: "avatar-upload" })
        }
    }

    const onPasswordSubmit = async (data: z.infer<typeof passwordSchema>) => {
        try {
            const res = await fetch("/api/user/password", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword: data.currentPassword,
                    newPassword: data.newPassword,
                }),
            })
            if (res.ok) {
                toast.success("Password updated successfully")
                passwordForm.reset()
            } else {
                const err = await res.json()
                toast.error(err.error || "Failed to update password")
            }
        } catch (error) {
            toast.error("An error occurred")
        }
    }

    const handleColorChange = async (color: string) => {
        applyAccentColor(color)
        profileForm.setValue('accentColor', color)
        // Auto-save accent color
        try {
            await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...profileForm.getValues(), accentColor: color }),
            })
            toast.success(`Theme updated to ${color}`)
        } catch (error) {
            console.error("Color update error:", error)
        }
    }

    if (isLoading) {
        return <div className="p-10 text-center text-text-3">Loading settings...</div>
    }

    return (
        <div className="space-y-6 animate-page-in max-w-4xl mx-auto">
            <PageHeader title="Settings" description="Manage your profile and preferences" />

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="flex gap-2 mb-8 w-fit">
                    <TabsTrigger value="profile" className="flex items-center gap-2">
                        <PersonIcon /> Profile
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2">
                        <LockClosedIcon /> Security
                    </TabsTrigger>
                    <TabsTrigger value="appearance" className="flex items-center gap-2">
                        <BlendingModeIcon /> Appearance
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6">
                    <Card variant="glass">
                        <CardContent className="p-6">
                            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                                <CardTitle className="mb-6">Personal Information</CardTitle>

                                <div className="flex items-start gap-6 mb-8">
                                    <div className="relative group">
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-[#5856d6] flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0 overflow-hidden">
                                            {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user?.name?.substring(0, 2).toUpperCase() || "AD"}
                                        </div>
                                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-full">
                                            CHANGE
                                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                        </label>
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <Input
                                            label="Full Name"
                                            {...profileForm.register('name')}
                                            error={profileForm.formState.errors.name?.message}
                                        />
                                        <Textarea
                                            label="Bio"
                                            {...profileForm.register('bio')}
                                            className="h-24 resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-border">
                                    <Button type="submit" loading={profileForm.formState.isSubmitting}>
                                        {profileForm.formState.isSubmitting ? "Saving..." : "Save Changes"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                    <Card variant="glass">
                        <CardContent className="p-6">
                            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                                <CardTitle className="mb-6">Change Password</CardTitle>
                                <div className="space-y-4 max-w-md">
                                    <Input
                                        label="Current Password"
                                        type="password"
                                        {...passwordForm.register('currentPassword')}
                                        error={passwordForm.formState.errors.currentPassword?.message}
                                    />
                                    <Input
                                        label="New Password"
                                        type="password"
                                        {...passwordForm.register('newPassword')}
                                        error={passwordForm.formState.errors.newPassword?.message}
                                    />
                                    <Input
                                        label="Confirm New Password"
                                        type="password"
                                        {...passwordForm.register('confirmPassword')}
                                        error={passwordForm.formState.errors.confirmPassword?.message}
                                    />
                                </div>
                                <div className="flex justify-start mt-6">
                                    <Button type="submit" loading={passwordForm.formState.isSubmitting}>
                                        {passwordForm.formState.isSubmitting ? "Updating..." : "Update Password"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="appearance" className="space-y-6">
                    <Card variant="glass">
                        <CardContent className="p-6">
                            <CardTitle className="mb-6">Theme Preferences</CardTitle>

                            <div className="grid gap-8">
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-text">Mode</label>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setTheme('light')}
                                            className={cn(
                                                "flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all",
                                                theme === 'light' ? "border-accent bg-[rgba(var(--accent-rgb),0.05)]" : "border-border hover:border-border-2"
                                            )}
                                        >
                                            <span className="text-sm font-medium">Light</span>
                                        </button>
                                        <button
                                            onClick={() => setTheme('dark')}
                                            className={cn(
                                                "flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all",
                                                theme === 'dark' ? "border-accent bg-[rgba(var(--accent-rgb),0.05)]" : "border-border hover:border-border-2"
                                            )}
                                        >
                                            <span className="text-sm font-medium">Dark</span>
                                        </button>
                                        <button
                                            onClick={() => setTheme('system')}
                                            className={cn(
                                                "flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all",
                                                theme === 'system' ? "border-accent bg-[rgba(var(--accent-rgb),0.05)]" : "border-border hover:border-border-2"
                                            )}
                                        >
                                            <span className="text-sm font-medium">System</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-text">Accent Color</label>
                                    <div className="flex gap-3 flex-wrap">
                                        {[
                                            { name: 'blue', hex: '#007aff' },
                                            { name: 'purple', hex: '#af52de' },
                                            { name: 'pink', hex: '#ff2d55' },
                                            { name: 'amber', hex: '#ff9500' },
                                            { name: 'green', hex: '#34c759' },
                                            { name: 'cyan', hex: '#5ac8fa' },
                                        ].map((c) => (
                                            <button
                                                key={c.name}
                                                onClick={() => handleColorChange(c.name)}
                                                className={cn(
                                                    "w-8 h-8 rounded-full shadow-sm transition-transform hover:scale-110 border-2",
                                                    profileForm.watch('accentColor') === c.name ? "border-text" : "border-transparent"
                                                )}
                                                style={{ background: c.hex }}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-text-3 italic mt-2">Accent color is saved to your profile.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
