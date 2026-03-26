# Codebase Index

**Last indexed**: March 26, 2026

## Overview

This repository is an employee management platform split across three main runtime surfaces:

- `app/`: Next.js 16 App Router frontend plus legacy and proxy API handlers
- `backend/hiringnow/`: Django 5.1 backend with domain apps and tenant-aware configuration
- `time-agent/`: desktop activity-tracking agent (Electron 28)

At the time of indexing, the repository contains 142 `app/api/**/route.ts` handlers, 30 Django apps under `backend/hiringnow/apps`, 93 files under `components/` (12 top-level + 16 domain subdirectories), 25 files under `features/` across 22 domain modules, and 41 files under `lib/`.

## Entry Points

- `package.json`: main frontend workspace and developer scripts (`dev`, `build`, `start`, `lint`, `quality-gate`)
- `app/layout.tsx`: root UI shell, theme provider, command palette, global error boundary, toast container
- `app/page.tsx`: frontend landing/dashboard entry route
- `middleware.ts`: route protection, Redis-backed rate limiting, security headers
- `next.config.ts`: standalone build, optional base-path support, CSP/security headers, image allowlist
- `docker-compose.yml`: local full-stack orchestration for Next.js frontend, Django backend, and optional Nginx gateway
- `backend/manage.py`: Django management entrypoint
- `backend/hiringnow/config/urls.py`: Django URL router
- `time-agent/main.js`: desktop agent main process entrypoint
- `service-manifest.json`: service registration manifest for multi-service platform mode

## Frontend: `app/`

The `app/` tree uses the Next.js App Router and mixes route pages with API handlers. There are 26 top-level page directories and 142 API route handlers.

### UI Route Areas (26 directories)

- `app/(dashboard)/`: grouped dashboard/report routes
- `app/admin/`: admin-only surfaces such as activity, assets, identity, integrations, reports, roles, workflows
- `app/employee/`: employee self-service pages for assets, documents, and time agent
- Module pages at the top level: `announcements`, `attendance`, `calendar`, `change-password`, `documents`, `employees`, `feedback`, `help-desk`, `leave`, `org-chart`, `payroll`, `performance`, `pf`, `profile`, `recruitment`, `reimbursement`, `resignation`, `settings`, `teams`, `training`
- Auth/public routes: `login`, `signup`

### API Route Areas (142 handlers)

- `app/api/admin/`: admin analytics, sessions, agent dashboards, metrics, orphan checks, time-tracker dashboard
- `app/api/agent/`: desktop agent registration, heartbeat, config, activity, reports, commands, idle events
- `app/api/auth/`: authentication endpoints (NextAuth v5)
- `app/api/cron/`: scheduled jobs such as report generation, aggregation, performance evaluation
- `app/api/*`: domain endpoints for employees, attendance, leaves, payroll, performance, reports, settings, teams, notifications, SCIM, storage, workflows, departments, documents, assets, tickets, recruitment, resignations, calendar, events, kudos, chat, health, and more

In practice, this layer is a mix of:

- Frontend-owned endpoints
- Legacy API routes from the older Next.js-backed backend
- Proxy/shim routes during the ongoing Django migration

## UI Components: `components/`

`components/` holds the shared React UI layer: 93 files total across 12 top-level components and 16 domain subdirectories.

### Top-Level Components (12)

- `AIChatbot.tsx`: AI-powered HR chatbot (Gemini 2.0 Flash)
- `AOSProvider.tsx`: animate-on-scroll provider
- `AppShell.tsx`: main layout shell with sidebar and topbar
- `CommandPalette.tsx`: Cmd+K command palette
- `ErrorBoundary.tsx`: global error boundary wrapper
- `MobileSidebar.tsx`: responsive mobile sidebar
- `ModeToggle.tsx`: dark/light theme toggle
- `NotificationCenter.tsx`: in-app notification center
- `RecruitmentKanban.tsx`: recruitment pipeline Kanban board
- `Sidebar.tsx`: main navigation sidebar with RBAC and feature flag gating
- `ThemeProvider.tsx`: next-themes provider
- `Topbar.tsx`: top navigation bar

