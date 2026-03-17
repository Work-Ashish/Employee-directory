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
                headers: { "Content-Type": "application/json" },
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
        for (const webhook of webhooks) {
            try {
                const deliveryResponse = await fetch(`${DJANGO_BASE}/api/v1/webhooks/deliveries/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
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
