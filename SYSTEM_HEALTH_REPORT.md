# 🏥 System Health Report — EMS Pro

> **Date:** 2026-02-25
> **Scope:** End-to-end system health analysis for 10,000+ concurrent users
> **Build:** Clean (`npx next build` exit code 0, zero errors)

---

## 1. Startup & Build Health

### ✅ What's Passing
- `npx next build` — **0 errors, 0 type errors** (exit code 0)
- `DATABASE_URL` validated at startup in `lib/prisma.ts:16` — throws if missing
- `GEMINI_API_KEY` checked at runtime in each AI route — returns 500 with clear message
- Prisma logging correctly scoped: `["error", "warn"]` in dev, `["error"]` in production

### 🔴 Critical Issues

| # | Issue | File | Impact |
|---|-------|------|--------|
| **C1** | `lib/supabase.ts:3-4` uses `process.env.NEXT_PUBLIC_SUPABASE_URL!` — non-null assertion without validation. If missing, `createClient(undefined, undefined)` is called → **silent runtime crash on every upload** | `lib/supabase.ts` | Crash on file upload |
| **C2** | `lib/auth.ts:15-16` uses `process.env.GOOGLE_CLIENT_ID!` and `GOOGLE_CLIENT_SECRET!` — if missing, Google OAuth silently fails with a cryptic error, not a clear startup message | `lib/auth.ts` | Login broken |

**Fix for C1:**
```typescript
// lib/supabase.ts — add validation at the top
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
}
```

### 🟡 Major Issues

| # | Issue | File | Impact |
|---|-------|------|--------|
| **M1** | Google Fonts loaded via external `<link>` CDN tag in `app/layout.tsx:22` instead of `next/font` — blocks rendering, no font fallback, FOUT risk | `app/layout.tsx` | Performance / CLS |

---

## 2. Runtime Stability

### ✅ What's Protected
- **Every API route** has a `try/catch` block (verified: 70+ catch handlers across 26 route files)
- **Check-in/check-out** wrapped in `$transaction` — no partial writes
- **AI routes** have `AbortController` timeouts (15–20s) — no infinite hangs
- **pg Pool** has `connectionTimeoutMillis: 5000` — fails fast if DB is down

### 🔴 Critical Issues

| # | Issue | File | Impact |
|---|-------|------|--------|
| **C3** | **No `global-error.tsx`** — Next.js global error boundary is missing. An unhandled throw in the root layout crashes the entire app with a white screen. | Missing file | White screen of death |
| **C4** | **No `error.tsx` in any route segment** — If a page component throws, the user sees raw Next.js error page in production. No graceful fallback UI. | Missing files | Bad UX on crashes |
| **C5** | **No `loading.tsx`** files — No Suspense boundaries. Server component delays show nothing to the user (no skeleton, no spinner). | Missing files | Perceived slowness |

**Fix for C3 — create `app/global-error.tsx`:**
```tsx
"use client"
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <html><body>
            <div style={{ padding: "2rem", textAlign: "center" }}>
                <h2>Something went wrong</h2>
                <p>The application encountered an unexpected error.</p>
                <button onClick={() => reset()}>Try Again</button>
            </div>
        </body></html>
    )
}
```

### 🟡 Major Issues

| # | Issue | Details |
|---|-------|---------|
| **M2** | `mousemove` listener in `TimeTracker.tsx:94` has no cleanup — creates an anonymous function on every render, cannot be removed by `removeEventListener` | Memory leak in long sessions |
| **M3** | `lib/prisma.ts:36` — global singleton check `if (process.env.NODE_ENV !== "production")` means in production, a NEW PrismaClient is created on every cold start. This is correct for serverless but on a persistent server it would create multiple clients. | Acceptable for Vercel, risky for self-hosted |

---

## 3. API Health

### ✅ What's Healthy
- **All 26 API directories** have route handlers with try/catch
- **Authentication** enforced: middleware + 100% route-level `await auth()` guards
- **HTTP status codes** used correctly: 200, 201, 401, 403, 404, 409, 413, 415, 500, 504
- **Health endpoint** at `/api/health` tests DB connectivity and returns uptime
- **RBAC** enforced: admin routes check `session.user.role === "ADMIN"`

### 🟡 Major Issues

