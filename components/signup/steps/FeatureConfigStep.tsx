"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Select } from "@/components/ui/Select"
import type { SignupFormData } from "@/lib/schemas/signup"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StepProps {
  data: SignupFormData
  updateData: (partial: Partial<SignupFormData>) => void
  errors: Record<string, string>
}

/* ------------------------------------------------------------------ */
/*  Module definitions                                                 */
/* ------------------------------------------------------------------ */

interface ModuleDef {
  key: string
  label: string
  icon: React.ReactNode
}

const MODULES: ModuleDef[] = [
  {
    key: "employees",
    label: "Employees",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="6" r="3" />
        <path d="M2 17v-1a5 5 0 0 1 10 0v1" />
        <circle cx="15" cy="7" r="2" />
        <path d="M15 13a4 4 0 0 1 4 4v0" />
      </svg>
    ),
  },
  {
    key: "attendance",
    label: "Attendance",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="8" />
        <path d="M10 5v5l3.5 2" />
      </svg>
    ),
  },
  {
    key: "leave",
    label: "Leave Management",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="14" height="14" rx="2" />
        <path d="M3 8h14" />
        <path d="M7 2v4" />
        <path d="M13 2v4" />
        <path d="M8 12l2 2 3-3" />
      </svg>
    ),
  },
  {
    key: "payroll",
    label: "Payroll",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v16" />
        <path d="M14 5H8.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H6" />
      </svg>
    ),
  },
  {
    key: "performance",
    label: "Performance",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16V10" />
        <path d="M8 16V7" />
        <path d="M12 16V4" />
        <path d="M16 16V8" />
      </svg>
    ),
  },
  {
    key: "training",
    label: "Training",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2L2 6l8 4 8-4-8-4z" />
        <path d="M4 8v5c0 2 2.7 3 6 3s6-1 6-3V8" />
        <path d="M18 6v8" />
      </svg>
    ),
  },
  {
    key: "announcements",
    label: "Announcements",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4L4 9l4 2 2 5 6-12z" />
        <path d="M16 4L8 11" />
      </svg>
    ),
  },
  {
    key: "assets",
    label: "Assets",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="14" height="10" rx="2" />
        <path d="M7 17h6" />
        <path d="M10 14v3" />
      </svg>
    ),
  },
  {
    key: "documents",
    label: "Documents",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3h7l4 4v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
        <path d="M12 3v4h4" />
        <path d="M7 10h6" />
        <path d="M7 13h4" />
      </svg>
    ),
  },
  {
    key: "helpDesk",
    label: "Help Desk",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10a6 6 0 0 1 12 0" />
        <path d="M4 10v2a2 2 0 0 0 2 2" />
        <path d="M16 10v2a2 2 0 0 1-2 2h-1" />
        <rect x="2" y="9" width="3" height="5" rx="1" />
        <rect x="15" y="9" width="3" height="5" rx="1" />
        <path d="M10 17a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z" />
      </svg>
    ),
  },
  {
    key: "recruitment",
    label: "Recruitment",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="14" height="11" rx="2" />
        <path d="M8 6V4a2 2 0 0 1 4 0v2" />
        <path d="M10 10v4" />
        <path d="M8 12h4" />
      </svg>
    ),
  },
  {
    key: "resignation",
    label: "Resignation",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5" />
        <path d="M9 10h8" />
        <path d="M12 7l3 3-3 3" />
        <path d="M3 7v6" />
      </svg>
    ),
  },
  {
    key: "reports",
    label: "Reports",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="8" />
        <path d="M10 10V4" />
        <path d="M10 10l5.5 3.2" />
        <path d="M10 10l-4 5.5" />
      </svg>
    ),
  },
  {
    key: "teams",
    label: "Teams",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="7" r="2.5" />
        <circle cx="14" cy="7" r="2.5" />
        <circle cx="10" cy="13" r="2.5" />
        <path d="M3 16a4 4 0 0 1 6 0" />
        <path d="M11 16a4 4 0 0 1 6 0" />
      </svg>
    ),
  },
  {
    key: "workflows",
    label: "Workflows",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="5" height="4" rx="1" />
        <rect x="13" y="3" width="5" height="4" rx="1" />
        <rect x="7.5" y="13" width="5" height="4" rx="1" />
        <path d="M4.5 7v2a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V7" />
        <path d="M10 11v2" />
      </svg>
    ),
  },
  {
    key: "calendar",
    label: "Calendar",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="14" height="14" rx="2" />
        <path d="M3 8h14" />
        <path d="M7 2v4" />
        <path d="M13 2v4" />
      </svg>
    ),
  },
  {
    key: "reimbursement",
    label: "Reimbursement",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
        <path d="M3 8h14" />
        <path d="M3 12h6" />
        <path d="M13 12h1" />
      </svg>
    ),
  },
  {
    key: "aiChatbot",
    label: "AI Chatbot",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2l1.5 3.5L15 7l-3.5 1.5L10 12l-1.5-3.5L5 7l3.5-1.5L10 2z" />
        <path d="M15 12l.75 1.75L17.5 14.5l-1.75.75L15 17l-.75-1.75L12.5 14.5l1.75-.75L15 12z" />
        <path d="M5 13l.5 1.5L7 15l-1.5.5L5 17l-.5-1.5L3 15l1.5-.5L5 13z" />
      </svg>
    ),
  },
]

