# Contributing to EMS Pro

## Local Development Setup

### Next.js Frontend

1. Install dependencies: `npm install`
2. Create `.env` from `.env.example`
3. Set `NEXT_PUBLIC_API_URL` to your Django backend URL (default: `http://127.0.0.1:8000`)
4. Run `npx prisma db push` (for local-only models)
5. Start the app with `npm run dev`

### Django Backend (HiringNow)

1. `cd` to `HiringNow/hiringnow-platform/hiringnow/`
2. Create virtualenv and install: `pip install -r requirements.txt`
3. Create `.env` from `.env.example` (DB_NAME, DB_USER, DB_PASSWORD, SECRET_KEY, TENANT_DB_SLUGS)
4. Run migrations: `python manage.py migrate`
5. Seed RBAC: `python manage.py seed_rbac --tenant-slug <slug>`
6. Seed feature flags: `python manage.py seed_features`
7. Start: `python manage.py runserver`

Recommended env vars for full local coverage:
- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `GEMINI_API_KEY`
- `CRON_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY`

---

## Project Structure

```text
app/                  # App Router pages and API routes
  api/                # 100+ route handlers (legacy, local models only)
components/           # Shared UI and feature components
  agent/              # Agent-tracking components
  dashboard/          # Role-based dashboards
  performance/        # Performance review UI
context/
  AuthContext.tsx      # Django JWT auth context (permissions, feature flags, capabilities)
features/             # Feature modules with API clients for Django
  employees/          # Employee list, form, API client, types
  leave/              # Leave API client
lib/                  # Shared services and helpers
  api-client.ts       # Django HTTP client (JWT, tenant header, case transforms, pagination remap)
  django-auth.ts      # Django JWT auth (login, register, refresh, getMe, JWT decoding)
  transform.ts        # camelCase <-> snake_case transforms
  permissions.ts      # Dual RBAC: static matrix + Django codenames + feature flags
  security.ts         # withAuth() — auth, codename fallback, tenant admin bypass
  logger.ts           # Structured logging + auditLog() → Django
  auth.ts             # Legacy NextAuth config (being phased out)
  agent-auth.ts       # withAgentAuth() for desktop devices
  queue.ts            # Background job queue
  webhooks.ts         # Outbound webhook dispatch
prisma/
  schema.prisma       # 63 models, 38 enums (retained for local-only models)
__tests__/            # Vitest tests
```

---

## RBAC and Auth Rules

### Next.js API routes (legacy — local models only)

1. choose the required module/action
2. wrap it in `withAuth({ module, action })`
3. scope queries by `organizationId`
4. use safe selects for sensitive data

### Django-backed features (primary)

1. Use `api.get/post/put/patch/delete` from `lib/api-client.ts` — it handles JWT, tenant headers, and case transforms
2. RBAC is enforced by Django `HasPermission` + the 63-codename permission system
3. Feature flag gating: check `isModuleEnabled(module, user.featureFlags)` from `lib/permissions.ts`
4. To add a new module permission: update `PERMISSIONS` in `seed_rbac.py`, assign to roles in `SYSTEM_ROLES`, re-run `seed_rbac`
5. To add a new feature flag: add to `FEATURE_FLAGS` in `seed_features.py`, re-run `seed_features`

### Desktop agent routes

1. use `withAgentAuth()`
2. validate payloads with `lib/schemas/agent.ts`
3. avoid trusting client-calculated scores or categories when server-side derivation is available

---

## API Conventions

- use `apiSuccess()` and `apiError()`
- validate POST/PUT/PATCH bodies with Zod
- wrap route logic in `try/catch`
- never expose raw internal errors to clients
- prefer queue-backed async work for webhook delivery and heavy report generation

---

## Testing

- run `npx vitest run --silent`
- run `npx tsc --noEmit`
- add tests for permission changes and route validation when touching auth-sensitive paths

---

## Notes for New Agent Features

If you work on agent tracking:
- document privacy implications clearly
- preserve auditability for admin commands
- keep retention/export behavior in mind
- validate queue and webhook side effects, not just the happy path