| # | Issue | File(s) | Impact |
|---|-------|---------|--------|
| **M4** | **No request body validation (Zod)** on most POST/PUT routes — `body.subject`, `body.employeeId` etc. accepted without schema validation. Invalid data reaches Prisma and errors at DB level. | All POST routes | 500 errors for invalid input instead of 400 |
| **M5** | **No CORS configuration** — `middleware.ts` has no CORS headers. If the frontend is deployed to a different origin or a mobile app calls the API, all requests will be blocked. | `middleware.ts` | API unreachable from other origins |
| **M6** | **Inconsistent response envelopes** — `/api/employees` returns `{ data, total, page, limit }`, other endpoints return raw arrays. Frontend must handle both patterns. | Multiple routes | Integration complexity |

---

## 4. Database Stability

### ✅ What's Solid
- **pg Pool**: `max: 3`, `idleTimeoutMillis: 10000`, `connectionTimeoutMillis: 5000`
- **30+ indexes** on FK lookups, status fields, date ranges, composite indexes
- **Transactions** on check-in, check-out, and employee creation
- **Burnout endpoint** uses raw SQL aggregation instead of loading records into memory
- **Employees endpoint** is paginated with `skip/take`

### 🟡 Major Issues

| # | Issue | File(s) | Impact |
|---|-------|---------|--------|
| **M7** | **12+ GET endpoints return unbounded results** — `payroll`, `attendance`, `pf`, `performance`, `resignations`, `leaves`, `recruitment`, `events`, `announcements`, `tickets`, `documents`, `assets` all use `findMany` without `take` | Multiple routes | Payload size at scale |
| **M8** | **`dashboard/route.ts:60`** fetches ALL employee salaries to compute ranges: `findMany({ select: { salary: true } })` — at 10K employees, this is a full table scan returning 10K rows for salary distribution. | `dashboard/route.ts` | Slow dashboard load |

### 🟢 Minor Issues

| # | Issue | Details |
|---|-------|---------|
| **m1** | `dashboard/logins/route.ts` uses two separate queries (`findMany` for active users + `findMany` for recent logins) — could combine into one query | Minor N+1 |

---

## 5. Authentication & Authorization

### ✅ What's Secured
- **Global middleware** (`middleware.ts`) enforces auth on all routes except `/login` and `/api/auth`
- **Route-level auth** — `await auth()` called in every route handler (all 10 previously-disabled routes fixed)
- **RBAC enforcement** — admin routes check `session.user.role === "ADMIN"` or `session?.user?.role !== "ADMIN"`
- **Protection levels**: Public (login, auth) → Authenticated (employee routes) → Admin (admin routes)
- **Google OAuth** generates secure random password (no empty string)
- **Tickets** scoped: non-admins see only their own

### 🟡 Major Issues

| # | Issue | File | Impact |
|---|-------|------|--------|
| **M9** | **No rate limiting** — Middleware has no brute-force protection. Login, AI chatbot, and upload endpoints can be hammered indefinitely. | `middleware.ts` | DoS / abuse risk |
| **M10** | **No CSRF protection** — POST routes rely only on session cookies. No CSRF token validation. NextAuth has some built-in protection but custom POST routes don't use it. | All POST routes | CSRF attacks |

### 🟢 Minor Issues

| # | Issue | Details |
|---|-------|---------|
| **m2** | JWT strategy used but no explicit `maxAge` configured — defaults to 30 days. Consider shorter session lifetimes for sensitive data. | `lib/auth.ts` |
| **m3** | No session revocation mechanism — if a user is terminated, their existing JWT remains valid until expiry. | Architecture gap |

---

## 6. Performance Stability

### ✅ What's Optimized
- **Dashboard polling**: 30s intervals + `visibilitychange` pause on hidden tabs
- **bcrypt cost**: 10 (balanced security/performance)
- **`getSessionEmployee()`**: single OR query instead of two sequential calls
- **Burnout analytics**: raw SQL aggregation with LIMIT 500
- **Employee list**: paginated with search

### 🟡 Major Issues

| # | Issue | File | Impact |
|---|-------|------|--------|
| **M11** | **No caching anywhere** — no `Cache-Control` headers on any response, no `staleTime` on client fetching, no Redis. Every page visit triggers full DB queries. | Architecture | Excessive DB load |
| **M12** | **Onboarding agent fires Gemini API call on every page load** — no caching of the AI-generated welcome message. With 1000 employees loading their dashboard, that's 1000 Gemini calls. | `onboarding/agent/route.ts` | API cost / latency |

### 🟢 Minor Issues

