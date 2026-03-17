# Changelog

All notable changes to EMS Pro are documented here.

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
