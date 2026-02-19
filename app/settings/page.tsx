"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { PersonIcon, LockClosedIcon, BlendingModeIcon } from "@radix-ui/react-icons"

export default function SettingsPage() {
    const { theme, setTheme } = useTheme()
    const [accentColor, setAccentColor] = React.useState('blue')

    // Mock accent color change - in real app would use context
    const handleColorChange = (color: string) => {
        setAccentColor(color)
        document.documentElement.style.setProperty('--accent', `var(--${color})`)
        document.documentElement.style.setProperty('--glow', `var(--${color}-dim)`)
        toast.success(`Theme updated to ${color}`)
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
                    <div className="glass p-6">
                        <h2 className="text-[16px] font-bold text-[var(--text)] mb-6">Personal Information</h2>

                        <div className="flex items-start gap-6 mb-8">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#5856d6] flex items-center justify-center text-white text-[24px] font-bold shadow-lg">
                                AD
                            </div>
                            <div className="flex-1 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-medium text-[var(--text3)]">First Name</label>
                                        <input type="text" defaultValue="Admin" className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[13px] focus:border-[var(--accent)] outline-none" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-medium text-[var(--text3)]">Last Name</label>
                                        <input type="text" defaultValue="User" className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[13px] focus:border-[var(--accent)] outline-none" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-medium text-[var(--text3)]">Bio</label>
                                    <textarea defaultValue="Senior Administrator managing enterprise resources." className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[13px] focus:border-[var(--accent)] outline-none h-24 resize-none" />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-[var(--border)]">
                            <button className="btn btn-primary" onClick={() => toast.success("Profile updated successfully")}>Save Changes</button>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="security" className="space-y-6 animate-[fadeSlide_0.3s_both]">
                    <div className="glass p-6">
                        <h2 className="text-[16px] font-bold text-[var(--text)] mb-6">Change Password</h2>
                        <div className="space-y-4 max-w-md">
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-medium text-[var(--text3)]">Current Password</label>
                                <input type="password" className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[13px] focus:border-[var(--accent)] outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-medium text-[var(--text3)]">New Password</label>
                                <input type="password" className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[13px] focus:border-[var(--accent)] outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-medium text-[var(--text3)]">Confirm New Password</label>
                                <input type="password" className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[13px] focus:border-[var(--accent)] outline-none" />
                            </div>
                        </div>
                        <div className="flex justify-start mt-6">
                            <button className="btn btn-primary" onClick={() => toast.success("Password updated successfully")}>Update Password</button>
                        </div>
                    </div>
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
                                            theme === 'light' ? "border-[var(--accent)] bg-[rgba(0,122,255,0.05)]" : "border-[var(--border)] hover:border-[var(--border2)]"
                                        )}
                                    >
                                        <span className="text-[13px] font-medium">Light</span>
                                    </button>
                                    <button
                                        onClick={() => setTheme('dark')}
                                        className={cn(
                                            "flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all",
                                            theme === 'dark' ? "border-[var(--accent)] bg-[rgba(0,122,255,0.05)]" : "border-[var(--border)] hover:border-[var(--border2)]"
                                        )}
                                    >
                                        <span className="text-[13px] font-medium">Dark</span>
                                    </button>
                                    <button
                                        onClick={() => setTheme('system')}
                                        className={cn(
                                            "flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all",
                                            theme === 'system' ? "border-[var(--accent)] bg-[rgba(0,122,255,0.05)]" : "border-[var(--border)] hover:border-[var(--border2)]"
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
                                                accentColor === c.name ? "border-[var(--text)]" : "border-transparent"
                                            )}
                                            style={{ background: c.hex }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
