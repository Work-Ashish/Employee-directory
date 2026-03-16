# EMS Pro — Project Backlog

**Last Updated**: March 16, 2026
**Methodology**: Agile Scrum | 2-week sprints
**Velocity**: ~35 SP/sprint (estimated)

---

## Status Legend

| Label | Meaning |
|-------|---------|
| DONE | Shipped and verified |
| IN PROGRESS | Currently being worked on |
| TO DO | Committed for upcoming sprint |
| BACKLOG | Prioritized but not yet scheduled |

---

## Sprint Summary

| Sprint | Dates | SP Planned | SP Done | Status |
|--------|-------|-----------|---------|--------|
| Sprint 0 | Feb 17 – Mar 2 | 40 | 40 | COMPLETE |
| Sprint 1 | Mar 3 – Mar 16 | 38 | 38 | COMPLETE |
| Sprint 2 | Mar 17 – Mar 30 | 36 | — | UPCOMING |
| Sprint 3 | Mar 31 – Apr 13 | 39 | — | PLANNED |
| Sprint 4 | Apr 14 – Apr 27 | 37 | — | PLANNED |
| Sprint 5 | Apr 28 – May 25 | 65 | — | PLANNED (4 weeks) |
| Sprint 6+ | May 26+ | 79 | — | BACKLOG |

**Current Position**: Sprint 1 complete. 78 SP delivered across 2 sprints. Sprint 2 starts Mar 17.

---

## EPIC-01: Core Platform & Infrastructure

**Owner**: Backend Team | **Total SP**: 21 | **Status**: DONE

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP01-S01 | Story | Multi-tenant architecture with org scoping | 5 | P0 | 0 | DONE |
| EP01-S02 | Story | RBAC middleware with 6 roles | 3 | P0 | 0 | DONE |
| EP01-S03 | Story | API response envelope (apiSuccess/apiError) | 2 | P0 | 0 | DONE |
| EP01-S04 | Story | Structured JSON logging system | 2 | P1 | 0 | DONE |
| EP01-S05 | Story | Metrics collector with auto-alerting | 3 | P1 | 0 | DONE |
| EP01-S06 | Story | Async context propagation (requestId/orgId) | 2 | P1 | 0 | DONE |
| EP01-S07 | Story | Redis caching with in-memory fallback | 2 | P1 | 0 | DONE |
| EP01-S08 | Story | Health check endpoints (/health, /raw-health) | 2 | P1 | 0 | DONE |

<details>
<summary>Story Details</summary>

**EP01-S01**: Multi-tenant architecture with org scoping
> As a **platform operator**, I want all data queries scoped by organizationId, so that tenant data is strictly isolated.
>
> **Acceptance Criteria**:
> - [x] `orgFilter()` helper scopes all Prisma queries by organizationId
> - [x] Organization model with settings and configuration
> - [x] All API routes extract org context from authenticated session
> - [x] Unit tests verify tenant isolation

**EP01-S02**: RBAC middleware with 6 roles
> As an **admin**, I want role-based access control on all API routes, so that users can only access authorized functionality.
>
> **Acceptance Criteria**:
> - [x] `withAuth(["ADMIN"], handler)` wrapper validates role on every request
> - [x] 6 roles defined: ADMIN, EMPLOYEE, HR_MANAGER, PAYROLL_ADMIN, RECRUITER, IT_ADMIN
> - [x] Unauthorized access returns 401/403 with proper error codes
> - [x] Rate limiting enforced per-user

**EP01-S03**: API response envelope
> As a **frontend developer**, I want consistent API response shapes, so that error handling is predictable.
>
> **Acceptance Criteria**:
> - [x] `apiSuccess(data)` wraps all successful responses
> - [x] `apiError(code, message)` wraps all error responses
> - [x] Standard error codes defined in `ApiErrorCode` enum

</details>

---

## EPIC-02: Authentication & Identity

**Owner**: Backend Team | **Total SP**: 13 | **Status**: DONE

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP02-S01 | Story | NextAuth.js v5 setup with JWT strategy | 3 | P0 | 0 | DONE |
| EP02-S02 | Story | Google OAuth social login | 2 | P1 | 0 | DONE |
| EP02-S03 | Story | Auth0 enterprise SSO integration | 3 | P1 | 0 | DONE |
| EP02-S04 | Story | SCIM 2.0 user provisioning | 3 | P1 | 1 | DONE |
| EP02-S05 | Story | Session management with revocation | 2 | P1 | 1 | DONE |

<details>
<summary>Story Details</summary>

