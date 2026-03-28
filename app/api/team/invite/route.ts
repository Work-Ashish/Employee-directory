/**
 * POST /api/team/invite — Invite team members during onboarding.
 *
 * For each invite: generates an employee ID + temp password,
 * calls Django to create the employee, and sends a welcome email.
 */
import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"
import crypto from "crypto"
import { withAuth, AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

interface InvitePayload {
  email: string
  role: string
  name?: string
}

interface InviteRequest {
  invites: InvitePayload[]
  organizationName: string
  organizationSlug: string
}

const DJANGO_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const ROLE_LABELS: Record<string, string> = {
  hr_manager: "HR Manager",
  payroll_admin: "Payroll Admin",
  team_lead: "Team Lead",
  employee: "Employee",
}

/** Generate a secure 12-char temporary password */
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$"
  const bytes = crypto.randomBytes(12)
  return Array.from(bytes, (b) => chars[b % chars.length]).join("")
}

/** Generate employee code: EMP-XXXX (zero-padded sequence) */
function generateEmployeeCode(index: number): string {
  return `EMP-${String(index).padStart(4, "0")}`
}

/** Try to create the employee record in Django (best-effort) */
async function createDjangoEmployee(
  invite: InvitePayload,
  employeeCode: string,
  token: string,
  tenantSlug: string
): Promise<{ ok: boolean; data?: Record<string, unknown> }> {
  try {
    const [firstName, ...rest] = (invite.name || invite.email.split("@")[0]).split(" ")
    const lastName = rest.join(" ") || ""

    const res = await fetch(`${DJANGO_BASE}/api/v1/employees/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Tenant-Slug": tenantSlug,
      },
      body: JSON.stringify({
        employee_code: employeeCode,
        first_name: firstName,
        last_name: lastName,
        email: invite.email,
        status: "active",
      }),
    })

    if (res.ok) {
      const data = await res.json()
      return { ok: true, data }
    }
    return { ok: false }
  } catch {
    return { ok: false }
  }
}

/** Build the invite email HTML */
function buildInviteEmail(params: {
  name: string
  email: string
  role: string
  employeeCode: string
  password: string
  organizationName: string
  organizationSlug: string
}): string {
  const loginUrl = process.env.NEXTAUTH_URL || "https://app.ems-pro.com"
  const roleLabel = ROLE_LABELS[params.role] || params.role

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0;">
          Welcome to ${params.organizationName}
        </h1>
        <p style="color: #666; font-size: 14px; margin-top: 8px;">
          You've been invited to join the HR platform as <strong>${roleLabel}</strong>
        </p>
      </div>

      <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="font-size: 14px; color: #666; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.5px;">
          Your Login Credentials
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px; width: 140px;">Organization ID</td>
            <td style="padding: 8px 0; font-weight: 600; color: #1a1a1a; font-size: 14px;">${params.organizationSlug}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">Employee ID</td>
            <td style="padding: 8px 0; font-weight: 600; color: #1a1a1a; font-size: 14px;">${params.employeeCode}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">Email</td>
            <td style="padding: 8px 0; font-weight: 600; color: #1a1a1a; font-size: 14px;">${params.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">Temporary Password</td>
            <td style="padding: 8px 0; font-weight: 600; color: #1a1a1a; font-size: 14px; font-family: monospace; letter-spacing: 1px;">${params.password}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">Role</td>
            <td style="padding: 8px 0; font-weight: 600; color: #1a1a1a; font-size: 14px;">${roleLabel}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin-bottom: 16px;">
        <a href="${loginUrl}/onboarding?tenant=${encodeURIComponent(params.organizationSlug)}&email=${encodeURIComponent(params.email)}"
           style="display: inline-block; background: #007aff; color: #fff; text-decoration: none;
                  padding: 14px 36px; border-radius: 8px; font-weight: 600; font-size: 15px;">
          Complete Your Onboarding
        </a>
      </div>

      <p style="color: #999; font-size: 12px; text-align: center; margin: 0 0 8px;">
        Or log in directly at <a href="${loginUrl}/login" style="color: #007aff;">${loginUrl}/login</a>
      </p>
      <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
        You will be asked to change your password on first login, then complete your onboarding profile.
        If you did not expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `
}

async function handlePOST(req: Request) {
  try {
    const body = (await req.json()) as InviteRequest
    const { invites, organizationName, organizationSlug } = body

    if (!invites?.length) {
      return NextResponse.json({ error: "No invites provided" }, { status: 400 })
    }

    // Get admin token from Authorization header (set after login)
    const authHeader = req.headers.get("Authorization")
    const token = authHeader?.replace("Bearer ", "") || ""

    const results: Array<{
      email: string
      employeeCode: string
      role: string
      emailSent: boolean
      employeeCreated: boolean
    }> = []

    for (let i = 0; i < invites.length; i++) {
      const invite = invites[i]
      const employeeCode = generateEmployeeCode(i + 2) // EMP-0001 is admin, start from EMP-0002
      const password = generatePassword()
      const name = invite.name || invite.email.split("@")[0].replace(/[._-]/g, " ")

      // Try to create employee in Django
      let employeeCreated = false
      if (token) {
        const djangoResult = await createDjangoEmployee(invite, employeeCode, token, organizationSlug)
        employeeCreated = djangoResult.ok
      }

      // Send invite email
      const emailSent = await sendEmail({
        to: invite.email,
        subject: `You're invited to join ${organizationName} on EMS Pro`,
        html: buildInviteEmail({
          name,
          email: invite.email,
          role: invite.role,
          employeeCode,
          password,
          organizationName,
          organizationSlug,
        }),
      })

      results.push({
        email: invite.email,
        employeeCode,
        role: invite.role,
        emailSent,
        employeeCreated,
      })
    }

    return NextResponse.json({ data: results })
  } catch (error) {
    console.error("[TEAM_INVITE_ERROR]", error)
    return NextResponse.json(
      { error: "Failed to process invites" },
      { status: 500 }
    )
  }
}

export const POST = withAuth({ module: Module.EMPLOYEES, action: Action.CREATE }, handlePOST)
