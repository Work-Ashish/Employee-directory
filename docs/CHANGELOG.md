# Changelog

All notable changes to EMS Pro are documented here.

---

## [5.2.0] - 2026-03-21

### Added

- **Playwright E2E Test Suite** — 57 tests across 7 spec files covering auth, employees CRUD, teams CRUD, leave/attendance, payroll/announcements, admin panels (assets, documents, training, integrations, performance), and full navigation smoke tests for all 18 routes
- **Playwright Configuration** — `playwright.config.ts` with single-worker sequential execution, chromium project, screenshot-on-failure, and trace-on-retry
- **Login Helper** — `tests/e2e/helpers/auth.ts` with `login()` and `uniqueId()` utilities
- **Circuit Breaker Reset** — `resetCircuitBreaker()` export in `lib/django-proxy.ts` for test isolation

### Changed

- **Modal Widths** — Broadened all modal/popup forms across the app: `Modal.tsx` default → `max-w-2xl`, `Dialog.tsx` size tiers bumped (sm→lg, default→2xl, lg→3xl, xl→5xl), plus `TeamFormModal`, `TeamDetailModal`, `TeamReviewForm` individually widened
- **Django Proxy Tests** — Rewrote `__tests__/lib/django-proxy.test.ts` (17 tests) with `resetCircuitBreaker()` in `beforeEach`, POST-specific tests for non-retry scenarios, and 3 new tests (retry success, POST no-retry, circuit breaker OPEN)

### Fixed

- **Login Authentication** — Rotated credentials after GitGuardian secret detection incident; password updated via Django shell
- **Secret Leak Prevention** — Added `.claude/settings.local.json` to `.gitignore`, ran `git rm --cached` to stop tracking it

### Security

- Resolved GitGuardian incident #29052649 (credential exposure in 22 commits)
- Rotated exposed password, added `.gitignore` entries for sensitive files

---

## [5.1.0] - 2026-03-17

### Added — HiringNow Django Integration (9 Sprints)

- **RBAC Alignment (S1)** — `DJANGO_ROLE_MAP`, `DJANGO_MODULE_MAP`, `toCodename()`, `hasPermissionWithCodenames()` in `lib/permissions.ts`. `fetchUserPermissions()` in AuthContext fetches Django codenames on login/mount
- **Feature Flags (S2/S6)** — `fetchFeatureFlags()` in AuthContext, `MODULE_FEATURE_FLAG` map + `isModuleEnabled()` in permissions.ts, Sidebar module gating, route protection via `ROUTE_MODULE_MAP`
- **Multi-Tenancy (S3)** — `decodeJwtPayload()` + `persistTenantFromJwt()` in `django-auth.ts` extract tenant context from JWT claims
- **Middleware Security (S4)** — Per-user 1000/hr rate limiting in `middleware.ts` alongside per-IP 60/min. `auditLog()` in `logger.ts` dispatching to Django `/api/v1/audit-logs/`
- **Data Contract (S5)** — `remapPaginationParams()` in `api-client.ts` auto-converts `limit=` → `per_page=` for Django. Extended `ApiResponse.meta` with `perPage`, `totalPages`
- **Django RBAC Expansion (S7)** — `seed_rbac.py` expanded: 18 modules, 63 permission codenames, 7 roles (admin, hr_manager, payroll_admin, team_lead, recruiter, hiring_manager, interviewer, viewer)
- **Django Feature Flags (S8)** — New `seed_features` management command with 14 module flags (employees, attendance, leave, payroll, performance, training, recruitment, documents, assets, help_desk, announcements, reimbursement, workflows, teams)
- **Django Audit Logs (S9)** — New `apps/audit/` app: AuditLog model, serializer, REST API at `/api/v1/audit-logs/`, registered in DB router
- **Django CORS (S9)** — `CORS_ALLOW_HEADERS` with `x-tenant-slug` in `config/settings/base.py`

### Changed

- `context/AuthContext.tsx` — Now fetches permissions + feature flags + capabilities in parallel on login/mount. Feature flags response parsing handles Django array format
- `lib/security.ts` — Added tenant admin bypass + Django codename fallback chain
- `components/Sidebar.tsx` — Now checks feature flags for module visibility
- `app/settings/page.tsx` — Change-password path fixed to `/auth/change-password/`
- `config/db_router.py` — Added `audit` to `tenant_scoped_apps`
- `config/urls.py` — Added audit URL include

