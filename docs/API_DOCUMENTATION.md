# API Documentation

## Authentication

### Django JWT Auth (Primary)

All frontend API calls go through `lib/api-client.ts` → Django `/api/v1/` endpoints:

1. `Authorization: Bearer <access_token>` header (JWT from localStorage)
2. `X-Tenant-Slug` header for multi-tenant routing
3. `api-client.ts` auto-transforms request bodies to snake_case and responses to camelCase
4. 401 responses → auto-redirect to `/login`, clear tokens
5. Pagination: `limit=` auto-remapped to `per_page=` for Django compatibility

JWT claims contain: `user_id`, `tenant_id`, `tenant_slug`, `employee_id`, `is_tenant_admin`, `must_change_password`

### Session-auth routes (Legacy Next.js API)

Protected Next.js API routes use `withAuth()` and enforce:

1. valid session (NextAuth or Django JWT fallback)
2. module/action permission check (static matrix → Django codenames → functional roles)
3. tenant admin bypass via `isTenantAdmin()`
4. session revocation check
5. organization scoping
6. employee resolution where required

### Agent routes

Desktop agent routes use `withAgentAuth()` and authenticate devices via API keys issued at registration time.

### Cron routes

Cron routes require:

```text
Authorization: Bearer {CRON_SECRET}
```

---

## Roles

### Next.js Static Roles (Fallback)

| Role | Summary |
| --- | --- |
| CEO | Full access across all 19 modules |
| HR | HR operations, workflow visibility, agent tracking visibility |
| PAYROLL | Payroll and compliance operations |
| TEAM_LEAD | Team, review, leave, ticket, limited agent visibility |
| EMPLOYEE | Own data, self-service, personal activity visibility |

### Django Dynamic Roles (Primary — via `seed_rbac`)

| Role | Codenames | Summary |
| --- | --- | --- |
| admin | 63 | Full access to all modules |
| hr_manager | 39 | HR, employees, attendance, leave, performance, training, recruitment, documents, tickets, reports |
| payroll_admin | 11 | Payroll processing, reimbursement, reporting |
| team_lead | 13 | Team management, leave approval, performance reviews |
| recruiter | 6 | Recruitment pipeline management |
| hiring_manager | 4 | View candidates and feedback |
| interviewer | 5 | Assigned candidates + feedback |
| viewer | 5 | Read-only employee/attendance/leave/reports |

Role mapping: `DJANGO_ROLE_MAP` in `lib/permissions.ts` maps Django slugs → Next.js roles.

---

## Response Envelope

Both Django and Next.js use the same envelope:

```json
{ "data": {}, "error": null, "meta": { "requestId": "...", "timestamp": "..." } }
{ "data": null, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} }, "meta": {} }
```

---

## Key Endpoints

### Dashboard (Migrated to Django)

- `GET /api/v1/dashboard/` (Django)
- `GET /api/v1/dashboard/logins/` (Django)
~~- `GET /api/dashboard`~~ (Legacy)
~~- `GET /api/dashboard/logins`~~ (Legacy)

### Employees

- `GET /api/employees`
- `POST /api/employees`
- `PUT /api/employees/{id}`
- `DELETE /api/employees/{id}`
- `POST /api/employees/{id}/credentials`

### Performance (Legacy — Daily/Monthly Reviews)

- `GET /api/performance`
- `POST /api/performance`
- `POST /api/cron/evaluate-performance`
- `GET /api/admin/performance`
- `GET /api/employee/performance`

### Performance — Source One Module (Django-backed)

All Source One performance routes proxy to Django via `proxyToDjango()`. They require Django JWT auth and `X-Tenant-Slug` header.

#### Row-Level Scoping (3-Tier)

All list and detail endpoints enforce row-level access control based on the user's role (determined via `UserRole` M2M table, not a User field):

| Tier | Roles | Visibility |
| --- | --- | --- |
| Full Access | Admin, CEO, HR Manager (`is_tenant_admin` OR role slug in `{admin, ceo, hr_manager}`) | All records, unfiltered |
| Team Lead | Team Lead (has `performance.manage` but not full-access role) | Own records + direct reports (`reporting_to`) + team members they lead |
| Employee | Employee, Viewer, others | Own records only |

