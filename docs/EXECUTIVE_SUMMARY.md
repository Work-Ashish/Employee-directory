# EMS Pro — Executive Summary

**Project**: EMS Pro (Employee Management System)
**Version**: 1.0.0 (Sprint 1 Complete)
**Date**: March 16, 2026
**Status**: Active Development — Sprint 1 Delivered, Sprint 2 Planning

---

## 1. Project Overview

EMS Pro is a full-stack, multi-tenant Human Resource Management System (HRMS) built as a modern SaaS platform. It manages the complete employee lifecycle — from recruitment and onboarding through performance management, payroll processing, and resignation handling. The system serves organizations of all sizes with role-based access, AI-powered analytics, real-time agent tracking, and configurable workflows.

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16 (App Router, Turbopack), React 19, TailwindCSS 3.4, Radix UI |
| **Backend** | Next.js API Routes, Prisma 7.4 ORM |
| **Database** | PostgreSQL (Supabase-hosted) — 64 models, 46 enums |
| **Authentication** | NextAuth.js v5, JWT, bcryptjs, Google OAuth, Auth0, SCIM 2.0 |
| **Caching/Queue** | Upstash Redis (with in-memory fallback) |
| **AI Engine** | Google Gemini 2.0 Flash (via ai-sdk) |
| **File Storage** | Supabase Storage (5 buckets: avatars, documents, assets, training, receipts) |
| **Validation** | Zod 4.3, react-hook-form |
| **Testing** | Vitest (unit), Playwright (E2E) |
| **Export** | XLSX, jsPDF, CSV (QuickBooks/Xero compatible) |
| **Notifications** | Slack integration, in-app notification center, email (Resend) |

---

## 2. Completed Features (Sprint 1 — Delivered)

### 2.1 Core Platform Infrastructure

- **Multi-tenant architecture**: All queries scoped by `organizationId` via `orgFilter()` helper
- **RBAC system**: 6 roles — ADMIN, EMPLOYEE, HR_MANAGER, PAYROLL_ADMIN, RECRUITER, IT_ADMIN
- **Auth middleware**: `withAuth()` wrapper handles authentication, logging, metrics, rate limiting
- **API standards**: Consistent `apiSuccess()`/`apiError()` response envelope across 105+ API routes
- **Async context propagation**: AsyncLocalStorage for requestId/orgId/userId across request lifecycle
- **Structured logging**: JSON-format logging with `logger` and `logContext`
- **Metrics collection**: `MetricsCollector` with auto-alerting thresholds
- **Database transactions**: Atomic operations for employee creation, payroll finalization, workflow approvals

### 2.2 Employee Management (6 API routes)

- Full CRUD operations for employee records
- Employee profile with personal details, address, banking information
- Department and team assignment
- Manager/reporting hierarchy mapping
- Credential management and password reset
- Employee document storage (Supabase Storage)
- Profile photo upload (avatars bucket)

### 2.3 Attendance & Time Tracking (17 API routes)

- **Attendance**: Daily check-in/check-out, manual entry, bulk import via CSV/Excel
- **Time Sessions**: Real-time time tracking with heartbeat monitoring
- **Break Management**: Track break entries with start/end timestamps
- **Shift Management**: Create shifts, assign employees to shifts
- **Attendance Policy**: Configurable policies (grace period, half-day thresholds, overtime rules)
- **Attendance Regularization**: Employee-requested corrections with approval workflow
- **Holiday Calendar**: Organization-wide and regional holiday management
- **Activity Logging**: Application-level activity tracking with idle detection
- **Attendance Engine**: `evaluateAttendance()`, `isWorkingDay()` business logic

### 2.4 Leave Management (2 API routes)

- Leave request submission and approval workflow
- Leave balance tracking per leave type
- Leave policy configuration
- Manager approval/rejection with comments

### 2.5 Payroll Processing (6 API routes)

