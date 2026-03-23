/**
 * /api/departments — Local handler.
 *
 * Django stores "department" as a CharField on Employee, not a separate model.
 * This route derives department entities from unique employee department values
 * and manages department metadata (id, color) via an in-process store.
 *
 * For production, back this with a Django Department model or a KV store.
 * The current approach uses a module-level Map that resets on server restart.
 */
import { NextResponse } from "next/server"

interface DepartmentRecord {
    id: string
    name: string
    color: string
    employeeCount: number
}

// Module-level store keyed by department name (persists within server process).
// Using the name as key ensures the "id" returned to the frontend IS the name,
// so when the form sends departmentId it's the actual department name Django expects.
const departmentStore = new Map<string, { color: string }>()

function getDjangoBase(): string {
    return (
        process.env.DJANGO_GATEWAY_URL ||
        process.env.DJANGO_INTERNAL_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://127.0.0.1:8000"
    )
}

/** Fetch unique department names + counts from Django employees endpoint. */
async function fetchDepartmentsFromDjango(req: Request): Promise<Map<string, number>> {
    const counts = new Map<string, number>()
    try {
        const headers: Record<string, string> = { "Content-Type": "application/json" }
        const auth = req.headers.get("authorization")
        if (auth) headers["Authorization"] = auth
        const slug = req.headers.get("x-tenant-slug") || req.headers.get("X-Tenant-Slug")
        if (slug) headers["X-Tenant-Slug"] = slug

        const res = await fetch(`${getDjangoBase()}/api/v1/employees/?per_page=1000`, {
            headers,
            signal: AbortSignal.timeout(10_000),
        })
        if (res.ok) {
            const json = await res.json()
            const employees = json.data?.results || json.results || (Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [])
            for (const emp of employees) {
                const dept = emp.department
                if (dept && typeof dept === "string" && dept.trim()) {
                    counts.set(dept.trim(), (counts.get(dept.trim()) || 0) + 1)
                }
            }
        }
    } catch {
        // If Django is unreachable, return what we have in the local store
    }
    return counts
}

export async function GET(req: Request) {
    const djangoDepts = await fetchDepartmentsFromDjango(req)

    // Merge Django-sourced departments into local store
    for (const [name] of djangoDepts) {
        if (!departmentStore.has(name)) {
            departmentStore.set(name, { color: "from-[#a18cd1] to-[#fbc2eb]" })
        }
    }

    // Build response — id === name so the frontend form value is the name string
    const departments: DepartmentRecord[] = []
    for (const [name, { color }] of departmentStore) {
        departments.push({
            id: name,
            name,
            color,
            employeeCount: djangoDepts.get(name) || 0,
        })
    }

    return NextResponse.json({ data: departments })
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const name = body.name?.trim()
        const color = body.color || "from-[#a18cd1] to-[#fbc2eb]"

        if (!name) {
            return NextResponse.json(
                { error: { detail: "Department name is required" } },
                { status: 400 }
            )
        }

        // Check for duplicate (case-insensitive)
        const existing = [...departmentStore.keys()].find(
            (k) => k.toLowerCase() === name.toLowerCase()
        )
        if (existing) {
            return NextResponse.json(
                { error: { detail: `Department "${name}" already exists` } },
                { status: 409 }
            )
        }

        departmentStore.set(name, { color })

        return NextResponse.json(
            { data: { id: name, name, color, employeeCount: 0 } },
            { status: 201 }
        )
    } catch {
        return NextResponse.json(
            { error: { detail: "Invalid request body" } },
            { status: 400 }
        )
    }
}
