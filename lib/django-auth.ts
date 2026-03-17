/**
 * Django JWT authentication helpers.
 * Replaces NextAuth.js with direct Django SimpleJWT integration.
 */

import { toCamelCase } from "./transform";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/** Decode JWT payload without verification (client-side only) */
function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return {};
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload));
  } catch {
    return {};
  }
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
    body: JSON.stringify(body),
  });
  const json = await response.json();
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

  localStorage.setItem("access_token", result.access);
  localStorage.setItem("refresh_token", result.refresh);
  persistTenantFromJwt(result.access, payload.tenantSlug);

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

  return result;
}

export async function refreshToken(): Promise<string> {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) throw new Error("No refresh token available");

  const result = await authFetch<{ access: string; refresh?: string }>("/refresh/", {
    refresh,
  });

  localStorage.setItem("access_token", result.access);
  if (result.refresh) {
    localStorage.setItem("refresh_token", result.refresh);
  }
  persistTenantFromJwt(result.access);

  return result.access;
}

export async function logout(): Promise<void> {
  const refresh = localStorage.getItem("refresh_token");
  if (refresh) {
    try {
      await authFetch("/logout/", { refresh });
    } catch {
      // Token already invalid — non-fatal
    }
  }
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("tenant_slug");
  localStorage.removeItem("tenant_id");
}

export async function getMe(): Promise<AuthUser> {
  const token = localStorage.getItem("access_token");
  if (!token) throw new Error("Not authenticated");

  const slug = localStorage.getItem("tenant_slug");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (slug) headers["X-Tenant-Slug"] = slug;

  const response = await fetch(`${BASE_URL}/api/v1/auth/me/`, { headers });

  if (response.status === 401) {
    // Try refreshing the token
    try {
      const newToken = await refreshToken();
      headers["Authorization"] = `Bearer ${newToken}`;
      const retryResponse = await fetch(`${BASE_URL}/api/v1/auth/me/`, { headers });
      if (!retryResponse.ok) throw new Error("Auth failed after refresh");
      const retryJson = await retryResponse.json();
      const retryPayload = retryJson.data !== undefined ? retryJson.data : retryJson;
      return toCamelCase<AuthUser>(retryPayload);
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      throw new Error("Session expired");
    }
  }

  if (!response.ok) throw new Error("Failed to fetch user");
  const json = await response.json();
  // Unwrap Django {"data":{...},"error":null,"meta":{}} envelope
  const payload = json.data !== undefined ? json.data : json;
  return toCamelCase<AuthUser>(payload);
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("access_token");
}