- **Salary Calculation**: `calculateNetSalary()` with configurable components
- **Provident Fund**: `calculatePFContributions()` for employee and employer
- **Tax Engine**: `calculateDynamicTax()` with progressive slab support
- **Payroll Run**: Bulk payroll processing with finalization
- **Payslip Generation**: Individual payslip PDF generation
- **Import**: Bulk payroll data import from Excel/CSV
- **Compliance**: PayrollComplianceConfig, TaxSlab, PayrollAudit models
- **Export**: QuickBooks and Xero CSV format export

### 2.6 Performance Management (2 API routes, 10 components)

- **Admin Performance View**: Manager-facing dashboard (1413 lines) for reviewing team performance
- **Employee Performance View**: Employee-facing dashboard with self-review capability
- **Review Forms**:
  - Daily Self-Review Form (activity metrics, behavioral ratings, priorities, blockers, key wins)
  - Monthly Self-Review Form
  - Team Leader Monthly Review Form
  - Team Review Form
- **Review Types**: MANAGER, SELF, PEER reviews
- **Form Types**: DAILY, MONTHLY, TEAM_REVIEW, LEADER_MONTHLY
- **AI-Powered Evaluation**: Cron-based performance evaluation using Google Gemini
- **Performance Metrics**: Automated tracking of weekly scores and performance metrics
- **Burnout Analytics**: Admin burnout risk detection and alerts

### 2.7 Employee Feedback System

- Structured feedback submission (rating + comments)
- Feedback categories: manager feedback, peer feedback, self-assessment
- Feedback history tracking per employee
- Integration with performance review pipeline

### 2.8 Training & Development (2 API routes)

- Training program creation and management
- Employee enrollment with status tracking
- Training material storage (Supabase training bucket)
- Completion tracking and certification

### 2.9 Recruitment (1 API route)

- Candidate management with status tracking
- Recruitment Kanban board (visual pipeline)
- Candidate profile storage

### 2.10 Document Management (2 API routes)

- Document upload, categorization, and retrieval
- Supabase Storage integration (documents bucket)
- Document embeddings for AI-powered search (DocumentEmbedding model)
- Admin and employee document views

### 2.11 Asset Management (2 API routes)

- Asset tracking (laptops, equipment, etc.)
- Asset assignment to employees
- Bulk import from Excel/CSV
- Admin and employee asset views

### 2.12 Announcements & Communication (1 API route)

- Organization-wide announcement creation
- Priority levels and expiration dates
- Read receipt tracking
- 4 dedicated UI components

### 2.13 Help Desk / Ticketing (1 API route)

- Ticket creation and status tracking
- Priority-based queue management

### 2.14 Calendar & Events (1 API route)

- Organization calendar with events
- Holiday integration
- Event creation and management

### 2.15 Resignation Management (2 API routes)

- Resignation request submission
- Approval workflow (manager → HR)
- Notice period tracking
- Bulk import support

### 2.16 Reimbursement Management (2 API routes)

- Expense claim submission with receipt upload (receipts bucket)
- Multi-level approval workflow
- Reimbursement status tracking

### 2.17 Kudos / Recognition (1 API route)

- Peer-to-peer recognition system
- Kudos categories and badges
- Dashboard widget for recent kudos

### 2.18 Workflow Engine (2 API routes)

- **Configurable workflows**: WorkflowTemplate → WorkflowStep → WorkflowInstance → WorkflowAction
- **State machine**: `WorkflowEngine.initiateWorkflow()`, `.processAction()`
- **Visual builder**: Admin workflow builder page (`/admin/workflows/builder`)
- **Multi-step approvals**: Sequential and parallel approval paths

### 2.19 Agent Tracking / Desktop Monitoring (8 DB models, 10 API routes)

- **Device registration**: Agent registers company devices with authentication
- **Activity tracking**: Application usage, website usage, idle events
- **Heartbeat monitoring**: Real-time device status with configurable intervals
- **Screenshot capture**: Periodic screenshot functionality
- **Remote commands**: Push commands to registered agent devices
- **Activity classification**: `activity-classifier.ts` productivity scoring engine
- **Daily activity reports**: Auto-generated via `agent-report-generator.ts`
- **Admin dashboards**: Device management, activity monitoring, time-tracker dashboard
- **Cron aggregation**: Automated activity data aggregation and report generation

