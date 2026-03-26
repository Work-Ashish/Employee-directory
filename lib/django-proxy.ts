/**
 * Django Proxy Adapter for Next.js API Routes (Sprint 13).
 *
 * Forwards incoming Next.js API requests to the Django REST backend,
 * relaying auth headers, tenant context, and request body. This allows
 * legacy Next.js routes to act as thin proxies while the frontend is
 * migrated to call Django directly via the feature API clients.
 *
 * Includes circuit breaker (CLOSED/OPEN/HALF-OPEN) and retry with
 * exponential backoff for transient errors on idempotent methods.
 */

// ---------------------------------------------------------------------------
// Circuit Breaker (per-path-prefix state)
// ---------------------------------------------------------------------------
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

const CB_FAILURE_THRESHOLD = 5;
const CB_COOLDOWN_MS = 30_000; // 30 seconds

interface CircuitBreakerEntry {
  state: CircuitState;
  failures: number;
  openedAt: number;
}

const circuitBreakers = new Map<string, CircuitBreakerEntry>();

/** Derive a path prefix from a Django path (first two segments, e.g. "/employees/list/" -> "/employees"). */
function getPathPrefix(djangoPath: string): string {
  const normalized = djangoPath.startsWith("/") ? djangoPath : `/${djangoPath}`;
  const segments = normalized.split("/").filter(Boolean);
  return `/${segments[0] || "_root"}`;
}

function getCB(pathPrefix: string): CircuitBreakerEntry {
  if (!circuitBreakers.has(pathPrefix)) {
    circuitBreakers.set(pathPrefix, { state: "CLOSED", failures: 0, openedAt: 0 });
  }
  return circuitBreakers.get(pathPrefix)!;
}

function cbRecordSuccess(pathPrefix: string): void {
  const cb = getCB(pathPrefix);
  cb.failures = 0;
  cb.state = "CLOSED";
}

function cbRecordFailure(pathPrefix: string): void {
  const cb = getCB(pathPrefix);
  cb.failures++;
  if (cb.failures >= CB_FAILURE_THRESHOLD) {
    cb.state = "OPEN";
    cb.openedAt = Date.now();
  }
}

function cbCanAttempt(pathPrefix: string): boolean {
  const cb = getCB(pathPrefix);
  if (cb.state === "CLOSED") return true;
  if (cb.state === "OPEN") {
    if (Date.now() - cb.openedAt >= CB_COOLDOWN_MS) {
      cb.state = "HALF_OPEN";
      return true; // allow one probe request
    }
    return false;
  }
  // HALF_OPEN — already allowing one request; block additional ones
  // until the probe completes (handled by caller sequentially).
  return true;
}

/** Reset circuit breaker state (for testing). */
export function resetCircuitBreaker(): void {
  circuitBreakers.clear();
}

/** Return the current circuit breaker state for health-check endpoints. */
export function getCircuitBreakerState(djangoPath?: string): {
  state: CircuitState;
  consecutiveFailures: number;
  openedAt: number | null;
} {
  if (djangoPath) {
    const cb = getCB(getPathPrefix(djangoPath));
    return {
      state: cb.state,
      consecutiveFailures: cb.failures,
      openedAt: cb.state !== "CLOSED" ? cb.openedAt : null,
    };
  }
  // Aggregate: return the worst state across all breakers
  let worstState: CircuitState = "CLOSED";
  let maxFailures = 0;
  let latestOpenedAt: number | null = null;
  for (const cb of circuitBreakers.values()) {
    if (cb.failures > maxFailures) maxFailures = cb.failures;
    if (cb.state === "OPEN" || (cb.state === "HALF_OPEN" && worstState === "CLOSED")) {
      worstState = cb.state;
      latestOpenedAt = cb.openedAt;
    }
  }
  return { state: worstState, consecutiveFailures: maxFailures, openedAt: latestOpenedAt };
}

// ---------------------------------------------------------------------------
// Retry helpers
// ---------------------------------------------------------------------------
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(["GET", "HEAD"]);
const MAX_RETRIES = 2; // 3 total attempts
const RETRY_DELAYS_MS = [1_000, 2_000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Lazily resolve the Django base URL so env vars set after module load are respected.
 *  Priority: DJANGO_GATEWAY_URL (API gateway) > DJANGO_INTERNAL_URL (direct) > NEXT_PUBLIC_API_URL > default */
function getDjangoBase(): string {
  return (
    process.env.DJANGO_GATEWAY_URL ||
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
 * Includes circuit breaker gating and retry with exponential backoff
 * for transient errors (502/503/504) on idempotent methods (GET/HEAD).
 *
 * @example
 * ```ts
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
  // --- Circuit breaker gate ------------------------------------------------
  const pathPrefix = getPathPrefix(djangoPath);
  if (!cbCanAttempt(pathPrefix)) {
    return Response.json(
      {
        error: "Circuit breaker is OPEN — Django backend unavailable",
        detail: `Tripped after ${CB_FAILURE_THRESHOLD} consecutive failures. Retry after cooldown.`,
      },
      { status: 503 }
    );
  }

  const { extraHeaders, method, timeoutMs = 30_000 } = options;
  const resolvedMethod = (method || request.method).toUpperCase();

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

  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      headers.set(k, v);
    }
  }

  // --- Forward body (for non-GET/HEAD) ------------------------------------
  const hasBody = !IDEMPOTENT_METHODS.has(resolvedMethod);
  let body: ArrayBuffer | null = null;
  if (hasBody) {
    body = await request.arrayBuffer();
  }

  // --- Attempt with retry (idempotent methods only) -----------------------
  const canRetry = IDEMPOTENT_METHODS.has(resolvedMethod);
  const maxAttempts = canRetry ? MAX_RETRIES + 1 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS_MS[attempt - 1]);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const djangoResponse = await fetch(targetUrl, {
        method: resolvedMethod,
        headers,
        body,
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timer);

      // Transient error on an idempotent method — retry if attempts remain
      if (
        canRetry &&
        RETRYABLE_STATUSES.has(djangoResponse.status) &&
        attempt < maxAttempts - 1
      ) {
        cbRecordFailure(pathPrefix);
        continue;
      }

      // Determine success/failure for the circuit breaker
      if (djangoResponse.ok) {
        cbRecordSuccess(pathPrefix);
      } else if (RETRYABLE_STATUSES.has(djangoResponse.status)) {
        cbRecordFailure(pathPrefix);
      }

      // --- Relay Django's response back to the client ---------------------
      const responseHeaders = new Headers();
      djangoResponse.headers.forEach((value, key) => {
        if (!STRIPPED_HEADERS.has(key.toLowerCase())) {
          responseHeaders.set(key, value);
        }
      });

      return new Response(djangoResponse.body, {
        status: djangoResponse.status,
        statusText: djangoResponse.statusText,
        headers: responseHeaders,
      });
    } catch (error: unknown) {
      clearTimeout(timer);
      cbRecordFailure(pathPrefix);

      // If retries remain and method is idempotent, keep trying
      if (canRetry && attempt < maxAttempts - 1) {
        continue;
      }

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

  // Unreachable, but satisfies TypeScript
  return Response.json(
    { error: "Failed to reach Django backend", detail: "Exhausted retries" },
    { status: 502 }
  );
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