**EP02-S01**: NextAuth.js v5 setup with JWT strategy
> As a **user**, I want to securely log in with email/password, so that I can access the system.
>
> **Acceptance Criteria**:
> - [x] NextAuth v5 configured with CredentialsProvider and JWT
> - [x] bcryptjs password hashing
> - [x] Login page with form validation
> - [x] Session persistence across page refreshes

**EP02-S04**: SCIM 2.0 user provisioning
> As an **IT admin**, I want to sync users from our identity provider via SCIM, so that user management is automated.
>
> **Acceptance Criteria**:
> - [x] `/api/scim/v2/Users` GET and POST endpoints
> - [x] `/api/scim/v2/Users/[id]` PATCH and DELETE endpoints
> - [x] SCIM schema compliance for User resource

</details>

---

## EPIC-03: Employee Management

**Owner**: Full-stack Team | **Total SP**: 16 | **Status**: DONE

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP03-S01 | Story | Employee CRUD with profile/address/banking | 5 | P0 | 0 | DONE |
| EP03-S02 | Story | Employee list with DataTable (sort/filter/paginate) | 3 | P0 | 0 | DONE |
| EP03-S03 | Story | Employee form modal (create/edit) | 3 | P0 | 0 | DONE |
| EP03-S04 | Story | Employee credential management | 2 | P1 | 0 | DONE |
| EP03-S05 | Story | Employee profile self-service page | 3 | P1 | 0 | DONE |

<details>
<summary>Story Details</summary>

**EP03-S01**: Employee CRUD with profile/address/banking
> As an **HR manager**, I want to create, view, update, and deactivate employees with their full profile, so that I can manage the workforce.
>
> **Acceptance Criteria**:
> - [x] POST/GET/PUT/DELETE on `/api/employees` and `/api/employees/[id]`
> - [x] Employee model with linked EmployeeProfile, EmployeeAddress, EmployeeBanking
> - [x] Department and team assignment on creation
> - [x] Org-scoped queries via orgFilter()
> - [x] Zod validation on all inputs

</details>

---

## EPIC-04: Attendance & Time Tracking

**Owner**: Full-stack Team | **Total SP**: 26 | **Status**: DONE

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP04-S01 | Story | Daily attendance CRUD | 3 | P0 | 0 | DONE |
| EP04-S02 | Story | Time tracker (check-in/out with heartbeat) | 5 | P0 | 0 | DONE |
| EP04-S03 | Story | Break management | 2 | P1 | 0 | DONE |
| EP04-S04 | Story | Shift creation and assignment | 3 | P1 | 1 | DONE |
| EP04-S05 | Story | Attendance policy configuration | 3 | P1 | 1 | DONE |
| EP04-S06 | Story | Attendance regularization workflow | 3 | P1 | 1 | DONE |
| EP04-S07 | Story | Holiday calendar management | 2 | P1 | 1 | DONE |
| EP04-S08 | Story | Bulk attendance import (CSV/Excel) | 3 | P1 | 1 | DONE |
| EP04-S09 | Story | Attendance engine (evaluateAttendance) | 2 | P1 | 0 | DONE |

<details>
<summary>Story Details</summary>

**EP04-S02**: Time tracker with check-in/out and heartbeat
> As an **employee**, I want to check in/out and have my time tracked automatically, so that my attendance is accurately recorded.
>
> **Acceptance Criteria**:
> - [x] `/api/time-tracker/check-in` and `/api/time-tracker/check-out` endpoints
> - [x] Heartbeat endpoint for real-time session monitoring
> - [x] TimeSession model with start/end timestamps
> - [x] Activity logging with idle detection
> - [x] Time tracker status and history APIs

**EP04-S06**: Attendance regularization workflow
> As an **employee**, I want to request corrections to my attendance, so that mistakes can be fixed with manager approval.
>
> **Acceptance Criteria**:
> - [x] Regularization request submission with reason
> - [x] Manager approval/rejection workflow
> - [x] Attendance auto-updated on approval
> - [x] Audit trail of all regularizations

</details>

---

## EPIC-05: Leave Management

**Owner**: Full-stack Team | **Total SP**: 6 | **Status**: DONE

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP05-S01 | Story | Leave request and approval workflow | 3 | P0 | 0 | DONE |
| EP05-S02 | Story | Leave balance tracking by type | 3 | P1 | 0 | DONE |

---

## EPIC-06: Payroll Processing

