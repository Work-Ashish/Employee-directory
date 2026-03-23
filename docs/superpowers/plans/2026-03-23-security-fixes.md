# Security Vulnerability Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all CRITICAL and HIGH security vulnerabilities found in the EMS Pro security audit without breaking existing functionality.

**Architecture:** Incremental, file-by-file fixes with test verification after each change. No schema migrations required. Changes are isolated — each task touches 1–2 files max.

**Tech Stack:** Django 5.1, DRF, Next.js 16, psycopg2, SimpleJWT, TypeScript

---

## File Map

| File | Action | Task |
|------|--------|------|
| `backend/hiringnow/config/db_utils.py` | Modify | 1 |
| `backend/hiringnow/apps/users/serializers.py` | Modify | 2 |
| `backend/hiringnow/apps/employees/serializers.py` | Modify | 3 |
| `backend/hiringnow/apps/audit/serializers.py` | Modify | 4 |
| `backend/hiringnow/apps/audit/views.py` | Modify | 4 |
| `backend/hiringnow/apps/audit/urls.py` | Modify | 4 |
| `backend/hiringnow/apps/users/auth_views.py` | Modify | 5 |
| `backend/hiringnow/config/views.py` | Modify | 6 |
| `backend/hiringnow/config/settings/production.py` | Modify | 7 |
| `lib/logger.ts` | Modify | 8 |
| `lib/security.ts` | Modify | 8 |
| `next.config.ts` | Modify | 9 |
| `app/api/performance/cycles/route.ts` | Modify | 10 |
| `app/api/performance/monthly/route.ts` | Modify | 10 |
| `app/api/performance/monthly/[id]/route.ts` | Modify | 10 |
| `app/api/performance/monthly/[id]/sign/route.ts` | Modify | 10 |
| `app/api/performance/appraisals/route.ts` | Modify | 10 |
| `app/api/performance/appraisals/[id]/route.ts` | Modify | 10 |
| `app/api/performance/eligibility/route.ts` | Modify | 10 |
| `app/api/performance/pip/route.ts` | Modify | 10 |
| `app/api/performance/pip/[id]/route.ts` | Modify | 10 |
| `app/api/teams/route.ts` | Modify | 10 |
| `app/api/teams/[id]/route.ts` | Modify | 10 |
| `app/api/teams/[id]/members/route.ts` | Modify | 10 |
| `app/api/teams/sync/route.ts` | Modify | 10 |
| `app/api/teams/org-chart/route.ts` | Modify | 10 |
| `lib/webhooks.ts` | Modify | 11 |
| `lib/django-auth.ts` | Modify | 12 |

---

## Priority Order

| Priority | ID | Severity | Finding |
|----------|----|----------|---------|
| 1 | C1 | CRITICAL | SQL injection in `db_utils.py` via f-string |
| 2 | H1 | HIGH | Privilege escalation — `is_tenant_admin` writable in UserCreateSerializer |
| 3 | H2 | HIGH | Privilege escalation — `user` FK writable in EmployeeUpdateSerializer |
| 4 | H3 | HIGH | Audit log spoofing — no read_only_fields in AuditLogSerializer |
| 5 | H4 | HIGH | No throttle on token refresh/blacklist endpoints |
| 6 | H5 | HIGH | Health endpoint leaks DB error details |
| 7 | H6 | HIGH | Missing HSTS/SSL settings in production |
| 8 | H7 | HIGH | Unauthenticated audit log POST from Next.js |
| 9 | H8 | HIGH | CSP allows unsafe-eval and unsafe-inline |
| 10 | H9 | HIGH | 21 Django proxy routes lack `withAuth` guard |
| 11 | H10 | HIGH | SSRF in webhook dispatch — no private IP validation |
| 12 | H11 | HIGH | JWT stored in localStorage (XSS vector) |

---

### Task 1: Fix SQL Injection in db_utils.py [CRITICAL]

**Files:**
- Modify: `backend/hiringnow/config/db_utils.py:16`

**Risk:** Raw f-string interpolation into SQL allows arbitrary DB commands if tenant slug is attacker-controlled.

- [ ] **Step 1: Read the current file**

Read `backend/hiringnow/config/db_utils.py` in full.

- [ ] **Step 2: Fix the SQL injection**

Replace the raw f-string with `psycopg2.sql.Identifier`:

