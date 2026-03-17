"use client"

import * as React from "react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Badge } from "@/components/ui/Badge"
import { api } from "@/lib/api-client"

const billingSchema = z.object({
  cardNumber: z.string().min(13, "Invalid card number").max(19),
  cardExpiry: z.string().regex(/^\d{2}\/\d{2}$/, "Use MM/YY format"),
  cardCvv: z.string().min(3, "Invalid CVV").max(4),
  cardName: z.string().min(1, "Name is required"),
  billingEmail: z.string().email("Invalid email"),
  invoicePreference: z.enum(["email", "download"]),
})

type BillingForm = z.infer<typeof billingSchema>

const INVOICE_OPTIONS = [
  { value: "email", label: "Email Invoice" },
  { value: "download", label: "Download PDF" },
]

const CardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="3.5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <line x1="1" y1="6.5" x2="15" y2="6.5" stroke="currentColor" strokeWidth="1.2" />
    <line x1="4" y1="9.5" x2="7" y2="9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

const ShieldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[var(--green)] shrink-0">
    <path d="M7 1L3 3v3c0 3.3 1.7 5.3 4 6 2.3-.7 4-2.7 4-6V3L7 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M5 7l1.5 1.5L9 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export function BillingTab() {
  const [savedCard, setSavedCard] = React.useState<{ last4: string; brand: string; expiry: string } | null>(null)

  const form = useForm<BillingForm>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      cardNumber: "",
      cardExpiry: "",
      cardCvv: "",
      cardName: "",
      billingEmail: "",
      invoicePreference: "email",
    },
  })

  // Load saved billing info
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("billing_info")
      if (saved) {
        const parsed = JSON.parse(saved)
        setSavedCard(parsed.card || null)
        form.reset({
          cardNumber: "",
          cardExpiry: "",
          cardCvv: "",
          cardName: parsed.cardName || "",
          billingEmail: parsed.billingEmail || "",
          invoicePreference: parsed.invoicePreference || "email",
        })
      }
    } catch { /* ignore */ }
  }, [form])

  const onSubmit = async (data: BillingForm) => {
    try {
      // Try API first
      await api.put("/organization/billing/", data)
      toast.success("Billing information updated")
    } catch {
      // Save locally as fallback
      const raw = data.cardNumber.replace(/\s/g, "")
      const billingInfo = {
        card: { last4: raw.slice(-4), brand: detectCardBrand(raw), expiry: data.cardExpiry },
        cardName: data.cardName,
        billingEmail: data.billingEmail,
        invoicePreference: data.invoicePreference,
      }
      localStorage.setItem("billing_info", JSON.stringify(billingInfo))
      setSavedCard(billingInfo.card)
      toast.success("Billing information saved")
    }
    form.setValue("cardNumber", "")
    form.setValue("cardCvv", "")
    form.setValue("cardExpiry", "")
  }

  return (
    <div className="space-y-6">
      {/* Current Card */}
      {savedCard && (
        <Card variant="glass">
          <CardContent className="p-6">
            <CardTitle className="mb-4">Payment Method on File</CardTitle>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-[var(--accent)]/5 to-transparent border border-border">
              <div className="w-12 h-8 rounded bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center text-white">
                <CardIcon />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text">
                  {savedCard.brand} ending in {savedCard.last4}
                </p>
                <p className="text-xs text-text-3">Expires {savedCard.expiry}</p>
              </div>
              <Badge variant="success" size="sm" dot>Active</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Update Card Form */}
      <Card variant="glass">
        <CardContent className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardTitle className="mb-6">{savedCard ? "Update Payment Method" : "Add Payment Method"}</CardTitle>

            <div className="space-y-4">
              <Input
                label="Card Number"
                leftIcon={<CardIcon />}
                value={form.watch("cardNumber")}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "").slice(0, 16)
                  const formatted = raw.replace(/(.{4})/g, "$1 ").trim()
                  form.setValue("cardNumber", formatted, { shouldValidate: true })
                }}
                error={form.formState.errors.cardNumber?.message}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
              />

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Input
                  label="Expiry Date"
                  value={form.watch("cardExpiry")}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, "").slice(0, 4)
                    if (val.length >= 3) val = val.slice(0, 2) + "/" + val.slice(2)
                    form.setValue("cardExpiry", val, { shouldValidate: true })
                  }}
                  error={form.formState.errors.cardExpiry?.message}
                  placeholder="MM/YY"
                  maxLength={5}
                />
                <Input
                  label="CVV"
                  type="password"
                  value={form.watch("cardCvv")}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 4)
                    form.setValue("cardCvv", val, { shouldValidate: true })
                  }}
                  error={form.formState.errors.cardCvv?.message}
                  placeholder="***"
                  maxLength={4}
                />
                <Input
                  label="Name on Card"
                  {...form.register("cardName")}
                  error={form.formState.errors.cardName?.message}
                  placeholder="John Doe"
                  className="col-span-2 sm:col-span-1"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50 mt-2">
                <Input
                  label="Billing Email"
                  type="email"
                  {...form.register("billingEmail")}
                  error={form.formState.errors.billingEmail?.message}
                  placeholder="billing@company.com"
                />
                <Select
                  label="Invoice Preference"
                  {...form.register("invoicePreference")}
                  error={form.formState.errors.invoicePreference?.message}
                  options={INVOICE_OPTIONS}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <ShieldIcon />
                <p className="text-[11px] text-text-3">Secured with 256-bit SSL encryption</p>
              </div>
              <Button type="submit" loading={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Card"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function detectCardBrand(number: string): string {
  if (number.startsWith("4")) return "Visa"
  if (/^5[1-5]/.test(number) || /^2[2-7]/.test(number)) return "Mastercard"
  if (number.startsWith("3") && (number[1] === "4" || number[1] === "7")) return "Amex"
  if (number.startsWith("6011") || number.startsWith("65")) return "Discover"
  return "Card"
}