**Owner**: Backend Team | **Total SP**: 21 | **Status**: DONE

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP06-S01 | Story | Salary calculation engine | 5 | P0 | 0 | DONE |
| EP06-S02 | Story | PF contribution calculator | 3 | P0 | 0 | DONE |
| EP06-S03 | Story | Dynamic tax slab engine | 3 | P0 | 0 | DONE |
| EP06-S04 | Story | Payroll run (bulk processing) | 3 | P0 | 1 | DONE |
| EP06-S05 | Story | Payslip PDF generation | 2 | P1 | 1 | DONE |
| EP06-S06 | Story | Payroll bulk import | 2 | P1 | 1 | DONE |
| EP06-S07 | Story | QuickBooks/Xero CSV export | 3 | P2 | 1 | DONE |

<details>
<summary>Story Details</summary>

**EP06-S01**: Salary calculation engine
> As a **payroll admin**, I want net salary computed automatically from CTC, deductions, and allowances, so that payroll runs are accurate.
>
> **Acceptance Criteria**:
> - [x] `calculateNetSalary()` with configurable components
> - [x] Handles basic, HRA, DA, special allowances
> - [x] Deductions: PF, ESI, professional tax, TDS
> - [x] PayrollComplianceConfig for org-level settings

</details>

---

## EPIC-07: Performance Management

**Owner**: Full-stack Team | **Total SP**: 24 | **Status**: DONE

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP07-S01 | Story | Admin performance dashboard | 5 | P0 | 1 | DONE |
| EP07-S02 | Story | Performance review CRUD API | 3 | P0 | 1 | DONE |
| EP07-S03 | Story | Daily self-review form (TL template) | 5 | P0 | 1 | DONE |
| EP07-S04 | Story | Monthly self-review form | 3 | P1 | 1 | DONE |
| EP07-S05 | Story | Team review form for managers | 3 | P1 | 1 | DONE |
| EP07-S06 | Story | Leader monthly review form | 3 | P1 | 1 | DONE |
| EP07-S07 | Story | Review detail view with form rendering | 2 | P1 | 1 | DONE |
| EP07-S08 | Story | Employee self-review forms | 8 | P1 | 1 | DONE |
| EP07-S09 | Story | AI-powered performance evaluation cron | 3 | P1 | 1 | DONE |
| EP07-S10 | Story | Burnout analytics dashboard | 3 | P2 | 1 | DONE |

<details>
<summary>Story Details</summary>

**EP07-S08**: Employee self-review forms
> As an **employee**, I want to submit daily self-reviews using the same template as team leads, so that I can track my own performance.
>
> **Acceptance Criteria**:
> - [x] "Submit Self-Review" button on employee performance page
> - [x] Opens DailySelfReviewForm (activity metrics, behavioral ratings, priorities, blockers, key wins)
> - [x] Submits with reviewType: "SELF", formType: "DAILY"
> - [x] Self-reviews displayed separately from manager reviews
> - [x] Average rating computed from manager reviews only

</details>

---

## EPIC-08: Employee Feedback System

**Owner**: Full-stack Team | **Total SP**: 5 | **Status**: DONE

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP08-S01 | Story | Feedback submission API and UI | 3 | P1 | 1 | DONE |
| EP08-S02 | Story | Feedback history and categories | 2 | P2 | 1 | DONE |

---

## EPIC-09: Training & Development

**Owner**: Full-stack Team | **Total SP**: 6 | **Status**: DONE

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP09-S01 | Story | Training program management | 3 | P1 | 1 | DONE |
| EP09-S02 | Story | Employee enrollment and tracking | 3 | P1 | 1 | DONE |

---

## EPIC-10: Recruitment

**Owner**: Full-stack Team | **Total SP**: 5 | **Status**: DONE (MVP)

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP10-S01 | Story | Candidate CRUD API | 2 | P1 | 1 | DONE |
| EP10-S02 | Story | Recruitment Kanban board | 3 | P1 | 1 | DONE |

---

## EPIC-11: Document Management

**Owner**: Full-stack Team | **Total SP**: 8 | **Status**: DONE

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP11-S01 | Story | Document upload and categorization | 3 | P1 | 0 | DONE |
| EP11-S02 | Story | Supabase storage integration | 2 | P1 | 0 | DONE |
| EP11-S03 | Story | Document embeddings for AI search | 3 | P2 | 1 | DONE |

---

## EPIC-12: Asset Management

**Owner**: Full-stack Team | **Total SP**: 5 | **Status**: DONE

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP12-S01 | Story | Asset CRUD with assignment | 3 | P1 | 1 | DONE |
| EP12-S02 | Story | Asset bulk import | 2 | P1 | 1 | DONE |

---

## EPIC-13: Communication & Collaboration