### Domain Subdirectories (16)

- `components/ui/`: design system primitives (Button, Card, Dialog, DataTable, Avatar, SearchAutocomplete, etc.)
- `components/dashboard/`: role-based dashboard widgets and dashboards
- `components/admin/`: role management, reports, session management
- `components/agent/`: workforce-monitoring widgets
- Domain folders: `attendance`, `leave`, `payroll`, `performance`, `pf`, `reimbursement`, `resignation`, `settings`, `signup`, `teams`, `training`, `announcements`

## Feature API Clients: `features/`

`features/` is a feature-sliced layer with 25 files across 22 domain modules. Most contain frontend API clients that bridge React views to Django backend endpoints.

### Domain Modules (22)

`announcements`, `assets`, `attendance`, `dashboard`, `departments`, `documents`, `employees`, `events`, `feedback`, `leave`, `notifications`, `payroll`, `performance`, `reimbursements`, `reports`, `resignations`, `roles`, `sessions`, `teams`, `tickets`, `timetracker`, `training`

- Most modules follow `features/<domain>/api/client.ts`
- `features/employees/` goes further with `components/` and `types.ts`
- All API clients use `api.get/post/put/delete` from `lib/api-client.ts`

## Shared Frontend Logic: `lib/`

`lib/` contains 41 cross-cutting service files across 4 subdirectories and 31 top-level files:

### Auth and Permissions

- `auth.ts`: legacy NextAuth config (being phased out)
- `auth-server.ts`: server-side auth helpers
- `django-auth.ts`: Django JWT login, register, refresh, logout, getMe, JWT decoding
- `permissions.ts`: dual RBAC matrix (static + Django codenames), feature flags, role mapping
- `permissions-server.ts`: server-side permission resolution

### Backend Integration

- `api-client.ts`: centralized Django HTTP client with JWT, tenant headers, case transforms, pagination remap
- `django-proxy.ts`: legacy proxy with circuit breaker + retry (deprecated)
- `api-response.ts`: API envelope helpers (apiSuccess/apiError)
- `transform.ts`: camelCase/snake_case transforms

### Domain Engines

- `attendance-engine.ts`: attendance evaluation logic
- `payroll-engine.ts`: salary calculation, PF, tax slab engine
- `workflow-engine.ts`: workflow processing helpers

### Workforce Monitoring

- `agent-auth.ts`: withAgentAuth() for desktop device routes
- `agent-report-generator.ts`: daily activity report generation
- `activity-classifier.ts`: activity categorization and productivity scoring

### Platform Services

- `queue.ts`: Redis-backed background job queue
- `redis.ts`: Redis client with in-memory fallback
- `metrics.ts`: metrics collection and alerting hooks
- `logger.ts`: structured JSON logging + auditLog() dispatch to Django
- `webhooks.ts`: outbound webhook dispatch with HMAC signing
- `search-index.ts`: search index helpers
- `security.ts`: withAuth() route authorization with Django codename fallback
- `session-employee.ts`: session-to-employee resolution

### Utilities

- `chart-theme.ts`: chart color theme
- `email.ts`: email sending via Resend
- `exportUtils.ts`: export helpers
- `route-deprecation.ts`: deprecated route logging
- `salary-store.ts`: salary data store
- `supabase.ts`: Supabase client
- `swal.ts`: SweetAlert2 helpers
- `utils.ts`: general utilities

### Subdirectories

- `lib/schemas/`: Zod validation schemas (agent payloads, etc.)
- `lib/connectors/`: external service connectors
- `lib/export/`: PDF/Excel export utilities
- `lib/email-templates/`: HTML email templates

## Backend: `backend/`

The Django backend is organized as a standalone service with 30 domain apps.

### Core Backend Files

