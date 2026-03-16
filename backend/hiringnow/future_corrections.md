# Future Corrections & Technical Debt

This file tracks intentional shortcuts taken during early development that will need
to be revisited when new apps are added. Each item explains what was done, why, what
needs to change, and the safest way to make that change.

---

## 1. Employee → Candidate FK (currently a UUID field)

**File:** `apps/employees/models.py`

**Current state:**
```python
candidate_id = models.UUIDField(null=True, blank=True, db_index=True)
```

**Why:** The `Candidate` model doesn't exist yet. A real FK would cause an import error.

**What to change when:** The `Candidate` app is built and has its own migration.

**How to change safely:**
1. Add the Candidate model and run its migrations first.
2. Add a new migration in the employees app:
```python
migrations.AddField(
    model_name='employee',
    name='candidate',
    field=models.OneToOneField(
        'candidates.Candidate',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='employee_profile',
    ),
)
migrations.RunSQL(
    "UPDATE employees SET candidate_id_new = candidate_id WHERE candidate_id IS NOT NULL",
    reverse_sql="",
)
migrations.RemoveField(model_name='employee', name='candidate_id')
migrations.RenameField(model_name='employee', old_name='candidate_id_new', new_name='candidate')
```
3. Update `EmployeeSerializer`, `EmployeeCreateSerializer`, `EmployeeUpdateSerializer`
   to use `candidate` (FK) instead of `candidate_id` (UUID).
4. No data loss — the UUID values are migrated into the FK column.

---

## 2. Employee → Offer FK (currently a UUID field)

**File:** `apps/employees/models.py`

**Current state:**
```python
offer_id = models.UUIDField(null=True, blank=True, db_index=True)
```

**Why:** The `Offer` model doesn't exist yet.

**What to change when:** The `Offer` app is built and has its own migration.

**How to change safely:** Same pattern as #1 above — add the FK field, migrate data from
the UUID column, remove the UUID column. Always do this as two separate migrations:
one to add the new FK column, one to drop the old UUID column, after verifying data integrity.

---

## 3. EmploymentType model lives in employees app — should move to compliance app

**File:** `apps/employees/models.py`

**Current state:** `EmploymentType` is defined inside the employees app as a temporary home.

**Why:** The `compliance` app from the spec doesn't exist yet.

**What to change when:** The `compliance` app is created.

**How to change safely:**
1. Create the `compliance` app and define `EmploymentType` there.
2. Write a data migration (NOT a schema migration) that copies all rows from
   `employees_employmenttype` to `compliance_employmenttype`.
3. Add a new migration in employees that changes the FK:
   ```python
   migrations.AlterField(
       model_name='employee',
       name='employment_type',
       field=models.ForeignKey('compliance.EmploymentType', ...),
   )
   ```
4. Remove `EmploymentType` from `apps/employees/models.py`.
5. Update all imports in `apps/employees/serializers.py` and `apps/employees/views.py`.
6. **Do NOT delete the old table until all tenant DBs have been migrated.**

---

## 4. RBAC roles for Hiring Manager and Interviewer are under-permissioned

**File:** `apps/rbac/management/commands/seed_rbac.py`

**Current state:**
```python
"hiring_manager": { "permissions": ["employees.view"] },
"interviewer":    { "permissions": ["employees.view"] },
```

**Why:** The permissions `interviews.manage`, `jobs.view`, `candidates.view` etc.
don't exist yet because those apps aren't built.

**What to change when:** Jobs, Candidates, and Interviews apps are built and their
permissions are added to the `PERMISSIONS` dict in `seed_rbac.py`.

**How to change safely:**
1. Add new permission codenames to the `PERMISSIONS` dict.
2. Update `SYSTEM_ROLES` for `hiring_manager` and `interviewer` with the correct permissions.
3. Re-run `seed_rbac` on every existing tenant:
   ```bash
   python manage.py seed_rbac --tenant-slug <slug>
   ```
   The command clears and re-creates role permissions each run — it is idempotent and safe to re-run.

---

## 5. Platform Admin API — feature flags managed via Django shell

**Current state:** There is no API to create/update `FeatureFlag` entries in the registry
or to set per-tenant `TenantFeature` overrides. This is currently done via Django shell.