**Owner**: Full-stack Team | **Total SP**: 8 | **Status**: DONE

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP13-S01 | Story | Announcements with read receipts | 3 | P1 | 1 | DONE |
| EP13-S02 | Story | Kudos/peer recognition system | 2 | P2 | 1 | DONE |
| EP13-S03 | Story | In-app notification center | 3 | P1 | 1 | DONE |

---

## EPIC-14: Help Desk, Calendar, Resignation, Reimbursement

**Owner**: Full-stack Team | **Total SP**: 10 | **Status**: DONE

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP14-S01 | Story | Help desk ticketing system | 2 | P1 | 1 | DONE |
| EP14-S02 | Story | Calendar with events and holidays | 3 | P1 | 1 | DONE |
| EP14-S03 | Story | Resignation workflow | 3 | P1 | 1 | DONE |
| EP14-S04 | Story | Reimbursement claims with receipts | 2 | P1 | 1 | DONE |

---

## EPIC-15: Workflow Engine

**Owner**: Full-stack Team | **Total SP**: 8 (done) + 18 (planned) | **Status**: PARTIAL

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP15-S01 | Story | Workflow template and step models | 3 | P0 | 1 | DONE |
| EP15-S02 | Story | Workflow engine (initiate/process) | 3 | P0 | 1 | DONE |
| EP15-S03 | Story | Admin workflow builder page | 2 | P1 | 1 | DONE |
| EP15-S04 | Story | WorkflowFieldConfig model and API | 5 | P1 | 2 | TO DO |
| EP15-S05 | Story | ConfigPanel slide-over component | 5 | P1 | 2 | TO DO |
| EP15-S06 | Story | FormBuilder drag-and-drop component | 8 | P1 | 3 | BACKLOG |
| EP15-S07 | Story | Real-time workflow preview engine | 5 | P2 | 3 | BACKLOG |
| EP15-S08 | Story | AI workflow optimization suggestions | 3 | P2 | 3 | BACKLOG |
| EP15-S09 | Story | Configuration versioning with rollback | 3 | P2 | 4 | BACKLOG |

<details>
<summary>Story Details</summary>

**EP15-S04**: WorkflowFieldConfig model and API
> As an **admin**, I want to define custom fields for each workflow screen, so that workflows can be tailored to our processes without code changes.
>
> **Acceptance Criteria**:
> - [ ] `WorkflowFieldConfig` Prisma model with screenName, fieldName, fieldType, label, required, validationRules, displayOrder, conditionalLogic
> - [ ] CRUD API at `/api/workflows/fields`
> - [ ] Field types: text, number, date, dropdown, multi-select, file, rich text, user picker
> - [ ] Validation rules stored as JSON schema

**EP15-S05**: ConfigPanel slide-over component
> As an **admin**, I want a right-side configuration panel on every configurable screen, so that I can customize fields and layout in real-time.
>
> **Acceptance Criteria**:
> - [ ] `<ConfigPanel />` component slides in from right side
> - [ ] Lists current fields with drag-to-reorder
> - [ ] Add/remove/edit field properties inline
> - [ ] Changes save to WorkflowFieldConfig API
> - [ ] Main screen updates in real-time without refresh

**EP15-S06**: FormBuilder drag-and-drop component
> As an **admin**, I want a drag-and-drop form builder, so that I can visually design workflow forms.
>
> **Acceptance Criteria**:
> - [ ] Drag field types from palette onto canvas
> - [ ] Configure field properties (label, required, validation, conditional visibility)
> - [ ] Live preview of rendered form
> - [ ] Save/load form configurations
> - [ ] Export as workflow template

</details>

---

## EPIC-16: Agent Tracking & Desktop Monitoring

**Owner**: Full-stack Team | **Total SP**: 18 (done) + 29 (planned) | **Status**: PARTIAL

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP16-S01 | Story | Agent device registration and auth | 3 | P0 | 1 | DONE |
| EP16-S02 | Story | Activity tracking API (app/website/idle) | 5 | P0 | 1 | DONE |
| EP16-S03 | Story | Heartbeat monitoring | 2 | P1 | 1 | DONE |
| EP16-S04 | Story | Remote command push to devices | 3 | P1 | 1 | DONE |
| EP16-S05 | Story | Activity classifier (productivity scoring) | 3 | P1 | 1 | DONE |
| EP16-S06 | Story | Daily activity report generator | 2 | P1 | 1 | DONE |
| EP16-S07 | Story | Agent configuration admin panel | 5 | P1 | 4 | BACKLOG |
| EP16-S08 | Story | Screenshot review interface with timeline | 8 | P2 | 4 | BACKLOG |
| EP16-S09 | Story | Live monitoring WebSocket feed | 5 | P2 | 4 | BACKLOG |
| EP16-S10 | Story | Productivity scoring dashboards | 5 | P2 | 4 | BACKLOG |
| EP16-S11 | Story | Agent config schema expansion | 3 | P2 | 4 | BACKLOG |
| EP16-S12 | Story | Cross-platform agent installer packaging | 3 | P2 | 4 | BACKLOG |

