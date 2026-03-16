# Changelog

All notable changes to EMS Pro are documented here.

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
