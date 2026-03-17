# System Architecture - EMS Pro

## Overview

EMS Pro is a multi-tenant HRMS undergoing migration to a unified platform. The **frontend** is built on Next.js 16, React 19, and TailwindCSS 3.4. The **backend** is being migrated from Next.js API Routes + Prisma to a **Django 5.1 + Django REST Framework** backend (located in `backend/`) with schema-per-tenant PostgreSQL isolation, SimpleJWT authentication, and dynamic RBAC. The system includes 10 roles, 19+ permissioned modules, 100+ legacy API routes (being migrated), 63+ database models, AI-assisted workflows, and a desktop agent telemetry/reporting pipeline.

---

## Architecture Diagram (Target)

```mermaid
graph TB
    subgraph Client Layer
        Browser["Next.js Frontend (port 3000)"]
        DesktopAgent["Desktop Agent"]
    end

    subgraph API Gateway
        APIClient["lib/api-client.ts"]
        Transform["lib/transform.ts (camelCase <-> snake_case)"]
        DjangoAuth["lib/django-auth.ts (JWT)"]
    end

    subgraph Django Backend ["Django Backend (port 8000)"]
        TenantMW["TenantMiddleware"]
        JWTAuth["TenantJWTAuthentication"]
        HasPerm["HasPermission"]
        DRFViews["DRF APIViews"]
        DBRouter["TenantDatabaseRouter"]
    end

    subgraph Data Layer
        RegistryDB["Registry DB (tenants, permissions)"]
        TenantDB["Tenant DBs (users, employees, departments)"]
        Redis["Redis Cache / Queue"]
    end

    subgraph Legacy Layer ["Legacy (being migrated)"]
        NextAPIRoutes["Next.js API Routes"]
        Prisma["Prisma ORM"]
        LegacyDB["Supabase PostgreSQL"]
    end

    subgraph External Services
        Gemini["Gemini 2.5 Flash"]
        Resend["Resend Email"]
    end

    Browser --> APIClient
    APIClient --> Transform
    APIClient --> DjangoAuth
    APIClient --> TenantMW
    TenantMW --> JWTAuth
    JWTAuth --> HasPerm
    HasPerm --> DRFViews
    DRFViews --> DBRouter
    DBRouter --> RegistryDB
    DBRouter --> TenantDB
    DRFViews --> Redis
    Browser --> NextAPIRoutes
    NextAPIRoutes --> Prisma
    Prisma --> LegacyDB
    DesktopAgent --> NextAPIRoutes
```

---

## Frontend

- App Router-based UI with role-aware dashboards
- Shared design system components for cards, dialogs, inputs, tables, tabs, and status surfaces
- Employee and Team Lead dashboards now include a personal To-Do list widget and an activity tracker widget
- Admin dashboard area now includes an agent-tracking page for workforce monitoring

---

## API Layer

The repository currently contains 100+ route handlers.

### Main route groups

| Prefix | Description |
| --- | --- |
| `/api/employees` | Employee CRUD, credentials, profile, documents |
| `/api/attendance` | Attendance, shifts, holidays, regularization, policies |
| `/api/time-tracker` | Check-in/out, heartbeat, break, history, status |
| `/api/payroll` | Payroll CRUD, config, import, run, payslip |
| `/api/performance` | Daily/monthly performance reviews |
| `/api/agent` | Device registration, heartbeat, config, commands, activity, idle events, report fetch |
| `/api/admin/agent` | Agent dashboard, device inventory, remote commands |
| `/api/cron` | AI performance evaluation, agent aggregation, agent reports, scheduled jobs |
| `/api/admin` | Sessions, metrics, analytics, performance, assets, agent management |

All session-auth routes use:

- `withAuth({ module, action })`
- `apiSuccess()` / `apiError()`
- organization scoping
- Zod validation for mutations

Desktop agent routes use:

- `withAgentAuth()`
- device API keys
- Zod validation via `lib/schemas/agent.ts`

---

## RBAC

Roles:

- CEO
- HR
- PAYROLL
- TEAM_LEAD
- EMPLOYEE

Modules:

- EMPLOYEES
- PAYROLL
- TEAMS
- PERFORMANCE
- FEEDBACK
- DASHBOARD
- REPORTS
- ATTENDANCE
- LEAVES
- TRAINING
- ANNOUNCEMENTS
- ASSETS
- DOCUMENTS
- TICKETS
- RECRUITMENT
- RESIGNATION
- ORGANIZATION
- SETTINGS
- WORKFLOWS
- AGENT_TRACKING

Actions:

- VIEW
- CREATE
- UPDATE
- DELETE
- REVIEW
- ASSIGN
- EXPORT
- IMPORT

---

## Database

The current Prisma schema has **63 models** and **38 enums**.

### Core HR models

- `Organization`
- `User`
- `Employee`
- `EmployeeProfile`
- `EmployeeAddress`
- `EmployeeBanking`
- `Department`
- `Team`
- `TeamMember`

### Operations models

- `Attendance`
- `TimeSession`
- `BreakEntry`
- `Leave`
- `Payroll`
- `ProvidentFund`
- `Training`
- `Asset`
- `Document`
- `Ticket`
- `Resignation`
- `CalendarEvent`

### Workflow and reporting

- `WorkflowTemplate`
- `WorkflowStep`
- `WorkflowInstance`
- `WorkflowAction`
- `SavedReport`
- `ReportSchedule`
- `Webhook`
- `WebhookDelivery`
- `AuditLog`

### AI and monitoring

- `PerformanceMetrics`
- `WeeklyScores`
- `AgentExecutionLogs`
- `Notifications`
- `AdminAlerts`