<details>
<summary>Story Details</summary>

**EP16-S07**: Agent configuration admin panel
> As an **admin**, I want a dedicated configuration panel for the desktop agent, so that I can control tracking behavior per device or policy.
>
> **Acceptance Criteria**:
> - [ ] Admin page at `/admin/agent-tracking/config`
> - [ ] Per-device and per-policy configuration settings
> - [ ] Settings: screenshot interval, quality, idle threshold, working hours, blocked apps, privacy mode
> - [ ] Real-time config push to connected agents
> - [ ] Default config templates

**EP16-S09**: Live monitoring WebSocket feed
> As a **CEO/HR manager**, I want to see real-time agent activity as it happens, so that I can monitor workforce productivity live.
>
> **Acceptance Criteria**:
> - [ ] WebSocket/SSE endpoint for live activity stream
> - [ ] Admin dashboard with real-time activity feed
> - [ ] Filter by department, team, or individual
> - [ ] Live status indicators (active/idle/offline)

</details>

---

## EPIC-17: AI-Powered Features

**Owner**: Backend Team | **Total SP**: 16 | **Status**: DONE

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP17-S01 | Story | AI chatbot (Gemini 2.0 Flash) | 5 | P1 | 1 | DONE |
| EP17-S02 | Story | Command palette (Cmd+K) | 3 | P1 | 1 | DONE |
| EP17-S03 | Story | AI onboarding companion | 3 | P2 | 1 | DONE |
| EP17-S04 | Story | Performance evaluation cron (AI) | 3 | P1 | 1 | DONE |
| EP17-S05 | Story | Document embedding pipeline | 2 | P2 | 1 | DONE |

---

## EPIC-18: Reporting & Analytics

**Owner**: Full-stack Team | **Total SP**: 8 | **Status**: DONE

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP18-S01 | Story | Dynamic report builder | 3 | P1 | 1 | DONE |
| EP18-S02 | Story | Saved reports with scheduling | 3 | P1 | 1 | DONE |
| EP18-S03 | Story | CSV/PDF/Excel export | 2 | P1 | 1 | DONE |

---

## EPIC-19: Enterprise Integrations

**Owner**: Backend Team | **Total SP**: 10 | **Status**: DONE

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP19-S01 | Story | Webhook system with HMAC signing | 3 | P1 | 1 | DONE |
| EP19-S02 | Story | Slack notification connector | 2 | P2 | 1 | DONE |
| EP19-S03 | Story | Audit logging system | 3 | P1 | 1 | DONE |
| EP19-S04 | Story | Queue system (Redis FIFO) | 2 | P1 | 0 | DONE |

---

## EPIC-20: UI/UX Platform

**Owner**: Frontend Team | **Total SP**: 18 | **Status**: DONE

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP20-S01 | Story | AppShell with sidebar and topbar | 3 | P0 | 0 | DONE |
| EP20-S02 | Story | Design system (19 Radix UI components) | 5 | P0 | 0 | DONE |
| EP20-S03 | Story | Dark/light mode with theme toggle | 2 | P1 | 0 | DONE |
| EP20-S04 | Story | Mobile-responsive sidebar | 2 | P1 | 0 | DONE |
| EP20-S05 | Story | DataTable with TanStack (sort/filter/page) | 3 | P0 | 0 | DONE |
| EP20-S06 | Story | Admin and employee dashboards | 3 | P0 | 0 | DONE |

---

## EPIC-21: Role Creation & Assignment System (NEW)

**Owner**: Full-stack Team | **Total SP**: 18 | **Status**: TO DO — Sprint 2

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP21-S01 | Story | FunctionalRole model and RoleCapability mapping | 5 | P0 | 2 | TO DO |
| EP21-S02 | Story | Role management admin CRUD UI | 5 | P0 | 2 | TO DO |
| EP21-S03 | Story | Role hierarchy inheritance engine | 3 | P0 | 2 | TO DO |
| EP21-S04 | Story | Role-based UI filtering (sidebar + pages) | 5 | P0 | 2 | TO DO |

<details>
<summary>Story Details</summary>

