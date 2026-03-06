"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { canAccessModule, hasPermission, Module, Action } from "@/lib/permissions"

interface Feedback {
  id: string
  content: string
  rating: number
  isAnonymous: boolean
  period: string
  createdAt: string
  fromEmployee: { id: string; firstName: string; lastName: string } | null
  toEmployee: { id: string; firstName: string; lastName: string }
}

export default function FeedbackPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [feedbackList, setFeedbackList] = React.useState<Feedback[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!isLoading && !canAccessModule(user?.role ?? "", Module.FEEDBACK)) {
      router.push("/")
    }
  }, [user, isLoading, router])

  React.useEffect(() => {
    fetch("/api/feedback")
      .then(r => r.json())
      .then(data => {
        const arr = data.data || data
        setFeedbackList(Array.isArray(arr) ? arr : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (isLoading || loading) return <div className="p-6 text-[var(--text3)]">Loading...</div>

  const canCreate = hasPermission(user?.role ?? "", Module.FEEDBACK, Action.CREATE)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Feedback</h1>
          <p className="text-[var(--text3)] text-sm mt-1">View and submit employee feedback</p>
        </div>
      </div>

      {feedbackList.length === 0 ? (
        <div className="text-center py-12 text-[var(--text3)]">
          <p>No feedback found.</p>
          {canCreate && <p className="text-sm mt-2">Be the first to submit feedback for a colleague.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {feedbackList.map(fb => (
            <div key={fb.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text)]">
                    To: {fb.toEmployee.firstName} {fb.toEmployee.lastName}
                  </span>
                  <span className="text-xs text-[var(--text4)]">• {fb.period}</span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={i < fb.rating ? "text-yellow-500" : "text-gray-300"}>★</span>
                  ))}
                </div>
              </div>
              <p className="text-sm text-[var(--text2)] mb-2">{fb.content}</p>
              <div className="text-xs text-[var(--text4)]">
                {fb.isAnonymous || !fb.fromEmployee
                  ? "Anonymous"
                  : `From: ${fb.fromEmployee.firstName} ${fb.fromEmployee.lastName}`}
                {" • "}
                {new Date(fb.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