/* ------------------------------------------------------------------ */
/*  Preference select options                                          */
/* ------------------------------------------------------------------ */

const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New_York (EST)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
]

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
]

const DATE_FORMAT_OPTIONS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
]

const CURRENCY_OPTIONS = [
  { value: "INR", label: "INR (\u20B9)" },
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (\u20AC)" },
  { value: "GBP", label: "GBP (\u00A3)" },
  { value: "JPY", label: "JPY (\u00A5)" },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function FeatureConfigStep({ data, updateData, errors }: StepProps) {
  const toggleModule = (key: string) => {
    updateData({
      enabledModules: {
        ...data.enabledModules,
        [key]: !data.enabledModules[key],
      },
    })
  }

  return (
    <div>
      {/* Module Configuration */}
      <div>
        <h3 className="text-lg font-bold text-text">Module Configuration</h3>
        <p className="mt-1 text-sm text-text-3">
          Toggle the modules you want to enable for your organization.
        </p>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULES.map((mod, index) => {
            const enabled = !!data.enabledModules[mod.key]

            return (
              <motion.div
                key={mod.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className={cn(
                  "rounded-xl p-4 flex items-center justify-between gap-3 transition-colors duration-200",
                  enabled
                    ? "bg-accent/5 border border-accent/20"
                    : "bg-surface border border-border opacity-70"
                )}
              >
                {/* Left: icon + label */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className={cn("shrink-0", enabled ? "text-accent" : "text-text-3")}>
                    {mod.icon}
                  </span>
                  <span className="text-sm font-medium text-text truncate">{mod.label}</span>
                </div>

                {/* Right: toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`Toggle ${mod.label}`}
                  onClick={() => toggleModule(mod.key)}
                  className={cn(
                    "w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200 shrink-0",
                    enabled ? "bg-accent" : "bg-bg-3"
                  )}
                >
                  <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={cn(
                      "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm",
                      enabled ? "left-[22px]" : "left-0.5"
                    )}
                  />
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.55 }}
        className="glass-premium rounded-2xl p-6 mt-8"
      >
        <h3 className="text-lg font-bold text-text mb-4">Preferences</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Timezone"
            value={data.timezone}
            onChange={(e) => updateData({ timezone: e.target.value })}
            error={errors.timezone}
            options={TIMEZONE_OPTIONS}
          />

          <Select
            label="Language"
            value={data.language}
            onChange={(e) => updateData({ language: e.target.value })}
            error={errors.language}
            options={LANGUAGE_OPTIONS}
          />

          <Select
            label="Date Format"
            value={data.dateFormat}
            onChange={(e) => updateData({ dateFormat: e.target.value })}
            error={errors.dateFormat}
            options={DATE_FORMAT_OPTIONS}
          />

          <Select
            label="Currency"
            value={data.currency}
            onChange={(e) => updateData({ currency: e.target.value })}
            error={errors.currency}
            options={CURRENCY_OPTIONS}
          />
        </div>
      </motion.div>
    </div>
  )
}