---

## [5.0.0] - 2026-03-16

### Added

- **Django Backend** (`backend/`) — Full Django 5.1 + DRF backend adopting HiringNow platform architecture
  - Schema-per-tenant PostgreSQL multi-tenancy
  - `apps.departments` — Department CRUD with employee count annotations and delete guards
  - `apps.dashboard` — Stats API (department split, status counts, recent hires, salary, login analytics)
  - `apps.employees` — Extended with salary, date_of_joining, avatar_url, soft-delete, sub-profiles (EmployeeProfile, EmployeeAddress, EmployeeBanking), pagination, search, credentials reset, manager list
  - `apps.users` — Extended with avatar, bio, accent_color, must_change_password, last_login_at, UserSession model
  - `apps.rbac` — Extended from 5 to 10 roles (admin, ceo, hr_manager, payroll_admin, team_lead, employee, etc.) and 14 permissions
  - JWT claims now include `must_change_password` and `employee_id`
  - CORS configuration for frontend-backend communication
- **Frontend Django Integration**
  - `lib/api-client.ts` — Centralized HTTP client with JWT auth and tenant slug headers
  - `lib/transform.ts` — camelCase/snake_case transform layer for Django API
  - `lib/django-auth.ts` — Login, register, refresh, logout, getMe helpers
  - `context/AuthContext.tsx` — Rewritten from NextAuth to Django JWT with role mapping
  - `features/employees/api/client.ts` — Rewired to Django REST API with pagination
  - `app/login/page.tsx` — Added tenant slug (Organization ID) field, uses Django JWT auth
- **Data Migration Script** (`backend/scripts/migrate_ems_data.py`) — Supabase to Django tenant DBs with dry-run support
- **Docker Compose** — Added backend and frontend services

### Changed

- Login page now requires Organization ID (tenant slug) for multi-tenant auth
- Employee list endpoint returns paginated `{ results, total, page, limit, totalPages }` format
- Employee deletion is now soft-delete (sets deleted_at, is_archived, status=ARCHIVED)
- Credentials reset returns email instead of username

---

## [4.2.0] - 2026-03-16

### Added

- Local-storage backed To-Do list widget on Employee and Team Lead dashboards

### Changed

- Updated HR Chatbot to use Gemini 2.5 Flash (`gemini-2.5-flash`)

---

## [4.1.0] - 2026-03-12

### Added

- `AGENT_TRACKING` RBAC module
- Desktop agent endpoints for register, heartbeat, config, commands, activity, and idle events
- Admin agent endpoints for dashboard, device inventory, and command dispatch
- Daily activity report endpoint and cron pipelines for aggregation/report generation
- `AgentActivityWidget` for employees and admin agent-tracking dashboard
- Email delivery support via Resend and daily report templates

### Changed

- Prisma schema now includes `AgentDevice`, `AgentCommand`, `AgentActivitySnapshot`, `AppUsageSummary`, `WebsiteUsageSummary`, `IdleEvent`, and `DailyActivityReport`
- Queue now supports `AGENT_REPORT_GENERATE` and `AGENT_AGGREGATE`
- Webhook dispatch now includes agent-related events
- Sidebar and dashboards now expose agent tracking where permitted

---

## [4.0.0] - 2026-03-06

### Added

- Structured daily and monthly performance reviews with `formData`
- Role-scoped performance review API
- Reviewer tracking on performance submissions

### Changed

- Admin and employee performance views rewritten around structured review data
- Performance schema updated with `formType` and `formData`

---

## [3.0.0] - 2026-03-04

### Added

- Full RBAC permission system
- Role-based dashboards
- Structured logging, metrics, and session management
- Normalized API responses and permission-aware middleware

### Changed

- Routes migrated to `withAuth({ module, action })`
- UI moved onto shared design system components

---

## [2.0.0] - 2026-02-25

### Added

- AI chatbot
- Google OAuth
- Admin payroll export
- Real-time time tracker

### Fixed

- Password change loop
- Prisma connection pool exhaustion

---

## [1.0.0] - 2026-02-24

### Added

- Employee CRUD
- Department management
- Zod validation
- Redis-backed dashboard caching
- Pagination and bulk employee import
