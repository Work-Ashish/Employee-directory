/**
 * Department API client.
 *
 * Departments are NOT a Django model — they're derived from the CharField
 * on Employee. This client calls the Next.js /api/departments route (local
 * handler) instead of Django directly.
 */

export interface Department {
  id: string
  name: string
  color: string
  employeeCount?: number
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token")
    if (token) headers["Authorization"] = `Bearer ${token}`
    const slug = localStorage.getItem("tenant_slug")
    if (slug) headers["X-Tenant-Slug"] = slug
  }
  return headers
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    const detail = json.error?.detail || json.detail || "Request failed"
    const message = Array.isArray(detail) ? detail.join(". ") : detail
    throw new Error(message)
  }
  const json = await res.json()
  return json.data !== undefined ? json.data : json
}

export const DepartmentAPI = {
  list: async (): Promise<Department[]> => {
    const res = await fetch("/api/departments", { headers: getHeaders() })
    return handleResponse<Department[]>(res)
  },

  create: async (payload: { name: string; color: string }): Promise<Department> => {
    const res = await fetch("/api/departments", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    })
    return handleResponse<Department>(res)
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`/api/departments/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error?.detail || "Failed to delete department")
    }
  },
}