```python
# At the top of the file, add:
from psycopg2 import sql

# Replace line 16:
# OLD: cur.execute(f"CREATE DATABASE {db_name}")
# NEW:
cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name)))
```

Audit the rest of the file for any other raw SQL with f-string interpolation and apply the same `sql.Identifier` pattern.

- [ ] **Step 3: Validate db_name input**

Add a safeguard above the execute call:

```python
import re

if not re.match(r'^[a-z][a-z0-9_]{0,62}$', db_name):
    raise ValueError(f"Invalid database name: {db_name}")
```

- [ ] **Step 4: Verify Django starts cleanly**

Run: `cd backend/hiringnow && python manage.py check`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add backend/hiringnow/config/db_utils.py
git commit -m "fix(security): prevent SQL injection in db_utils.py via parameterized identifiers

Use psycopg2.sql.Identifier instead of f-string interpolation for
CREATE DATABASE. Add regex validation for database names."
```

---

### Task 2: Fix Privilege Escalation in UserCreateSerializer [HIGH]

**Files:**
- Modify: `backend/hiringnow/apps/users/serializers.py:20`

**Risk:** Any user calling the registration endpoint can set `is_tenant_admin=True` and gain full admin access.

- [ ] **Step 1: Read the current file**

Read `backend/hiringnow/apps/users/serializers.py` in full.

- [ ] **Step 2: Remove is_tenant_admin from writable fields**

In `UserCreateSerializer`, change the `is_tenant_admin` field to read-only:

```python
# Replace:
#   is_tenant_admin = serializers.BooleanField(default=False)

# With:
is_tenant_admin = serializers.BooleanField(default=False, read_only=True)
```

And in the `create()` method, hardcode it to `False`:

```python
# Replace:
#   is_tenant_admin=validated_data.get('is_tenant_admin', False),
# With:
is_tenant_admin=False,
```

- [ ] **Step 3: Verify Django checks pass**

Run: `cd backend/hiringnow && python manage.py check`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add backend/hiringnow/apps/users/serializers.py
git commit -m "fix(security): prevent privilege escalation via is_tenant_admin in UserCreateSerializer

Make is_tenant_admin read_only and hardcode to False in create().
Tenant admin status should only be set through admin channels."
```

---

### Task 3: Fix Privilege Escalation in EmployeeUpdateSerializer [HIGH]

**Files:**
- Modify: `backend/hiringnow/apps/employees/serializers.py:147`

**Risk:** An attacker can change the `user` FK on an Employee record to hijack another user's employee profile.

- [ ] **Step 1: Read the current file**

Read `backend/hiringnow/apps/employees/serializers.py` in full.

- [ ] **Step 2: Make user FK read-only in EmployeeUpdateSerializer**

In `EmployeeUpdateSerializer.Meta`, add `read_only_fields` with `user`. Since `user` is already in the `fields` list, this is the minimal correct fix:

```python
class Meta:
    model = Employee
    fields = [..., 'user', ...]
    read_only_fields = ['user']
```

If `read_only_fields` already exists, append `'user'` to it.

- [ ] **Step 3: Verify EmployeeCreateSerializer is safe**

`EmployeeCreateSerializer` has `user` in `fields` (line 89) and a `validate_user()` method (line 110-113) that rejects assignment if the user already has an employee profile. This is acceptable — the `user` FK is needed for admin-driven employee creation. The view-level RBAC (`withAuth`) ensures only admins/HR can call the create endpoint. No change needed here.

- [ ] **Step 4: Verify Django checks pass**

Run: `cd backend/hiringnow && python manage.py check`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add backend/hiringnow/apps/employees/serializers.py
git commit -m "fix(security): prevent user FK manipulation in EmployeeUpdateSerializer

Add user to read_only_fields to prevent employee-to-user
reassignment attacks."
```

---

### Task 4: Fix Audit Log — Add Authenticated Create Endpoint [HIGH]

**Files:**
- Modify: `backend/hiringnow/apps/audit/serializers.py`
- Modify: `backend/hiringnow/apps/audit/views.py`
- Modify: `backend/hiringnow/apps/audit/urls.py`

**Risk:** The `AuditLogSerializer` has no `read_only_fields` — all fields are writable. Additionally, the Django audit view currently only supports GET (list). The `auditLog()` function in `lib/logger.ts` POSTs to `/api/v1/audit-logs/` but this returns 405 today (silently swallowed by fire-and-forget). Tasks 4 and 8 together create a working, authenticated audit create endpoint.

- [ ] **Step 1: Read all three files**

Read `backend/hiringnow/apps/audit/serializers.py`, `backend/hiringnow/apps/audit/views.py`, and `backend/hiringnow/apps/audit/urls.py`.

- [ ] **Step 2: Lock down AuditLogSerializer**

Add `read_only_fields` for server-determined values:

```python
class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'ip_address']
```

- [ ] **Step 3: Add an authenticated create view**

The current view is `AuditLogListView` (GET only). Add a create endpoint:

```python
from rest_framework.permissions import IsAuthenticated
from rest_framework import generics

