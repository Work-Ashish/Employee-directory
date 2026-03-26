# Codebase Index

## Overview

This repository is an employee management platform split across three main runtime surfaces:

- `app/`: Next.js 16 App Router frontend plus a large set of legacy and proxy API handlers
- `backend/hiringnow/`: Django 5.1 backend with domain apps and tenant-aware configuration
- `time-agent/`: desktop activity-tracking agent

At the time of indexing, the repository contains about 865 tracked files from `rg --files`, 141 `app/api/**/route.ts` handlers, 30 Django apps under `backend/hiringnow/apps`, 93 files under `components/`, and 25 files under `features/`.

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

## Frontend: `app/`

The `app/` tree mixes route pages with Next.js API handlers.

### UI Route Areas

- `app/(dashboard)/`: grouped dashboard/report routes
- `app/admin/`: admin-only surfaces such as activity, assets, identity, integrations, reports, roles, workflows
- `app/employee/`: employee self-service pages for assets, documents, and time agent
- Module pages at the top level: `attendance`, `calendar`, `documents`, `employees`, `feedback`, `leave`, `org-chart`, `payroll`, `performance`, `profile`, `recruitment`, `reimbursement`, `resignation`, `settings`, `teams`, `training`
- Auth/public routes: `login`, `signup`, `change-password`

### API Route Areas

- `app/api/admin/`: admin analytics, sessions, agent dashboards, metrics, orphan checks
- `app/api/agent/`: desktop agent registration, heartbeat, config, activity, reports, commands
- `app/api/auth/`: authentication endpoints
- `app/api/cron/`: scheduled jobs such as report generation and aggregation
- `app/api/*`: domain endpoints for employees, attendance, leaves, payroll, performance, reports, settings, teams, notifications, SCIM, storage, workflows, and more

In practice, this layer appears to be a mix of:

- frontend-owned endpoints
- compatibility endpoints from an older Next.js-backed backend
- proxy/shim routes during the Django migration

## UI Components: `components/`

`components/` holds the shared React UI layer. The structure is mostly domain-oriented:

- `components/ui/`: design system primitives such as `Button`, `Card`, `Dialog`, `DataTable`, `Avatar`, `SearchAutocomplete`
- `components/dashboard/`: role-based dashboard widgets and dashboards
- `components/admin/`: role management, reports, session management
- `components/agent/`: workforce-monitoring widgets
- Domain folders: `attendance`, `leave`, `payroll`, `performance`, `pf`, `reimbursement`, `resignation`, `settings`, `teams`, `training`, `announcements`
- App shell pieces at the root: `AppShell`, `Sidebar`, `Topbar`, `CommandPalette`, `NotificationCenter`, `AIChatbot`, `ThemeProvider`

## Feature API Clients: `features/`

`features/` is a lightweight feature-sliced layer, mostly made of frontend API clients and a few local feature components.

- Most modules follow `features/<domain>/api/client.ts`
- `features/employees/` goes further and also contains `components/` and `types.ts`
- This folder looks like the main bridge from React views into backend endpoints

## Shared Frontend Logic: `lib/`

`lib/` contains cross-cutting services and domain logic:

- Auth and permissions: `auth.ts`, `auth-server.ts`, `django-auth.ts`, `permissions.ts`, `permissions-server.ts`
- Backend integration: `api-client.ts`, `django-proxy.ts`, `api-response.ts`
- Domain engines: `attendance-engine.ts`, `payroll-engine.ts`, `workflow-engine.ts`
- Workforce monitoring: `agent-auth.ts`, `agent-report-generator.ts`, `activity-classifier.ts`
- Platform services: `queue.ts`, `redis.ts`, `metrics.ts`, `logger.ts`, `webhooks.ts`, `search-index.ts`
- Validation and schemas: `lib/schemas/`
- Integrations/export/email: `connectors/`, `export/`, `email-templates/`

## Backend: `backend/`

The Django backend is organized as a standalone service.

### Core Backend Files

- `backend/requirements.txt`: Python dependencies
- `backend/pytest.ini`: backend test configuration
- `backend/tenant_config.py`, `backend/tenant_store.py`: tenant-related helpers
- `backend/celery_common/`: shared task helpers
- `backend/scripts/`: migration/utilities

### Main Django Project

- `backend/hiringnow/config/`: settings, routing, tenant database helpers, ASGI/WSGI
- `backend/hiringnow/common/`: shared models, helpers, pagination, throttles
- `backend/hiringnow/management/commands/`: custom Django management commands
- `backend/hiringnow/tests/`: backend architecture and migration tests

### Django Domain Apps

`backend/hiringnow/apps/` contains 30 apps, including:

- HR/core: `employees`, `departments`, `teams`, `attendance`, `leave`, `documents`, `assets`, `training`
- Engagement/performance: `performance`, `feedback`, `announcements`, `events`
- Admin/platform: `rbac`, `roles`, `sessions`, `reports`, `features`, `notifications`, `workflows`, `users`, `tenants`, `audit`
- Operations: `payroll`, `reimbursements`, `resignations`, `tickets`, `dashboard`, `timetracker`, `agent`

## Desktop Agent: `time-agent/`

This is a separate desktop runtime, likely Electron-based given the file layout:

- `main.js`, `preload.js`: application bootstrap
- `renderer/`: UI layer
- `trackers/`: local activity capture
- `auth.js`, `config.js`: local auth/config logic
- `assets/`: packaged resources

## Tests and Tooling

- `__tests__/`: Vitest-style unit tests for API and library code
- `tests/e2e/`: Playwright end-to-end tests
- `playwright.config.ts`, `vitest.config.ts`: test runners
- `scripts/`: quality gate, release/rollback, load tests, storage bucket setup

## Docs and Infra

- `docs/`: architecture, API documentation, user flows, changelog, backlog, agent docs
- `infra/nginx/`: gateway config for platform mode
- `extensions/ems-tracker/`: browser extension area
- `context/AuthContext.tsx`: shared auth context provider
- `types/index.ts`: shared TypeScript types

## Architectural Notes

- The repo is in a migration state: README and folder layout both indicate a move from Next.js API routes toward Django-backed APIs.
- The frontend is not purely feature-sliced or purely page-sliced; it currently uses both `components/` and `features/`.
- RBAC, tenant awareness, workforce monitoring, and reporting are all first-class concerns across the codebase.

## Notable Oddities

There are multiple suspicious root-level and backend-level files with names such as `({,`, `0`, `manager`, `f.toEmployeeId`, and `name.includes(kw)))`. These do not match normal project structure and are worth reviewing before relying on the repository layout for automation or packaging.

There is also an already-dirty working tree, including many modified API routes and several newly added directories under `app/api/notifications/`, `app/api/roles/[id]/permissions/`, and `app/api/teams/`. This index intentionally does not classify those edits as stable architecture.