Detail view GET/PUT requests return **403** if the record is outside the user's visibility scope.

#### Review Cycles

- `GET /api/performance/cycles` — List review cycles (filterable by status, year)
- `POST /api/performance/cycles` — Create a new review cycle (name, type, start/end dates)

#### Monthly Reviews

- `GET /api/performance/monthly` — List monthly reviews (scoped by role tier; filterable by employee, month, year)
- `POST /api/performance/monthly` — Create monthly review (employee_id, review_month, review_year, scores, comments)
- `GET /api/performance/monthly/{id}` — Get monthly review detail (403 if outside scope)
- `PUT /api/performance/monthly/{id}` — Update monthly review (403 if outside scope)
- `POST /api/performance/monthly/{id}/sign` — Collect digital signature (role: employee, manager, or hr). **Signer validation**: employee can only sign own review, manager can only sign their direct report's review, HR signature requires full-access role

#### Appraisals

- `GET /api/performance/appraisals` — List appraisals (scoped by role tier; filterable by type: annual, six_monthly)
- `POST /api/performance/appraisals` — Create appraisal (employee_id, type, cycle_id, overall_rating, comments)
- `GET /api/performance/appraisals/{id}` — Get appraisal detail (403 if outside scope)
- `PUT /api/performance/appraisals/{id}` — Update appraisal (403 if outside scope)

#### Eligibility

- `GET /api/performance/eligibility` — List active employees eligible for performance reviews. **Scoped**: team leads see only their team members + direct reports; full-access users see all

#### Performance Improvement Plans (PIPs)

- `GET /api/performance/pip` — List PIPs (scoped by role tier; filterable by status, employee)
- `POST /api/performance/pip` — Create PIP (employee_id, duration_days: 60 or 90, goals, support_plan)
- `GET /api/performance/pip/{id}` — Get PIP detail (403 if outside scope)
- `PUT /api/performance/pip/{id}` — Update PIP (status, progress notes) (403 if outside scope)

### Attendance and Time Tracking

- `GET/POST /api/attendance`
- `GET/POST /api/attendance/holidays`
- `GET/PUT /api/attendance/policy`
- `GET/POST /api/attendance/shifts`
- `POST /api/time-tracker/check-in`
- `POST /api/time-tracker/check-out`
- `POST /api/time-tracker/break`
- `POST /api/time-tracker/heartbeat`
- `GET /api/time-tracker/status`
- `GET /api/time-tracker/history`

### Payroll

- `GET/POST /api/payroll`
- `POST /api/payroll/run`
- `GET/POST /api/payroll/config`
- `POST /api/payroll/import`
- `GET /api/payroll/{id}/payslip`
- `GET/POST /api/pf`

### Agent Tracking (Django-backed)

All agent tracking endpoints are implemented in Django (`apps/agent/`). Next.js proxy routes forward to Django, and the desktop Electron agent calls Django directly.

#### Device Registration

- `POST /api/v1/agent/register/` -- First-time device registration (idempotent by `machine_id`)
  - Request: `{ machine_id, device_name, platform, agent_version, employee_id? }`
  - Response: `AgentDevice` serialized object with `id`, `status`, `employee`, etc.
  - If `machine_id` already exists, returns the existing device
  - If `employee_id` omitted, resolved from JWT `employee_profile`

#### Heartbeat

- `POST /api/v1/agent/heartbeat/` -- Agent pings every 30 seconds
  - Request: `{ device_id?, machine_id?, agent_version? }`
  - Response: `{ status: "ok", server_time: "..." }`
  - Looks up device by `device_id` or `machine_id`
  - Updates `last_heartbeat` and optionally `agent_version`

#### Bulk Data Ingest

- `POST /api/v1/agent/ingest/` -- Bulk activity data upload from desktop agent
  - Request: `{ device_id, sessions: [{ started_at, ended_at, active_seconds, idle_seconds, keystrokes, mouse_clicks, app_usages: [...], website_visits: [...], idle_events: [...], screenshots: [...] }] }`
  - Response: `{ status: "ok", sessions_created: 1 }`
  - Rejects if device status is not `ACTIVE`
  - Auto-categorizes apps and domains via `categorization.py`
  - Categories: `PRODUCTIVE`, `NEUTRAL`, `UNPRODUCTIVE`, `UNCATEGORIZED`

