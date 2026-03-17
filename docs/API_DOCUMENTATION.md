# API Documentation

## Authentication

### Session-auth routes

Protected application routes use `withAuth()` and enforce:

1. valid NextAuth session
2. module/action permission check
3. session revocation check
4. organization scoping
5. employee resolution where required

### Agent routes

Desktop agent routes use `withAgentAuth()` and authenticate devices via API keys issued at registration time.

### Cron routes

Cron routes require:

```text
Authorization: Bearer {CRON_SECRET}
```

---

## Roles

| Role | Summary |
| --- | --- |
| CEO | Full access across all 19 modules |
| HR | HR operations, workflow visibility, agent tracking visibility |
| PAYROLL | Payroll and compliance operations |
| TEAM_LEAD | Team, review, leave, ticket, limited agent visibility |
| EMPLOYEE | Own data, self-service, personal activity visibility |

---

## Response Envelope

```json
{ "success": true, "data": {} }
{ "success": false, "error": { "message": "Validation Error", "code": "VALIDATION_ERROR" } }
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

### Performance

- `GET /api/performance`
- `POST /api/performance`
- `POST /api/cron/evaluate-performance`
- `GET /api/admin/performance`
- `GET /api/employee/performance`

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

## Webhook Events

Current notable webhook events include:

- `employee.created`
- `employee.updated`
- `payroll.finalized`
- `attendance.late`
- `agent.device.registered`
- `agent.command.executed`
- `agent.report.generated`