**Database Models**: AgentDevice, AgentCommand, AgentActivitySnapshot, AppUsageSummary, WebsiteUsageSummary, IdleEvent, DailyActivityReport

### 2.20 AI-Powered Features

- **AI Chatbot**: Context-aware HR assistant (387 lines, Google Gemini 2.0 Flash)
- **Command Palette**: Cmd+K global search and action palette
- **Onboarding Companion**: AI-guided new employee onboarding
- **Performance Evaluation**: Automated performance scoring via cron
- **Document Embeddings**: Vector search for AI-powered document retrieval
- **Burnout Detection**: Automated admin alerts for burnout risk indicators

### 2.21 Reporting & Analytics (3 API routes)

- **Report Builder**: Dynamic report creation with custom filters
- **Saved Reports**: Persistent report configurations with scheduling
- **Export**: CSV, PDF, Excel export across all modules
- **Dashboard Analytics**: Admin and employee dashboard with Recharts visualizations

### 2.22 Enterprise & Integration Features

- **SCIM 2.0**: Automated user provisioning (2 API routes)
- **Webhooks**: Event-driven notifications with HMAC signing (2 API routes)
- **Slack Integration**: Notification delivery via Slack connector
- **Auth0**: Enterprise SSO support
- **Google OAuth**: Social login
- **Accounting Export**: QuickBooks and Xero CSV generation

### 2.23 System Administration

- **Session Management**: Active session tracking with revocation capability
- **Audit Logging**: Comprehensive action audit trail
- **Organization Settings**: Configurable organization-level preferences
- **Health Monitoring**: `/api/health` and `/api/raw-health` endpoints
- **Metrics Dashboard**: API performance metrics with alerting
- **Notification Center**: Real-time in-app notifications

### 2.24 UI/UX Platform

- **34 page routes** with responsive design
- **73 React components** across 14 feature folders
- **19 reusable UI components** (Radix UI + TailwindCSS design system)
- **Dark/Light mode**: Theme toggle with system preference detection
- **Mobile responsive**: MobileSidebar for touch devices
- **Data tables**: TanStack Table with sorting, filtering, pagination
- **Toast notifications**: Sonner-based notification system
- **Loading states**: Skeleton screens and spinner components

---

## 3. New Client Requirements (Received March 16, 2026)

The following requirements have been received from the client and are scheduled for implementation in upcoming sprints.

### 3.1 Role Creation and Assignment System

**Priority**: High | **Estimated Effort**: 13 SP

**Requirements**:
- Roles must be defined before user creation — system enforces role-first workflow
- Recruitment-specific roles: Sourcing, Screening, Interview Scheduling, Offer Making, Onboarding
- Each employee tagged to specific functional roles defining task visibility and permissions
- Customizable role names and designations (e.g., "Talent Acquisition Specialist", "Interview Coordinator", "Senior Interview Coordinator")
- Hierarchical role inheritance — higher-level roles automatically inherit lower-level capabilities (e.g., Team Leaders can perform sourcing/screening tasks)
- UI dynamically adapts to show only functionality relevant to user's assigned roles

**Implementation Approach**:
- Extend existing RBAC model with a new `FunctionalRole` model and `RoleCapability` mapping table
- Create role management admin UI with drag-and-drop hierarchy builder
- Implement capability-based permission checks alongside existing role checks
- Add role-based UI filtering in `Sidebar.tsx` and feature components
- Build role inheritance resolution engine in `lib/permissions.ts`

**Impact on Existing System**:
- Extend `User` model with many-to-many `FunctionalRole` relationship
- Update `security.ts` middleware to resolve functional roles
- Modify sidebar and page-level access control
- New admin page: `/admin/roles`

### 3.2 User Creation and Management Enhancements

**Priority**: High | **Estimated Effort**: 8 SP