class AuditLogCreateView(generics.CreateAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
        )
```

- [ ] **Step 4: Wire the create view in urls.py**

In `backend/hiringnow/apps/audit/urls.py`, add the POST route:

```python
from .views import AuditLogListView, AuditLogCreateView

urlpatterns = [
    path('', AuditLogListView.as_view(), name='audit-log-list'),
    path('create/', AuditLogCreateView.as_view(), name='audit-log-create'),
]
```

Or, if the URL pattern should accept POST on the same path as GET, combine them into a `ListCreateAPIView`:

```python
class AuditLogListCreateView(generics.ListCreateAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AuditLog.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
        )
```

Choose whichever pattern matches the existing URL config. The key requirement: POST must require `IsAuthenticated`.

- [ ] **Step 5: Verify Django checks pass**

Run: `cd backend/hiringnow && python manage.py check`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add backend/hiringnow/apps/audit/serializers.py backend/hiringnow/apps/audit/views.py backend/hiringnow/apps/audit/urls.py
git commit -m "fix(security): add authenticated audit log create endpoint with read_only_fields

Add read_only_fields to AuditLogSerializer (id, created_at, ip_address).
Create authenticated POST endpoint for audit log ingestion.
Server overrides ip_address from request context."
```

---

### Task 5: Add Throttling to Token Refresh/Blacklist [HIGH]

**Files:**
- Modify: `backend/hiringnow/apps/users/auth_views.py:74-117`

**Risk:** Token refresh and blacklist endpoints have `AllowAny` and no throttle, enabling token abuse and brute-force attacks.

- [ ] **Step 1: Read the current file**

Read `backend/hiringnow/apps/users/auth_views.py` in full.

- [ ] **Step 2: Add throttle classes**

Add throttle classes to both views:

```python
from rest_framework.throttling import AnonRateThrottle

class TokenRefreshThrottle(AnonRateThrottle):
    rate = '30/minute'

class TokenBlacklistThrottle(AnonRateThrottle):
    rate = '10/minute'
```

Then in `TenantTokenRefreshView`:
```python
throttle_classes = [TokenRefreshThrottle]
```

And in `TenantTokenBlacklistView`:
```python
throttle_classes = [TokenBlacklistThrottle]
```

- [ ] **Step 3: Fix silent exception handling**

Replace `except Exception: pass` blocks with proper logging:

```python
import logging
logger = logging.getLogger(__name__)

# Replace: except Exception: pass
# With:
except Exception as e:
    logger.warning("Failed to extract tenant for refresh: %s", str(e))
```

- [ ] **Step 4: Verify Django checks pass**

Run: `cd backend/hiringnow && python manage.py check`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add backend/hiringnow/apps/users/auth_views.py
git commit -m "fix(security): add throttling to token refresh and blacklist endpoints

Add 30/min throttle on refresh, 10/min on blacklist.
Replace silent exception handling with logged warnings."
```

---

### Task 6: Fix Health Endpoint Information Leak [HIGH]

**Files:**
- Modify: `backend/hiringnow/config/views.py:15-24`

**Risk:** The health readiness endpoint returns raw database error messages, which may reveal internal DB structure, hostnames, or credentials.

- [ ] **Step 1: Read the current file**

Read `backend/hiringnow/config/views.py` in full.

- [ ] **Step 2: Remove error detail from response**

```python
# Replace:
#   return Response({'status': 'error', 'detail': str(e)}, status=503)
# With:
import logging
logger = logging.getLogger(__name__)

# In the except block:
logger.error("Health check failed: %s", str(e))
return Response({'status': 'error', 'detail': 'Service unavailable'}, status=503)
```

- [ ] **Step 3: Verify the endpoint still works**

Run: `cd backend/hiringnow && python manage.py check`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add backend/hiringnow/config/views.py
git commit -m "fix(security): remove DB error details from health endpoint response

Log errors server-side instead of returning them to the client.
Prevents information disclosure about database internals."
```

