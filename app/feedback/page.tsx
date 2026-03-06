"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { canAccessModule, hasPermission, Module, Action } from "@/lib/permissions"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { Spinner } from "@/components/ui/Spinner"

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

  if (isLoading || loading) return <div className="p-6 text-text-3 flex items-center gap-2"><Spinner /> Loading...</div>

  const canCreate = hasPermission(user?.role ?? "", Module.FEEDBACK, Action.CREATE)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Feedback"
        description="View and submit employee feedback"
      />

      {feedbackList.length === 0 ? (
        <EmptyState
          title="No feedback found."
          description={canCreate ? "Be the first to submit feedback for a colleague." : undefined}
        />
      ) : (
        <div className="space-y-4">
          {feedbackList.map(fb => (
            <Card key={fb.id} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text">
                    To: {fb.toEmployee.firstName} {fb.toEmployee.lastName}
                  </span>
                  <span className="text-xs text-text-4">• {fb.period}</span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={i < fb.rating ? "text-yellow-500" : "text-gray-300"}>★</span>
                  ))}
                </div>
              </div>
              <p className="text-sm text-text-2 mb-2">{fb.content}</p>
              <div className="text-xs text-text-4">
                {fb.isAnonymous || !fb.fromEmployee
                  ? "Anonymous"
                  : `From: ${fb.fromEmployee.firstName} ${fb.fromEmployee.lastName}`}
                {" • "}
                {new Date(fb.createdAt).toLocaleDateString()}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