#### Screenshot Upload

- `POST /api/v1/agent/screenshot/upload/` -- Upload screenshot as base64
  - Request: `{ filename, data (base64), captured_at }`
  - Response: `{ url, image_url, filename, captured_at }`
  - Saves to `MEDIA_ROOT/agent_screenshots/` with sanitized filename

#### Command Polling

- `GET /api/v1/agent/commands/?device_id=<uuid>` -- Agent polls for pending commands
  - Also accepts `machine_id` query param
  - Response: Array of `AgentCommand` objects (type, payload)
  - Automatically marks returned commands as `DELIVERED`
  - Command types: `SUSPEND`, `RESUME`, `KILL_SWITCH`, `UNINSTALL`, `WIPE_DATA`, `FORCE_SYNC`, `FORCE_UPDATE`, `UPDATE_CONFIG`

#### Daily Report

- `GET /api/v1/agent/daily-report/?date=YYYY-MM-DD` -- Employee's daily activity summary
  - Returns: productivity score, active/idle/productive seconds, top apps, top websites, clock-in/out times
  - Today's report only available after 8:00 PM
  - Future dates rejected
  - Computes and caches `DailyActivitySummary` on first access

#### Admin Dashboard

- `GET /api/v1/admin/agent/dashboard/` -- Aggregated stats for admin dashboard
  - Requires `assets.view` permission
  - Returns: device counts by status, today's session aggregates (active/idle/keystrokes/clicks/screenshots), top 10 apps, top 10 websites, stale devices (no heartbeat for 10+ min)

#### Admin Device Management

- `GET /api/v1/admin/agent/devices/` -- Paginated device list with search/filter
  - Query params: `status`, `search`, `page`, `limit`
  - Requires `assets.view` permission
- `POST /api/v1/admin/agent/devices/` -- Update device status
  - Request: `{ device_id, status }`
  - Requires `assets.view` permission

#### Admin Command Issuance

- `POST /api/v1/admin/agent/command/` -- Issue a command to a device
  - Request: `{ device_id, type, payload? }`
  - Requires `assets.manage` permission
  - Side-effects: `SUSPEND`/`KILL_SWITCH` set device to `SUSPENDED`, `UNINSTALL` to `UNINSTALLED`, `RESUME` to `ACTIVE`

#### Cron / Worker Endpoints

- `POST /api/cron/agent-aggregate` -- Aggregate daily activity data
- `POST /api/cron/agent-reports` -- Generate daily reports
- `POST /api/worker/process-queue` -- Process background job queue

### Workflow Engine (Django-backed)

All workflow endpoints are implemented in Django (`apps/workflows/`). The engine supports multi-step approval workflows that can be wired to any entity type.

#### Workflow Templates

- `GET /api/v1/workflows/templates/` -- List workflow templates (paginated)
  - Query params: `entity_type`, `status`, `page`, `limit`
  - Requires `settings.view` permission
  - Response: `{ results: [...], total, page, limit, total_pages }`

- `POST /api/v1/workflows/templates/` -- Create workflow template
  - Requires `settings.manage` permission
  - Request: `{ name, description, entity_type, status, steps: [{ order, name, approver_type, approver?, sla_hours, is_optional }] }`
  - Entity types: `LEAVE`, `REIMBURSEMENT`, `RESIGNATION`, `ASSET_REQUEST`, `ONBOARDING`, `OFFBOARDING`
  - Template statuses: `DRAFT`, `PUBLISHED`, `ARCHIVED`

#### Workflow Template Detail

- `GET /api/v1/workflows/templates/{id}/` -- Get template with steps
- `PUT /api/v1/workflows/templates/{id}/` -- Update template fields
- `DELETE /api/v1/workflows/templates/{id}/` -- Delete template

#### Workflow Instances

- `GET /api/v1/workflows/instances/` -- List workflow instances
  - Admin/HR see all; employees see only their own
  - Query params: `status`, `template_id`, `page`, `limit`
  - Instance statuses: `PENDING`, `IN_PROGRESS`, `APPROVED`, `REJECTED`, `CANCELLED`