---

### Task 7: Add HSTS and SSL Settings to Production [HIGH]

**Files:**
- Modify: `backend/hiringnow/config/settings/production.py`

**Risk:** Missing HSTS allows protocol downgrade attacks. Missing SSL redirect allows cleartext HTTP.

- [ ] **Step 1: Read the current file**

Read `backend/hiringnow/config/settings/production.py` in full.

- [ ] **Step 2: Add HSTS and SSL settings**

Append these settings to the file:

```python
# HSTS — instruct browsers to only use HTTPS
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Force HTTPS redirect
SECURE_SSL_REDIRECT = True

# Trust X-Forwarded-Proto from reverse proxy (nginx/ALB/CloudFront)
# Required to avoid infinite redirect loops when behind a proxy
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```

- [ ] **Step 3: Verify settings load**

Run: `cd backend/hiringnow && DJANGO_SETTINGS_MODULE=config.settings.production python -c "from django.conf import settings; print(settings.SECURE_HSTS_SECONDS)"`
Expected: `31536000`

- [ ] **Step 4: Commit**

```bash
git add backend/hiringnow/config/settings/production.py
git commit -m "fix(security): add HSTS and SSL redirect to production settings

Enable 1-year HSTS with subdomains and preload.
Force SSL redirect for all HTTP requests."
```

---

### Task 8: Authenticate Audit Log POST from Next.js [HIGH]

**Files:**
- Modify: `lib/logger.ts:127-131`

**Risk:** The `auditLog()` function POSTs to Django's `/api/v1/audit-logs/` without an Authorization header. Combined with Task 4 (which creates the authenticated POST endpoint), this task ensures the client sends proper credentials.

**NOTE:** `auditLog()` is called from both client-side (browser) and server-side (Next.js API route handlers via `withAuth`). The fix must handle both contexts.

- [ ] **Step 1: Read the current file**

Read `lib/logger.ts` in full. Check all call sites of `auditLog()` to confirm whether it's called server-side.

- [ ] **Step 2: Refactor auditLog to accept an optional token parameter**

Add an optional `authToken` parameter for server-side callers:

