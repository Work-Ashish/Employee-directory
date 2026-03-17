# User Flows - EMS Pro

## CEO / HR

### Dashboard

1. Log in with CEO or HR credentials.
2. Review total employees, active/on-leave counts, department split, hiring trends, and salary distribution.
3. Open reports, employees, workflows, and agent-tracking insights from quick actions.

### Create Employee

1. Navigate to `/employees`.
2. Click **Add Employee**.
3. Complete employee details and optional avatar upload.
4. Submit the form.
5. The system creates the employee plus linked login credentials.

### Performance Review Management

1. Navigate to `/performance`.
2. Choose **Daily Review** or **Monthly Review**.
3. Select an employee.
4. Complete structured form sections.
5. Submit and review history in the table view.

### Agent Tracking Management

1. Navigate to `/admin/agent-tracking`.
2. Review device counts, stale devices, and organization activity totals.
3. Inspect top apps and top websites.
4. Search/filter the device inventory.
5. Suspend or reactivate devices.
6. Issue commands such as force sync or resume.

## Payroll Admin

### Payroll Dashboard

1. Log in as PAYROLL.
2. Review payroll operations summary, PF stats, and personal time tracker.
3. Navigate to payroll runs, PF, and exports.

### Run Payroll

1. Open `/payroll`.
2. Select a period.
3. Review payroll records.
4. Process pending items and export outputs.

## Team Lead

### Team Dashboard

1. Log in as TEAM_LEAD.
2. Review personal stats and team overview.
3. Check live attendance states.
4. Open review and leave approval actions.
5. In agent-enabled orgs, review team activity visibility where permitted.
6. Track priority items using the personal To-Do list widget.

### Daily or Monthly Reviews

1. Navigate to `/performance`.
2. Select a team member.
3. Fill the appropriate review form.
4. Submit and review historical entries.

## Employee

### Employee Dashboard

1. Log in as EMPLOYEE.
2. Review attendance, leave balance, training, review status, and team presence.
3. Use the time tracker for check-in, break, resume, and check-out.
4. View the activity tracker widget when agent tracking is enabled.
5. Access kudos, onboarding companion, and personal To-Do list widgets.

### View Daily Activity Report

1. Open the activity tracker widget.
2. Click **View Full Report**.
3. Review active time, idle time, top apps, top websites, AI summary, and recommendations.
4. Receive the report by email if delivery is enabled.

### Apply for Leave

1. Navigate to `/leave`.
2. Create a leave request.
3. Submit for approval.

### Change Password

1. On first login, open `/change-password`.
2. Enter the current temporary password.
3. Set a new password.
4. Return to the dashboard.

## Authentication

### Login Flow (Django JWT)

1. Navigate to `/login`.
2. Enter Organization ID (tenant slug), email, and password.
3. The frontend calls `POST /api/v1/auth/login/` with tenant_slug, email, password.
4. Django authenticates against the tenant database and returns JWT tokens.
5. Tokens are stored in localStorage; tenant slug is persisted.
6. If `mustChangePassword` is true in the JWT claims, redirect to `/change-password`.
7. The user lands on a role-specific dashboard.

### First-Login Password Change

1. Employee is created via admin with auto-generated temporary password.
2. On first login, JWT includes `must_change_password: true`.
3. Frontend detects this and redirects to `/change-password`.
4. User submits new password (old_password not required for first-login).
5. Django clears `must_change_password` flag and blacklists the old refresh token.
6. User is redirected to login again with the new password.

### Session Management

- JWT-based sessions via Django SimpleJWT (15-min access, 7-day refresh)
- Refresh token rotation with blacklisting after rotation
- Session records stored in `UserSession` model
- Admin session revocation via `/admin/identity`
- Tenant context resolved from JWT claims on every request
