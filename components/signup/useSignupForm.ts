"use client"

import { useState, useCallback } from "react"
import {
  STEP_SCHEMAS,
  INITIAL_SIGNUP_DATA,
  type SignupFormData,
} from "@/lib/schemas/signup"

export type Direction = "forward" | "backward"

export function useSignupForm() {
  const [data, setData] = useState<SignupFormData>(INITIAL_SIGNUP_DATA)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<Direction>("forward")

  const updateData = useCallback(
    (partial: Partial<SignupFormData>) => {
      setData((prev) => ({ ...prev, ...partial }))
      // Clear errors for updated fields
      const keys = Object.keys(partial)
      if (keys.length > 0) {
        setErrors((prev) => {
          const next = { ...prev }
          keys.forEach((k) => delete next[k])
          return next
        })
      }
    },
    []
  )

  const validateStep = useCallback(
    (step: number): boolean => {
      const schema = STEP_SCHEMAS[step]
      if (!schema) return true

      const result = schema.safeParse(data)
      if (!result.success) {
        const fieldErrors: Record<string, string> = {}
        for (const issue of result.error.issues) {
          const key = issue.path.join(".")
          if (!fieldErrors[key]) {
            fieldErrors[key] = issue.message
          }
        }
        setErrors(fieldErrors)
        return false
      }

      setErrors({})
      return true
    },
    [data]
  )

  const goNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setDirection("forward")
      setCurrentStep((prev) => Math.min(prev + 1, 4))
      return true
    }
    return false
  }, [currentStep, validateStep])

  const goBack = useCallback(() => {
    setDirection("backward")
    setErrors({})
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }, [])

  const goToStep = useCallback((step: number) => {
    setDirection(step > currentStep ? "forward" : "backward")
    setErrors({})
    setCurrentStep(step)
  }, [currentStep])

  return {
    data,
    updateData,
    errors,
    currentStep,
    direction,
    goNext,
    goBack,
    goToStep,
    validateStep,
  }
}
