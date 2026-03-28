/**
 * Django JWT authentication helpers.
 * Replaces NextAuth.js with direct Django SimpleJWT integration.
 *
 * TODO(security): Migrate JWT storage from localStorage to httpOnly cookies.
 * Current flow: login() stores tokens in localStorage, api-client.ts reads them.
 * Target flow: Django sets httpOnly cookies, api-client.ts sends credentials: 'include'.
 * Requires Django: SESSION_COOKIE_HTTPONLY=True, CSRF_COOKIE_HTTPONLY=False (for CSRF token).
 * See: docs/superpowers/plans/2026-03-23-security-fixes.md Task 12 Phase 2.
 */

import { toCamelCase } from "./transform";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/** Shared refresh promise — prevents concurrent refresh calls across the entire app.
 *  Both django-auth.ts and api-client.ts must use this to avoid race conditions
 *  with ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION. */
let sharedRefreshPromise: Promise<string> | null = null;

/** Proactive refresh timer ID */
let refreshTimerId: ReturnType<typeof setTimeout> | null = null;

/** Decode JWT payload without verification (client-side only) */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return {};
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4) payload += '=';
    return JSON.parse(atob(payload));
  } catch {
    return {};
  }
}

/** Set a lightweight marker cookie for middleware auth detection */
function setAuthMarker(): void {
  const maxAge = 60 * 60 * 24 * 7; // 7 days — matches refresh token lifetime
  document.cookie = `ems_authenticated=1; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/** Clear the auth marker cookie */
function clearAuthMarker(): void {
  document.cookie = "ems_authenticated=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
}

/** Extract and persist tenant claims from JWT access token */
function persistTenantFromJwt(accessToken: string, fallbackSlug?: string): void {
  const claims = decodeJwtPayload(accessToken);
  const tenantId = claims.tenant_id as string | undefined;
  const tenantSlug = (claims.tenant_slug as string | undefined) || fallbackSlug;
  if (tenantId) localStorage.setItem("tenant_id", tenantId);
  if (tenantSlug) localStorage.setItem("tenant_slug", tenantSlug);
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  accentColor: string;
  bio: string;
  mustChangePassword: boolean;
  onboardingStatus: string | null;
  lastLoginAt: string | null;
  tenantId: string;
  tenantSlug: string;
  isTenantAdmin: boolean;
  employeeId: string | null;
}

export interface LoginPayload {
  tenantSlug: string;
  email: string;
  password: string;
}

export interface RegisterPayload {
  tenantName: string;
  tenantSlug: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

async function authFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${BASE_URL}/api/v1/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const text = await response.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    // Log the raw response for debugging
    console.error(`[authFetch] ${path} returned status=${response.status}, body starts with: ${text.slice(0, 200)}`);
    if (!response.ok) {
      // Try to extract error from HTML if it's a Django debug page
      const match = text.match(/exception_value[^>]*>([^<]+)</);
      const djangoError = match?.[1]?.replace(/&#x27;/g, "'") || "";
      throw new Error(djangoError || `Server error (${response.status}). Check Django server logs.`);
    }
    throw new Error("Invalid response from server");
  }
  if (!response.ok) {
    // Django wraps errors as {"data":null,"error":{"detail":[...]},"meta":{}}
    const errObj = json.error || json;
    const detail = errObj.detail;
    const message = Array.isArray(detail) ? detail.join(". ") : (typeof detail === "string" ? detail : null);
    // Also handle field-level errors like {"tenant_slug":["Tenant not found."]}
    if (!message) {
      const fieldErrors = Object.entries(errObj)
        .filter(([k]) => k !== "detail")
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as string[]).join(", ") : v}`)
        .join("; ");
      throw new Error(fieldErrors || JSON.stringify(json));
    }
    throw new Error(message);
  }
  // Django wraps success as {"data":{...},"error":null,"meta":{}} — unwrap it
  const payload = json.data !== undefined ? json.data : json;
  return toCamelCase<T>(payload);
}

export async function login(payload: LoginPayload): Promise<AuthTokens & { user: Record<string, unknown> }> {
  const result = await authFetch<AuthTokens & { user: Record<string, unknown> }>("/login/", {
    tenant_slug: payload.tenantSlug,
    email: payload.email,
    password: payload.password,
  });

  // Store tokens in localStorage as fallback (cross-origin dev).
  // In production (same-origin), httpOnly cookies from Django take precedence.
  localStorage.setItem("access_token", result.access);
  localStorage.setItem("refresh_token", result.refresh);
  persistTenantFromJwt(result.access, payload.tenantSlug);
  setAuthMarker();
  scheduleProactiveRefresh(result.access);

  return result;
}

