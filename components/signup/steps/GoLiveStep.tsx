"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import type { SignupFormData } from "@/lib/schemas/signup"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StepProps {
  data: SignupFormData
  updateData: (partial: Partial<SignupFormData>) => void
  errors: Record<string, string>
}

interface GoLiveStepProps extends StepProps {
  goToStep: (step: number) => void
  onLaunch: () => void
  isLaunching: boolean
}

/* ------------------------------------------------------------------ */
/*  Pricing lookup                                                     */
/* ------------------------------------------------------------------ */

const PLAN_PRICES: Record<string, { monthly: string; annual: string }> = {
  starter: { monthly: "$9/mo", annual: "$7/mo" },
  growth: { monthly: "$29/mo", annual: "$24/mo" },
  enterprise: { monthly: "$79/mo", annual: "$66/mo" },
}

/* ------------------------------------------------------------------ */
/*  Inline SVG icons                                                   */
/* ------------------------------------------------------------------ */

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 1.5l2.5 2.5L4.5 12H2v-2.5L10 1.5z" />
    </svg>
  )
}

function RocketIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto block">
      <path d="M12 2C12 2 7 6 7 13l2.5 2.5L12 18l2.5-2.5L17 13c0-7-5-11-5-11z" />
      <circle cx="12" cy="10.5" r="2" />
      <path d="M7 13l-2.5 3" />
      <path d="M17 13l2.5 3" />
      <path d="M9.5 18L8 21" />
      <path d="M14.5 18L16 21" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4l4 4-4 4" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
      <path d="M10 2a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GoLiveStep({
  data,
  goToStep,
  onLaunch,
  isLaunching,
}: GoLiveStepProps) {
  const [modulesExpanded, setModulesExpanded] = useState(false)

  // Derived data
  const teamCount = data.teamInvites.length + 1
  const activeModules = Object.entries(data.enabledModules).filter(([, v]) => v)
  const activeModuleCount = activeModules.length
  const planLabel = data.subscriptionTier.charAt(0).toUpperCase() + data.subscriptionTier.slice(1)
  const planPrice = PLAN_PRICES[data.subscriptionTier]?.[data.billingCycle] ?? ""

  /* ---- Review rows ---- */
  const rows = [
    {
      label: "Company",
      value: (
        <span>
          {data.companyName}
          {data.companyDomain && (
            <span className="ml-1.5 text-text-3 text-xs">
              {data.companyDomain}.emspro.com
            </span>
          )}
        </span>
      ),
      step: 0,
    },
    {
      label: "Plan",
      value: (
        <span>
          {planLabel}
          <span className="ml-1.5 text-text-3 text-xs">{planPrice}</span>
        </span>
      ),
      step: 1,
    },
    {
      label: "Team",
      value: `${teamCount} member${teamCount !== 1 ? "s" : ""} invited`,
      step: 2,
    },
    {
      label: "Modules",
      value: `${activeModuleCount} module${activeModuleCount !== 1 ? "s" : ""} active`,
      step: 3,
    },
  ]

  return (
    <div className="max-w-2xl mx-auto">
      {/* ---- Title area ---- */}
      <div className="text-center pt-6">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="inline-block"
        >
          <RocketIcon size={48} />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-4 text-3xl font-bold text-text"
        >
          Ready to Launch!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-2 text-text-3"
        >
          Review your setup and launch your platform
        </motion.p>
      </div>

      {/* ---- Review card ---- */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="glass-premium rounded-2xl p-6 mt-8"
      >
        {rows.map((row, i) => (
          <div key={row.label}>
            <div className="flex items-center justify-between py-4">
              {/* Left: label */}
              <span className="text-text-3 text-sm uppercase tracking-wider w-24 shrink-0">
                {row.label}
              </span>

              {/* Center: value */}
              <div className="flex-1 min-w-0 px-4">
                <span className="text-text font-medium text-sm">{row.value}</span>

                {/* Expandable module list */}
                {row.label === "Modules" && (
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => setModulesExpanded((prev) => !prev)}
                      className="inline-flex items-center gap-0.5 text-xs text-accent hover:underline"
                    >
                      {modulesExpanded ? "Hide" : "Show"} modules
                      <motion.span
                        animate={{ rotate: modulesExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronIcon />
                      </motion.span>
                    </button>

                    <motion.div
                      initial={false}
                      animate={{
                        height: modulesExpanded ? "auto" : 0,
                        opacity: modulesExpanded ? 1 : 0,
                      }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {activeModules.map(([key]) => (
                          <span
                            key={key}
                            className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full bg-accent/10 text-accent"
                          >
                            {key}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>

              {/* Right: edit button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToStep(row.step)}
                leftIcon={<PencilIcon />}
              >
                Edit
              </Button>
            </div>

            {/* Row divider (skip last) */}
            {i < rows.length - 1 && <div className="border-b border-border" />}
          </div>
        ))}
      </motion.div>

      {/* ---- Launch button ---- */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="mt-8 flex justify-center"
      >
        <div className="relative">
          {/* Glow pulse */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-accent to-[#5ac8fa]"
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [0.95, 1.05, 0.95],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{ filter: "blur(16px)" }}
          />

          <motion.button
            type="button"
            disabled={isLaunching}
            onClick={onLaunch}
            whileHover={
              isLaunching
                ? undefined
                : { scale: 1.05, boxShadow: "0 0 30px rgba(0,122,255,0.3)" }
            }
            whileTap={isLaunching ? undefined : { scale: 0.97 }}
            className={cn(
              "relative z-10 inline-flex items-center gap-2.5 px-10 py-4 text-lg font-bold rounded-2xl text-white transition-colors duration-200",
              "bg-gradient-to-r from-accent to-[#5ac8fa]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              isLaunching && "opacity-80 cursor-not-allowed"
            )}
          >
            {isLaunching ? (
              <>
                <SpinnerIcon />
                Setting Up Your Platform...
              </>
            ) : (
              <>
                <RocketIcon size={20} />
                Launch Your Platform
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