**What to change when:** Before onboarding real clients.

**What needs to be built:**
- `GET/POST /platform/features/` — manage the global feature catalog
- `GET/PUT /platform/tenants/` — list tenants and manage their status
- `PUT /platform/tenants/{slug}/features/` — enable/disable features per tenant

**How to change safely:** Build as a new `apps/platform/` app with its own URLs.
These endpoints must be gated behind a `is_platform_admin` flag or a separate
API key — they must NOT be accessible via regular tenant JWT tokens.

---

## 6. Promoting a user to tenant admin has no API

**File:** `apps/users/serializers.py`

**Current state:** `is_tenant_admin` was intentionally removed from `UserUpdateSerializer`
to prevent privilege escalation. There is currently no API to promote a user to tenant admin
after creation. It can only be set at registration time or via Django shell.

**What to change when:** A secure "promote to admin" flow is needed.

**How to change safely:**
- Add a dedicated endpoint `POST /users/{id}/promote-admin/` with its own permission check.
- This endpoint should only be callable by an existing `is_tenant_admin` user.
- It should also enforce the "you cannot demote yourself" rule.
- Do NOT simply add `is_tenant_admin` back to `UserUpdateSerializer` — that would re-open
  the privilege escalation vulnerability.

---

## 7. Password change does not force logout of all sessions

**File:** `apps/users/auth_views.py`

**Current state:** `ChangePasswordView` blacklists one refresh token (the one submitted
in the request body). Other active sessions (other devices) remain valid until their
access tokens expire (15 minutes).

**What to change when:** Full "logout all devices" is required.

**How to change safely:**
- Store a `password_changed_at` timestamp on the User model.
- In `TenantJWTAuthentication`, after decoding the token, check if the token's `iat`
  (issued at) claim is older than `password_changed_at`. If so, reject the token.
- This invalidates ALL tokens issued before the password change without needing to
  blacklist each one individually.

---

## 8. EmploymentType table has no seed data

**File:** `apps/employees/migrations/` or a management command

**Current state:** The `employment_types` table is created empty. Users must add types
manually via Django admin or shell before creating employees.

**What to change when:** Before first tenant is onboarded.

**How to fix:** Add a data migration or extend `seed_rbac` to also seed employment types:
```python
EMPLOYMENT_TYPES = [
    ("Full Time", "full_time"),
    ("Part Time", "part_time"),
    ("Contract", "contract"),
    ("Internship", "internship"),
    ("Consultant", "consultant"),
]
```
Run this once per tenant DB during provisioning.

---

## 9. Employee deletion leaves direct reports with NULL manager

**File:** `apps/employees/models.py`

**Current state:**
```python
reporting_to = models.ForeignKey('self', on_delete=models.SET_NULL, ...)
```

When a manager is deleted, all their direct reports get `reporting_to = NULL` silently.

**What to change when:** Before go-live, or when org chart / hierarchy features are built.

**How to change safely:**
- Do NOT hard-delete employees — add a soft-delete pattern instead (set `status = 'exited'`,
  never call `.delete()`).
- Or, before allowing a DELETE, check `employee.direct_reports.exists()` and block the
  deletion with a 400 response if any direct reports exist, forcing the caller to
  reassign them first.

---

## Summary Table

| # | Item | Trigger | Risk if ignored |
|---|------|---------|-----------------|
| 1 | Employee → Candidate FK | Candidate app built | UUID column not validated as real FK |
| 2 | Employee → Offer FK | Offer app built | UUID column not validated as real FK |
| 3 | EmploymentType → compliance app | Compliance app built | Duplicate model definitions |
| 4 | RBAC role permissions | Jobs/Interviews/Candidates built | Hiring Manager/Interviewer under-permissioned |
| 5 | Platform Admin API | Before first real client | Feature flags managed via shell (error-prone) |
| 6 | Promote-to-admin API | When self-service admin mgmt needed | Requires Django shell access |
| 7 | Full session invalidation on password change | Security hardening phase | Other devices stay logged in after password change |
| 8 | EmploymentType seed data | Before first tenant is onboarded | Empty dropdown on employee creation |
| 9 | Employee soft delete | Before org chart / hierarchy features | Silent NULL on manager deletion |
