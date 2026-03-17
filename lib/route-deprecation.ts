/**
 * Route Deprecation Utility (Sprint 13).
 *
 * Provides helpers to mark legacy Next.js API routes as deprecated,
 * log usage, and add deprecation headers to responses so clients
 * can detect and migrate to the Django API.
 */

/** In-memory counter to avoid flooding logs for the same route. */
const hitCounts = new Map<string, number>();

/** Maximum log entries per route per process lifetime (prevents log spam). */
const MAX_LOG_PER_ROUTE = 50;

/**
 * Log a deprecation warning for a legacy route.
 * Call at the top of any route handler that should no longer be used.
 *
 * @param routeName - Human-readable route identifier, e.g. "/api/employees GET"
 * @param alternative - Optional pointer to the replacement endpoint.
 *
 * @example
 * ```ts
 * import { deprecatedRoute } from "@/lib/route-deprecation";
 *
 * export async function GET(req: Request) {
 *   deprecatedRoute("/api/employees GET", "Django /api/v1/employees/");
 *   // ...legacy handler
 * }
 * ```
 */
export function deprecatedRoute(
  routeName: string,
  alternative?: string
): void {
  const count = hitCounts.get(routeName) ?? 0;
  hitCounts.set(routeName, count + 1);

  if (count < MAX_LOG_PER_ROUTE) {
    const altMsg = alternative ? ` Use ${alternative} instead.` : "";
    console.warn(
      `[DEPRECATED] Route ${routeName} is deprecated.${altMsg} (hit #${count + 1})`
    );
  }
}

/**
 * Add standard deprecation headers to an outgoing response.
 *
 * @param response - The Response object to decorate.
 * @param info     - Human-readable deprecation notice.
 * @returns The same Response (mutated in-place).
 */
export function addDeprecationHeaders(
  response: Response,
  info: string
): Response {
  response.headers.set("Deprecation", "true");
  response.headers.set("Sunset", "2026-06-01");
  response.headers.set("X-Deprecation-Notice", info);
  return response;
}

/**
 * Wrap a route handler so it automatically logs deprecation and adds headers.
 *
 * @param routeName   - e.g. "/api/departments GET"
 * @param alternative - e.g. "Django /api/v1/departments/"
 * @param handler     - The original route handler function.
 *
 * @example
 * ```ts
 * import { withDeprecation } from "@/lib/route-deprecation";
 *
 * export const GET = withDeprecation(
 *   "/api/departments GET",
 *   "Django /api/v1/departments/",
 *   async (req) => {
 *     return proxyToDjango(req, "/departments/");
 *   }
 * );
 * ```
 */
export function withDeprecation(
  routeName: string,
  alternative: string,
  handler: (req: Request, ctx?: unknown) => Promise<Response>
): (req: Request, ctx?: unknown) => Promise<Response> {
  return async (req: Request, ctx?: unknown) => {
    deprecatedRoute(routeName, alternative);
    const response = await handler(req, ctx);
    return addDeprecationHeaders(
      response,
      `This route is deprecated. Migrate to ${alternative}.`
    );
  };
}

/**
 * Get the current hit count snapshot (useful for admin/metrics endpoints).
 */
export function getDeprecationStats(): Record<string, number> {
  return Object.fromEntries(hitCounts);
}