- `POST /api/v1/workflows/instances/` -- Create workflow instance
  - Request: `{ template_id, entity_id }`
  - Auto-sets `initiated_by` from JWT

- `GET /api/v1/workflows/instances/{id}/` -- Instance detail with actions and steps

#### Workflow Actions

- `POST /api/v1/workflows/instances/{id}/action/` -- Approve, reject, or return a step
  - Request: `{ decision, comments? }`
  - Decisions: `APPROVED`, `REJECTED`, `RETURNED`
  - On approve: advances to next step or finalizes as `APPROVED`
  - On reject: finalizes as `REJECTED`
  - On return: resets to step 1 as `IN_PROGRESS`

#### Auto-Trigger Integration

The workflow engine integrates with Leave and Resignation modules via `initiate_workflow()` in `apps/workflows/services.py`. When a leave request or resignation is created, if a `PUBLISHED` workflow template exists for that entity type, a workflow instance is automatically created.

### Teams (Django-backed)

All team routes proxy to Django via `proxyToDjango()`. They require Django JWT auth and `X-Tenant-Slug` header.

#### Team List / Create

- `GET /api/teams` — List teams (paginated, filterable by department_id). Non-admin users see only teams they lead or belong to
- `POST /api/teams` — Create a new team (name, description, lead_id, department_id). Requires `teams.manage`

#### Team Detail

- `GET /api/teams/{id}` — Get team detail with full member list
- `PUT /api/teams/{id}` — Update team (name, description, lead_id, department_id). Requires `teams.manage`
- `DELETE /api/teams/{id}` — Delete team. Requires `teams.manage`

#### Team Members

- `POST /api/teams/{id}/members` — Add member to team (employee_id, role). Requires `teams.manage`
- `DELETE /api/teams/{id}/members?employee_id={eid}` — Remove member from team. Requires `teams.manage`

#### Team Sync

- `POST /api/teams/sync-from-hierarchy` — Auto-create teams from `reporting_to` hierarchy. Each manager with direct reports gets a team; reports become members. Requires `teams.manage`

#### Org Chart

- `GET /api/teams/org-chart` — Hierarchical employee → manager tree for org chart visualization

### Other Modules

- `/api/leaves`
- `/api/training`
- `/api/announcements`
- `/api/assets`
- `/api/documents`
- `/api/tickets`
- `/api/recruitment`
- `/api/resignations`
- `/api/events`
- `/api/kudos`
- `/api/notifications`
- `/api/workflows/templates`
- `/api/workflows/action`
- `/api/reports/query`
- `/api/reports/export`
- `/api/settings/webhooks`
- `/api/organization`
- `/api/chat` (Returns 501, pending FastAPI migration)
- `/api/health`
- `/api/admin/sessions`
- `/api/admin/metrics`

---

## Agent Payload Schemas

Defined in `lib/schemas/agent.ts`:

- `agentRegisterSchema`
- `agentHeartbeatSchema`
- `agentActivityBatchSchema`
- `agentIdleEventSchema`
- `agentCommandConfirmSchema`
- `adminAgentCommandSchema`
- `adminDeviceListSchema`
- `adminDeviceUpdateSchema`

---

## Django Integration Endpoints

