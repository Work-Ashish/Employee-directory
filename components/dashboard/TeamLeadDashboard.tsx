"use client"

import * as React from "react"
import { DashboardStatCard } from "./DashboardComponents"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { EmptyState } from "@/components/ui/EmptyState"
import { CalendarIcon, ClockIcon, BackpackIcon, PersonIcon } from "@radix-ui/react-icons"
import { KudosWidget } from "./KudosWidget"
import { TimeTracker } from "./TimeTracker"
import { OnboardingCompanion } from "./OnboardingCompanion"
import { TodoList } from "./TodoList"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"
import { DashboardAPI } from "@/features/dashboard/api/client"
import { TeamAPI } from "@/features/teams/api/client"

const MOTIVATIONAL_QUOTES = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
    { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
    { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
    { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Anonymous" },
    { text: "Dream bigger. Do bigger.", author: "Anonymous" },
    { text: "Great things never come from comfort zones.", author: "Anonymous" },
    { text: "Push yourself, because no one else is going to do it for you.", author: "Anonymous" },
    { text: "Wake up with determination. Go to bed with satisfaction.", author: "Anonymous" },
    { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
    { text: "Little things make big days.", author: "Anonymous" },
    { text: "It's going to be hard, but hard does not mean impossible.", author: "Anonymous" },
    { text: "The best time for new beginnings is now.", author: "Anonymous" },
    { text: "Don't stop when you're tired. Stop when you're done.", author: "Anonymous" },
    { text: "Your limitation — it's only your imagination.", author: "Anonymous" },
    { text: "Strive for progress, not perfection.", author: "Anonymous" },
    { text: "Work hard in silence, let your success be your noise.", author: "Frank Ocean" },
    { text: "Stay focused and extra sparkly.", author: "Anonymous" },
    { text: "A little progress each day adds up to big results.", author: "Satya Nani" },
    { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
    { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
    { text: "Act as if what you do makes a difference. It does.", author: "William James" },
    { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
    { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
]

function DailyQuote() {
    const quote = React.useMemo(() => {
        const today = new Date()
        const dayOfYear = Math.floor(
            (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
        )
        return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length]
    }, [])

    return (
        <div className="relative z-10 hidden md:flex flex-col items-end justify-center text-right max-w-[380px] pl-6">
            <div className="text-[40px] leading-none text-white/10 font-serif select-none">&ldquo;</div>
            <p className="text-lg font-semibold text-white/80 leading-relaxed italic -mt-4">
                {quote.text}
            </p>
            <span className="text-sm text-white/40 font-medium mt-3">
                — {quote.author}
            </span>
        </div>
    )
}

interface TeamMember {
    id: string
    name: string
    designation: string
    avatarUrl: string | null
    attendanceStatus: "PRESENT" | "ABSENT"
}

interface TeamData {
    id: string
    name: string
    description: string | null
    memberCount: number
    members: TeamMember[]
}

interface DashboardData {
    stats: {
        attendanceCount: number
        leavesUsed: number
        pendingTrainingCount: number
        reviewStatus: string
    } | null
    teamStatus: any[]
    team: TeamData | null
}

export function TeamLeadDashboard() {
    const { user } = useAuth()
    const [loading, setLoading] = React.useState(true)
    const [data, setData] = React.useState<DashboardData | null>(null)
    const isFirstLoad = React.useRef(true)

    const fetchDashboardData = React.useCallback(async () => {
        try {
            if (isFirstLoad.current) setLoading(true)

            // Fetch dashboard stats and team data in parallel
            const [dashData, teamResult] = await Promise.allSettled([
                DashboardAPI.getStats(),
                TeamAPI.list(),
            ])

            const stats = dashData.status === "fulfilled"
                ? (dashData.value as unknown as DashboardData)
                : null

            let teamData: TeamData | null = null

            if (teamResult.status === "fulfilled" && teamResult.value.results?.length > 0) {
                // Pick the first team the user leads/belongs to
                const firstTeam = teamResult.value.results[0]
                const teamId = String(firstTeam.id)

                try {
                    // Fetch full team details with members
                    const teamDetail = await TeamAPI.get(teamId)
                    const members: TeamMember[] = (teamDetail.members || []).map((m) => {
                        // m.employee can be an object or a string ID depending on serializer
                        const emp = typeof m.employee === "object" && m.employee !== null
                            ? m.employee
                            : null
                        const name = emp
                            ? `${emp.firstName} ${emp.lastName}`.trim()
                            : (m as any).employeeName || "Unknown"
                        const designation = emp?.designation
                            || (m as any).designation
                            || ""
                        const avatarUrl = emp?.avatarUrl
                            || (m as any).avatarUrl
                            || null

                        return {
                            id: emp?.id || String(m.employee),
                            name,
                            designation,
                            avatarUrl,
                            attendanceStatus: "PRESENT" as const, // Default; no attendance data from this endpoint
                        }
                    })

                    teamData = {
                        id: teamId,
                        name: teamDetail.name,
                        description: teamDetail.description ?? null,
                        memberCount: teamDetail.memberCount ?? teamDetail._count?.members ?? members.length,
                        members,
                    }
                } catch (detailErr) {
                    console.error("Team detail fetch error:", detailErr)
                    // Still show basic team info from the list response
                    teamData = {
                        id: teamId,
                        name: firstTeam.name,
                        description: firstTeam.description ?? null,
                        memberCount: firstTeam.memberCount ?? firstTeam._count?.members ?? 0,
                        members: [],
                    }
                }
            }

            setData({
                stats: stats?.stats ?? null,
                teamStatus: (stats as any)?.teamStatus ?? [],
                team: teamData,
            })
        } catch (error) {
            console.error("Dashboard fetch error:", error)
        } finally {
            isFirstLoad.current = false
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchDashboardData()
        let interval: NodeJS.Timeout | null = null
        const startPolling = () => {
            if (interval) clearInterval(interval)
            interval = setInterval(fetchDashboardData, 30000)
        }
        const handleVisibility = () => {
            if (document.hidden) {
                if (interval) clearInterval(interval)
                interval = null
            } else {
                if (interval) clearInterval(interval)
                interval = null
                fetchDashboardData()
                startPolling()
            }
        }
        startPolling()
        document.addEventListener("visibilitychange", handleVisibility)
        return () => {
            if (interval) clearInterval(interval)
            document.removeEventListener("visibilitychange", handleVisibility)
        }
    }, [fetchDashboardData])

    const team = data?.team

    return (
        <div className="relative min-h-screen overflow-hidden p-1">
            {/* Background */}
            <div className="fixed inset-0 mesh-bg opacity-40 dark:opacity-20 pointer-events-none" />
            <div className="orb w-[400px] h-[400px] bg-accent/15 top-[-100px] right-[-100px]" />
            <div className="orb w-[300px] h-[300px] bg-purple/10 bottom-[100px] left-[-50px]" style={{ animationDelay: "-5s" }} />

            <div className="relative z-10 space-y-8 animate-page-in">
                {/* Hero Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#111111] p-8 md:p-10 rounded-2xl text-white shadow-lg overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-[0.03] rounded-full translate-x-32 -translate-y-32 group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white opacity-[0.02] rounded-full translate-y-24" />
                    <div className="relative z-10 shrink-0">
                        <h1 className="text-[32px] md:text-[40px] font-black tracking-tight leading-tight">
                            Welcome back,<br />
                            <span className="text-white/50">{user?.name?.split(" ")[0] || "Team Lead"}</span>
                        </h1>
                        <p className="text-md text-white/60 mt-4 max-w-[450px] font-medium leading-relaxed">
                            {team
                                ? `Leading team "${team.name}" with ${team.memberCount} member${team.memberCount !== 1 ? "s" : ""}. Keep your team performing at their best!`
                                : data?.stats?.attendanceCount
                                    ? `You've been present for ${data.stats.attendanceCount} days this month. Keep up the great work!`
                                    : "Check-in to start your day and track your progress."
                            }
                        </p>
                        <div className="flex gap-3 mt-8">
                            <Link href="/profile" className="px-6 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-md font-bold transition-all border border-white/10">
                                View Profile
                            </Link>
                            <Link href="/calendar" className="px-6 py-2.5 bg-white text-black rounded-xl text-md font-bold transition-all hover:shadow-lg">
                                Calendar
                            </Link>
                        </div>
                    </div>
                    <DailyQuote />
                </div>

                {/* Stat Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {loading ? (
                        Array(4).fill(0).map((_, i) => (
                            <div key={i} className="bg-surface border border-border rounded-xl p-5 h-[140px] animate-pulse" />
                        ))
                    ) : (
                        <>
                            <DashboardStatCard label="Attendance" value={String(data?.stats?.attendanceCount || 0)} sub="Days present this month" badge="Live" badgeType="up" icon={<ClockIcon className="w-5 h-5" />} />
                            <DashboardStatCard label="Leave Balance" value={String(data?.stats?.leavesUsed || 0)} sub="Leaves used" badge="Yearly" badgeType="neutral" icon={<CalendarIcon className="w-5 h-5" />} />
                            <DashboardStatCard label="Pending Training" value={String(data?.stats?.pendingTrainingCount || 0)} sub="Assigned modules"
                                badge={(data?.stats?.pendingTrainingCount || 0) > 0 ? "Priority" : "Done"}
                                badgeType={(data?.stats?.pendingTrainingCount || 0) > 0 ? "down" : "up"}
                                icon={<BackpackIcon className="w-5 h-5" />} />
                            <DashboardStatCard label="Review Status" value={data?.stats?.reviewStatus || "Upcoming"} sub="Next evaluation" badge="Q1" badgeType="neutral" icon={<span className="text-lg">📊</span>} />
                        </>
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
                    <div className="space-y-6">
                        <OnboardingCompanion />

                        {/* Team Overview Card */}
                        <Card variant="glass-premium" className="rounded-2xl">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                            <PersonIcon className="w-5 h-5" />
                                        </div>
                                        <CardTitle className="text-lg">
                                            {team ? `My Team — ${team.name}` : "My Team"}
                                        </CardTitle>
                                    </div>
                                    {team && (
                                        <Badge variant="neutral" size="sm">
                                            {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                                        </Badge>
                                    )}
                                </div>
                                {team?.description && (
                                    <p className="text-sm text-text-3 mt-2">{team.description}</p>
                                )}
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="space-y-4">
                                        {Array(3).fill(0).map((_, i) => <div key={i} className="h-14 w-full bg-bg-2 rounded-xl animate-pulse" />)}
                                    </div>
                                ) : !team ? (
                                    <EmptyState
                                        title="No team assigned"
                                        description="Contact your administrator to get assigned to a team."
                                        icon={<PersonIcon className="w-8 h-8" />}
                                    />
                                ) : team.members.length === 0 ? (
                                    <EmptyState
                                        title="No members yet"
                                        description="Your team doesn't have any members assigned yet."
                                        icon={<PersonIcon className="w-8 h-8" />}
                                    />
                                ) : (
                                    <div className="space-y-2">
                                        {team.members.map((member) => (
                                            <div key={member.id} className="flex items-center justify-between p-3 hover:bg-bg/50 rounded-xl transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={member.name} size="default" />
                                                    <div>
                                                        <span className="text-md font-bold text-text-2 block group-hover:text-text transition-colors">
                                                            {member.name}
                                                        </span>
                                                        <span className="text-xs text-text-3 font-medium">
                                                            {member.designation}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-2.5 h-2.5 rounded-full ring-4 transition-all duration-300",
                                                        member.attendanceStatus === "PRESENT"
                                                            ? "bg-success ring-success/10"
                                                            : "bg-text-4 ring-text-4/10"
                                                    )} />
                                                    <span className={cn(
                                                        "text-xs font-semibold",
                                                        member.attendanceStatus === "PRESENT" ? "text-success" : "text-text-4"
                                                    )}>
                                                        {member.attendanceStatus === "PRESENT" ? "Active" : "Away"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Today's Schedule */}
                        <Card variant="glass-premium" className="rounded-2xl">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                        <CalendarIcon className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-lg">Today&apos;s Schedule</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-md text-text-3 py-12 text-center bg-bg-2/30 rounded-xl border-2 border-dashed border-border font-medium">
                                    No events scheduled for today.
                                </div>
                            </CardContent>
                        </Card>

                        {/* To-Do List */}
                        <TodoList />
                    </div>

                    <div className="flex flex-col gap-6">
                        <TimeTracker />
                        <KudosWidget />

                        {/* Quick Actions */}
                        <Card variant="glass-premium" className="rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-lg">Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <Link href="/performance" className="block">
                                        <Button variant="primary" className="w-full justify-start gap-3">
                                            <span className="text-lg">⭐</span>
                                            Review Team Member
                                        </Button>
                                    </Link>
                                    <Link href="/leave" className="block">
                                        <Button variant="secondary" className="w-full justify-start gap-3">
                                            <span className="text-lg">🏖️</span>
                                            Approve Leaves
                                        </Button>
                                    </Link>
                                    <Link href="/help-desk" className="block">
                                        <Button variant="secondary" className="w-full justify-start gap-3">
                                            <span className="text-lg">🎫</span>
                                            Raise Ticket
                                        </Button>
                                    </Link>
                                    <Link href="/attendance" className="block">
                                        <Button variant="ghost" className="w-full justify-start gap-3">
                                            <span className="text-lg">📅</span>
                                            View Attendance
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
