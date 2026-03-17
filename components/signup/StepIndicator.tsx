"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Step metadata                                                      */
/* ------------------------------------------------------------------ */
interface StepDef {
  label: string
  icon: (active: boolean) => React.ReactNode
}

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path
      d="M4.5 9.5L7.5 12.5L13.5 6.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const BuildingIcon = ({ active }: { active: boolean }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    className={active ? "text-white" : "text-[var(--text3)]"}
  >
    <path
      d="M3 15V4.5C3 3.67 3.67 3 4.5 3H9C9.83 3 10.5 3.67 10.5 4.5V15M10.5 8H13.5C14.33 8 15 8.67 15 9.5V15M6 6.5H7.5M6 9.5H7.5M6 12.5H7.5M12 11H13.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line x1="2" y1="15" x2="16" y2="15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

const CreditCardIcon = ({ active }: { active: boolean }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    className={active ? "text-white" : "text-[var(--text3)]"}
  >
    <rect
      x="2"
      y="4"
      width="14"
      height="10"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <line x1="2" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.4" />
    <line x1="5" y1="11" x2="8" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

const UsersIcon = ({ active }: { active: boolean }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    className={active ? "text-white" : "text-[var(--text3)]"}
  >
    <circle cx="6.5" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M2 14.5C2 12.29 3.79 10.5 6 10.5H7C9.21 10.5 11 12.29 11 14.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <circle cx="12.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M13 10.5C14.66 10.5 16 11.84 16 13.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
)

const GearIcon = ({ active }: { active: boolean }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    className={active ? "text-white" : "text-[var(--text3)]"}
  >
    <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M9 2.5L9.9 4.3C10 4.5 10.3 4.6 10.5 4.5L12.3 3.6L11.5 5.5C11.4 5.7 11.5 6 11.7 6.1L13.5 7L11.7 7.9C11.5 8 11.4 8.3 11.5 8.5L12.3 10.4L10.5 9.5C10.3 9.4 10 9.5 9.9 9.7L9 11.5L8.1 9.7C8 9.5 7.7 9.4 7.5 9.5L5.7 10.4L6.5 8.5C6.6 8.3 6.5 8 6.3 7.9L4.5 7L6.3 6.1C6.5 6 6.6 5.7 6.5 5.5L5.7 3.6L7.5 4.5C7.7 4.6 8 4.5 8.1 4.3L9 2.5Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
)

const RocketIcon = ({ active }: { active: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    className={active ? "text-white" : "text-[var(--text3)]"}
  >
    <path
      d="M8 2c0 0-3.5 2.5-3.5 6.5L6 10l2 1.5L10 10l1.5-1.5C11.5 4.5 8 2 8 2z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <circle cx="8" cy="7" r="1.2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5.5 12L4.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M10.5 12L11.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
)

const STEPS: StepDef[] = [
  { label: "Profile & KYC", icon: (a) => <BuildingIcon active={a} /> },
  { label: "Payment Setup", icon: (a) => <CreditCardIcon active={a} /> },
  { label: "Team Setup", icon: (a) => <UsersIcon active={a} /> },
  { label: "Feature Config", icon: (a) => <GearIcon active={a} /> },
  { label: "Go Live", icon: (a) => <RocketIcon active={a} /> },
]

/* ------------------------------------------------------------------ */
/*  Circle component for each step                                     */
/* ------------------------------------------------------------------ */
function StepCircle({
  index,
  currentStep,
}: {
  index: number
  currentStep: number
}) {
  const isCompleted = index < currentStep
  const isActive = index === currentStep
  const isFuture = index > currentStep

  return (
    <div className="relative flex flex-col items-center">
      {/* Circle wrapper — pulse ring is positioned relative to this */}
      <div className="relative flex items-center justify-center">
        {/* Pulse ring for active step */}
        {isActive && (
          <motion.div
            className="absolute inset-0 m-auto w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-[var(--accent)]"
            animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Circle */}
        <motion.div
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full",
          "w-8 h-8 sm:w-10 sm:h-10",
          "transition-colors duration-300",
          isCompleted && "bg-[var(--green)] text-white",
          isActive && "bg-[var(--accent)] text-white",
          isFuture &&
            "bg-transparent border-2 border-[var(--border2)] text-[var(--text3)]",
        )}
        animate={
          isCompleted
            ? { scale: 1 }
            : isActive
              ? { scale: 1.1 }
              : { scale: 1 }
        }
        initial={isCompleted ? { scale: 1.2 } : undefined}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {isCompleted ? (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
          >
            <CheckIcon />
          </motion.span>
        ) : (
          STEPS[index].icon(isActive)
        )}
      </motion.div>
      </div>

      {/* Label — hidden on xs, visible sm+ */}
      <span
        className={cn(
          "hidden sm:block mt-2 text-[11px] font-semibold whitespace-nowrap select-none",
          isCompleted && "text-[var(--green)]",
          isActive && "text-[var(--accent)]",
          isFuture && "text-[var(--text4)]",
        )}
      >
        {STEPS[index].label}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Connecting line between steps                                      */
/* ------------------------------------------------------------------ */
function ConnectingLine({
  index,
  currentStep,
}: {
  index: number
  currentStep: number
}) {
  const isCompleted = index < currentStep

  return (
    <div className="flex-1 flex items-center mx-1 sm:mx-2 -mt-4 sm:-mt-3">
      <motion.div
        className={cn(
          "w-full h-[2px] rounded-full origin-left",
          isCompleted ? "bg-[var(--accent)]" : "bg-[var(--border)]",
        )}
        initial={isCompleted ? { scaleX: 0 } : { scaleX: 1 }}
        animate={{ scaleX: 1 }}
        transition={
          isCompleted
            ? { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
            : { duration: 0 }
        }
      />
    </div>
  )
}

/* ================================================================== */
/*  StepIndicator                                                      */
/* ================================================================== */
interface StepIndicatorProps {
  currentStep: number
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav
      aria-label="Signup progress"
      className="flex items-start justify-center w-full max-w-2xl mx-auto px-2 sm:px-0"
    >
      {STEPS.map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-start",
            i < STEPS.length - 1 ? "flex-1" : "",
          )}
        >
          <StepCircle index={i} currentStep={currentStep} />
          {i < STEPS.length - 1 && (
            <ConnectingLine index={i} currentStep={currentStep} />
          )}
        </div>
      ))}
    </nav>
  )
}
