# HRMS Microservice Architecture — Integration with HiringNow Platform

## 1. High-Level Service Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (User)                              │
│                    https://app.hiringnow.com                        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NGINX API GATEWAY (:80)                         │
│                                                                     │
│   /api/v1/hrms/*  ──rewrite──▶  hrms-django:8001/api/v1/*          │
│   /hrms/*         ───────────▶  hrms-next:3001/hrms/*              │
│   /api/v1/*       ───────────▶  hn-django:8000/api/v1/*            │
│   /*              ───────────▶  hn-next:3000/*                     │
└─────────┬───────────┬───────────┬───────────┬───────────────────────┘
          │           │           │           │
          ▼           ▼           ▼           ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  HiringNow  │ │  HiringNow  │ │    HRMS     │ │    HRMS     │
│   Next.js   │ │   Django    │ │   Next.js   │ │   Django    │
│   :3000     │ │   :8000     │ │   :3001     │ │   :8001     │
│             │ │             │ │basePath:    │ │             │
│  Platform   │ │  5 apps:    │ │  /hrms      │ │  28 apps:   │
│  UI + Icon  │ │  tenants    │ │             │ │  employees  │
│  Sidebar    │ │  users      │ │  Content    │ │  attendance │
│             │ │  rbac       │ │  area only  │ │  payroll    │
│  Reads      │ │  features   │ │  (embedded  │ │  leave ...  │
│  service-   │ │  employees  │ │   mode)     │ │             │
│  manifest   │ │             │ │             │ │             │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │               │               │
       └───────┬───────┘               └───────┬───────┘
               │                               │
               ▼                               ▼
      ┌─────────────────┐            ┌─────────────────┐
      │  hiringnow-     │            │  hrms-internal   │
      │  network        │◄──bridge──▶│  network         │
      │  (shared)       │            │  (isolated)      │
      └────────┬────────┘            └────────┬────────┘
               │                              │
               ▼                              ▼
      ┌──────────────────────────────────────────────┐
      │              PostgreSQL                       │
      │                                              │
      │  ┌──────────────┐  ┌──────────────────────┐  │
      │  │ Registry DB  │  │ Tenant DB (per-slug) │  │
      │  │              │  │                      │  │
      │  │ • Tenant     │  │ • HN tables          │  │
      │  │ • Permission │  │   (users, rbac...)   │  │
      │  │ • FeatureFlag│  │                      │  │
      │  │              │  │ • HRMS tables         │  │
      │  │ (shared by   │  │   (employees,        │  │
      │  │  both svcs)  │  │    payroll, leave..)  │  │
      │  └──────────────┘  └──────────────────────┘  │
      └──────────────────────────────────────────────┘
```

## 2. User Interaction Flow (Figma UI → Code)

```
┌──────────────────────────────────────────────────────────────────┐
│                    HiringNow Platform UI                         │
│                                                                  │
│  ┌────┐ ┌──────────────────┐ ┌─────────────────────────────┐   │
│  │ 🏠 │ │                  │ │                             │   │
│  │    │ │  HRMS Secondary  │ │                             │   │
│  │ 👥 │◄│  Sidebar         │ │      Content Area           │   │
│  │HRMS│ │  (from service-  │ │      (Next.js Multi-Zone)   │   │
│  │    │ │   manifest.json) │ │                             │   │
│  │ 📊 │ │                  │ │   /hrms/dashboard           │   │
│  │    │ │  • Dashboard     │ │   /hrms/employees           │   │
│  │ 💰 │ │  • Employees ◄──┼─┤   /hrms/attendance          │   │
│  │    │ │  • Attendance    │ │   /hrms/payroll             │   │
│  │ ⚙️ │ │  • Leave         │ │   ...                      │   │
│  │    │ │  • Payroll       │ │                             │   │
│  └────┘ │  • Performance   │ │  ┌───────────────────────┐  │   │
│  Icon   │  • Training      │ │  │ Rendered by HRMS      │  │   │
│  Side   │  • Documents     │ │  │ Next.js (port 3001)   │  │   │
│  bar    │  • Help Desk     │ │  │ basePath: /hrms       │  │   │
│  (HN)   │  • Reports       │ │  │ embedded mode: true   │  │   │
│         │  • Settings      │ │  └───────────────────────┘  │   │
│         └──────────────────┘ └─────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘

User clicks "HRMS" icon → HiringNow reads service-manifest.json
                        → Renders secondary sidebar with HRMS modules
                        → Routes /hrms/* to HRMS Next.js via Multi-Zone
```

## 3. Request Lifecycle

```
User clicks "Employees" in HRMS sidebar
          │
          ▼
┌─────────────────────────────────┐
│ Browser navigates to:           │
│ https://app.hiringnow.com/hrms/ │
│ employees                       │
└────────────┬────────────────────┘
             │
    ── Page Request ──
             │
             ▼
┌─────────────────────────────────┐
│ Nginx: /hrms/* → hrms-next     │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ HRMS Next.js (basePath=/hrms)   │
│ Renders EmployeeList page       │
│                                 │
│ Calls: fetch("/api/v1/hrms/     │
│        employees/")             │
└────────────┬────────────────────┘
             │
    ── API Request ──
             │
             ▼
┌─────────────────────────────────┐
│ Nginx: /api/v1/hrms/*           │
│ Rewrite: strip /hrms            │
│ → /api/v1/employees/            │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ HRMS Django (:8001)             │
│                                 │
│ 1. TenantMiddleware             │
│    → reads X-Tenant-Slug        │
│    → sets thread-local tenant   │
│                                 │
│ 2. TenantJWTAuthentication      │
│    → validates JWT (shared key) │
│    → extracts user_id,          │
│      tenant_id                  │
│                                 │
│ 3. HasPermission('employees.    │
│    view')                       │
│    → checks user's RBAC role    │
│                                 │
│ 4. EmployeeListView             │
│    → queries tenant DB          │
│    → returns JSON               │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Response: { data: [...],        │
│   pagination: {...} }           │
│ → flows back through Nginx      │
│ → rendered in HRMS React page   │
└─────────────────────────────────┘
```

## 4. Authentication Flow (Shared JWT)

```
┌──────────┐     POST /api/v1/auth/login/     ┌──────────────┐
│  Browser  │ ───────────────────────────────▶ │ HiringNow    │
│           │                                  │ Django :8000  │
│           │ ◀─── JWT { access, refresh } ─── │              │
│           │                                  │ Signs with    │
│           │      JWT payload:                │ SECRET_KEY    │
│           │      {                           └──────────────┘
│           │        user_id: "abc-123",              │
│           │        tenant_id: "xyz-456",            │
│           │        is_tenant_admin: true,     SAME SECRET_KEY
│           │        exp: 1742...                     │
│           │      }                                  │
│           │                                         ▼
│           │     GET /api/v1/hrms/employees/  ┌──────────────┐
│           │ ───Bearer <same-jwt>───────────▶ │ HRMS Django  │
│           │                                  │ :8001        │
│           │                                  │              │
│           │ ◀─── { data: [...] } ─────────── │ Validates    │
└──────────┘                                   │ with SAME    │
                                               │ SECRET_KEY   │
  No separate login needed!                    │ ✓ Valid!     │
  Token minted by HiringNow works             └──────────────┘
  in HRMS automatically.
```

## 5. Service Discovery (Manifest-Based)

```
┌─────────────────────────────────────────────────┐
│            HiringNow Platform                    │
│                                                  │
│  On startup, reads service manifests from        │
│  registered microservices:                       │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  GET hrms-next:3001/service-manifest.json│    │
│  │                                         │    │
│  │  {                                      │    │
│  │    "service": "hrms",                   │    │
│  │    "basePath": "/hrms",                 │    │
│  │    "icon": "Users",                     │    │
│  │    "sidebar": [                         │    │
│  │      { "label": "Dashboard",            │    │
│  │        "path": "/hrms/dashboard" },     │    │
│  │      { "label": "Employees",            │    │
│  │        "path": "/hrms/employees" },     │    │
│  │      ...                                │    │
│  │    ],                                   │    │
│  │    "healthCheck": "/api/v1/health/"     │    │
│  │  }                                      │    │
│  └────────────────────┬────────────────────┘    │
│                       │                          │
│                       ▼                          │
│  ┌─────────────────────────────────────────┐    │
│  │  Platform dynamically builds:            │    │
│  │                                         │    │
│  │  Icon Sidebar:    Secondary Sidebar:    │    │
│  │  ┌──────┐        ┌──────────────────┐   │    │
│  │  │ Home │        │ (populated from  │   │    │
│  │  │ HRMS │───────▶│  manifest.sidebar│   │    │
│  │  │ ATS  │        │  array)          │   │    │
│  │  │ ...  │        └──────────────────┘   │    │
│  │  └──────┘                               │    │
│  │                                         │    │
│  │  next.config.ts rewrites:               │    │
│  │  { source: "/hrms/:path*",              │    │
│  │    destination: "http://hrms-next:3001/  │    │
│  │    hrms/:path*" }                       │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

## 6. Docker Network Topology

```
┌─ docker compose (HiringNow Platform) ──────────────────────────┐
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐                          │
│  │  hn-next     │    │  hn-django   │                          │
│  │  :3000       │    │  :8000       │                          │
│  └──────┬───────┘    └──────┬───────┘                          │
│         │                   │                                   │
│         └─────────┬─────────┘                                   │
│                   │                                             │
└───────────────────┼─────────────────────────────────────────────┘
                    │
           ┌────────┴────────┐
           │  hiringnow-     │
           │  network        │◄──── shared Docker network
           │  (external)     │      both stacks join this
           └────────┬────────┘
                    │
┌───────────────────┼─────────────────────────────────────────────┐
│                   │                                             │
│  ┌────────────────┴──────────────────────────────┐             │
│  │                                                │             │
│  │  ┌──────────────┐    ┌──────────────┐         │             │
│  │  │  hrms-next   │    │  hrms-django │         │             │
│  │  │  :3001       │    │  :8001       │         │             │
│  │  └──────┬───────┘    └──────┬───────┘         │             │
│  │         │                   │                  │             │
│  │         └─────────┬─────────┘                  │             │
│  │                   │                            │             │
│  │          hrms-internal network                 │             │
│  └────────────────────────────────────────────────┘             │
│                                                                 │
│  ┌──────────────┐                                              │
│  │   gateway    │  (profile: gateway)                          │
│  │   nginx:80   │  Routes all traffic                          │
│  └──────────────┘                                              │
│                                                                 │
└─ docker compose (HRMS Microservice) ───────────────────────────┘
```

## 7. Scaling to More Microservices

```
The same pattern repeats for any new module:

┌────────────────────────────────────────────────────────────┐
│                    HiringNow Platform                       │
│                                                            │
│  Icon Sidebar        Secondary Sidebars    Content Area    │
│  ┌──────┐           ┌─────────────────┐  ┌────────────┐  │
│  │ 🏠   │           │                 │  │            │  │
│  │ Home │           │                 │  │            │  │
│  ├──────┤    ┌─────▶│ HRMS sidebar    │  │  /hrms/*   │  │
│  │ 👥   │────┘      │ (manifest.json) │  │            │  │
│  │ HRMS │           └─────────────────┘  └────────────┘  │
│  ├──────┤           ┌─────────────────┐  ┌────────────┐  │
│  │ 🎯   │────┐      │                 │  │            │  │
│  │ ATS  │    └─────▶│ ATS sidebar     │  │  /ats/*    │  │
│  ├──────┤           │ (manifest.json) │  │            │  │
│  │ 📚   │           └─────────────────┘  └────────────┘  │
│  │ LMS  │────┐      ┌─────────────────┐  ┌────────────┐  │
│  ├──────┤    └─────▶│ LMS sidebar     │  │  /lms/*    │  │
│  │ 💬   │           │ (manifest.json) │  │            │  │
│  │ Chat │           └─────────────────┘  └────────────┘  │
│  └──────┘                                                  │
│                                                            │
│  Each microservice provides:                               │
│  1. service-manifest.json (sidebar + routes)               │
│  2. Dockerfile + docker-compose.yml                        │
│  3. Shared JWT SECRET_KEY                                  │
│  4. basePath for Next.js Multi-Zone                        │
│  5. Health probe at /health/ready/                         │
│                                                            │
│  Gateway adds one location block per service:              │
│  /api/v1/hrms/* → hrms-django                             │
│  /api/v1/ats/*  → ats-django                              │
│  /api/v1/lms/*  → lms-django                              │
└────────────────────────────────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `service-manifest.json` | Declares HRMS sidebar items, routes, permissions |
| `next.config.ts` | `basePath` from env + `SAMEORIGIN` framing |
| `components/AppShell.tsx` | Embedded mode hides sidebar/topbar |
| `middleware.ts` | Redirects to platform login when embedded |
| `lib/django-proxy.ts` | `DJANGO_GATEWAY_URL` priority for API routing |
| `backend/Dockerfile` | Django container (Gunicorn, port 8001) |
| `Dockerfile` | Next.js container (port 3001) |
| `infra/nginx/default.conf` | API gateway routing rules |
| `docker-compose.yml` | Standalone + gateway profiles |
| `config/settings/base.py` | CORS + CSRF for gateway origins |
| `config/views.py` | `/health/live/` + `/health/ready/` probes |

## Environment Variables

| Variable | Standalone | Embedded |
|----------|-----------|----------|
| `NEXT_PUBLIC_BASE_PATH` | _(empty)_ | `/hrms` |
| `NEXT_PUBLIC_EMBEDDED` | `false` | `true` |
| `NEXT_PUBLIC_PLATFORM_LOGIN_URL` | _(empty)_ | `http://localhost:3000/login` |
| `DJANGO_GATEWAY_URL` | _(empty)_ | `http://gateway/api/v1/hrms` |
| `SECRET_KEY` | any | **must match HiringNow's** |
