# Contributing to EMS Pro

## Local Development Setup

1. Install dependencies: `npm install`
2. Create `.env` from `.env.example`
3. Run `npx prisma db push`
4. Create admin seed data with `node scripts/create_admin.js`
5. Start the app with `npm run dev`

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
  api/                # 100+ route handlers
components/           # Shared UI and feature components
  agent/              # Agent-tracking components
  dashboard/          # Role-based dashboards
  performance/        # Performance review UI
lib/                  # Shared services and helpers
  auth.ts             # NextAuth config
  security.ts         # withAuth() and org scoping
  agent-auth.ts       # withAgentAuth() for desktop devices
  permissions.ts      # Permission matrix (5 roles x 19 modules x 8 actions)
  queue.ts            # Background job queue
  webhooks.ts         # Outbound webhook dispatch
  agent-report-generator.ts
  activity-classifier.ts
prisma/
  schema.prisma       # 63 models, 38 enums
__tests__/            # Vitest tests
```

---

## RBAC and Auth Rules

When adding a session-auth API route:
1. choose the required module/action
2. wrap it in `withAuth({ module, action })`
3. scope queries by `organizationId`
4. use safe selects for sensitive data

When adding a desktop agent route:
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
