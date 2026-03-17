"use client"

import { motion } from "framer-motion"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import type { SignupFormData } from "@/lib/schemas/signup"

interface StepProps {
  data: SignupFormData
  updateData: (partial: Partial<SignupFormData>) => void
  errors: Record<string, string>
}

type Tier = "starter" | "growth" | "enterprise"

interface PricingTier {
  id: Tier
  name: string
  monthlyPrice: number
  annualPrice: number
  employees: string
  features: string[]
  highlighted: string[]
  popular?: boolean
  icon: React.ReactNode
  color: string
  gradient: string
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 29,
    annualPrice: 24,
    employees: "Up to 25",
    features: ["Core HR", "Attendance", "Leave", "Basic Reports", "Email Support"],
    highlighted: [],
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 3L17.5 10L25 11L19.5 16.5L21 24L14 20L7 24L8.5 16.5L3 11L10.5 10L14 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    color: "text-blue-500",
    gradient: "from-blue-500/10 to-cyan-500/5",
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 79,
    annualPrice: 66,
    employees: "Up to 100",
    features: [
      "Everything in Starter",
      "Payroll Management",
      "Performance Reviews",
      "Advanced Reports",
      "Training Module",
      "Recruitment Pipeline",
      "Priority Email Support",
    ],
    highlighted: ["Payroll Management", "Performance Reviews", "Recruitment Pipeline"],
    popular: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M4 21L10 15L14 19L24 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 7H24V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: "text-[var(--accent)]",
    gradient: "from-[var(--accent)]/15 to-purple-500/5",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 199,
    annualPrice: 166,
    employees: "Unlimited",
    features: [
      "Everything in Growth",
      "SSO & SAML",
      "API Access",
      "Custom Workflows",
      "AI Chatbot",
      "Asset Management",
      "Dedicated Account Manager",
      "SLA & Priority Support",
      "Custom Integrations",
    ],
    highlighted: ["SSO & SAML", "API Access", "AI Chatbot", "Custom Integrations"],
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="10" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 14H24" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 4H18L20 10H8L10 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="14" cy="20" r="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    color: "text-purple-500",
    gradient: "from-purple-500/10 to-pink-500/5",
  },
]

const BILLING_CYCLE_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual (save 17%)" },
]

const INVOICE_OPTIONS = [
  { value: "email", label: "Email Invoice" },
  { value: "download", label: "Download PDF" },
]

const CheckIcon = ({ highlighted }: { highlighted?: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    className={cn("shrink-0", highlighted ? "text-[var(--accent)]" : "text-[var(--green)]")}
  >
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" opacity={0.3} />
    <path
      d="M4.5 8l2.5 2.5L11.5 5.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const RadioIcon = ({ selected }: { selected: boolean }) => (
  <div className={cn(
    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
    selected ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border2)]"
  )}>
    {selected && (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className="w-2 h-2 rounded-full bg-white"
      />
    )}
  </div>
)