| # | Issue | Details |
|---|-------|---------|
| **m4** | `AdminPayrollView.tsx` has 3 consecutive `useEffect` hooks (lines 143, 154, 161) that could trigger cascading re-renders | Component re-render churn |
| **m5** | Google Fonts loaded via external CDN `<link>` instead of `next/font` — render-blocking resource | CLS / TTFB |

---

## 7. Frontend Smoothness

### ✅ What's Working
- **Skeleton loaders** — `AdminDashboard` and `EmployeeDashboard` show skeletons while loading
- **Toast notifications** — Sonner toaster at `top-right` with system theme
- **Theme provider** — `next-themes` with light/dark switch
- **Responsive shell** — `AppShell` with sidebar + main content area

### 🔴 Critical Issues

| # | Issue | Impact |
|---|-------|--------|
| **C6** | **No `error.tsx` for any page** — A server component crash shows raw Next.js error screen instead of a user-friendly fallback | White screen in production |
| **C7** | **No `loading.tsx` for any page** — No Suspense boundaries. Navigation between pages shows nothing until data loads | Perceived app freeze |

### 🟡 Major Issues

| # | Issue | File | Impact |
|---|-------|------|--------|
| **M13** | **`TimeTracker.tsx:94`** adds `mousemove` listener as anonymous function — never cleaned up. Over an 8-hour work session, this accumulates DOM listeners. | `TimeTracker.tsx` | Memory leak |
| **M14** | **`GET /api/employees` response shape changed** to `{ data, total }` but **frontend consumers may still expect a flat array**. Any component doing `employees.map()` instead of `employees.data.map()` will crash silently. | Frontend integration | Broken employee list |

---

## 8. Edge Case Testing

### What Happens If:

| Scenario | Current Behavior | Verdict |
|----------|-----------------|---------|
| **API fails (500)** | All routes return `{ error: "..." }` with proper status codes. Frontend shows toast errors in most components. | ✅ Handled |
| **DB disconnects** | `pg Pool` `connectionTimeoutMillis: 5000` → fast failure. `/api/health` reports DB status. | ✅ Handled |
| **Network is slow** | AI routes have `AbortController` timeouts. No timeout on regular API calls — they hang until serverless timeout. | 🟡 Partial |
| **Invalid data submitted** | No Zod validation — Prisma catches at DB level with a raw `P2002`/`P2003` code. User sees "Internal Server Error" instead of a helpful validation message. | ❌ Poor UX |
| **Large file uploaded** | Upload validates: 10 MB max + MIME type allowlist. Returns 413/415 with clear message. | ✅ Handled |
| **Double check-in** | `$transaction` in check-in route prevents duplicates. Returns 409 with existing session. | ✅ Handled |
| **Concurrent ticket creation** | UUID-based codes — no collision. | ✅ Handled |
| **User logged out mid-operation** | Middleware redirects to `/login`. Route-level `auth()` returns 401. | ✅ Handled |
| **Gemini API rate-limited** | AI routes catch errors and return 500. `AbortController` prevents hanging. But no retry or queue. | 🟡 Partial |
| **Supabase env vars missing** | App launches but crashes on first upload — `createClient(undefined)` | ❌ Silent crash |

---

## 9. Logging & Monitoring

### ✅ What's Working
- **`/api/health`** — DB connectivity + uptime (monitoring-ready)
- **`console.error("[TAG]", error)`** — all routes log errors with route identifier tags (e.g., `[TICKETS_POST]`, `[TIME_TRACKER_CHECKOUT]`)
- **No `error.message` in responses** — only generic error messages returned to clients (fixed in v3)

### 🟡 Major Issues

| # | Issue | Impact |
|---|-------|--------|
| **M15** | **No structured logging** — `console.error` only. No JSON logging, no log levels, no request IDs. In production, these logs are unsearchable and unfiltered in Vercel's log viewer. | Debugging difficulty |
| **M16** | **No request tracing** — No correlation IDs between requests. When an error occurs, there's no way to trace it back to the specific user/request. | Incident response |

### 🟢 Minor Issues

| # | Issue | Details |
|---|-------|---------|
| **m6** | No performance metrics logged — no response time tracking, no slow query alerts | No performance visibility |
| **m7** | AI route errors don't log which model/prompt failed — only `[CHAT_POST]` tag | AI debugging blind spot |

---

## 10. Deployment Readiness

### ✅ What's Ready
- **Clean build** — `npx next build` passes with 0 errors
- **Security headers** in `next.config.ts` and `middleware.ts` (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection, Permissions-Policy)
- **`.env` excluded from git** — `.gitignore` covers `.env*`
- **Image domains** allowlisted in `next.config.ts`
- **Prisma logging** scoped by `NODE_ENV`
- **pg Pool** limited to 3 connections per instance