**EP21-S01**: FunctionalRole model and RoleCapability mapping
> As an **admin**, I want to define functional roles with specific capabilities, so that employees can be assigned granular permissions beyond the 6 system roles.
>
> **Acceptance Criteria**:
> - [ ] `FunctionalRole` Prisma model (id, name, description, level, parentRoleId, isActive)
> - [ ] `RoleCapability` mapping table (roleId, capability, module)
> - [ ] Many-to-many relationship between User and FunctionalRole
> - [ ] Seed data for recruitment roles: Sourcing, Screening, Interview Scheduling, Offer Making, Onboarding
> - [ ] CRUD API at `/api/roles` and `/api/roles/[id]/capabilities`

**EP21-S02**: Role management admin CRUD UI
> As an **admin**, I want an interface to create, edit, and delete functional roles with their capabilities, so that I can customize access without developer involvement.
>
> **Acceptance Criteria**:
> - [ ] Admin page at `/admin/roles`
> - [ ] Role list with search and filter
> - [ ] Create/edit form with capability checkboxes grouped by module
> - [ ] Hierarchy visualization (tree or org chart)
> - [ ] Drag-and-drop role ordering for hierarchy levels

**EP21-S03**: Role hierarchy inheritance engine
> As an **admin**, I want higher-level roles to automatically inherit capabilities from lower-level roles, so that team leaders can perform subordinate tasks without manual assignment.
>
> **Acceptance Criteria**:
> - [ ] `resolveCapabilities(userId)` function in `lib/permissions.ts`
> - [ ] Walks up parentRoleId chain collecting capabilities
> - [ ] Maximum inheritance depth of 5 levels
> - [ ] Capability resolution cached in Redis (5-min TTL)
> - [ ] Override: specific capability can be denied at any level

**EP21-S04**: Role-based UI filtering
> As a **user**, I want the UI to show only screens and actions relevant to my assigned roles, so that the interface is clean and focused.
>
> **Acceptance Criteria**:
> - [ ] Sidebar navigation items filtered by user's resolved capabilities
> - [ ] Page-level access guard checks functional role
> - [ ] Button/action visibility controlled by capability checks
> - [ ] Graceful "Access Denied" page for unauthorized routes

</details>

---

## EPIC-22: User Creation & Bulk Management (NEW)

**Owner**: Full-stack Team | **Total SP**: 13 | **Status**: TO DO — Sprint 2

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP22-S01 | Story | Bulk employee upload via Excel | 5 | P1 | 2 | TO DO |
| EP22-S02 | Story | Auto-hierarchy from import data | 3 | P1 | 2 | TO DO |
| EP22-S03 | Story | Welcome email with credentials | 3 | P1 | 2 | TO DO |
| EP22-S04 | Story | Manager mapping enforcement | 2 | P1 | 2 | TO DO |

<details>
<summary>Story Details</summary>

**EP22-S01**: Bulk employee upload via Excel
> As an **HR manager**, I want to create multiple employees at once by uploading an Excel file, so that onboarding large batches is efficient.
>
> **Acceptance Criteria**:
> - [ ] Upload XLSX file with columns: employee code, name, email, designation, role, department, manager email
> - [ ] Column mapping UI (auto-detect + manual override)
> - [ ] Preview step showing parsed data with validation errors highlighted
> - [ ] Batch insert with transaction (all-or-nothing or skip-errors mode)
> - [ ] Download error report for failed rows
> - [ ] Maximum 500 employees per upload

**EP22-S02**: Auto-hierarchy from import data
> As an **HR manager**, I want the system to automatically build reporting hierarchy from department and position data in the import file, so that I don't have to manually set up each reporting line.
>
> **Acceptance Criteria**:
> - [ ] Fuzzy string matching on department + designation fields
> - [ ] Auto-resolve manager by matching department head designation
> - [ ] Preview hierarchy tree before committing
> - [ ] Manual override for unresolved mappings
> - [ ] Log all auto-resolved and manual mappings for audit

**EP22-S03**: Welcome email with credentials
> As a **new employee**, I want to receive my login credentials via email when my account is created, so that I can access the system immediately.
>
> **Acceptance Criteria**:
> - [ ] Email sent via Resend on employee creation (single and bulk)
> - [ ] Contains: login URL, email, temporary password, first-login instructions
> - [ ] Branded HTML email template
> - [ ] Force password change on first login
> - [ ] Admin can re-send credentials from employee profile

