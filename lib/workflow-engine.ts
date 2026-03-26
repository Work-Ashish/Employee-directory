const DJANGO_BASE = process.env.DJANGO_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
const DJANGO_SERVICE_TOKEN = process.env.DJANGO_SERVICE_TOKEN || ""

/** Approval actions matching the Django backend */
export type ApprovalAction = "APPROVE" | "REJECT" | "REQUEST_INFO"

export class WorkflowEngine {

    static async initiateWorkflow(templateId: string, entityId: string, requesterId: string, organizationId: string) {
        const response = await fetch(`${DJANGO_BASE}/api/v1/workflows/initiate/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Token ${DJANGO_SERVICE_TOKEN}` },
            body: JSON.stringify({
                template_id: templateId,
                entity_id: entityId,
                requester_id: requesterId,
                organization_id: organizationId,
            }),
            signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
            const errorBody = await response.text()
            throw new Error(`Failed to initiate workflow: ${response.status} ${errorBody}`)
        }

        const json = await response.json()
        return json.data ?? json
    }

    static async processAction(instanceId: string, actorId: string, organizationId: string, action: ApprovalAction, comments?: string) {
        const response = await fetch(`${DJANGO_BASE}/api/v1/workflows/action/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Token ${DJANGO_SERVICE_TOKEN}` },
            body: JSON.stringify({
                instance_id: instanceId,
                actor_id: actorId,
                organization_id: organizationId,
                action,
                comments,
            }),
            signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
            const errorBody = await response.text()
            throw new Error(`Failed to process workflow action: ${response.status} ${errorBody}`)
        }

        const json = await response.json()
        return json.data ?? json
    }
}