export async function register(payload: RegisterPayload): Promise<AuthTokens & { user: Record<string, unknown> }> {
  const result = await authFetch<AuthTokens & { user: Record<string, unknown> }>("/register/", {
    tenant_name: payload.tenantName,
    tenant_slug: payload.tenantSlug,
    email: payload.email,
    password: payload.password,
    first_name: payload.firstName || "",
    last_name: payload.lastName || "",
  });

  localStorage.setItem("access_token", result.access);
  localStorage.setItem("refresh_token", result.refresh);
  persistTenantFromJwt(result.access, payload.tenantSlug);
  setAuthMarker();
  scheduleProactiveRefresh(result.access);

  return result;
}

/** Schedule a proactive token refresh 2 minutes before expiry */
function scheduleProactiveRefresh(accessToken: string): void {
  if (typeof window === "undefined") return;
  if (refreshTimerId) clearTimeout(refreshTimerId);

  const claims = decodeJwtPayload(accessToken);
  const exp = claims.exp as number | undefined;
  if (!exp) return;

  // Refresh 2 minutes before expiry (or immediately if less than 2 min left)
  const msUntilExpiry = exp * 1000 - Date.now();
  const refreshIn = Math.max(msUntilExpiry - 2 * 60 * 1000, 0);

  refreshTimerId = setTimeout(() => {
    refreshToken().catch(() => {
      // Refresh failed — user will get 401 on next request which triggers redirect
    });
  }, refreshIn);
}

/** Core refresh logic — always use via refreshToken() which deduplicates */
async function doRefresh(): Promise<string> {
  // Send refresh token from localStorage (cross-origin fallback) or let Django read from cookie
  const refresh = localStorage.getItem("refresh_token");
  const result = await authFetch<{ access: string; refresh?: string }>("/refresh/", refresh ? { refresh } : {});

  if (result.access) localStorage.setItem("access_token", result.access);
  if (result.refresh) localStorage.setItem("refresh_token", result.refresh);
  setAuthMarker();
  if (result.access) {
    persistTenantFromJwt(result.access);
    scheduleProactiveRefresh(result.access);
  }

  return result.access;
}

/** Refresh the access token. Deduplicates concurrent calls app-wide. */
export async function refreshToken(): Promise<string> {
  if (!sharedRefreshPromise) {
    sharedRefreshPromise = doRefresh().finally(() => {
      sharedRefreshPromise = null;
    });
  }
  return sharedRefreshPromise;
}

export async function logout(): Promise<void> {
  const refresh = localStorage.getItem("refresh_token");
  try {
    await authFetch("/logout/", refresh ? { refresh } : {});
  } catch {
    // non-fatal
  }
  if (refreshTimerId) { clearTimeout(refreshTimerId); refreshTimerId = null; }
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("tenant_slug");
  localStorage.removeItem("tenant_id");
  clearAuthMarker();
}

export async function getMe(): Promise<AuthUser> {
  // Use Authorization header (localStorage fallback for cross-origin dev)
  // plus credentials: include for httpOnly cookie (same-origin prod)
  const token = localStorage.getItem("access_token");
  const slug = localStorage.getItem("tenant_slug");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (slug) headers["X-Tenant-Slug"] = slug;

  const response = await fetch(`${BASE_URL}/api/v1/auth/me/`, {
    headers,
    credentials: "include",
  });

  if (response.status === 401) {
    try {
      await refreshToken();
      const retryResponse = await fetch(`${BASE_URL}/api/v1/auth/me/`, {
        headers,
        credentials: "include",
      });
      if (!retryResponse.ok) throw new Error("Auth failed after refresh");
      const retryJson = await retryResponse.json();
      const retryPayload = retryJson.data !== undefined ? retryJson.data : retryJson;
      return toCamelCase<AuthUser>(retryPayload);
    } catch {
      clearAuthMarker();
      throw new Error("Session expired");
    }
  }

  if (!response.ok) throw new Error("Failed to fetch user");
  const json = await response.json();
  const payload = json.data !== undefined ? json.data : json;
  return toCamelCase<AuthUser>(payload);
}
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  // Check for the marker cookie (actual JWT is in httpOnly cookie)
  return document.cookie.includes("ems_authenticated=1") || !!localStorage.getItem("access_token");
}
