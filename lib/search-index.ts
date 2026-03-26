const DJANGO_BASE = process.env.DJANGO_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
const DJANGO_SERVICE_TOKEN = process.env.DJANGO_SERVICE_TOKEN || ""

// ── Entity Types ──

export type IndexableEntity = "EMPLOYEE" | "CANDIDATE" | "DOCUMENT"

// ── Sync Handlers (called from API routes after mutations) ──

export async function indexEmployee(employeeId: string) {
    try {
        await fetch(`${DJANGO_BASE}/api/v1/search/index/employee/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Token ${DJANGO_SERVICE_TOKEN}` },
            body: JSON.stringify({ employee_id: employeeId }),
            signal: AbortSignal.timeout(5000),
        })
    } catch (err) {
        console.error("[SEARCH_INDEX] Failed to index employee", employeeId, err)
    }
}

export async function indexCandidate(candidateId: string) {
    try {
        await fetch(`${DJANGO_BASE}/api/v1/search/index/candidate/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Token ${DJANGO_SERVICE_TOKEN}` },
            body: JSON.stringify({ candidate_id: candidateId }),
            signal: AbortSignal.timeout(5000),
        })
    } catch (err) {
        console.error("[SEARCH_INDEX] Failed to index candidate", candidateId, err)
    }
}

export async function indexDocument(documentId: string) {
    try {
        await fetch(`${DJANGO_BASE}/api/v1/search/index/document/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Token ${DJANGO_SERVICE_TOKEN}` },
            body: JSON.stringify({ document_id: documentId }),
            signal: AbortSignal.timeout(5000),
        })
    } catch (err) {
        console.error("[SEARCH_INDEX] Failed to index document", documentId, err)
    }
}

// ── Bulk Reindex ──

export async function reindexAll(organizationId: string): Promise<{ employees: number; candidates: number; documents: number }> {
    try {
        const response = await fetch(`${DJANGO_BASE}/api/v1/search/reindex/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Token ${DJANGO_SERVICE_TOKEN}` },
            body: JSON.stringify({ organization_id: organizationId }),
            signal: AbortSignal.timeout(60000),
        })

        if (!response.ok) {
            throw new Error(`Reindex failed: ${response.status}`)
        }

        const json = await response.json()
        const data = json.data ?? json
        return {
            employees: data.employees ?? 0,
            candidates: data.candidates ?? 0,
            documents: data.documents ?? 0,
        }
    } catch (err) {
        console.error("[SEARCH_INDEX] Reindex failed", err)
        return { employees: 0, candidates: 0, documents: 0 }
    }
}

// ── Search Query ──

export async function searchIndex(
    organizationId: string,
    query: string,
    options?: { entityType?: IndexableEntity; limit?: number }
): Promise<Array<{
    entityType: string; entityId: string; title: string
    subtitle: string | null; metadata: unknown; score: number
}>> {
    const limit = options?.limit ?? 20
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return []

    try {
        const params = new URLSearchParams({
            organization_id: organizationId,
            q: query,
            limit: String(limit),
        })
        if (options?.entityType) {
            params.set("entity_type", options.entityType)
        }

        const response = await fetch(`${DJANGO_BASE}/api/v1/search/?${params.toString()}`, {
            headers: { "Content-Type": "application/json", "Authorization": `Token ${DJANGO_SERVICE_TOKEN}` },
            signal: AbortSignal.timeout(5000),
        })

        if (!response.ok) return []

        const json = await response.json()
        const results = json.data ?? json.results ?? json

        if (!Array.isArray(results)) return []

        return results.map((r: Record<string, unknown>) => ({
            entityType: String(r.entity_type ?? r.entityType ?? ""),
            entityId: String(r.entity_id ?? r.entityId ?? ""),
            title: String(r.title ?? ""),
            subtitle: r.subtitle != null ? String(r.subtitle) : null,
            metadata: r.metadata ?? {},
            score: Number(r.score ?? 0),
        }))
    } catch (err) {
        console.error("[SEARCH_INDEX] Search failed", err)
        return []
    }
}
