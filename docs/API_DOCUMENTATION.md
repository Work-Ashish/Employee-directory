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

#### Review Cycles

- `GET /api/performance/cycles` — List review cycles (filterable by status, year)
- `POST /api/performance/cycles` — Create a new review cycle (name, type, start/end dates)

#### Monthly Reviews

- `GET /api/performance/monthly` — List monthly reviews (filterable by employee, month, year)
- `POST /api/performance/monthly` — Create monthly review (employee_id, review_month, review_year, scores, comments)
- `GET /api/performance/monthly/{id}` — Get monthly review detail
- `PUT /api/performance/monthly/{id}` — Update monthly review
- `POST /api/performance/monthly/{id}/sign` — Collect digital signature (role: employee, manager, or hr)

#### Appraisals

- `GET /api/performance/appraisals` — List appraisals (filterable by type: annual, six_monthly)
- `POST /api/performance/appraisals` — Create appraisal (employee_id, type, cycle_id, overall_rating, comments)
- `GET /api/performance/appraisals/{id}` — Get appraisal detail
- `PUT /api/performance/appraisals/{id}` — Update appraisal

#### Eligibility

- `GET /api/performance/eligibility` — List active employees eligible for performance reviews

#### Performance Improvement Plans (PIPs)

- `GET /api/performance/pip` — List PIPs (filterable by status, employee)
- `POST /api/performance/pip` — Create PIP (employee_id, duration_days: 60 or 90, goals, support_plan)
- `GET /api/performance/pip/{id}` — Get PIP detail
- `PUT /api/performance/pip/{id}` — Update PIP (status, progress notes)

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

### Agent Tracking

#### Employee / device endpoints

- `POST /api/agent/register`
- `POST /api/agent/heartbeat`
- `GET /api/agent/config`
- `POST /api/agent/activity`
- `POST /api/agent/idle-event`
- `GET /api/agent/commands`
- `PUT /api/agent/commands/{id}`
- `GET /api/agent/report/{date}`

#### Admin endpoints

- `GET /api/admin/agent/dashboard`
- `GET /api/admin/agent/devices`
- `PATCH /api/admin/agent/devices`
- `POST /api/admin/agent/command`

#### Cron / worker endpoints

- `POST /api/cron/agent-aggregate`
- `POST /api/cron/agent-reports`
- `POST /api/worker/process-queue`

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
| `/api/v1/dashboard/` | GET | Dashboard stats | Dashboard components |

All feature API clients in `features/*/api/client.ts` call Django via `api.get/post/put/delete` from `lib/api-client.ts`.

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
