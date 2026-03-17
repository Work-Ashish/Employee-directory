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

const GST_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$/
const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/

const INDUSTRY_OPTIONS = [
  { value: "", label: "Select industry..." },
  { value: "technology", label: "Technology" },
  { value: "finance", label: "Finance" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "retail", label: "Retail" },
  { value: "other", label: "Other" },
]

const COMPANY_SIZE_OPTIONS = [
  { value: "", label: "Select size..." },
  { value: "1-10", label: "1-10" },
  { value: "11-50", label: "11-50" },
  { value: "51-200", label: "51-200" },
  { value: "201-500", label: "201-500" },
  { value: "500+", label: "500+" },
]

const BuildingIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2 14V3a1 1 0 011-1h6a1 1 0 011 1v11M10 8h3a1 1 0 011 1v5M2 14h12M5 5h2M5 8h2M5 11h2"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const GlobeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M2 8h12M8 2c1.66 1.46 2.6 3.63 2.6 6s-.94 4.54-2.6 6c-1.66-1.46-2.6-3.63-2.6-6s.94-4.54 2.6-6z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const MailIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="2"
      y="3"
      width="12"
      height="10"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <path
      d="M2 5l6 4 6-4"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const PhoneIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3.65 2h2.7l1.35 3.15-1.69 1.01a8.37 8.37 0 003.83 3.83l1.01-1.69L14 9.65v2.7A1.35 1.35 0 0112.65 14 10.65 10.65 0 012 3.35 1.35 1.35 0 013.65 2z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const LockIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="3"
      y="7"
      width="10"
      height="7"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <path
      d="M5 7V5a3 3 0 016 0v2"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
)

export function ProfileKycStep({ data, updateData, errors }: StepProps) {
  const isGstValid = data.gstNumber !== "" && GST_REGEX.test(data.gstNumber)
  const isPanValid = data.panNumber !== "" && PAN_REGEX.test(data.panNumber)
  const isKycVerified = isGstValid && isPanValid

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card - Company Information */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0 }}
        >
          <div className="glass-premium rounded-2xl p-6 md:p-8">
            <h3 className="font-bold text-text mb-4">Company Information</h3>
            <div className="space-y-4">
              <Input
                label="Company Name"
                leftIcon={<BuildingIcon />}
                value={data.companyName}
                onChange={(e) => updateData({ companyName: e.target.value })}
                error={errors.companyName}
                placeholder="Acme Corporation"
              />

              <div className="relative">
                <Input
                  label="Domain"
                  leftIcon={<GlobeIcon />}
                  value={data.companyDomain}
                  onChange={(e) =>
                    updateData({
                      companyDomain: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, ""),
                    })
                  }
                  error={errors.companyDomain}
                  placeholder="acme"
                  className="pr-28"
                />
                <span className="absolute right-3 bottom-[calc(0.625rem)] text-xs text-text-3 pointer-events-none">
                  <Badge variant="neutral" size="sm">
                    .emspro.com
                  </Badge>
                </span>
              </div>

              <Select
                label="Industry"
                value={data.industry}
                onChange={(e) => updateData({ industry: e.target.value })}
                error={errors.industry}
                options={INDUSTRY_OPTIONS}
              />

              <Select
                label="Company Size"
                value={data.companySize}
                onChange={(e) => updateData({ companySize: e.target.value })}
                error={errors.companySize}
                options={COMPANY_SIZE_OPTIONS}
              />

              <Input
                label="GST Number"
                value={data.gstNumber}
                onChange={(e) =>
                  updateData({ gstNumber: e.target.value.toUpperCase() })
                }
                error={errors.gstNumber}
                placeholder="22AAAAA0000A1Z5"
                style={{ textTransform: "uppercase" }}
              />

              <Input
                label="PAN Number"
                value={data.panNumber}
                onChange={(e) =>
                  updateData({ panNumber: e.target.value.toUpperCase() })
                }
                error={errors.panNumber}
                placeholder="AAAAA0000A"
                style={{ textTransform: "uppercase" }}
              />
            </div>
          </div>
        </motion.div>

        {/* Right Card - Admin Setup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.15 }}
        >
          <div className="glass-premium rounded-2xl p-6 md:p-8">
            <h3 className="font-bold text-text mb-4">Admin Setup</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={data.adminFirstName}
                  onChange={(e) =>
                    updateData({ adminFirstName: e.target.value })
                  }
                  error={errors.adminFirstName}
                  placeholder="John"
                />
                <Input
                  label="Last Name"
                  value={data.adminLastName}
                  onChange={(e) =>
                    updateData({ adminLastName: e.target.value })
                  }
                  error={errors.adminLastName}
                  placeholder="Doe"
                />
              </div>

              <Input
                label="Email"
                leftIcon={<MailIcon />}
                type="email"
                value={data.adminEmail}
                onChange={(e) => updateData({ adminEmail: e.target.value })}
                error={errors.adminEmail}
                placeholder="john@acme.com"
              />

              <Input
                label="Phone"
                leftIcon={<PhoneIcon />}
                type="tel"
                value={data.adminPhone}
                onChange={(e) => updateData({ adminPhone: e.target.value })}
                error={errors.adminPhone}
                placeholder="+91 9876543210"
              />

              <Input
                label="Password"
                leftIcon={<LockIcon />}
                type="password"
                value={data.adminPassword}
                onChange={(e) =>
                  updateData({ adminPassword: e.target.value })
                }
                error={errors.adminPassword}
                placeholder="Min 8 characters"
              />

              <Input
                label="Confirm Password"
                leftIcon={<LockIcon />}
                type="password"
                value={data.adminConfirmPassword}
                onChange={(e) =>
                  updateData({ adminConfirmPassword: e.target.value })
                }
                error={errors.adminConfirmPassword}
                placeholder="Re-enter password"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* KYC Verified Badge */}
      {isKycVerified && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex justify-center"
        >
          <Badge variant="success" size="lg" dot>
            KYC Verified &mdash; GST &amp; PAN validated
          </Badge>
        </motion.div>
      )}
    </div>
  )
}