### 🔴 Critical Issues

| # | Issue | Impact |
|---|-------|--------|
| **C8** | **No `global-error.tsx`** — Production crashes render Next.js default error page | Unprofessional UX |

### 🟡 Major Issues

| # | Issue | Impact |
|---|-------|--------|
| **M17** | **No Dockerfile** — Can't containerize or deploy to anything other than Vercel | Vendor lock-in |
| **M18** | **No CI/CD pipeline** — No GitHub Actions, no automated tests, no deployment gates | Manual, error-prone deploys |
| **M19** | **No rate limiting** — Endpoints open to brute-force and abuse | Security |
| **M20** | **`debug_link.js`** still exists in root — appears to be a debug/test file | Cleanup needed |

---

## Issue Summary

### 🔴 Critical (Must Fix Before Production) — 8 Issues

| # | Issue | Fix Effort |
|---|-------|-----------|
| C1 | `supabase.ts` env var validation missing — silent crash on upload | 5 min |
| C2 | `auth.ts` env vars use `!` without validation | 5 min |
| C3 | No `global-error.tsx` — white screen on crash | 10 min |
| C4 | No `error.tsx` in route segments | 15 min |
| C5 | No `loading.tsx` files — no loading UI | 15 min |
| C6 | = C4 (frontend impact) | — |
| C7 | = C5 (frontend impact) | — |
| C8 | = C3 (deployment impact) | — |
| | **Unique critical issues: 5** | **~50 min total** |

### 🟡 Major (Should Fix) — 20 Issues

| # | Issue | Fix Effort |
|---|-------|-----------|
| M1 | Google Fonts via CDN instead of `next/font` | 15 min |
| M2 | `TimeTracker.tsx` mousemove listener leak | 10 min |
| M4 | No Zod validation on POST/PUT routes | 2–3 hours |
| M5 | No CORS configuration | 15 min |
| M6 | Inconsistent response envelopes | 1 hour |
| M7 | 12+ GET endpoints unbounded | 2 hours |
| M8 | Dashboard salary full-table scan | 30 min |
| M9 | No rate limiting | 1 hour |
| M10 | No CSRF protection | 30 min |
| M11 | No caching anywhere | 2 hours |
| M12 | Onboarding agent no response caching | 30 min |
| M13 | = M2 | — |
| M14 | Employee API response shape may break frontend | 30 min |
| M15 | No structured logging | 1 hour |
| M16 | No request tracing | 1 hour |
| M17 | No Dockerfile | 30 min |
| M18 | No CI/CD pipeline | 1 hour |
| M19 | = M9 | — |
| M20 | `debug_link.js` still in root | 1 min |

### 🟢 Minor Improvements — 7 Issues

| # | Issue |
|---|-------|
| m1 | Dashboard logins: 2 queries could be 1 |
| m2 | JWT maxAge not explicitly set |
| m3 | No session revocation mechanism |
| m4 | AdminPayrollView cascading useEffect re-renders |
| m5 | = M1 |
| m6 | No performance metrics |
| m7 | AI error logs lack prompt/model context |

---

## Final Scores

| Metric | Score | Justification |
|--------|:-----:|---------------|
| **System Stability** | **6.5/10** | Every route has try/catch, transactions on critical paths, AI timeouts, pool limits. Brought down by: no error boundaries, no loading states, no env validation on Supabase/Google, mousemove memory leak. |
| **Production Readiness** | **5.5/10** | Clean build, security headers, auth on all routes. Brought down by: 0% test coverage, no CI/CD, no Dockerfile, no rate limiting, no structured logging, no CORS, no Zod validation. |

### Path to 8+/10

| Priority | Action | Score Impact |
|----------|--------|:----------:|
| 1 | Add `global-error.tsx` + `error.tsx` + `loading.tsx` | +1 stability |
| 2 | Validate Supabase + Google env vars on startup | +0.5 stability |
| 3 | Add Zod validation on POST/PUT routes | +0.5 readiness |
| 4 | Add rate limiting to middleware | +0.5 readiness |
| 5 | Add Vitest + test middleware/auth/CRUD | +1 readiness |
| 6 | Add CI/CD (GitHub Actions) | +0.5 readiness |
| 7 | Add structured logging (Pino) | +0.5 readiness |
