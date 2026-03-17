"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"

import { useSignupForm } from "./useSignupForm"
import SignupBackground from "./SignupBackground"
import StepIndicator from "./StepIndicator"
import { ProfileKycStep } from "./steps/ProfileKycStep"
import { PaymentSetupStep } from "./steps/PaymentSetupStep"
import { TeamSetupStep } from "./steps/TeamSetupStep"
import FeatureConfigStep from "./steps/FeatureConfigStep"
import GoLiveStep from "./steps/GoLiveStep"

import { register } from "@/lib/django-auth"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

const STEP_TITLES = [
  "Set up your organization",
  "Choose your plan",
  "Build your team",
  "Configure your platform",
  "Launch!",
]

function fireConfetti() {
  const defaults = {
    startVelocity: 30,
    spread: 360,
    ticks: 80,
    zIndex: 9999,
    colors: ["#007aff", "#34c759", "#af52de", "#5ac8fa", "#ff9500"],
  }

  confetti({ ...defaults, particleCount: 80, origin: { x: 0.2, y: 0.6 } })
  confetti({ ...defaults, particleCount: 120, origin: { x: 0.5, y: 0.5 } })
  setTimeout(() => {
    confetti({ ...defaults, particleCount: 80, origin: { x: 0.8, y: 0.6 } })
  }, 200)
}

export function SignupWizard() {
  const router = useRouter()
  const {
    data,
    updateData,
    errors,
    currentStep,
    direction,
    goNext,
    goBack,
    goToStep,
  } = useSignupForm()

  const [isLaunching, setIsLaunching] = useState(false)
  const [launchError, setLaunchError] = useState("")

  const handleLaunch = useCallback(async () => {
    setIsLaunching(true)
    setLaunchError("")

    try {
      await register({
        tenantName: data.companyName,
        tenantSlug: data.companyDomain,
        email: data.adminEmail,
        password: data.adminPassword,
        firstName: data.adminFirstName,
        lastName: data.adminLastName,
      })

      // Fire confetti celebration
      fireConfetti()

      // Wait for confetti to be visible, then redirect
      setTimeout(() => {
        router.push("/")
      }, 2500)
    } catch (err: unknown) {
      const isNetworkError =
        err instanceof TypeError && /failed to fetch|network/i.test(err.message)

      if (isNetworkError) {
        // Backend not reachable — proceed in offline/demo mode
        // Store signup data locally so the app can pick it up
        try {
          localStorage.setItem("signup_data", JSON.stringify({
            companyName: data.companyName,
            companyDomain: data.companyDomain,
            adminEmail: data.adminEmail,
            adminFirstName: data.adminFirstName,
            adminLastName: data.adminLastName,
            subscriptionTier: data.subscriptionTier,
            billingCycle: data.billingCycle,
          }))
          localStorage.setItem("tenant_slug", data.companyDomain)
        } catch {
          // localStorage not available — non-fatal
        }

        fireConfetti()
        setTimeout(() => {
          router.push("/")
        }, 2500)
        return
      }

      const message =
        err instanceof Error ? err.message : "Registration failed. Please try again."
      setLaunchError(message)
      setIsLaunching(false)
    }
  }, [data, router])

  const renderStep = () => {
    const stepProps = { data, updateData, errors }

    switch (currentStep) {
      case 0:
        return <ProfileKycStep {...stepProps} />
      case 1:
        return <PaymentSetupStep {...stepProps} />
      case 2:
        return <TeamSetupStep {...stepProps} />
      case 3:
        return <FeatureConfigStep {...stepProps} />
      case 4:
        return (
          <GoLiveStep
            {...stepProps}
            goToStep={goToStep}
            onLaunch={handleLaunch}
            isLaunching={isLaunching}
          />
        )
      default:
        return null
    }
  }

  const slideVariants = {
    enter: (dir: string) => ({
      x: dir === "forward" ? 60 : -60,
      opacity: 0,
      scale: 0.97,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: string) => ({
      x: dir === "forward" ? -60 : 60,
      opacity: 0,
      scale: 0.97,
    }),
  }

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col bg-bg overflow-hidden">
      <SignupBackground />

      {/* Content layer */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <motion.div
          className="pt-8 pb-2 px-4 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text">
            Platform{" "}
            <span className="bg-gradient-to-r from-accent to-[#5ac8fa] bg-clip-text text-transparent">
              Onboarding
            </span>
          </h1>
          <p className="mt-1 text-sm text-text-3">
            5-step setup wizard — get your HR platform live in minutes
          </p>
        </motion.div>

        {/* Step Indicator */}
        <motion.div
          className="px-4 py-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <StepIndicator currentStep={currentStep} />
        </motion.div>

        {/* Step subtitle */}
        <div className="text-center px-4 mb-2">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentStep}
              className="text-sm font-medium text-text-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {STEP_TITLES[currentStep]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32 scrollbar-thin scrollbar-thumb-bg-3 scrollbar-track-transparent">
          <div className="max-w-5xl mx-auto">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  duration: 0.4,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation Footer */}
        {currentStep < 4 && (
          <motion.div
            className={cn(
              "fixed bottom-0 left-0 right-0 z-20",
              "bg-surface/80 backdrop-blur-xl border-t border-border",
              "px-4 md:px-8 py-4"
            )}
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={goBack}
                disabled={currentStep === 0}
                className={cn(currentStep === 0 && "opacity-0 pointer-events-none")}
                leftIcon={
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M10 12L6 8L10 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              >
                Back
              </Button>

              <Button
                variant="primary"
                onClick={goNext}
                rightIcon={
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M6 4L10 8L6 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              >
                Next Step
              </Button>
            </div>
          </motion.div>
        )}

        {/* Launch Error */}
        {launchError && (
          <motion.div
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 bg-red-dim text-red px-6 py-3 rounded-xl border border-red/20 shadow-lg text-sm font-medium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {launchError}
          </motion.div>
        )}
      </div>
    </div>
  )
}
