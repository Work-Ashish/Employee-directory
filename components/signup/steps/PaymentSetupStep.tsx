"use client"

import { motion } from "framer-motion"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { cn } from "@/lib/utils"
import type { SignupFormData } from "@/lib/schemas/signup"

interface StepProps {
  data: SignupFormData
  updateData: (partial: Partial<SignupFormData>) => void
  errors: Record<string, string>
}

const MONTHLY_PRICE = 500 // INR per user/month
const ANNUAL_DISCOUNT = 0.15 // 15% off
const ANNUAL_PRICE = Math.round(MONTHLY_PRICE * (1 - ANNUAL_DISCOUNT)) // ₹425/user/month

const PLAN_FEATURES = [
  { text: "Unlimited Employees", highlighted: true },
  { text: "Core HR & Employee Management", highlighted: false },
  { text: "Attendance & Leave Management", highlighted: false },
  { text: "Payroll Management", highlighted: true },
  { text: "Performance Reviews", highlighted: true },
  { text: "Training Module", highlighted: false },
  { text: "Recruitment Pipeline", highlighted: false },
  { text: "Reports & Analytics", highlighted: false },
  { text: "Asset & Document Management", highlighted: false },
  { text: "AI Chatbot", highlighted: true },
  { text: "Custom Workflows", highlighted: false },
  { text: "API Access & Integrations", highlighted: false },
  { text: "Priority Support", highlighted: false },
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

export function PaymentSetupStep({ data, updateData, errors }: StepProps) {
  const isAnnual = data.billingCycle === "annual"
  const displayPrice = isAnnual ? ANNUAL_PRICE : MONTHLY_PRICE

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
              -15%
            </span>
          </button>
        </div>
      </motion.div>

      {/* Single Plan Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        className="max-w-lg mx-auto"
      >
        <div className="relative rounded-2xl overflow-hidden border border-[var(--accent)] shadow-[0_0_30px_rgba(0,122,255,0.12)]">
          {/* Header */}
          <div className="bg-gradient-to-br from-[var(--accent)]/15 to-purple-500/5 p-6 pb-5 text-center">
            <h4 className="font-bold text-text text-xl">EMS Pro</h4>
            <p className="text-xs text-text-3 mt-1">Everything you need to manage your team</p>

            {/* Price */}
            <div className="mt-5 flex items-baseline justify-center gap-1">
              <span className="text-lg text-text-3 font-medium">₹</span>
              <span className="text-5xl font-extrabold text-text tracking-tight">{displayPrice}</span>
              <div className="text-left ml-1">
                <span className="text-text-3 text-sm block leading-tight">/user</span>
                <span className="text-text-3 text-sm block leading-tight">/month</span>
              </div>
            </div>

            {isAnnual && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-sm text-text-3 line-through">₹{MONTHLY_PRICE}/user/mo</span>
                <span className="text-xs font-semibold text-[var(--green)] bg-[var(--green)]/10 px-2.5 py-0.5 rounded-full">
                  Save 15%
                </span>
              </div>
            )}

            {!isAnnual && (
              <p className="text-xs text-text-3 mt-2">
                ₹{ANNUAL_PRICE}/user/mo when billed annually
              </p>
            )}
          </div>

          {/* Features */}
          <div className="p-6 pt-4 bg-[var(--surface)]">
            <p className="text-[11px] uppercase tracking-wider text-text-3 font-semibold mb-3">
              Everything included
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
              {PLAN_FEATURES.map((feature) => (
                <li
                  key={feature.text}
                  className={cn(
                    "flex items-center gap-2.5 text-sm",
                    feature.highlighted ? "text-text font-medium" : "text-text-2"
                  )}
                >
                  <CheckIcon highlighted={feature.highlighted} />
                  {feature.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>

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