function PricingCard({
  tier,
  selected,
  isAnnual,
  onSelect,
  delay,
}: {
  tier: PricingTier
  selected: boolean
  isAnnual: boolean
  onSelect: () => void
  delay: number
}) {
  const displayPrice = isAnnual ? tier.annualPrice : tier.monthlyPrice
  const monthlyPrice = tier.monthlyPrice
  const savings = isAnnual ? Math.round(((monthlyPrice - tier.annualPrice) / monthlyPrice) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="relative"
    >
      {/* Popular badge */}
      {tier.popular && (
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.2 }}
        >
          <Badge variant="default" className="bg-[var(--accent)] text-white shadow-lg px-4 py-1">
            Most Popular
          </Badge>
        </motion.div>
      )}

      <motion.div
        animate={{
          scale: selected ? 1.02 : 1,
          y: selected ? -2 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={onSelect}
        className={cn(
          "relative rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden h-full",
          "border",
          selected
            ? "border-[var(--accent)] shadow-[0_0_30px_rgba(0,122,255,0.15)]"
            : "border-[var(--border)] hover:border-[var(--border2)]"
        )}
      >
        {/* Gradient header area */}
        <div className={cn(
          "bg-gradient-to-br p-6 pb-5 relative",
          tier.gradient,
        )}>
          {/* Selection radio */}
          <div className="absolute top-4 right-4">
            <RadioIcon selected={selected} />
          </div>

          {/* Name */}
          <h4 className="font-bold text-text text-lg">{tier.name}</h4>
          <p className="text-xs text-text-3 mt-1">{tier.employees} employees</p>

          {/* Price */}
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-text tracking-tight">${displayPrice}</span>
            <span className="text-text-3 text-sm">/mo</span>
          </div>

          {isAnnual && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-text-3 line-through">${monthlyPrice}/mo</span>
              <span className="text-xs font-semibold text-[var(--green)] bg-[var(--green)]/10 px-2 py-0.5 rounded-full">
                Save {savings}%
              </span>
            </div>
          )}

          {!isAnnual && (
            <p className="text-xs text-text-3 mt-1.5">
              ${tier.annualPrice}/mo billed annually
            </p>
          )}
        </div>

        {/* Features list */}
        <div className="p-6 pt-4 bg-[var(--surface)]">
          <p className="text-[11px] uppercase tracking-wider text-text-3 font-semibold mb-3">
            What&apos;s included
          </p>
          <ul className="space-y-2.5">
            {tier.features.map((feature) => {
              const isHighlighted = tier.highlighted.includes(feature)
              return (
                <li
                  key={feature}
                  className={cn(
                    "flex items-center gap-2.5 text-sm",
                    isHighlighted ? "text-text font-medium" : "text-text-2"
                  )}
                >
                  <CheckIcon highlighted={isHighlighted} />
                  {feature}
                </li>
              )
            })}
          </ul>

          {/* Select button */}
          <motion.button
            className={cn(
              "w-full mt-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
              selected
                ? "bg-[var(--accent)] text-white shadow-md"
                : "bg-[var(--bg2)] text-text-2 hover:bg-[var(--bg3)] hover:text-text"
            )}
            whileTap={{ scale: 0.97 }}
          >
            {selected ? "Selected" : "Select Plan"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function PaymentSetupStep({ data, updateData, errors }: StepProps) {
  const isAnnual = data.billingCycle === "annual"

  return (
    <div className="space-y-6">
      {/* Billing Cycle Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex justify-center"
      >
        <div className="inline-flex items-center bg-[var(--bg2)] rounded-full p-1 gap-1">
          <button
            onClick={() => updateData({ billingCycle: "monthly" })}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200",
              !isAnnual
                ? "bg-[var(--surface)] text-text shadow-sm"
                : "text-text-3 hover:text-text-2"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => updateData({ billingCycle: "annual" })}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2",
              isAnnual
                ? "bg-[var(--surface)] text-text shadow-sm"
                : "text-text-3 hover:text-text-2"
            )}
          >
            Annual
            <span className="text-[10px] font-bold text-[var(--green)] bg-[var(--green)]/10 px-2 py-0.5 rounded-full">
              -17%
            </span>
          </button>
        </div>
      </motion.div>

      {/* Pricing Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {PRICING_TIERS.map((tier, idx) => (
          <PricingCard
            key={tier.id}
            tier={tier}
            selected={data.subscriptionTier === tier.id}
            isAnnual={isAnnual}
            onSelect={() => updateData({ subscriptionTier: tier.id })}
            delay={idx * 0.1}
          />
        ))}
      </div>

      {/* Billing Details Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: 0.3 }}
        className="max-w-2xl mx-auto"
      >
        <div className="glass-premium rounded-2xl p-6 md:p-8">
          <h3 className="font-bold text-text mb-4">Payment Information</h3>

          {/* Card Number Row */}
          <div className="space-y-4">
            <Input
              label="Card Number"
              leftIcon={
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="3.5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <line x1="1" y1="6.5" x2="15" y2="6.5" stroke="currentColor" strokeWidth="1.2" />
                  <line x1="4" y1="9.5" x2="7" y2="9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              }
              value={data.cardNumber || ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "").slice(0, 16)
                const formatted = raw.replace(/(.{4})/g, "$1 ").trim()
                updateData({ cardNumber: formatted })
              }}
              error={errors.cardNumber}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Input
                label="Expiry Date"
                value={data.cardExpiry || ""}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, "").slice(0, 4)
                  if (val.length >= 3) val = val.slice(0, 2) + "/" + val.slice(2)
                  updateData({ cardExpiry: val })
                }}
                error={errors.cardExpiry}
                placeholder="MM/YY"
                maxLength={5}
              />
              <Input
                label="CVV"
                type="password"
                value={data.cardCvv || ""}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 4)
                  updateData({ cardCvv: val })
                }}
                error={errors.cardCvv}
                placeholder="***"
                maxLength={4}
              />
              <Input
                label="Name on Card"
                value={data.cardName || ""}
                onChange={(e) => updateData({ cardName: e.target.value })}
                error={errors.cardName}
                placeholder="John Doe"
                className="col-span-2 sm:col-span-1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50 mt-2">
              <Input
                label="Billing Email"
                type="email"
                value={data.billingEmail}
                onChange={(e) => updateData({ billingEmail: e.target.value })}
                error={errors.billingEmail}
                placeholder="billing@acme.com"
              />

              <Select
                label="Invoice Preference"
                value={data.invoicePreference}
                onChange={(e) =>
                  updateData({
                    invoicePreference: e.target.value as "email" | "download",
                  })
                }
                error={errors.invoicePreference}
                options={INVOICE_OPTIONS}
              />
            </div>
          </div>

          {/* Security note */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[var(--green)] shrink-0">
              <path d="M7 1L3 3v3c0 3.3 1.7 5.3 4 6 2.3-.7 4-2.7 4-6V3L7 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M5 7l1.5 1.5L9 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-[11px] text-text-3">
              Secured with 256-bit SSL encryption. We never store your full card details.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