**EP22-S04**: Manager mapping enforcement
> As a **system**, I want every employee to have a manager assigned, so that approval workflows and reporting chains always have a target.
>
> **Acceptance Criteria**:
> - [ ] `managerId` required on Employee model (except org-level admin)
> - [ ] Validation on create/update API endpoints
> - [ ] Manager dropdown populated from same department + higher level
> - [ ] Orphan detection: admin alert for employees without managers

</details>

---

## EPIC-23: Elasticsearch Search (NEW)

**Owner**: Backend Team | **Total SP**: 21 | **Status**: BACKLOG — Sprint 3

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP23-S01 | Story | Elasticsearch deployment and client setup | 5 | P1 | 3 | BACKLOG |
| EP23-S02 | Story | Index sync pipeline (Prisma → ES) | 3 | P1 | 3 | BACKLOG |
| EP23-S03 | Story | Autocomplete search API (/api/search/suggest) | 5 | P1 | 3 | BACKLOG |
| EP23-S04 | Story | SearchAutocomplete reusable component | 3 | P1 | 3 | BACKLOG |
| EP23-S05 | Story | Replace search inputs system-wide | 5 | P1 | 3 | BACKLOG |

<details>
<summary>Story Details</summary>

**EP23-S01**: Elasticsearch deployment and client setup
> As a **developer**, I want an Elasticsearch cluster connected to the application, so that we can build fast full-text search.
>
> **Acceptance Criteria**:
> - [ ] Managed Elasticsearch/OpenSearch instance provisioned
> - [ ] `lib/elasticsearch.ts` client with connection pooling
> - [ ] Index definitions for: employees, candidates, documents, jobs
> - [ ] Health check integration with `/api/health`
> - [ ] Environment variable: `ELASTICSEARCH_URL`

**EP23-S03**: Autocomplete search API
> As a **user**, I want search suggestions to appear as I type, so that I can quickly find employees, candidates, or documents.
>
> **Acceptance Criteria**:
> - [ ] `/api/search/suggest?q=&type=` endpoint
> - [ ] Returns top 10 suggestions with relevance scores
> - [ ] Response time < 100ms for warm queries
> - [ ] Supports: employee, candidate, document, job entity types
> - [ ] Highlights matching text in results
> - [ ] Debounced (300ms) on frontend

**EP23-S04**: SearchAutocomplete reusable component
> As a **frontend developer**, I want a drop-in autocomplete search component, so that I can add predictive search to any page.
>
> **Acceptance Criteria**:
> - [ ] `<SearchAutocomplete />` component using Radix Combobox
> - [ ] Props: entityType, placeholder, onSelect, minChars
> - [ ] Keyboard navigation (up/down/enter/escape)
> - [ ] Loading state and empty state
> - [ ] Grouped results by entity type for global search

</details>

---

## EPIC-24: Recruitment Pipeline Expansion (NEW)

**Owner**: Full-stack Team | **Total SP**: 5 | **Status**: BACKLOG — Sprint 3

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP24-S01 | Story | Recruitment functional roles integration | 5 | P1 | 3 | BACKLOG |

<details>
<summary>Story Details</summary>

**EP24-S01**: Recruitment functional roles integration
> As a **recruiter**, I want my recruitment UI to show only the tasks matching my assigned role (sourcing, screening, interviews, offers, onboarding), so that I focus on my responsibilities.
>
> **Acceptance Criteria**:
> - [ ] Recruitment Kanban columns filtered by user's functional role
> - [ ] Sourcing role: sees candidate creation, job board posting
> - [ ] Screening role: sees resume review, initial filtering
> - [ ] Interview Scheduling role: sees calendar integration, interview setup
> - [ ] Offer Making role: sees offer letter generation, negotiation
> - [ ] Onboarding role: sees document collection, welcome flow

</details>

---

## EPIC-25: Desktop Application (NEW)

**Owner**: Desktop Team | **Total SP**: 65 | **Status**: BACKLOG — Sprint 5

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP25-S01 | Story | Desktop app framework (Electron/Tauri) | 13 | P1 | 5 | BACKLOG |
| EP25-S02 | Story | OS-level permission management | 5 | P1 | 5 | BACKLOG |
| EP25-S03 | Story | App usage tracker (process monitoring) | 8 | P1 | 5 | BACKLOG |
| EP25-S04 | Story | Screenshot engine (configurable intervals) | 5 | P1 | 5 | BACKLOG |
| EP25-S05 | Story | Idle detection and break tracking | 5 | P2 | 5 | BACKLOG |
| EP25-S06 | Story | Live data streaming to web portal | 8 | P2 | 5 | BACKLOG |
| EP25-S07 | Story | Auto-update mechanism | 5 | P2 | 5 | BACKLOG |
| EP25-S08 | Story | Cross-platform installer (Win/Mac/Linux) | 8 | P2 | 5 | BACKLOG |
| EP25-S09 | Story | Privacy zone configuration | 3 | P3 | 5 | BACKLOG |
| EP25-S10 | Story | Offline mode with data sync | 5 | P3 | 5 | BACKLOG |