### Agent tracking

- `AgentDevice`
- `AgentCommand`
- `AgentActivitySnapshot`
- `AppUsageSummary`
- `WebsiteUsageSummary`
- `IdleEvent`
- `DailyActivityReport`

---

## Queue and Async Work

Redis-backed queue jobs currently include:

- webhook delivery
- agent aggregation
- agent report generation
- other import/export jobs

These flows are implemented in `lib/queue.ts`, worker routes, and webhook dispatch helpers.

---

## Integrations

- Supabase Storage for files
- Gemini for AI chat, performance analysis, and activity summaries
- Resend for transactional email delivery
- Google OAuth and optional Auth0 for sign-in
- Webhook subscriptions for downstream integrations

---

## Security Model

- **Schema-per-tenant** PostgreSQL isolation (target) — each tenant gets a separate database
- **Legacy**: Multi-tenant scoping via `organizationId` (shared schema)
- JWT auth via Django SimpleJWT with tenant-aware token claims
- Route-level RBAC with `HasPermission` (Django) and `withAuth()` (legacy Next.js)
- Device-level auth with `withAgentAuth()` for desktop agent routes
- First-login password change enforcement (`must_change_password` flag)
- Structured logging and request tracing
- Rate limiting: 5 login/min, 3 register/hour, 1000 API/hour
- Webhook signing via HMAC
- Session revocation through `UserSession`

---

## Key Libraries

| File | Purpose |
| --- | --- |
| `lib/api-client.ts` | Centralized HTTP client for Django backend |
| `lib/django-auth.ts` | Django JWT login, register, refresh, logout, getMe |
| `lib/transform.ts` | camelCase/snake_case transforms for API communication |
| `lib/permissions.ts` | RBAC matrix and scoping helpers |
| `lib/auth.ts` | Legacy NextAuth config (being phased out) |
| `lib/security.ts` | Legacy session route authorization |
| `lib/agent-auth.ts` | Device auth for desktop agent routes |
| `lib/queue.ts` | Background job queue |
| `lib/webhooks.ts` | Outbound webhook dispatch |
| `lib/agent-report-generator.ts` | Daily activity report generation |
| `lib/activity-classifier.ts` | Activity categorization and productivity scoring |
| `lib/email.ts` | Email sending |
| `lib/logger.ts` | Structured logging |
| `lib/metrics.ts` | Metrics collection |

---

## Django Backend (`backend/`)

The new backend follows the HiringNow platform architecture:

### Apps

| App | Purpose | Status |
| --- | --- | --- |
| `apps.tenants` | Multi-tenant registry, tenant DB management | From HiringNow |
| `apps.users` | User model + UserSession + JWT auth | Extended |
| `apps.rbac` | Dynamic roles, permissions, UserRole | Extended (10 roles, 14 permissions) |
| `apps.employees` | Employee CRUD + sub-profiles (Profile, Address, Banking) | Extended |
| `apps.departments` | Department CRUD with employee count guards | New |
| `apps.dashboard` | Stats API (department split, status counts, salary, logins) | New |
| `apps.features` | Feature flags per tenant | From HiringNow |

### API Endpoints (Django)

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/v1/auth/register/` | POST | Tenant + admin user registration |
| `/api/v1/auth/login/` | POST | JWT login with tenant slug |
| `/api/v1/auth/refresh/` | POST | Token refresh |
| `/api/v1/auth/logout/` | POST | Token blacklist |
| `/api/v1/auth/me/` | GET/PUT | Current user profile |
| `/api/v1/auth/change-password/` | POST | Password change (supports first-login) |
| `/api/v1/employees/` | GET/POST | List (paginated) / Create employee |
| `/api/v1/employees/{id}/` | GET/PUT/DELETE | Detail / Update / Soft-delete |
| `/api/v1/employees/{id}/credentials/` | POST | Reset password, return temp_password |
| `/api/v1/employees/managers/` | GET | Active employees for manager dropdown |
| `/api/v1/departments/` | GET/POST | List / Create department |
| `/api/v1/departments/{id}/` | GET/DELETE | Detail / Delete (guarded) |
| `/api/v1/dashboard/` | GET | Dashboard aggregated stats |
| `/api/v1/dashboard/logins/` | GET | Login analytics |

### Data Migration

A migration script at `backend/scripts/migrate_ems_data.py` handles:

- Supabase PostgreSQL → Django tenant DBs
- User role mapping (EMS roles → Django roles)
- Department, Employee, and sub-profile migration
- bcrypt hash format adaptation
- Dry-run mode for validation

---

## Future Roadmap

### Phase 1 (Complete): Django Backend MVP

- Departments app, Employee extensions, User extensions, RBAC seed, Dashboard API
- Schema-per-tenant database routing
- JWT claims with employee_id and must_change_password

### Phase 2 (Complete): Frontend Adaptation

- API client with camelCase/snake_case transforms
- Django JWT auth helpers replacing NextAuth
- AuthContext rewrite for Django backend
- Employee page and login page adapted

### Phase 3 (Next): Data Migration

- Run migration script against Supabase
- Validate counts and integrity
- Parallel operation period (both backends live)

### Phase 4 (Planned): Full Migration

- Migrate remaining Next.js API routes to Django (attendance, payroll, leave, etc.)
- Remove Prisma and Supabase dependencies
- Migrate agent tracking APIs to Django
- Add FastAPI AI microservice for Gemini integration

### Phase 5 (Planned): Production Hardening

- End-to-end and integration tests
- CI/CD pipeline (pytest + ruff + vitest)
- Docker Compose with all services
- Performance benchmarking and optimization