```typescript
export async function auditLog(
  payload: AuditPayload,
  authToken?: string  // Pass from request context for server-side calls
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Server-side: use passed token. Client-side: read from localStorage.
  const token = authToken
    ?? (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const tenantSlug = typeof window !== 'undefined'
    ? localStorage.getItem('tenant_slug')
    : null;
  if (tenantSlug) {
    headers['X-Tenant-Slug'] = tenantSlug;
  }

  fetch(`${DJANGO_URL}/api/v1/audit-logs/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  }).catch(() => {});  // fire-and-forget
}
```

- [ ] **Step 3: Update server-side call sites**

Search for `auditLog(` in `lib/security.ts` and any API route handlers. Where the incoming request's Authorization header is available, pass it through:

```typescript
// In withAuth or similar:
const authHeader = req.headers.get('authorization');
const token = authHeader?.replace('Bearer ', '');
auditLog(payload, token);
```

- [ ] **Step 4: Django endpoint is already secured in Task 4**

Task 4 Step 3 creates the authenticated create endpoint with `permission_classes = [IsAuthenticated]`. No additional Django changes needed here.

- [ ] **Step 5: Verify build**

Run: `npm run build` (check no TS errors in logger.ts)

- [ ] **Step 6: Commit**

```bash
git add lib/logger.ts lib/security.ts
git commit -m "fix(security): authenticate audit log POST requests

Add JWT and tenant headers to auditLog() fetch calls.
Support both client-side (localStorage) and server-side (passed token) contexts."
```

---

### Task 9: Harden Content Security Policy [HIGH]

**Files:**
- Modify: `next.config.ts:21-24`

**Risk:** `unsafe-eval` allows arbitrary JS execution via eval(). `unsafe-inline` allows injected inline scripts. Both defeat the purpose of CSP.

- [ ] **Step 1: Read the current file**

Read `next.config.ts` in full.

- [ ] **Step 2: Remove unsafe directives**

Remove `'unsafe-eval'` in production. **Keep `'unsafe-inline'`** — Next.js uses inline scripts for hydration data (`__NEXT_DATA__`), and removing it without implementing nonce-based CSP (requires custom `_document.tsx`) will break the production app.

```typescript
const isDev = process.env.NODE_ENV === 'development';
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-eval' 'unsafe-inline';"
  : "script-src 'self' 'unsafe-inline';";
```

Also remove `localhost:*` from `connect-src` in production:

```typescript
const connectSrc = isDev
  ? "connect-src 'self' localhost:* ws://localhost:*;"
  : "connect-src 'self' https://*.your-domain.com;";
```

**Future work:** Implement nonce-based CSP to eliminate `unsafe-inline`. This requires a custom `_document.tsx` with the `nonce` prop and is out of scope for this plan.

- [ ] **Step 3: Verify dev server starts**

Run: `npm run dev` — check that the app loads without CSP violations in the console.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Success.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts
git commit -m "fix(security): harden CSP — remove unsafe-eval in production

Use unsafe-eval only in dev mode. Remove localhost from connect-src
in production. Prevents XSS via eval injection."
```

---

### Task 10: Add withAuth Guards to Django Proxy Routes [HIGH]

**Files:**
- Modify: All 21 proxy route files (listed below)

**Risk:** Next.js proxy routes to Django skip `withAuth()`, meaning no server-side permission check happens in the Next.js layer. Django does its own auth, but defense-in-depth requires both layers.

**Performance note:** `withAuth()` calls `getServerSession()` which hits Django's `/auth/me/` endpoint. This adds a second round-trip to Django per request (auth check + proxied request). This is acceptable for defense-in-depth, but a future optimization would validate the JWT locally in Next.js middleware instead of calling `/auth/me/` per-request.

**Affected routes (Performance — 9 files):**
- `app/api/performance/cycles/route.ts`
- `app/api/performance/monthly/route.ts`
- `app/api/performance/monthly/[id]/route.ts`
- `app/api/performance/monthly/[id]/sign/route.ts`
- `app/api/performance/appraisals/route.ts`
- `app/api/performance/appraisals/[id]/route.ts`
- `app/api/performance/eligibility/route.ts`
- `app/api/performance/pip/route.ts`
- `app/api/performance/pip/[id]/route.ts`

**Affected routes (Teams — 5 files):**
- `app/api/teams/route.ts`
- `app/api/teams/[id]/route.ts`
- `app/api/teams/[id]/members/route.ts`
- `app/api/teams/sync/route.ts`
- `app/api/teams/org-chart/route.ts`

**Affected routes (Other — 7 files):**
- `app/api/features/route.ts`
- `app/api/departments/route.ts`
- `app/api/dashboard/route.ts`
- `app/api/dashboard/logins/route.ts`
- And ALL other proxy routes found (search for `proxyToDjango` usage — there may be 20+ additional files including audit-logs, roles, feedback, reimbursements, and agent routes)

- [ ] **Step 1: Find all proxy routes**

Run: `grep -r "proxyToDjango" app/api/ --include="*.ts" -l`

- [ ] **Step 2: For each proxy route, add withAuth wrapper**

Pattern to apply — wrap each exported handler:

```typescript
// Before:
export async function GET(req: NextRequest) {
  return proxyToDjango(req, '/api/v1/performance/cycles/');
}

// After:
import { withAuth } from '@/lib/security';

async function handler(req: NextRequest) {
  return proxyToDjango(req, '/api/v1/performance/cycles/');
}

export const GET = withAuth({ module: 'PERFORMANCE', action: 'VIEW' }, handler);
```

Use the correct module/action for each route:
- Performance routes → `module: 'PERFORMANCE'`
- Team routes → `module: 'TEAMS'`
- Dashboard routes → `module: 'DASHBOARD'`
- Department routes → `module: 'EMPLOYEES'` (or `'ORGANIZATION'`)
- Feature routes → no auth needed (public info for UI gating)

**CAUTION:** Feature flag routes (`/api/features/`) should remain unauthenticated since they're fetched during AuthContext initialization before the user is fully authenticated. Skip these.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Success with no TS errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/performance/ app/api/teams/ app/api/departments/ app/api/dashboard/
git commit -m "fix(security): add withAuth guards to all Django proxy routes

Defense-in-depth: enforce RBAC at both Next.js and Django layers.
Feature flag routes remain unauthenticated for AuthContext init."
```

---

### Task 11: Add SSRF Protection to Webhook Dispatch [HIGH]

**Files:**
- Modify: `lib/webhooks.ts`

**Risk:** Webhook URLs are user-provided. Without validation, attackers can make the server send requests to internal services (169.254.169.254, localhost, 10.x.x.x, etc.).

- [ ] **Step 1: Read the current file**

Read `lib/webhooks.ts` in full.

- [ ] **Step 2: Add private IP validation**

Add a URL validator before the fetch call:

```typescript
function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname;

    // Block private/reserved IPs
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.') ||
      hostname === '169.254.169.254' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return true;
    }

    // Block 172.16.0.0/12 range
    if (hostname.startsWith('172.')) {
      const second = parseInt(hostname.split('.')[1], 10);
      if (second >= 16 && second <= 31) return true;
    }

    return false;
  } catch {
    return true; // Invalid URL = blocked
  }
}
```

Then in `dispatchWebhookEvent()`, before the fetch:

```typescript
if (isPrivateUrl(webhook.url)) {
  logger.warn(`Blocked webhook to private URL: ${webhook.url}`);
  return;
}
```

**Limitation:** This is a string-based first-layer defense. It does NOT prevent DNS rebinding attacks where a hostname like `evil.attacker.com` resolves to `127.0.0.1`. A complete solution requires resolving the hostname via `dns.resolve` before the check, but that is a separate task. This check still blocks the most common SSRF vectors (literal IPs, localhost, `.internal`, `.local`).

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Success.

- [ ] **Step 4: Commit**

```bash
git add lib/webhooks.ts
git commit -m "fix(security): add SSRF protection to webhook dispatch

