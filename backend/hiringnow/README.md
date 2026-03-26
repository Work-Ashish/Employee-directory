# EMS Pro — Django Backend

Multi-tenant SaaS backend for the EMS Pro Employee Management System. Built with Django 5.1, Django REST Framework, SimpleJWT, and PostgreSQL using a **DB-per-tenant** architecture.

## Tech stack

- **Django** 5.1, **Django REST Framework**, **SimpleJWT** (access/refresh, blacklist)
- **PostgreSQL** (registry DB + one database per tenant)
- **django-environ**, **django-cors-headers**, **drf-spectacular** (OpenAPI docs), **Redis** (optional)

## Local setup

1. **Clone and create a virtual environment**

   ```bash
   python -m venv .venv
   source .venv/bin/activate   # Linux/macOS
   # or: .venv\Scripts\activate  # Windows
   ```

2. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Environment variables**

   Copy `.env.example` to `.env` and set values:

   | Variable | Description |
   |----------|-------------|
   | `SECRET_KEY` | Django secret (signing, JWT, etc.) |
   | `DB_NAME` | Registry database name (e.g. `recruitment_registry`) |
   | `DB_USER` | PostgreSQL user |
   | `DB_PASSWORD` | PostgreSQL password |
   | `DB_HOST` | Host (default `localhost`) |
   | `DB_PORT` | Port (default `5432`) |
   | `TENANT_DB_NAME_PREFIX` | Prefix for tenant DBs (default: `{DB_NAME}_`, e.g. `recruitment_registry_`) |
   | `TENANT_DB_SLUGS` | Comma-separated tenant slugs to pre-create DBs (e.g. `sourceone,acme`). No spaces around `=`. |
   | `REDIS_URL` | Optional Redis URL (default `redis://localhost:6379/0`) |
   | `DJANGO_ENV` | Environment name (e.g. `development`, `production`) |

   For production you will also set `ALLOWED_HOSTS`, `ALLOWED_HOSTS_WILDCARD` (e.g. `.yourapp.com`), and `CORS_ALLOWED_ORIGINS` (see `config/settings/production.py`).

4. **Create the registry database and run migrations**

   ```bash
   # Create the default (registry) DB in PostgreSQL, then:
   python manage.py migrate
   ```

5. **Run the server**

   ```bash
   python manage.py runserver
   ```

## Architecture

### Multi-tenancy (DB-per-tenant)

- **Registry DB (`default`)**  
  Holds only the `Tenant` model (and Django admin/sessions if used). No tenant-scoped application data.

- **Tenant DBs**  
  One PostgreSQL database per tenant. Name pattern: `{TENANT_DB_NAME_PREFIX}{slug}` (e.g. `recruitment_registry_sourceone`).  
  User model and all tenant-scoped models live in the tenant DB; there is no `tenant_id` FK on users — isolation is by database.

- **Tenant resolution**  
  `TenantMiddleware` sets `request.tenant` from:
  - `X-Tenant-Slug` header, or  
  - First segment of the request host (subdomain).  
  Paths like `/health/`, `/admin/`, `/api/v1/auth/register/`, and `/api/v1/auth/login/` skip tenant resolution.

- **Database router**  
  `TenantDatabaseRouter` sends:
  - `tenants` app → `default` (registry)  
  - `users` (and other tenant-scoped apps) → current tenant’s DB (`request.tenant.db_name`)

- **JWT auth**  
  `TenantJWTAuthentication` reads `tenant_id` from the JWT, loads the tenant from the registry, and sets `request.tenant` so the router uses the correct DB. If the request already had a tenant (e.g. from subdomain), it must match the token’s tenant.

### Creating a new tenant and DB

New tenants are created via **registration** (`POST /api/v1/auth/register/`). The flow:

1. Create `Tenant` in the registry DB (`default`).
2. Create the tenant database with `config.db_utils.create_tenant_database(db_name)`.
3. Add the new DB to `settings.DATABASES` and run migrations on it:  
   `python manage.py migrate --database <db_name> --run-syncdb`
4. Set thread-local tenant and create the first user in the tenant DB (as tenant admin).

For **pre-existing** tenant DBs (e.g. listed in `TENANT_DB_SLUGS`), ensure each DB exists in PostgreSQL and that its alias is present in `DATABASES` (base settings build these from `TENANT_DB_SLUGS`). Then run:

```bash
python manage.py migrate --database default
python manage.py migrate --database recruitment_db_sourceone
# ... repeat for each tenant DB alias
```

## API overview

- **Health**  
  `GET /health/` — Returns `{"status": "ok"}` (no auth).

- **Auth** (under `/api/v1/auth/`)
  - `POST /api/v1/auth/register/` — Register new tenant + first user (tenant_name, tenant_slug, email, password, optional first_name, last_name). Returns tokens and user/tenant info.
  - `POST /api/v1/auth/login/` — Login with `tenant_slug`, `email`, `password`. Returns access/refresh tokens and user/tenant info.
  - `POST /api/v1/auth/refresh/` — Refresh access token (SimpleJWT).
  - `POST /api/v1/auth/logout/` — Blacklist refresh token (SimpleJWT).
  - `GET /api/v1/auth/me/` — Current user profile (tenant_id, tenant_slug from request). Requires Bearer token.

Authenticated requests must either include a tenant context (subdomain or `X-Tenant-Slug`) that matches the JWT’s tenant, or rely on the JWT’s tenant when no tenant was set by the middleware.

## Project layout

- `config/` — Django project: settings, root URLs, DB router, tenant context (thread-local), health view, `db_utils` (create_tenant_database).
- `apps/tenants/` — Tenant model (registry), TenantMiddleware.
- `apps/users/` — User model, auth serializers/views, TenantJWTAuthentication, auth URLs.
- `apps/rbac/` — Dynamic roles, permissions, UserRole. `seed_rbac` command (7 roles, 63 codenames, 18 modules).
- `apps/employees/` — Employee CRUD + sub-profiles (Profile, Address, Banking).
- `apps/departments/` — Department CRUD with employee count guards.
- `apps/teams/` — Team CRUD, membership, org chart, auto-sync from hierarchy.
- `apps/attendance/` — Attendance tracking.
- `apps/leave/` — Leave management.
- `apps/payroll/` — Payroll management.
- `apps/performance/` — Source One performance: ReviewCycle, MonthlyReview, Appraisal, PIP (14 endpoints).
- `apps/dashboard/` — Stats API (department split, status counts, salary, logins).
- `apps/features/` — Feature flags per tenant (`seed_features` command).
- `apps/audit/` — AuditLog model + REST API.
- `apps/agent/` — Desktop agent tracking: 8 models, 9 endpoints, categorization engine.
- `apps/workflows/` — Multi-step approval workflows: 4 models, 5 endpoints.
- `apps/notifications/`, `apps/announcements/`, `apps/events/`, `apps/feedback/`
- `apps/training/`, `apps/documents/`, `apps/assets/`, `apps/tickets/`
- `apps/resignations/`, `apps/reimbursements/`, `apps/reports/`
- `apps/roles/`, `apps/sessions/`, `apps/timetracker/`
- `common/` — BaseModel (UUID, timestamps), TenantAwareManager, StandardResultsPagination.

API docs can be generated with **drf-spectacular** (see `SPECTACULAR_SETTINGS` in `config/settings/base.py`).