- `backend/requirements.txt`: Python dependencies
- `backend/pytest.ini`: backend test configuration
- `backend/conftest.py`: shared test fixtures
- `backend/tenant_config.py`, `backend/tenant_store.py`: tenant-related helpers
- `backend/celery_common/`: shared Celery task helpers
- `backend/scripts/`: migration/utility scripts

### Main Django Project

- `backend/hiringnow/config/`: settings, routing, tenant database helpers, ASGI/WSGI, db_utils
- `backend/hiringnow/common/`: shared models (BaseModel), TenantAwareManager, StandardResultsPagination, throttles
- `backend/hiringnow/management/commands/`: custom Django management commands (seed_rbac, seed_features)
- `backend/hiringnow/tests/`: backend architecture and migration tests
- `backend/hiringnow/future_corrections.md`: tracked technical debt (9 items)

### Django Domain Apps (30)

| Category | Apps |
| --- | --- |
| HR/Core | `employees`, `departments`, `teams`, `attendance`, `leave`, `documents`, `assets`, `training` |
| Engagement/Performance | `performance`, `feedback`, `announcements`, `events` |
| Admin/Platform | `rbac`, `roles`, `sessions`, `reports`, `features`, `notifications`, `workflows`, `users`, `tenants`, `audit` |
| Operations | `payroll`, `reimbursements`, `resignations`, `tickets`, `dashboard`, `timetracker`, `agent` |

## Desktop Agent: `time-agent/`

Electron 28 desktop agent running in the system tray for workforce activity tracking:

- `main.js`, `preload.js`: Electron main process and context bridge
- `auth.js`: Django JWT login/refresh/logout
- `config.js`: tracking intervals, screenshot settings, heartbeat frequency
- `trackers/`: `app-tracker.js`, `idle-detector.js`, `screenshot-capture.js`, `sync-engine.js`
- `renderer/`: UI layer (`index.html`, `login.html`, `idle-popup.html`)
- `assets/`: packaged resources (tray icon)

## Tests and Tooling

- `__tests__/`: Vitest-style unit tests for API and library code
- `tests/e2e/`: Playwright end-to-end tests (57 tests across 7 spec files)
- `playwright.config.ts`: Playwright config (single-worker, chromium, screenshot-on-failure)
- `vitest.config.ts`: Vitest test runner config

### Scripts (8 files)

- `scripts/create-buckets-sql.ts`: SQL for Supabase storage buckets
- `scripts/init-and-test-buckets.mjs`: bucket initialization and testing
- `scripts/init-buckets.ts`: storage bucket setup
- `scripts/load_test.js`: general load testing
- `scripts/load_test_performance.js`: performance module load testing (13 endpoints, P50/P95/P99)
- `scripts/quality-gate.js`: quality gate checks
- `scripts/release_candidate.js`: release candidate pipeline
- `scripts/rollback.js`: rollback utilities

## Infrastructure and Extensions

- `infra/nginx/`: Nginx gateway config for platform mode
- `extensions/ems-tracker/`: browser extension area
- `context/AuthContext.tsx`: shared auth context provider (Django JWT, permissions, feature flags)
- `types/index.ts`: shared TypeScript types
- `.github/`: GitHub CI/CD workflows
- `Dockerfile`: frontend container build
- `docker-compose.yml`: full-stack orchestration
- `service-manifest.json`: service registration for multi-service platform

## Key Design Decisions

- The repo is in an active migration state: moving from Next.js API routes to Django-backed APIs
- Frontend uses a hybrid architecture: `components/` (shared UI) + `features/` (domain API clients)
- RBAC is enforced at two layers: Next.js static matrix (fallback) and Django 63-codename permission system (primary)
- Tenant awareness via DB-per-tenant isolation (Django) with JWT tenant claims
- Feature flags control module visibility in sidebar and route gating
- The desktop agent (`time-agent/`) communicates directly with the Django backend

## Notable Oddities

There are multiple suspicious root-level and backend-level files with names such as `({,`, `0`, `manager`, `f.toEmployeeId`, and `name.includes(kw)))`. These do not match normal project structure and are likely artifacts from accidental shell operations — they should be cleaned up.