Block webhook URLs targeting private IPs, localhost, link-local,
and internal hostnames."
```

---

### Task 12: Migrate JWT from localStorage to httpOnly Cookies [HIGH — Phased]

**Files:**
- Modify: `lib/django-auth.ts`

**Risk:** JWTs in localStorage are accessible to any XSS payload. httpOnly cookies are not accessible via JavaScript.

**NOTE:** This is a large change that affects the entire auth flow. Implement in phases.

#### Phase 1 (This Plan): Document and Prepare

- [ ] **Step 1: Read django-auth.ts**

Read `lib/django-auth.ts` in full. Identify all places that read/write `access_token` and `refresh_token` from localStorage.

- [ ] **Step 2: Add a TODO comment documenting the migration path**

At the top of `django-auth.ts`, add:

```typescript
// TODO(security): Migrate JWT storage from localStorage to httpOnly cookies.
// Current flow: login() stores tokens in localStorage, api-client.ts reads them.
// Target flow: Django sets httpOnly cookies, api-client.ts sends credentials: 'include'.
// Requires Django: SESSION_COOKIE_HTTPONLY=True, CSRF_COOKIE_HTTPONLY=False (for CSRF token).
// See: docs/superpowers/plans/2026-03-23-security-fixes.md Task 12 Phase 2.
```

- [ ] **Step 3: Commit**

```bash
git add lib/django-auth.ts
git commit -m "docs(security): document JWT-to-httpOnly cookie migration path

Add TODO with migration plan for moving JWT tokens out of
localStorage to prevent XSS token exfiltration."
```

#### Phase 2 (Separate Plan — Do NOT implement now)

This requires changes across Django settings, Django auth views, api-client.ts, django-auth.ts, and all CORS config. It should be a dedicated plan after Phase 1 is stable.

---

## Verification Checklist

After all tasks are complete:

- [ ] `cd backend/hiringnow && python manage.py check` — no errors
- [ ] `npm run build` — no TS errors
- [ ] `npm test` — all existing tests pass
- [ ] Manual smoke test: login → dashboard → employees → performance → teams
- [ ] Review git log — each commit is atomic and can be reverted independently

---

## What This Plan Does NOT Cover (Future Work)

| Finding | Severity | Reason Deferred |
|---------|----------|-----------------|
| JWT in localStorage (full migration) | HIGH | Requires cross-cutting changes; Phase 1 documented above |
| npm audit vulnerabilities (6) | MEDIUM | Run `npm audit fix` separately; may require testing |
| Rate limiter bypass via headers | MEDIUM | Needs load testing to validate fix |
| Middleware token validation depth | MEDIUM | Requires deeper refactor of auth flow |
| Missing CSRF on state-changing endpoints | MEDIUM | Covered by JWT auth; relevant when migrating to cookies |
| Prisma query injection surface | LOW | Prisma parameterizes by default |
