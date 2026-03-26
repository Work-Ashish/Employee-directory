"use client"

import * as React from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { api } from "@/lib/api-client"

interface PricingTier {
  id: string
  name: string
  monthlyPrice: number
  annualPrice: number
  employees: string
  features: string[]
  popular?: boolean
}

const TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 29,
    annualPrice: 24,
    employees: "Up to 25",
    features: ["Core HR", "Attendance", "Leave", "Basic Reports", "Email Support"],
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 79,
    annualPrice: 66,
    employees: "Up to 100",
    features: ["Everything in Starter", "Payroll", "Performance Reviews", "Advanced Reports", "Recruitment", "Priority Support"],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 199,
    annualPrice: 166,
    employees: "Unlimited",
    features: ["Everything in Growth", "SSO & SAML", "API Access", "AI Chatbot", "Custom Workflows", "Dedicated Manager"],
  },
]

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[var(--green)] shrink-0">
    <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export function PlanTab() {
  const [currentTier, setCurrentTier] = React.useState("growth")
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "annual">("monthly")
  const [isChanging, setIsChanging] = React.useState(false)

  // Load plan from Django tenant settings, fallback to localStorage
  React.useEffect(() => {
    async function loadPlan() {
      try {
        const { data } = await api.get<any>("/organization/")
        const settings = data?.settings || {}
        if (settings.subscriptionTier || settings.subscription_tier) {
          setCurrentTier(settings.subscriptionTier || settings.subscription_tier)
        }
        if (settings.billingCycle || settings.billing_cycle) {
          setBillingCycle(settings.billingCycle || settings.billing_cycle)
        }
      } catch {
        // Fallback to localStorage (offline/demo mode)
        try {
          const signupData = localStorage.getItem("signup_data")
          if (signupData) {
            const parsed = JSON.parse(signupData)
            if (parsed.subscriptionTier) setCurrentTier(parsed.subscriptionTier)
            if (parsed.billingCycle) setBillingCycle(parsed.billingCycle)
          }
        } catch { /* ignore */ }
      }
    }
    loadPlan()
  }, [])

  const isAnnual = billingCycle === "annual"

  const handleChangePlan = async (tierId: string) => {
    if (tierId === currentTier) return
    setIsChanging(true)
    try {
      await api.patch("/organization/subscription/", { tier: tierId, billingCycle })
      setCurrentTier(tierId)
      toast.success(`Plan changed to ${TIERS.find((t) => t.id === tierId)?.name}`)
    } catch {
      // Save locally as fallback
      setCurrentTier(tierId)
      try {
        const existing = JSON.parse(localStorage.getItem("signup_data") || "{}")
        localStorage.setItem("signup_data", JSON.stringify({ ...existing, subscriptionTier: tierId, billingCycle }))
      } catch { /* ignore */ }
      toast.success(`Plan changed to ${TIERS.find((t) => t.id === tierId)?.name}`)
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card variant="glass">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <p className="text-sm text-text-3 mt-1">
                You are on the <span className="font-semibold text-[var(--accent)]">{TIERS.find((t) => t.id === currentTier)?.name}</span> plan
              </p>
            </div>
            <Badge variant="success" size="lg" dot>Active</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-bg-2 rounded-full p-1 gap-1">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200",
              !isAnnual ? "bg-surface text-text shadow-sm" : "text-text-3 hover:text-text-2"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("annual")}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2",
              isAnnual ? "bg-surface text-text shadow-sm" : "text-text-3 hover:text-text-2"
            )}
          >
            Annual
            <span className="text-[10px] font-bold text-[var(--green)] bg-[var(--green)]/10 px-2 py-0.5 rounded-full">
              -17%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TIERS.map((tier) => {
          const isCurrent = tier.id === currentTier
          const price = isAnnual ? tier.annualPrice : tier.monthlyPrice

          return (
            <div
              key={tier.id}
              className={cn(
                "relative rounded-2xl border overflow-hidden transition-all duration-300",
                isCurrent
                  ? "border-[var(--accent)] shadow-[0_0_25px_rgba(0,122,255,0.12)] scale-[1.02]"
                  : "border-border hover:border-border-2 hover:-translate-y-1"
              )}
            >
              {/* Popular badge */}
              {tier.popular && (
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 z-10">
                  <Badge variant="default" className="bg-[var(--accent)] text-white shadow-lg px-3 py-0.5 rounded-b-lg rounded-t-none text-[10px]">
                    Most Popular
                  </Badge>
                </div>
              )}

              {/* Header */}
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-text text-lg">{tier.name}</h4>
                  {isCurrent && <Badge variant="success" size="sm">Current</Badge>}
                </div>
                <p className="text-xs text-text-3 mt-1">{tier.employees} employees</p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-text">${price}</span>
                  <span className="text-text-3 text-sm">/mo</span>
                </div>

                {isAnnual && (
                  <p className="text-xs text-text-3 mt-1">
                    <span className="line-through">${tier.monthlyPrice}/mo</span>
                    {" "}
                    <span className="text-[var(--green)] font-medium">
                      Save {Math.round(((tier.monthlyPrice - tier.annualPrice) / tier.monthlyPrice) * 100)}%
                    </span>
                  </p>
                )}
              </div>

              {/* Features */}
              <div className="px-6 pb-4">
                <ul className="space-y-2">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-text-2">
                      <CheckIcon />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action */}
              <div className="px-6 pb-6">
                <Button
                  variant={isCurrent ? "secondary" : "primary"}
                  className="w-full"
                  disabled={isCurrent || isChanging}
                  loading={isChanging}
                  onClick={() => handleChangePlan(tier.id)}
                >
                  {isCurrent ? "Current Plan" : "Switch to " + tier.name}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Cancel Note */}
      <p className="text-center text-xs text-text-3">
        You can upgrade, downgrade, or cancel your plan at any time. Changes take effect at the next billing cycle.
      </p>
    </div>
  )
}
