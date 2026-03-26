/**
 * POST /api/features/configure — Persist feature flag configuration.
 *
 * Called during onboarding to save the admin's module toggle selections.
 * Attempts to sync each flag to Django's TenantFeature table via PATCH.
 * Returns the saved config regardless of Django sync outcome.
 */
import { NextResponse } from "next/server"
import { withAuth, AuthContext } from "@/lib/security"
import { Module, Action } from "@/lib/permissions"

const DJANGO_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

/**
 * Maps frontend module keys to Django feature flag codenames.
 * Must stay in sync with the seed_features Django management command.
 */
const MODULE_TO_CODENAME: Record<string, string> = {
  employees: "employees",
  attendance: "attendance",
  leave: "leave",
  payroll: "payroll",
  performance: "performance",
  training: "training",
  announcements: "announcements",
  assets: "assets",
  documents: "documents",
  helpDesk: "help_desk",
  recruitment: "recruitment",
  resignation: "resignation",
  reports: "reports",
  teams: "teams",
  workflows: "workflows",
  calendar: "calendar",
  reimbursement: "reimbursement",
  aiChatbot: "ai_chatbot",
  feedback: "feedback",
}

interface ConfigureRequest {
  enabledModules: Record<string, boolean>
  tenantSlug: string
}

/** Attempt to PATCH a single feature flag in Django */
async function syncFeatureToDjango(
  codename: string,
  isEnabled: boolean,
  token: string,
  tenantSlug: string
): Promise<boolean> {
  try {
    const res = await fetch(`${DJANGO_BASE}/api/v1/features/${codename}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Tenant-Slug": tenantSlug,
      },
      body: JSON.stringify({ is_enabled: isEnabled }),
    })
    return res.ok
  } catch {
    return false
  }
}

async function handlePOST(req: Request) {
  try {
    const body = (await req.json()) as ConfigureRequest
    const { enabledModules, tenantSlug } = body

    if (!enabledModules || !tenantSlug) {
      return NextResponse.json(
        { error: "enabledModules and tenantSlug are required" },
        { status: 400 }
      )
    }

    // Build the codename→enabled map for Django
    const featureFlags: Record<string, boolean> = {}
    for (const [moduleKey, enabled] of Object.entries(enabledModules)) {
      const codename = MODULE_TO_CODENAME[moduleKey]
      if (codename) {
        featureFlags[codename] = enabled
      }
    }

    // Try to sync to Django (best-effort, fire-and-forget per flag)
    const authHeader = req.headers.get("Authorization")
    const token = authHeader?.replace("Bearer ", "") || ""
    let djangoSynced = 0

    if (token) {
      const syncResults = await Promise.allSettled(
        Object.entries(featureFlags).map(([codename, enabled]) =>
          syncFeatureToDjango(codename, enabled, token, tenantSlug)
        )
      )
      djangoSynced = syncResults.filter(
        (r) => r.status === "fulfilled" && r.value === true
      ).length
    }

    return NextResponse.json({
      data: {
        featureFlags,
        djangoSynced,
        totalFlags: Object.keys(featureFlags).length,
      },
    })
  } catch (error) {
    console.error("[FEATURE_CONFIGURE_ERROR]", error)
    return NextResponse.json(
      { error: "Failed to configure features" },
      { status: 500 }
    )
  }
}

export const POST = withAuth({ module: Module.SETTINGS, action: Action.UPDATE }, handlePOST)
