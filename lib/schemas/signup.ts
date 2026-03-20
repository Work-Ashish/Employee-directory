import { z } from "zod"

// Step 1: Profile & KYC
export const profileKycSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  companyDomain: z
    .string()
    .min(3, "Domain must be at least 3 characters")
    .max(30, "Domain must be at most 30 characters")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  industry: z.string().min(1, "Please select an industry"),
  companySize: z.string().min(1, "Please select company size"),
  gstNumber: z
    .string()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$/, "Invalid GST format")
    .or(z.literal("")),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}\d{4}[A-Z]$/, "Invalid PAN format")
    .or(z.literal("")),
  adminFirstName: z.string().min(1, "First name is required"),
  adminLastName: z.string().min(1, "Last name is required"),
  adminEmail: z.string().email("Invalid email address"),
  adminPhone: z.string().min(10, "Phone must be at least 10 digits"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
  adminConfirmPassword: z.string(),
}).refine((data) => data.adminPassword === data.adminConfirmPassword, {
  message: "Passwords do not match",
  path: ["adminConfirmPassword"],
})

// Step 2: Payment Setup (single plan: ₹500/user/month, 15% off annually)
export const paymentSetupSchema = z.object({
  subscriptionTier: z.string().default("growth"),
  billingEmail: z.string().email("Invalid billing email"),
  billingCycle: z.enum(["monthly", "annual"]),
  invoicePreference: z.enum(["email", "download"]),
  cardNumber: z.string().min(19, "Enter a valid 16-digit card number"),
  cardExpiry: z.string().regex(/^\d{2}\/\d{2}$/, "Enter a valid expiry (MM/YY)"),
  cardCvv: z.string().min(3, "CVV must be 3-4 digits").max(4),
  cardName: z.string().min(2, "Name on card is required"),
})

// Step 3: Team Setup
export const teamSetupSchema = z.object({
  teamInvites: z.array(
    z.object({
      email: z.string().email("Invalid email"),
      role: z.string().min(1, "Role is required"),
    })
  ),
})

// Step 4: Feature Config
export const featureConfigSchema = z.object({
  enabledModules: z.record(z.string(), z.boolean()),
  timezone: z.string().min(1, "Timezone is required"),
  language: z.string().min(1, "Language is required"),
  dateFormat: z.string().min(1, "Date format is required"),
  currency: z.string().min(1, "Currency is required"),
})

// Full form data type
export interface SignupFormData {
  // Step 1
  companyName: string
  companyDomain: string
  industry: string
  companySize: string
  gstNumber: string
  panNumber: string
  adminFirstName: string
  adminLastName: string
  adminEmail: string
  adminPhone: string
  adminPassword: string
  adminConfirmPassword: string
  // Step 2
  subscriptionTier: string
  billingEmail: string
  billingCycle: "monthly" | "annual"
  invoicePreference: "email" | "download"
  cardNumber: string
  cardExpiry: string
  cardCvv: string
  cardName: string
  // Step 3
  teamInvites: Array<{ email: string; role: string; name?: string }>
  // Step 4
  enabledModules: Record<string, boolean>
  timezone: string
  language: string
  dateFormat: string
  currency: string
}

export const STEP_SCHEMAS = [
  profileKycSchema,
  paymentSetupSchema,
  teamSetupSchema,
  featureConfigSchema,
  z.object({}),
] as const

export const INITIAL_SIGNUP_DATA: SignupFormData = {
  companyName: "",
  companyDomain: "",
  industry: "",
  companySize: "",
  gstNumber: "",
  panNumber: "",
  adminFirstName: "",
  adminLastName: "",
  adminEmail: "",
  adminPhone: "",
  adminPassword: "",
  adminConfirmPassword: "",
  subscriptionTier: "growth",
  billingEmail: "",
  billingCycle: "annual",
  invoicePreference: "email",
  cardNumber: "",
  cardExpiry: "",
  cardCvv: "",
  cardName: "",
  teamInvites: [],
  enabledModules: {
    employees: true,
    attendance: true,
    leave: true,
    payroll: true,
    performance: true,
    training: true,
    announcements: true,
    assets: true,
    documents: false,
    helpDesk: false,
    recruitment: false,
    resignation: false,
    reports: false,
    teams: false,
    workflows: false,
    calendar: false,
    reimbursement: false,
    aiChatbot: false,
  },
  timezone: "Asia/Kolkata",
  language: "en",
  dateFormat: "DD/MM/YYYY",
  currency: "INR",
}