**Requirements**:
- **Bulk upload**: Employee creation via Excel sheet with fields — employee code, name, designation, role, department, manager, etc.
- **Auto-hierarchy**: String matching algorithm to automatically build reporting hierarchy from department and position data in import file
- **Automated notifications**: New users receive login credentials via email upon account creation
- **Manager mapping**: Every user must be mapped to a manager/reporting structure

**Implementation Approach**:
- Extend existing CSV import pattern (already used in attendance, payroll, assets, resignations) to employee creation
- Add XLSX parsing with column mapping UI (similar to `CsvImportModal` component)
- Implement fuzzy string matching for department/position → hierarchy resolution
- Integrate Resend email transport for welcome emails with credentials
- Add `managerId` foreign key enforcement on Employee model

**Impact on Existing System**:
- Enhance `/api/employees` POST endpoint for bulk creation
- New component: Enhanced import modal with preview and hierarchy mapping
- Add email template for welcome notification
- Update Employee model with required manager reference

### 3.3 Elasticsearch Implementation

**Priority**: Medium-High | **Estimated Effort**: 13 SP

**Requirements**:
- Predictive/autocomplete search across all system search functions
- Covers: job search, candidate search, resume database search, employee search
- As-you-type suggestions with dropdown for quick selection
- Full-text search with relevance scoring

**Implementation Approach**:
- Deploy Elasticsearch (or OpenSearch) as a managed service alongside existing Supabase PostgreSQL
- Create search index sync pipeline: Prisma middleware → Elasticsearch indexing on write
- Build `lib/search.ts` client with index-per-entity pattern (employees, candidates, documents, jobs)
- Implement debounced autocomplete API: `/api/search/suggest`
- Create reusable `<SearchAutocomplete />` component using Radix Combobox
- Add search analytics for relevance tuning

**Entities to Index**:
| Entity | Searchable Fields |
|--------|-------------------|
| Employee | firstName, lastName, employeeCode, email, designation, department, skills |
| Candidate | name, email, phone, skills, resumeText, currentCompany |
| Document | title, content (extracted text), tags, category |
| Job/Position | title, department, location, requirements, description |

**Impact on Existing System**:
- New infrastructure dependency: Elasticsearch cluster
- New lib file: `lib/elasticsearch.ts`
- New API routes: `/api/search/suggest`, `/api/search/query`
- Replace existing search inputs across Employee List, Recruitment Kanban, Document views, Command Palette
- Prisma middleware for real-time index sync

### 3.4 Agent Tracking Software Enhancements

**Priority**: Medium | **Estimated Effort**: 21 SP

**Current State**: Desktop agent backend is built (8 DB models, 10 API routes, activity classifier, report generator, admin dashboard). The desktop agent itself exists but requires additional configuration capabilities.

**Requirements**:
- Fully configurable desktop application (currently partially configurable)
- Downloadable agent installer with OS-level permissions on company computers
- Enhanced software usage tracking with categorization
- Screenshot capture with configurable intervals and quality
- Live data monitoring streaming to CEO and HR portals
- Cross-platform support (Windows, macOS, Linux)

**Implementation Approach**:
- Enhance agent config API (`/api/agent/config`) with comprehensive settings schema
- Add admin-facing agent configuration panel with per-device and per-policy settings
- Implement WebSocket/SSE-based live monitoring feed for admin dashboards
- Build screenshot review interface with timeline view
- Add productivity scoring dashboards with team-level aggregations
- Desktop app enhancements: configurable capture intervals, app categorization, privacy zones

**Configuration Parameters to Add**:
| Setting | Type | Description |
|---------|------|-------------|
| Screenshot Interval | Number (seconds) | Time between screenshots (30s–600s) |
| Screenshot Quality | Enum | Low/Medium/High |
| Activity Tracking | Boolean | Enable/disable app tracking |
| Idle Threshold | Number (minutes) | Time before marking as idle |
| Working Hours | Time range | Active monitoring window |
| Blocked Apps | String[] | Apps excluded from tracking |
| Privacy Mode | Boolean | Blur screenshots of sensitive apps |
| Data Retention | Number (days) | Auto-delete old tracking data |