<details>
<summary>Story Details</summary>

**EP25-S01**: Desktop app framework
> As a **developer**, I want a cross-platform desktop application framework, so that we can build the agent tracking client.
>
> **Acceptance Criteria**:
> - [ ] Tauri or Electron project scaffolded
> - [ ] System tray integration (minimize to tray)
> - [ ] Auto-start on system boot (configurable)
> - [ ] Secure communication with backend API (TLS + device token)
> - [ ] Graceful shutdown handling

**EP25-S03**: App usage tracker
> As an **employer**, I want to see which applications each employee uses and for how long, so that I can understand productivity patterns.
>
> **Acceptance Criteria**:
> - [ ] Monitor active window title and process name
> - [ ] Aggregate time per application per hour
> - [ ] Categorize apps as productive/neutral/unproductive
> - [ ] Push summaries to `/api/agent/activity` every 5 minutes
> - [ ] Support Windows (Win32 API), macOS (NSWorkspace), Linux (X11/Wayland)

**EP25-S04**: Screenshot engine
> As an **admin**, I want periodic screenshots from employee computers, so that I can verify work activity when needed.
>
> **Acceptance Criteria**:
> - [ ] Configurable interval (30s to 600s)
> - [ ] Quality settings (low/medium/high → JPEG 30/60/90)
> - [ ] Upload to Supabase storage (assets bucket)
> - [ ] Privacy zone: blur configured applications
> - [ ] Thumbnail generation for timeline view

**EP25-S06**: Live data streaming to web portal
> As a **CEO/HR manager**, I want to see real-time employee activity on my web dashboard, so that I can monitor the workforce live.
>
> **Acceptance Criteria**:
> - [ ] Desktop app streams activity events via WebSocket
> - [ ] Web dashboard shows live status per employee
> - [ ] Active application name + duration shown in real-time
> - [ ] Filterable by department/team/individual
> - [ ] Connection status indicator per device

</details>

---

## EPIC-26: Advanced Features (Future)

**Owner**: Full-stack Team | **Total SP**: 79 | **Status**: BACKLOG — Sprint 6+

| ID | Type | Title | SP | Priority | Sprint | Status |
|----|------|-------|----|----------|--------|--------|
| EP26-S01 | Story | Resume parsing with AI | 8 | P2 | 6 | BACKLOG |
| EP26-S02 | Story | Full recruitment pipeline (sourcing → onboarding) | 13 | P1 | 6 | BACKLOG |
| EP26-S03 | Story | Predictive analytics dashboards | 8 | P3 | 6+ | BACKLOG |
| EP26-S04 | Story | Multi-language support (i18n) | 8 | P3 | 6+ | BACKLOG |
| EP26-S05 | Story | Mobile app (React Native) | 21 | P3 | 7+ | BACKLOG |
| EP26-S06 | Story | Video interview integration | 8 | P3 | 7+ | BACKLOG |
| EP26-S07 | Story | Applicant tracking system (ATS) | 13 | P2 | 6+ | BACKLOG |

---

## Velocity & Burndown

### Cumulative Story Points

```
Sprint 0:  ████████████████████████████████████████ 40 SP (delivered)
Sprint 1:  ██████████████████████████████████████   38 SP (delivered)
Sprint 2:  ████████████████████████████████████     36 SP (planned)
Sprint 3:  ███████████████████████████████████████  39 SP (planned)
Sprint 4:  █████████████████████████████████████    37 SP (planned)
Sprint 5:  █████████████████████████████████████████████████████████████████ 65 SP (planned, 4 weeks)
Sprint 6+: ███████████████████████████████████████████████████████████████████████████████████ 79 SP (backlog)
           ─────────────────────────────────────────
Total:     334 SP across full project
Delivered: 78 SP (23%)
Planned:   177 SP (53%)
Backlog:   79 SP (24%)
```

### Where We Are Now

```
[===========░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 23%
 Sprint 0+1                Future Sprints
 (78 SP done)              (256 SP remaining)
```

**78 out of 334 total story points delivered** — the core platform, all foundational modules, and Sprint 1 feature set are complete. The system is functional and usable. Upcoming work focuses on client-requested enhancements (roles, search, configurability) and the desktop application.

---

*Generated: March 16, 2026 | EMS Pro v1.0.0*
