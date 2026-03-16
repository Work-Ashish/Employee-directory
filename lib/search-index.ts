import { prisma } from "./prisma"

// ── Entity Types ──

export type IndexableEntity = "EMPLOYEE" | "CANDIDATE" | "DOCUMENT"

// ── Index Builders ──
// Each builder extracts searchable text and metadata from a Prisma record.

interface IndexEntry {
    entityType: IndexableEntity
    entityId: string
    organizationId: string
    title: string
    subtitle: string | null
    searchText: string
    metadata: Record<string, unknown>
}

function buildEmployeeEntry(emp: {
    id: string; firstName: string; lastName: string; email: string
    employeeCode: string; designation: string; phone?: string | null
    organizationId: string; status: string; department?: { name: string } | null
}): IndexEntry {
    const title = `${emp.firstName} ${emp.lastName}`
    const deptName = emp.department?.name || ""
    return {
        entityType: "EMPLOYEE",
        entityId: emp.id,
        organizationId: emp.organizationId,
        title,
        subtitle: emp.designation,
        searchText: [title, emp.email, emp.employeeCode, emp.designation, emp.phone, deptName]
            .filter(Boolean).join(" ").toLowerCase(),
        metadata: { email: emp.email, employeeCode: emp.employeeCode, department: deptName, status: emp.status },
    }
}

function buildCandidateEntry(c: {
    id: string; name: string; email: string; role: string
    phone?: string | null; organizationId: string; stage: string; status: string
    department?: { name: string } | null
}): IndexEntry {
    return {
        entityType: "CANDIDATE",
        entityId: c.id,
        organizationId: c.organizationId,
        title: c.name,
        subtitle: c.role,
        searchText: [c.name, c.email, c.role, c.phone, c.department?.name]
            .filter(Boolean).join(" ").toLowerCase(),
        metadata: { email: c.email, role: c.role, stage: c.stage, status: c.status, department: c.department?.name },
    }
}

function buildDocumentEntry(d: {
    id: string; title: string; category: string
    organizationId: string; employee?: { firstName: string; lastName: string } | null
}): IndexEntry {
    const ownerName = d.employee ? `${d.employee.firstName} ${d.employee.lastName}` : null
    return {
        entityType: "DOCUMENT",
        entityId: d.id,
        organizationId: d.organizationId,
        title: d.title,
        subtitle: d.category,
        searchText: [d.title, d.category, ownerName].filter(Boolean).join(" ").toLowerCase(),
        metadata: { category: d.category, owner: ownerName },
    }
}

// ── Upsert / Delete ──

async function upsertEntry(entry: IndexEntry) {
    await prisma.searchIndex.upsert({
        where: { entityType_entityId: { entityType: entry.entityType, entityId: entry.entityId } },
        create: { ...entry, metadata: entry.metadata as any },
        update: {
            title: entry.title,
            subtitle: entry.subtitle,
            searchText: entry.searchText,
            metadata: entry.metadata as any,
        },
    })
}

async function removeEntry(entityType: IndexableEntity, entityId: string) {
    await prisma.searchIndex.deleteMany({
        where: { entityType, entityId },
    })
}

// ── Sync Handlers (called from API routes after mutations) ──

export async function indexEmployee(employeeId: string) {
    try {
        const emp = await prisma.employee.findUnique({
            where: { id: employeeId },
            include: { department: { select: { name: true } } },
        })
        if (!emp || emp.deletedAt) { return removeEntry("EMPLOYEE", employeeId) }
        await upsertEntry(buildEmployeeEntry(emp))
    } catch (err) {
        console.error("[SEARCH_INDEX] Failed to index employee", employeeId, err)
    }
}

export async function indexCandidate(candidateId: string) {
    try {
        const c = await prisma.candidate.findUnique({
            where: { id: candidateId },
            include: { department: { select: { name: true } } },
        })
        if (!c) { return removeEntry("CANDIDATE", candidateId) }
        await upsertEntry(buildCandidateEntry(c))
    } catch (err) {
        console.error("[SEARCH_INDEX] Failed to index candidate", candidateId, err)
    }
}

export async function indexDocument(documentId: string) {
    try {
        const d = await prisma.document.findUnique({
            where: { id: documentId },
            include: { employee: { select: { firstName: true, lastName: true } } },
        })
        if (!d) { return removeEntry("DOCUMENT", documentId) }
        await upsertEntry(buildDocumentEntry(d))
    } catch (err) {
        console.error("[SEARCH_INDEX] Failed to index document", documentId, err)
    }
}

// ── Bulk Reindex ──

export async function reindexAll(organizationId: string): Promise<{ employees: number; candidates: number; documents: number }> {
    // Clear existing index for org
    await prisma.searchIndex.deleteMany({ where: { organizationId } })

    // Fetch all entities
    const [employees, candidates, documents] = await Promise.all([
        prisma.employee.findMany({
            where: { organizationId, deletedAt: null },
            include: { department: { select: { name: true } } },
        }),
        prisma.candidate.findMany({
            where: { organizationId },
            include: { department: { select: { name: true } } },
        }),
        prisma.document.findMany({
            where: { organizationId },
            include: { employee: { select: { firstName: true, lastName: true } } },
        }),
    ])

    // Build entries
    const entries: IndexEntry[] = [
        ...employees.map(buildEmployeeEntry),
        ...candidates.map(buildCandidateEntry),
        ...documents.map(buildDocumentEntry),
    ]

    // Batch insert (chunks of 100)
    const BATCH = 100
    for (let i = 0; i < entries.length; i += BATCH) {
        const chunk = entries.slice(i, i + BATCH)
        await prisma.searchIndex.createMany({ data: chunk as any, skipDuplicates: true })
    }

    return { employees: employees.length, candidates: candidates.length, documents: documents.length }
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

    const where: any = { organizationId }
    if (options?.entityType) where.entityType = options.entityType

    // Use AND logic: every term must appear in searchText
    where.AND = terms.map(term => ({
        searchText: { contains: term },
    }))

    const results = await prisma.searchIndex.findMany({
        where,
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
            entityType: true,
            entityId: true,
            title: true,
            subtitle: true,
            metadata: true,
            searchText: true,
        },
    })

    // Score: count how many terms match and boost exact title matches
    return results.map(r => {
        let score = 0
        const text = r.searchText
        for (const term of terms) {
            if (text.includes(term)) score += 1
            if (r.title.toLowerCase().includes(term)) score += 2
        }
        return {
            entityType: r.entityType,
            entityId: r.entityId,
            title: r.title,
            subtitle: r.subtitle,
            metadata: r.metadata,
            score,
        }
    }).sort((a, b) => b.score - a.score)
}