**Impact on Existing System**:
- Extend AgentDevice, AgentConfig models
- New admin page: `/admin/agent-tracking/config`
- WebSocket endpoint for live monitoring
- Screenshot review component

### 3.5 Workflow Configuration System

**Priority**: High | **Estimated Effort**: 13 SP

**Current State**: Basic workflow engine exists (WorkflowTemplate/Step/Instance/Action models, admin builder page). Workflows need to be made fully dynamic and configurable.

**Requirements**:
- All workflows must be configurable and customizable — zero hardcoded workflows
- Configuration interface allows adding, deleting, or modifying fields on any screen
- Right-side panel or pop-up configuration UI on each screen
- Real-time preview — changes visible immediately on the main screen
- AI-powered workflow suggestions for faster configuration

**Implementation Approach**:
- Build a `FormBuilder` component with drag-and-drop field configuration
- Create a `ConfigPanel` component (slide-over from right side) mountable on any page
- Implement `WorkflowFieldConfig` model to store per-screen field configurations
- Add field type library: text, number, date, dropdown, multi-select, file upload, rich text, user picker
- Build real-time preview engine using React state synchronization
- Integrate Gemini AI for workflow optimization suggestions
- Add configuration versioning with rollback capability

**Field Configuration Schema**:
```
WorkflowFieldConfig {
  id, screenName, fieldName, fieldType, label, required, defaultValue,
  validationRules, displayOrder, visibility, conditionalLogic,
  createdBy, version, isActive
}
```

**Impact on Existing System**:
- New Prisma model: `WorkflowFieldConfig`
- Enhance existing workflow builder page
- New reusable component: `<ConfigPanel />`
- New reusable component: `<FormBuilder />`
- Add configuration API: `/api/workflows/fields`
- Modify all configurable screens to read field config from database

---

## 4. System Architecture Summary

### 4.1 Database Scale

| Metric | Count |
|--------|-------|
| Prisma Models | 64 |
| Enums | 46 |
| Schema Lines | 1,683 |
| Tables (Supabase) | 64 |
| Storage Buckets | 5 |

### 4.2 API Surface

| Category | Routes |
|----------|--------|
| Admin | 10 |
| Agent Tracking | 10 |
| Attendance | 10 |
| Time Tracker | 7 |
| Payroll | 6 |
| Employees | 6 |
| Performance | 2 |
| Reports | 3 |
| Workflows | 2 |
| Teams | 3 |
| Leaves | 2 |
| Other (20 categories) | 44 |
| **Total** | **105** |

### 4.3 Frontend Scale

| Metric | Count |
|--------|-------|
| Page Routes | 34 |
| React Components | 73+ |
| UI Components | 19 |
| Feature Component Folders | 14 |

### 4.4 Test Coverage

| Test Suite | Tests | Status |
|------------|-------|--------|
| API Tests (employees) | 6 | Pass |
| API Tests (identity) | 5 | Pass |
| API Tests (reports) | 2 | Pass |
| Unit Tests (payroll) | — | 4 known failures (auth mock) |
| Unit Tests (security) | — | Pass |
| Unit Tests (redis) | — | Pass |
| Unit Tests (metrics) | — | Pass |
| Unit Tests (logger) | — | Pass |
| **Total** | **136** | **130 pass, 6 known failures** |

---

## 5. Future Roadmap

### Phase 1: Sprint 2 — Role & Workflow Foundations (Weeks 1–3)

| # | Feature | SP | Priority |
|---|---------|----|----|
| 1 | Functional Role model + admin CRUD | 5 | P0 |
| 2 | Role-based UI filtering (sidebar, pages) | 5 | P0 |
| 3 | Role hierarchy inheritance engine | 3 | P0 |
| 4 | Bulk employee upload (Excel) with auto-hierarchy | 8 | P1 |
| 5 | Welcome email with credentials (Resend) | 3 | P1 |
| 6 | Manager mapping enforcement | 2 | P1 |
| 7 | Workflow field configuration model + API | 5 | P1 |
| 8 | ConfigPanel (right-side slide-over) component | 5 | P1 |
| | **Total** | **36** | |

