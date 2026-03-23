/**
 * Centralized HTTP client for Django REST Framework backend.
 * Handles JWT auth, tenant slug header, and camelCase/snake_case transforms.
 */

import { toSnakeCase, toCamelCase } from "./transform";
import { refreshToken } from "./django-auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export interface PaginatedResponse<T> {
  results: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function getTenantSlug(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tenant_slug");
}

/** Remap 'limit' query param to 'per_page' for Django pagination compatibility */
function remapPaginationParams(path: string): string {
  if (!path.includes("limit=")) return path;
  return path.replace(/([?&])limit=(\d+)/g, "$1per_page=$2");
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}/api/v1${remapPaginationParams(path)}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const slug = getTenantSlug();
  if (slug) {
    headers["X-Tenant-Slug"] = slug;
  }

  // Transform request body to snake_case
  let body = options.body;
  if (body && typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      body = JSON.stringify(toSnakeCase(parsed));
    } catch {
      // Not JSON, send as-is
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new Error("Request timed out. Please check your connection and try again.");
    }
    throw err;
  }

  // Handle 401 → try refresh token, then retry once
  if (response.status === 401 && typeof window !== "undefined") {
    try {
      // Uses shared dedup from django-auth.ts — safe with ROTATE_REFRESH_TOKENS
      const newToken = await refreshToken();

      // Retry the original request with the new token
      headers["Authorization"] = `Bearer ${newToken}`;
      const retryResponse = await fetch(url, {
        ...options,
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });

      if (retryResponse.status === 401) {
        // Refresh succeeded but request still 401 — truly unauthorized
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        throw new Error("Unauthorized");
      }

      // Use the retry response from here on
      response = retryResponse;
    } catch (refreshErr) {
      // Refresh failed — clear tokens and redirect
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
      throw new Error("Session expired. Please log in again.");
    }
  } else if (response.status === 401) {
    // Server-side (no window) — just throw
    throw new Error("Unauthorized");
  }

  // Handle 429 → rate limit
  if (response.status === 429) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return { data: null as T, status: 204 };
  }

  const json = await response.json();

  if (!response.ok) {
    // Django wraps errors as {"data":null,"error":{"detail":[...]},"meta":{}}
    const errObj = json.error || json;
    const detail = errObj.detail;
    const message = Array.isArray(detail) ? detail.join(". ") : (typeof detail === "string" ? detail : null);
    const error = new Error(message || json.detail || "Request failed") as Error & {
      status: number;
      data: unknown;
    };
    error.status = response.status;
    error.data = toCamelCase(errObj);
    throw error;
  }

  // Unwrap Django {"data":{...},"error":null,"meta":{}} envelope and transform to camelCase
  const payload = json.data !== undefined ? json.data : json;
  return {
    data: toCamelCase<T>(payload),
    status: response.status,
  };
}

// Convenience methods
export const api = {
  get: <T>(path: string) => apiClient<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    apiClient<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    apiClient<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    apiClient<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => apiClient<T>(path, { method: "DELETE" }),
};