| Endpoint | Method | Purpose | Called By |
| --- | --- | --- | --- |
| `/api/v1/auth/login/` | POST | JWT login with tenant slug | `django-auth.ts` |
| `/api/v1/auth/register/` | POST | Tenant + admin registration | `django-auth.ts` |
| `/api/v1/auth/refresh/` | POST | Token refresh | `django-auth.ts` |
| `/api/v1/auth/logout/` | POST | Token blacklist | `django-auth.ts` |
| `/api/v1/auth/me/` | GET/PUT | Current user profile | `django-auth.ts` |
| `/api/v1/auth/change-password/` | POST | Password change | `app/settings/page.tsx` |
| `/api/v1/permissions/` | GET | User's permission codenames | `AuthContext.tsx` |
| `/api/v1/features/` | GET | Enabled feature flags (array) | `AuthContext.tsx` |
| `/api/v1/roles/capabilities/` | GET | Functional capabilities | `AuthContext.tsx` |
| `/api/v1/audit-logs/` | POST/GET | Audit event ingestion/listing | `lib/logger.ts` |
| `/api/v1/employees/` | GET/POST | Employee CRUD | `features/employees/api/client.ts` |
| `/api/v1/leaves/` | GET/POST | Leave management | `features/leave/api/client.ts` |
| `/api/v1/performance/cycles/` | GET/POST | Review cycle management | `app/api/performance/cycles/` |
| `/api/v1/performance/monthly/` | GET/POST | Monthly review CRUD | `app/api/performance/monthly/` |
| `/api/v1/performance/monthly/{id}/` | GET/PUT | Monthly review detail | `app/api/performance/monthly/[id]/` |
| `/api/v1/performance/monthly/{id}/sign/` | POST | Digital signature | `app/api/performance/monthly/[id]/sign/` |
| `/api/v1/performance/appraisals/` | GET/POST | Appraisal management | `app/api/performance/appraisals/` |
| `/api/v1/performance/appraisals/{id}/` | GET/PUT | Appraisal detail | `app/api/performance/appraisals/[id]/` |
| `/api/v1/performance/eligibility/` | GET | Employee eligibility | `app/api/performance/eligibility/` |
| `/api/v1/performance/pip/` | GET/POST | PIP management | `app/api/performance/pip/` |
| `/api/v1/performance/pip/{id}/` | GET/PUT | PIP detail | `app/api/performance/pip/[id]/` |
| `/api/v1/teams/` | GET/POST | Team list / Create team | `app/api/teams/` |
| `/api/v1/teams/{id}/` | GET/PUT/DELETE | Team detail / Update / Delete | `app/api/teams/[id]/` |
| `/api/v1/teams/{id}/members/` | POST/DELETE | Add/remove team member | `app/api/teams/[id]/members/` |
| `/api/v1/teams/sync-from-hierarchy/` | POST | Auto-create teams from hierarchy | `app/api/teams/sync/` |
| `/api/v1/teams/org-chart/` | GET | Org chart tree | `app/api/teams/org-chart/` |
| `/api/v1/dashboard/` | GET | Dashboard stats | Dashboard components |
| `/api/v1/agent/register/` | POST | Device registration | Desktop agent / `sync-engine.js` |
| `/api/v1/agent/heartbeat/` | POST | Heartbeat ping | Desktop agent / `sync-engine.js` |
| `/api/v1/agent/ingest/` | POST | Bulk activity ingest | Desktop agent / `sync-engine.js` |
| `/api/v1/agent/screenshot/upload/` | POST | Screenshot upload | Desktop agent / `sync-engine.js` |
| `/api/v1/agent/commands/` | GET | Poll pending commands | Desktop agent / `sync-engine.js` |
| `/api/v1/agent/daily-report/` | GET | Employee daily report | `app/api/agent/report/[date]/` |
| `/api/v1/admin/agent/dashboard/` | GET | Admin agent stats | `app/api/admin/agent/dashboard/` |
| `/api/v1/admin/agent/devices/` | GET/POST | Device list / status update | `app/api/admin/agent/devices/` |
| `/api/v1/admin/agent/command/` | POST | Issue device command | `app/api/admin/agent/command/` |
| `/api/v1/workflows/templates/` | GET/POST | Workflow template CRUD | `app/api/workflows/templates/` |
| `/api/v1/workflows/templates/{id}/` | GET/PUT/DELETE | Template detail | `app/api/workflows/templates/` |
| `/api/v1/workflows/instances/` | GET/POST | Workflow instance CRUD | `app/api/workflows/action/` |
| `/api/v1/workflows/instances/{id}/` | GET | Instance detail | `app/api/workflows/action/` |
| `/api/v1/workflows/instances/{id}/action/` | POST | Approve/reject/return | `app/api/workflows/action/` |

All feature API clients in `features/*/api/client.ts` (22 domain modules) call Django via `api.get/post/put/delete` from `lib/api-client.ts`.

---

## Webhook Events

Current notable webhook events include:

- `employee.created`
- `employee.updated`
- `payroll.finalized`
- `attendance.late`
- `agent.device.registered`
- `agent.command.executed`
- `agent.report.generated`