### Phase 2: Sprint 3 — Search & Workflow Config (Weeks 4–6)

| # | Feature | SP | Priority |
|---|---------|----|----|
| 1 | Elasticsearch deployment + index pipeline | 8 | P1 |
| 2 | Autocomplete search component + API | 5 | P1 |
| 3 | Replace search inputs system-wide | 5 | P1 |
| 4 | FormBuilder drag-and-drop component | 8 | P1 |
| 5 | Real-time workflow preview engine | 5 | P2 |
| 6 | AI workflow suggestions (Gemini) | 3 | P2 |
| 7 | Recruitment roles (sourcing → onboarding pipeline) | 5 | P1 |
| | **Total** | **39** | |

### Phase 3: Sprint 4 — Agent Tracking & Polish (Weeks 7–9)

| # | Feature | SP | Priority |
|---|---------|----|----|
| 1 | Agent configuration admin panel | 5 | P1 |
| 2 | Screenshot review interface + timeline | 8 | P2 |
| 3 | Live monitoring WebSocket feed | 5 | P2 |
| 4 | Productivity scoring dashboards | 5 | P2 |
| 5 | Agent config schema expansion | 3 | P2 |
| 6 | Configuration versioning + rollback | 3 | P2 |
| 7 | Cross-platform agent installer packaging | 8 | P2 |
| | **Total** | **37** | |

### Phase 4: Sprint 5 — Desktop Application (Weeks 10–14)

| # | Feature | SP | Priority |
|---|---------|----|----|
| 1 | Desktop app framework (Electron/Tauri) | 13 | P1 |
| 2 | OS-level permission management | 5 | P1 |
| 3 | App usage tracker (process monitoring) | 8 | P1 |
| 4 | Screenshot engine (configurable intervals) | 5 | P1 |
| 5 | Idle detection + break tracking | 5 | P2 |
| 6 | Live data streaming to web portal | 8 | P2 |
| 7 | Auto-update mechanism | 5 | P2 |
| 8 | Installer/uninstaller (Windows, macOS, Linux) | 8 | P2 |
| 9 | Privacy zone configuration | 3 | P3 |
| 10 | Offline mode + data sync | 5 | P3 |
| | **Total** | **65** | |

### Phase 5: Sprint 6+ — Advanced Features (Post-Desktop)

| # | Feature | SP | Priority |
|---|---------|----|----|
| 1 | Resume parsing with AI (candidate ingestion) | 8 | P2 |
| 2 | Full recruitment pipeline (sourcing → offer → onboarding) | 13 | P1 |
| 3 | Advanced analytics with predictive models | 8 | P3 |
| 4 | Multi-language support (i18n) | 8 | P3 |
| 5 | Mobile app (React Native) | 21 | P3 |
| 6 | Video interview integration | 8 | P3 |
| 7 | Applicant tracking system (ATS) | 13 | P2 |
| | **Total** | **79** | |

---

## 6. Delivery Summary

### What Has Been Delivered

| Area | Status | Details |
|------|--------|---------|
| Core Platform | COMPLETE | Multi-tenant, RBAC, auth, middleware, logging, metrics |
| Employee Management | COMPLETE | Full CRUD, profiles, documents, credentials |
| Attendance & Time | COMPLETE | Check-in/out, shifts, policies, regularization, holidays |
| Leave Management | COMPLETE | Requests, approvals, balance tracking |
| Payroll | COMPLETE | Salary calc, PF, tax, payslip, compliance, export |
| Performance | COMPLETE | Manager reviews, self-reviews, AI evaluation, burnout analytics |
| Feedback System | COMPLETE | Employee feedback submission and tracking |
| Training | COMPLETE | Programs, enrollment, completion tracking |
| Recruitment | PARTIAL | Kanban board, candidate management (pipeline needs expansion) |
| Documents | COMPLETE | Upload, categorization, AI search |
| Assets | COMPLETE | Tracking, assignment, bulk import |
| Announcements | COMPLETE | Creation, priority, read receipts |
| Help Desk | COMPLETE | Ticket management |
| Calendar | COMPLETE | Events, holiday integration |
| Resignation | COMPLETE | Request, approval workflow, import |
| Reimbursement | COMPLETE | Claims, receipts, approval workflow |
| Kudos | COMPLETE | Peer recognition system |
| Workflows | PARTIAL | Engine exists, needs full configurability |
| Agent Tracking | PARTIAL | Backend complete, desktop app needs configurability |
| AI Features | COMPLETE | Chatbot, performance eval, document search, onboarding |
| Reporting | COMPLETE | Builder, saved reports, export |
| Enterprise | COMPLETE | SCIM, webhooks, Slack, OAuth, accounting export |
| Infrastructure | COMPLETE | Health checks, audit logs, metrics, sessions |

