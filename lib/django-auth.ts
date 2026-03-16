/**
 * Django JWT authentication helpers.
 * Replaces NextAuth.js with direct Django SimpleJWT integration.
 */

import { toCamelCase } from "./transform";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
    throw new Error(json.detail || JSON.stringify(json));
  }
  return toCamelCase<T>(json);
}

export async function login(payload: LoginPayload): Promise<AuthTokens & { user: Record<string, unknown> }> {
  const result = await authFetch<AuthTokens & { user: Record<string, unknown> }>("/login/", {
    tenant_slug: payload.tenantSlug,
    email: payload.email,
    password: payload.password,
  });

  localStorage.setItem("access_token", result.access);
  localStorage.setItem("refresh_token", result.refresh);
  localStorage.setItem("tenant_slug", payload.tenantSlug);

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
  localStorage.setItem("tenant_slug", payload.tenantSlug);

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
      return toCamelCase<AuthUser>(await retryResponse.json());
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      throw new Error("Session expired");
    }
  }

  if (!response.ok) throw new Error("Failed to fetch user");
  return toCamelCase<AuthUser>(await response.json());
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("access_token");
}
