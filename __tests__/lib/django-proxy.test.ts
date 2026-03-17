import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Override the global mock from setup.ts — this test needs the real module
vi.unmock("@/lib/django-proxy")

// Mock global fetch before importing the module under test
const fetchMock = vi.fn()
vi.stubGlobal("fetch", fetchMock)

// Set env vars for predictable Django URL
vi.stubEnv("DJANGO_INTERNAL_URL", "http://django:8000")

import { proxyToDjango, createProxyHandlers } from "@/lib/django-proxy"

function makeRequest(
  url: string,
  init: RequestInit = {}
): Request {
  return new Request(url, init)
}

function makeDjangoResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  const responseHeaders = new Headers({
    "Content-Type": "application/json",
    ...headers,
  })
  return new Response(JSON.stringify(body), { status, headers: responseHeaders })
}

describe("proxyToDjango", () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("forwards a GET request to the correct Django URL", async () => {
    const djangoBody = { data: [{ id: 1, name: "Alice" }] }
    fetchMock.mockResolvedValueOnce(makeDjangoResponse(djangoBody))

    const req = makeRequest("http://localhost:3000/api/employees?page=1&limit=10")
    const res = await proxyToDjango(req, "/employees/")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, calledInit] = fetchMock.mock.calls[0]

    // Should target Django with query string preserved
    expect(calledUrl).toBe("http://django:8000/api/v1/employees/?page=1&limit=10")
    expect(calledInit.method).toBe("GET")
    expect(calledInit.body).toBeNull()

    // Response should relay Django status
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(djangoBody)
  })

  it("forwards a POST request with body", async () => {
    const reqBody = { firstName: "Bob", lastName: "Smith" }
    const djangoBody = { data: { id: 2, ...reqBody } }
    fetchMock.mockResolvedValueOnce(makeDjangoResponse(djangoBody, 201))

    const req = makeRequest("http://localhost:3000/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
    })

    const res = await proxyToDjango(req, "/employees/")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, calledInit] = fetchMock.mock.calls[0]
    expect(calledInit.method).toBe("POST")

    // Body should be forwarded as ArrayBuffer
    expect(calledInit.body).toBeDefined()
    const forwarded = JSON.parse(
      new TextDecoder().decode(calledInit.body as ArrayBuffer)
    )
    expect(forwarded).toEqual(reqBody)

    expect(res.status).toBe(201)
  })

  it("passes Authorization header through", async () => {
    fetchMock.mockResolvedValueOnce(makeDjangoResponse({ data: {} }))

    const req = makeRequest("http://localhost:3000/api/departments", {
      headers: {
        Authorization: "Bearer jwt-token-123",
        "X-Tenant-Slug": "acme-corp",
      },
    })

    await proxyToDjango(req, "/departments/")

    const [, calledInit] = fetchMock.mock.calls[0]
    const headers = calledInit.headers as Headers
    expect(headers.get("Authorization")).toBe("Bearer jwt-token-123")
    expect(headers.get("X-Tenant-Slug")).toBe("acme-corp")
  })

  it("handles Django error responses (4xx)", async () => {
    const errorBody = {
      error: { detail: ["Employee not found."] },
      data: null,
    }
    fetchMock.mockResolvedValueOnce(makeDjangoResponse(errorBody, 404))

    const req = makeRequest("http://localhost:3000/api/employees/999")
    const res = await proxyToDjango(req, "/employees/999/")

    // Should relay Django's 404 status back to the client
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error.detail).toContain("Employee not found.")
  })

  it("handles Django 500 responses", async () => {
    fetchMock.mockResolvedValueOnce(
      makeDjangoResponse({ error: "Internal Server Error" }, 500)
    )

    const req = makeRequest("http://localhost:3000/api/dashboard")
    const res = await proxyToDjango(req, "/dashboard/")

    expect(res.status).toBe(500)
  })

  it("returns 502 when Django is unreachable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"))

    const req = makeRequest("http://localhost:3000/api/employees")
    const res = await proxyToDjango(req, "/employees/")

    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.error).toBe("Failed to reach Django backend")
    expect(json.detail).toContain("ECONNREFUSED")
  })

  it("returns 504 on timeout", async () => {
    // Simulate a request that never resolves within the timeout
    fetchMock.mockImplementationOnce(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"))
          })
        })
    )

    const req = makeRequest("http://localhost:3000/api/employees")
    const res = await proxyToDjango(req, "/employees/", { timeoutMs: 50 })

    expect(res.status).toBe(504)
    const json = await res.json()
    expect(json.error).toContain("timed out")
  })

  it("strips hop-by-hop headers", async () => {
    fetchMock.mockResolvedValueOnce(makeDjangoResponse({ data: {} }))

    const req = makeRequest("http://localhost:3000/api/employees", {
      headers: {
        Host: "localhost:3000",
        Connection: "keep-alive",
        Authorization: "Bearer x",
      },
    })

    await proxyToDjango(req, "/employees/")

    const [, calledInit] = fetchMock.mock.calls[0]
    const headers = calledInit.headers as Headers
    // Host and Connection should be stripped
    expect(headers.has("Host")).toBe(false)
    expect(headers.has("Connection")).toBe(false)
    // Authorization should pass through
    expect(headers.get("Authorization")).toBe("Bearer x")
  })

  it("preserves query parameters", async () => {
    fetchMock.mockResolvedValueOnce(makeDjangoResponse({ data: [] }))

    const req = makeRequest(
      "http://localhost:3000/api/employees?search=john&page=2&limit=25"
    )
    await proxyToDjango(req, "/employees/")

    const [calledUrl] = fetchMock.mock.calls[0]
    expect(calledUrl).toContain("?search=john&page=2&limit=25")
  })

  it("normalizes path without leading slash", async () => {
    fetchMock.mockResolvedValueOnce(makeDjangoResponse({ data: {} }))

    const req = makeRequest("http://localhost:3000/api/departments")
    await proxyToDjango(req, "departments/")

    const [calledUrl] = fetchMock.mock.calls[0]
    expect(calledUrl).toBe("http://django:8000/api/v1/departments/")
  })

  it("applies extra headers from options", async () => {
    fetchMock.mockResolvedValueOnce(makeDjangoResponse({ data: {} }))

    const req = makeRequest("http://localhost:3000/api/employees")
    await proxyToDjango(req, "/employees/", {
      extraHeaders: { "X-Service-Token": "internal-secret" },
    })

    const [, calledInit] = fetchMock.mock.calls[0]
    const headers = calledInit.headers as Headers
    expect(headers.get("X-Service-Token")).toBe("internal-secret")
  })
})

describe("createProxyHandlers", () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it("creates GET/POST/PUT/PATCH/DELETE handlers", () => {
    const handlers = createProxyHandlers("/employees/")
    expect(typeof handlers.GET).toBe("function")
    expect(typeof handlers.POST).toBe("function")
    expect(typeof handlers.PUT).toBe("function")
    expect(typeof handlers.PATCH).toBe("function")
    expect(typeof handlers.DELETE).toBe("function")
  })

  it("each handler proxies with the correct method", async () => {
    fetchMock.mockResolvedValue(makeDjangoResponse({ data: {} }))
    const handlers = createProxyHandlers("/employees/")

    const req = makeRequest("http://localhost:3000/api/employees")
    await handlers.GET(req)
    expect(fetchMock.mock.calls[0][1].method).toBe("GET")

    await handlers.DELETE(req)
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE")
  })
})