### What Is Planned (New Requirements)

| Area | Status | Sprint Target |
|------|--------|---------------|
| Functional Role System | PLANNED | Sprint 2 |
| Bulk Employee Upload | PLANNED | Sprint 2 |
| Auto-Hierarchy Mapping | PLANNED | Sprint 2 |
| Welcome Email Automation | PLANNED | Sprint 2 |
| Elasticsearch Search | PLANNED | Sprint 3 |
| Configurable Workflows | PLANNED | Sprint 2–3 |
| Agent Config Enhancement | PLANNED | Sprint 4 |
| Desktop Application | PLANNED | Sprint 5 |

---

## 7. Key Metrics

| Metric | Value |
|--------|-------|
| Total Source Files | 304+ |
| API Endpoints | 105 |
| Database Models | 64 |
| Page Routes | 34 |
| React Components | 73+ |
| Test Cases | 136 (130 passing) |
| Scripts | 12 |
| Schema Lines | 1,683 |
| Estimated Total Lines of Code | ~35,000+ |

---

## 8. Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Elasticsearch adds infrastructure complexity | Medium | Consider Supabase full-text search as lightweight alternative; Elasticsearch for scale |
| Desktop agent OS permissions vary by platform | High | Prioritize Windows first (80% enterprise), macOS second, Linux third |
| Workflow configurability scope creep | Medium | Define fixed field type library; use versioning for safe rollback |
| Bulk import data quality | Medium | Add validation preview step before committing; rollback on partial failure |
| Role hierarchy complexity | Low | Limit inheritance depth to 5 levels; cache resolved permissions |

---

## 9. Appendix

### A. Current RBAC Roles

| Role | Access Level |
|------|-------------|
| ADMIN | Full system access, all modules |
| HR_MANAGER | Employee management, leave, attendance, performance |
| PAYROLL_ADMIN | Payroll, PF, tax, compliance |
| RECRUITER | Recruitment, candidates, interviews |
| IT_ADMIN | System settings, integrations, SCIM, sessions |
| EMPLOYEE | Self-service (profile, leave, attendance, performance, documents) |

### B. Proposed Functional Roles (New)

| Domain | Roles |
|--------|-------|
| Recruitment | Sourcing Specialist, Screening Coordinator, Interview Scheduler, Offer Manager, Onboarding Specialist |
| HR Operations | Attendance Manager, Leave Administrator, Policy Configurator |
| Performance | Review Coordinator, Feedback Manager, Analytics Viewer |
| IT Operations | Agent Admin, Device Manager, Config Administrator |
| Custom | User-defined roles with configurable capabilities |

### C. Storage Buckets

| Bucket | Purpose | Public |
|--------|---------|--------|
| avatars | Employee profile photos | Yes |
| documents | HR documents, contracts | Yes |
| assets | Asset-related files | Yes |
| training | Training materials | Yes |
| receipts | Reimbursement receipts | Yes |

### D. Environment Variables

```
DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL, GEMINI_API_KEY,
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH0_CLIENT_ID,
AUTH0_CLIENT_SECRET, AUTH0_ISSUER, UPSTASH_REDIS_REST_URL,
UPSTASH_REDIS_REST_TOKEN, CRON_SECRET,
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

*Document generated: March 16, 2026*
*EMS Pro v1.0.0 — Sprint 1 Complete*
