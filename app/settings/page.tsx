"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { PersonIcon, LockClosedIcon, BlendingModeIcon } from "@radix-ui/react-icons"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

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
                body: JSON.stringify(data),
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
        return <div className="p-10 text-center text-[var(--text3)]">Loading settings...</div>
    }

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)] max-w-4xl mx-auto">
            <div className="mb-[26px]">
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Settings</h1>
                <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Manage your profile and preferences</p>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="flex gap-2 mb-8 bg-[var(--bg2)] p-1 rounded-xl w-fit">
                    <TabsTrigger
                        value="profile"
                        className="px-4 py-2 rounded-[9px] text-[13px] font-medium transition-all data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--text)] data-[state=active]:shadow-sm text-[var(--text3)] flex items-center gap-2"
                    >
                        <PersonIcon /> Profile
                    </TabsTrigger>
                    <TabsTrigger
                        value="security"
                        className="px-4 py-2 rounded-[9px] text-[13px] font-medium transition-all data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--text)] data-[state=active]:shadow-sm text-[var(--text3)] flex items-center gap-2"
                    >
                        <LockClosedIcon /> Security
                    </TabsTrigger>
                    <TabsTrigger
                        value="appearance"
                        className="px-4 py-2 rounded-[9px] text-[13px] font-medium transition-all data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--text)] data-[state=active]:shadow-sm text-[var(--text3)] flex items-center gap-2"
                    >
                        <BlendingModeIcon /> Appearance
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6 animate-[fadeSlide_0.3s_both]">
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="glass p-6">
                        <h2 className="text-[16px] font-bold text-[var(--text)] mb-6">Personal Information</h2>

                        <div className="flex items-start gap-6 mb-8">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#5856d6] flex items-center justify-center text-white text-[24px] font-bold shadow-lg shrink-0">
                                {user?.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" /> : user?.name?.substring(0, 2).toUpperCase() || "AD"}
                            </div>
                            <div className="flex-1 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-medium text-[var(--text3)]">Full Name</label>
                                    <input
                                        {...profileForm.register('name')}
                                        type="text"
                                        className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[13px] focus:border-[var(--accent)] outline-none"
                                    />
                                    {profileForm.formState.errors.name && <p className="text-[11px] text-[var(--red)]">{profileForm.formState.errors.name.message}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-medium text-[var(--text3)]">Bio</label>
                                    <textarea
                                        {...profileForm.register('bio')}
                                        className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[13px] focus:border-[var(--accent)] outline-none h-24 resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-[var(--border)]">
                            <button
                                type="submit"
                                disabled={profileForm.formState.isSubmitting}
                                className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[13px] font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                                {profileForm.formState.isSubmitting ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </TabsContent>

                <TabsContent value="security" className="space-y-6 animate-[fadeSlide_0.3s_both]">
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="glass p-6">
                        <h2 className="text-[16px] font-bold text-[var(--text)] mb-6">Change Password</h2>
                        <div className="space-y-4 max-w-md">
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-medium text-[var(--text3)]">Current Password</label>
                                <input
                                    {...passwordForm.register('currentPassword')}
                                    type="password"
                                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[13px] focus:border-[var(--accent)] outline-none"
                                />
                                {passwordForm.formState.errors.currentPassword && <p className="text-[11px] text-[var(--red)]">{passwordForm.formState.errors.currentPassword.message}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-medium text-[var(--text3)]">New Password</label>
                                <input
                                    {...passwordForm.register('newPassword')}
                                    type="password"
                                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[13px] focus:border-[var(--accent)] outline-none"
                                />
                                {passwordForm.formState.errors.newPassword && <p className="text-[11px] text-[var(--red)]">{passwordForm.formState.errors.newPassword.message}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-medium text-[var(--text3)]">Confirm New Password</label>
                                <input
                                    {...passwordForm.register('confirmPassword')}
                                    type="password"
                                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[13px] focus:border-[var(--accent)] outline-none"
                                />
                                {passwordForm.formState.errors.confirmPassword && <p className="text-[11px] text-[var(--red)]">{passwordForm.formState.errors.confirmPassword.message}</p>}
                            </div>
                        </div>
                        <div className="flex justify-start mt-6">
                            <button
                                type="submit"
                                disabled={passwordForm.formState.isSubmitting}
                                className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[13px] font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                                {passwordForm.formState.isSubmitting ? "Updating..." : "Update Password"}
                            </button>
                        </div>
                    </form>
                </TabsContent>

                <TabsContent value="appearance" className="space-y-6 animate-[fadeSlide_0.3s_both]">
                    <div className="glass p-6">
                        <h2 className="text-[16px] font-bold text-[var(--text)] mb-6">Theme Preferences</h2>

                        <div className="grid gap-8">
                            <div className="space-y-3">
                                <label className="text-[13px] font-medium text-[var(--text)]">Mode</label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setTheme('light')}
                                        className={cn(
                                            "flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all",
                                            theme === 'light' ? "border-[var(--accent)] bg-[rgba(var(--accent-rgb),0.05)]" : "border-[var(--border)] hover:border-[var(--border2)]"
                                        )}
                                    >
                                        <span className="text-[13px] font-medium">Light</span>
                                    </button>
                                    <button
                                        onClick={() => setTheme('dark')}
                                        className={cn(
                                            "flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all",
                                            theme === 'dark' ? "border-[var(--accent)] bg-[rgba(var(--accent-rgb),0.05)]" : "border-[var(--border)] hover:border-[var(--border2)]"
                                        )}
                                    >
                                        <span className="text-[13px] font-medium">Dark</span>
                                    </button>
                                    <button
                                        onClick={() => setTheme('system')}
                                        className={cn(
                                            "flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all",
                                            theme === 'system' ? "border-[var(--accent)] bg-[rgba(var(--accent-rgb),0.05)]" : "border-[var(--border)] hover:border-[var(--border2)]"
                                        )}
                                    >
                                        <span className="text-[13px] font-medium">System</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[13px] font-medium text-[var(--text)]">Accent Color</label>
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
                                                profileForm.watch('accentColor') === c.name ? "border-[var(--text)]" : "border-transparent"
                                            )}
                                            style={{ background: c.hex }}
                                        />
                                    ))}
                                </div>
                                <p className="text-[11px] text-[var(--text3)] italic mt-2">Accent color is saved to your profile.</p>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
