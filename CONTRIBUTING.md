# Contributing to EMS Pro

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features

## Local Development Setup

1. **Clone & Install**: `npm install`
2. **Environment**: Create `.env` from `.env.example` — required vars:
   - `DATABASE_URL` — PostgreSQL (Supabase)
   - `AUTH_SECRET` — NextAuth.js secret
   - `NEXTAUTH_URL` — e.g., `http://localhost:3000`
   - `GEMINI_API_KEY` — Google Gemini 2.0 Flash
   - Optional: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH0_*`, `UPSTASH_REDIS_*`, `CRON_SECRET`
3. **Database**: `npx prisma db push` and `node scripts/create_admin.js`
4. **Run**: `npm run dev` (Turbopack)
5. **Verification**: Always run `npx next build` locally before submitting a PR to ensure 0 TypeScript/JSX errors.

## Project Structure

```
app/                  # Next.js 16 App Router pages + API routes
  api/                # 82+ API route handlers
  (pages)/            # 24 page routes
components/           # 41 React components
  ui/                 # 15+ reusable UI components (Card, Badge, Button, Dialog, etc.)
  dashboard/          # Role-based dashboards (Admin, Payroll, TeamLead, Employee)
  performance/        # Performance review forms (Daily, Monthly, DetailView)
  features/           # Employee list, form modal, API client
lib/                  # 25 shared library files
  auth.ts             # NextAuth v5 config
  security.ts         # withAuth() RBAC middleware, orgFilter()
  permissions.ts      # Permission matrix (5 roles × 18 modules × 8 actions)
  prisma.ts           # Prisma singleton with PrismaPg adapter
  schemas/            # 30+ Zod validation schemas
  api-response.ts     # apiSuccess() / apiError() envelope
  logger.ts           # Structured JSON logging
  metrics.ts          # API metrics + auto-alerting
prisma/
  schema.prisma       # 55 models, 38 enums
scripts/              # Admin tools (create_admin, load_test, etc.)
__tests__/            # Vitest + Playwright tests
```

## RBAC System

EMS Pro uses a granular RBAC system. When adding new API routes:

1. Define which module and action the route requires (see `lib/permissions.ts`)
2. Wrap the handler with `withAuth({ module: "MODULE_NAME", action: "ACTION" })`
3. Use `orgFilter(ctx)` for multi-tenant scoping on all queries
4. Use `scopeEmployeeQuery(ctx, module)` if the route returns employee data

### Roles

| Role | Access Level |
|---|---|
| CEO | Full access to all 18 modules |
| HR | Employee management, attendance, leaves, training, recruitment, workflows |
| PAYROLL | Payroll, PF, attendance (view), reports (view/export) |
| TEAM_LEAD | Team overview, performance reviews, leave approvals, tickets |
| EMPLOYEE | Own data only |

## API Conventions

- **Response envelope**: Always use `apiSuccess(data)` and `apiError(message, code, status)` from `lib/api-response.ts`
- **Input validation**: Add Zod schemas in `lib/schemas/` for all POST/PUT bodies
- **Error handling**: Wrap route logic in try/catch. Log with `logger.error()`. Never expose `error.message` to clients.
- **Permissions**: Every route must use `withAuth({ module, action })` — no unauthenticated API access

## Testing

- **Unit tests**: `npm run test` (Vitest)
- **E2E tests**: Playwright
- **Test files**: `__tests__/api/` for API routes, `lib/*.test.ts` for utilities

## Default Credentials (Development)

| Role | Email | Password |
|---|---|---|
| CEO | ceo@emspro.com | CEO@2026 |
| HR | hr@emspro.com | HR@2026 |
| Payroll | payroll@emspro.com | PAYROLL@2026 |
| Team Lead | teamlead@emspro.com | TL@2026 |
| Employee | EMP001@emspro.com | EMP001@2026 |

Created via `node scripts/create_admin.js`.

## Report Bugs

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/Work-Ashish/Employee-directory/issues) — include:

- A quick summary and/or background
- Steps to reproduce (be specific!)
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening)

## References

This document was adapted from the open-source contribution guidelines for [Facebook's Draft](https://github.com/facebook/draft-js/blob/master/CONTRIBUTING.md).
