/**
 * Django Proxy Adapter for Next.js API Routes (Sprint 13).
 *
 * Forwards incoming Next.js API requests to the Django REST backend,
 * relaying auth headers, tenant context, and request body. This allows
 * legacy Next.js routes to act as thin proxies while the frontend is
 * migrated to call Django directly via the feature API clients.
 */

/** Lazily resolve the Django base URL so env vars set after module load are respected. */
function getDjangoBase(): string {
  return (
    process.env.DJANGO_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:8000"
  );
}

/** Headers that must NOT be forwarded to Django (hop-by-hop or Next-internal). */
const STRIPPED_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "content-length", // recalculated by fetch()
]);

interface ProxyOptions {
  /** Extra headers to append (e.g. for server-side service tokens). */
  extraHeaders?: Record<string, string>;
  /** Override the HTTP method (defaults to the incoming request's method). */
  method?: string;
  /** Timeout in milliseconds (default 30 000). */
  timeoutMs?: number;
}

/**
 * Proxy an incoming Next.js API request to the Django backend.
 *
 * @param request  - The incoming `Request` from the Next.js route handler.
 * @param djangoPath - The Django URL path (e.g. "/employees/", "/departments/").
 *                     Appended to `DJANGO_BASE/api/v1`.
 * @param options  - Optional overrides.
 * @returns A `Response` that can be returned directly from the route handler.
 *
 * @example
 * ```ts
 * import { proxyToDjango } from "@/lib/django-proxy";
 *
 * export async function GET(req: Request) {
 *   return proxyToDjango(req, "/employees/");
 * }
 * ```
 */
export async function proxyToDjango(
  request: Request,
  djangoPath: string,
  options: ProxyOptions = {}
): Promise<Response> {
  const { extraHeaders, method, timeoutMs = 30_000 } = options;

  // --- Build target URL (preserve query string) -------------------------
  const incoming = new URL(request.url);
  const search = incoming.search; // includes leading "?"
  const normalizedPath = djangoPath.startsWith("/") ? djangoPath : `/${djangoPath}`;
  const targetUrl = `${getDjangoBase()}/api/v1${normalizedPath}${search}`;

  // --- Forward safe headers -----------------------------------------------
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!STRIPPED_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Ensure Authorization is forwarded (may come from NextAuth session cookie
  // or a Bearer token already on the request).
  if (!headers.has("Authorization")) {
    const authCookie = request.headers.get("cookie");
    // If no explicit Authorization header, don't fabricate one.
    // The Django backend will reject unauthenticated requests on its own.
    if (authCookie) {
      headers.set("cookie", authCookie);
    }
  }

  // Ensure tenant context is forwarded
  if (!headers.has("X-Tenant-Slug")) {
    const slug =
      request.headers.get("x-tenant-slug") ||
      request.headers.get("X-Tenant-Slug");
    if (slug) {
      headers.set("X-Tenant-Slug", slug);
    }
  }

  // Apply any extra headers from caller
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      headers.set(k, v);
    }
  }

  // --- Forward body (for non-GET/HEAD) ------------------------------------
  const hasBody = method
    ? !["GET", "HEAD"].includes(method.toUpperCase())
    : !["GET", "HEAD"].includes(request.method.toUpperCase());

  let body: BodyInit | null = null;
  if (hasBody) {
    body = await request.arrayBuffer();
  }

  // --- Execute the proxied request ----------------------------------------
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const djangoResponse = await fetch(targetUrl, {
      method: method || request.method,
      headers,
      body,
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timer);

    // --- Relay Django's response back to the client -----------------------
    const responseHeaders = new Headers();
    djangoResponse.headers.forEach((value, key) => {
      // Skip hop-by-hop on the way back too
      if (!STRIPPED_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // Stream the body through without buffering
    return new Response(djangoResponse.body, {
      status: djangoResponse.status,
      statusText: djangoResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    clearTimeout(timer);

    if (error instanceof DOMException && error.name === "AbortError") {
      return Response.json(
        { error: "Upstream request to Django timed out", detail: `${timeoutMs}ms` },
        { status: 504 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Unknown proxy error";
    console.error("[DJANGO_PROXY]", message, { targetUrl });

    return Response.json(
      { error: "Failed to reach Django backend", detail: message },
      { status: 502 }
    );
  }
}

/**
 * Build a proxied route handler set (GET, POST, PUT, PATCH, DELETE) for a
 * given Django path. Useful for one-liner conversions of entire route files.
 *
 * @example
 * ```ts
 * import { createProxyHandlers } from "@/lib/django-proxy";
 * export const { GET, POST } = createProxyHandlers("/employees/");
 * ```
 */
export function createProxyHandlers(
  djangoPath: string,
  options: ProxyOptions = {}
) {
  const handler =
    (method: string) => (request: Request) =>
      proxyToDjango(request, djangoPath, { ...options, method });

  return {
    GET: handler("GET"),
    POST: handler("POST"),
    PUT: handler("PUT"),
    PATCH: handler("PATCH"),
    DELETE: handler("DELETE"),
  };
}
