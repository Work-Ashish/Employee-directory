import crypto from "node:crypto"
import { queue } from "./queue"

const DJANGO_BASE = process.env.DJANGO_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export const WEBHOOK_EVENTS = {
    EMPLOYEE_CREATED: "employee.created",
    EMPLOYEE_UPDATED: "employee.updated",
    PAYROLL_FINALIZED: "payroll.finalized",
    ATTENDANCE_LATE: "attendance.late",
    AGENT_DEVICE_REGISTERED: "agent.device.registered",
    AGENT_COMMAND_EXECUTED: "agent.command.executed",
    AGENT_REPORT_GENERATED: "agent.report.generated",
} as const

export type WebhookEventType = typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS]

/**
 * Creates an HMAC-SHA256 signature for the given payload and secret.
 */
export function createHmacSignature(payload: string, secret: string): string {
    return crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex")
}

/**
 * Checks if a URL points to a private/reserved IP address.
 * First-layer SSRF defense — blocks literal private IPs, localhost, and internal hostnames.
 * NOTE: Does not prevent DNS rebinding attacks. A complete solution requires DNS resolution.
 */
function isPrivateUrl(urlString: string): boolean {
    try {
        const url = new URL(urlString)
        const hostname = url.hostname

        if (
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname === "::1" ||
            hostname === "[::1]" ||
            hostname === "0.0.0.0" ||
            hostname.startsWith("::ffff:127.") ||
            hostname.startsWith("0:0:0:0:0:ffff:") ||
            hostname.startsWith("::ffff:10.") ||
            hostname.startsWith("::ffff:192.168.") ||
            hostname.startsWith("10.") ||
            hostname.startsWith("192.168.") ||
            hostname === "169.254.169.254" ||
            hostname.endsWith(".internal") ||
            hostname.endsWith(".local")
        ) {
            return true
        }

        // Block 172.16.0.0/12 range
        if (hostname.startsWith("172.")) {
            const second = parseInt(hostname.split(".")[1], 10)
            if (second >= 16 && second <= 31) return true
        }

        return false
    } catch {
        return true // Invalid URL = blocked
    }
}

/**
 * Dispatches a webhook event by finding matching active webhooks from Django
 * and enqueuing delivery jobs.
 */
export async function dispatchWebhookEvent(
    organizationId: string,
    event: WebhookEventType,
    data: unknown
) {
    try {
        // Find active webhooks for this org subscribed to this event via Django API
        const response = await fetch(
            `${DJANGO_BASE}/api/v1/webhooks/active/?organization_id=${encodeURIComponent(organizationId)}&event=${encodeURIComponent(event)}`,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Token ${process.env.DJANGO_SERVICE_TOKEN || ""}`,
                },
                signal: AbortSignal.timeout(5000),
            }
        )

        if (!response.ok) return

        const json = await response.json()
        const webhooks: Array<{ id: string; url: string; secret?: string }> = json.data ?? json.results ?? json

        if (!Array.isArray(webhooks) || webhooks.length === 0) return

        const payload = {
            id: `wh_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
            event,
            data,
            timestamp: new Date().toISOString()
        }

        // Create delivery records via Django and enqueue jobs
        for (const webhook of webhooks.filter(w => !isPrivateUrl(w.url))) {
            try {
                const deliveryResponse = await fetch(`${DJANGO_BASE}/api/v1/webhooks/deliveries/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Token ${process.env.DJANGO_SERVICE_TOKEN || ""}`,
                    },
                    body: JSON.stringify({
                        webhook_id: webhook.id,
                        event,
                        payload,
                        status: "PENDING",
                    }),
                    signal: AbortSignal.timeout(5000),
                })

                if (deliveryResponse.ok) {
                    const deliveryJson = await deliveryResponse.json()
                    const delivery = deliveryJson.data ?? deliveryJson

                    await queue.enqueue("WEBHOOK_DELIVERY", {
                        deliveryId: delivery.id,
                        webhookId: webhook.id,
                        payload
                    })
                }
            } catch {
                // Continue with other webhooks if one delivery creation fails
            }
        }
    } catch (error) {
        console.error("[WEBHOOK_DISPATCH_ERROR]", error)
    }
}
