# Performance Agent Architecture

## Overview

EMS Pro includes a weekly AI-driven performance evaluation pipeline. This is separate from the desktop agent tracking and daily activity reporting system.

The performance agent:
- processes active employees in batches
- aggregates recent time and performance signals
- generates weekly scores
- creates notifications and admin alerts

---

## End-to-End Flow

### Request Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        BROWSER (React 19)                            │
│                                                                      │
│  ┌─────────────────────┐    ┌──────────────────────────────┐        │
│  │ AdminPerformanceView │    │ PerformanceTemplateEditor     │        │
│  │ EmployeeDashboard    │    │ (other performance components)│        │
│  └────────┬────────────┘    └──────────────┬───────────────┘        │
│           │                                │                         │
│           ▼                                ▼                         │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │        features/performance/api/client.ts                 │       │
│  │        (PerformanceAPI — typed methods)                    │       │
│  │                                                            │       │
│  │  .listReviews()          → /performance/reviews/           │       │
│  │  .getReview(id)          → /performance/reviews/:id/       │       │
│  │  .listTemplates()        → /performance/templates/         │       │
│  │  .getMetrics()           → /performance/metrics/           │       │
│  │  .listCycles()           → /performance/cycles/            │       │
│  │  .listMonthlyReviews()   → /performance/monthly/           │       │
│  │  .signMonthlyReview(id)  → /performance/monthly/:id/sign/  │       │
│  │  .listAppraisals()       → /performance/appraisals/        │       │
│  │  .checkEligibility(fy)   → /performance/appraisals/eligibility/ │  │
│  │  .listPIPs()             → /performance/pip/               │       │
│  └────────────────────────────┬─────────────────────────────┘       │
│                               │                                      │
│                               ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │              lib/api-client.ts (apiClient)                │       │
│  │                                                            │       │
│  │  1. Prepends BASE_URL + /api/v1 to path                   │       │
│  │  2. Attaches JWT from localStorage (Bearer token)          │       │
│  │  3. Attaches X-Tenant-Slug header                          │       │
│  │  4. Converts request body → snake_case                     │       │
│  │  5. Converts response body → camelCase                     │       │
│  │  6. Unwraps Django {data, error, meta} envelope            │       │
│  │  7. Handles 401 → redirect to /login                       │       │
│  └────────────────────────────┬─────────────────────────────┘       │
└───────────────────────────────┼──────────────────────────────────────┘
                                │
                    DIRECT HTTP (primary path)
                    GET http://127.0.0.1:8000/api/v1/performance/reviews/
                                │
┌───────────────────────────────┼──────────────────────────────────────┐
│                               ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │              DJANGO (DRF) — apps/performance/            │       │
│  │                                                          │       │
│  │  urls.py  (14 URL patterns)                              │       │
│  │  ├── /performance/reviews/              → List + Create   │       │
│  │  ├── /performance/reviews/:id/          → Detail + Update │       │
│  │  ├── /performance/templates/            → List + Create   │       │
│  │  ├── /performance/templates/:id/        → Detail + CRUD   │       │
│  │  ├── /performance/metrics/              → Read-only list  │       │
│  │  ├── /performance/cycles/               → List + Create   │       │
│  │  ├── /performance/monthly/              → List + Create   │       │
│  │  ├── /performance/monthly/:id/          → Detail + Update │       │
│  │  ├── /performance/monthly/:id/sign/     → Sign-off action │       │
│  │  ├── /performance/appraisals/           → List + Create   │       │
│  │  ├── /performance/appraisals/eligibility/ → Eligibility   │       │
│  │  ├── /performance/appraisals/:id/       → Detail + Update │       │
│  │  ├── /performance/pip/                  → List + Create   │       │
│  │  └── /performance/pip/:id/              → Detail + Update │       │
│  └──────────────────────────┬───────────────────────────────┘       │
│                             │                                        │
│                             ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │  views.py — APIView classes                              │       │
│  │                                                          │       │
│  │  Permissions:                                            │       │
│  │  ├── IsAuthenticated (JWT via SimpleJWT)                 │       │
│  │  └── HasPermission('performance.view/manage/review')     │       │
│  │                                                          │       │
│  │  Tenant isolation:                                       │       │
│  │  └── TenantDatabaseRouter routes to tenant-specific DB   │       │
│  │                                                          │       │
│  │  Data flow (example: list reviews):                      │       │
│  │  1. Auth middleware validates JWT → request.user          │       │
│  │  2. HasPermission checks codename against user role      │       │
│  │  3. View queries PerformanceReview.objects.all()          │       │
│  │     (scoped to tenant DB automatically)                  │       │
│  │  4. Admin sees all; employee filtered by own profile     │       │
│  │  5. Paginated via page/per_page query params             │       │
│  │  6. Serialized → {results, total, page, limit, ...}     │       │
│  └──────────────────────────┬───────────────────────────────┘       │
│                             │                                        │
│                             ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │  services.py — Business Logic                            │       │
│  │                                                          │       │
│  │  compute_score_percentage()       — calculates from metrics │     │
│  │  rating_category_from_score()     — maps score → A/B/C/D │       │
│  │  rating_from_category()           — maps category → 1-5  │       │
│  │  alert_type_from_rating()         — triggers PIP/warning  │       │
│  │  check_six_monthly_eligibility()  — appraisal gate        │       │
│  │  aggregate_monthly_summary()      — rolls up monthly data │       │
│  │  outcome_from_rating()            — determines HR outcome │       │
│  │  category_from_rating()           — numeric → label       │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                      │
│                    DJANGO BACKEND (port 8000)                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Two Request Paths

### Path 1 — Direct API Client (Primary, Active)

This is the recommended path. Frontend components use `PerformanceAPI` from `features/performance/api/client.ts`, which calls `api-client.ts`.

```
Component
  → PerformanceAPI.listReviews()
  → api.get("/performance/reviews/")
  → apiClient() builds: http://127.0.0.1:8000/api/v1/performance/reviews/
  → Attaches JWT + X-Tenant-Slug headers
  → Converts request body to snake_case
  → Django view processes and responds
  → apiClient() unwraps {data, error, meta} envelope
  → Converts response to camelCase
  → Component receives typed data
```

### Path 2 — Legacy Proxy (Deprecated)

Old Next.js API routes in `app/api/performance/` that proxy to Django via `lib/django-proxy.ts`. These log deprecation warnings and will be removed once all frontend code uses the direct client.

```
Component
  → fetch("/api/performance")
  → Next.js route: app/api/performance/route.ts
  → proxyToDjango(req, "/performance/reviews/")
  → django-proxy.ts builds: http://127.0.0.1:8000/api/v1/performance/reviews/
  → Circuit breaker check (5 failures → 30s OPEN cooldown)
  → Retry on 502/503/504 for GET/HEAD (3 attempts, exponential backoff)
  → Django view responds
  → Raw response relayed back (NO camelCase transform)
```

### Path Comparison

| Aspect | Direct (api-client) | Proxy (django-proxy) |
|--------|---------------------|----------------------|
| Case transform | snake_case ↔ camelCase | None (raw relay) |
| Auth | JWT from localStorage | Forwards incoming headers |
| Error handling | Unwraps envelope, typed errors | Raw Django response |
| Circuit breaker | No | Yes (5 failures → 30s cooldown) |
| Retry | No | Yes (GET/HEAD, 3 attempts) |
| Timeout | 10s (AbortSignal) | 30s (configurable) |
| Status | **Active** | **Deprecated** (logs warnings) |

---

## Legacy Proxy Route Mapping

These Next.js proxy routes exist for backward compatibility. Each logs a deprecation warning via `deprecatedRoute()`.

| Next.js Proxy Route | Django Target |
|---------------------|---------------|
| `GET/POST /api/performance` | `/api/v1/performance/reviews/` |
| `GET/PUT /api/performance/reviews/[id]` | `/api/v1/performance/reviews/:id/` |
| `GET/POST /api/performance/templates` | `/api/v1/performance/templates/` |
| `GET/PUT/DELETE /api/performance/templates/[id]` | `/api/v1/performance/templates/:id/` |
| `GET /api/performance/metrics` | `/api/v1/performance/metrics/` |
| `GET /api/employee/performance` | `/api/v1/performance/reviews/` |
| `GET /api/admin/performance` | `/api/v1/performance/reviews/` |

---

## AI Weekly Evaluation Pipeline

### Current Status: **NOT IMPLEMENTED (501 Stub)**

The cron endpoint at `/api/cron/evaluate-performance` returns `501 Not Implemented`. When built, the pipeline would:

1. **Trigger**: Cron job hits `POST /api/cron/evaluate-performance` with `Bearer $CRON_SECRET`
2. **Load**: Fetch active employees in batches
3. **Idempotency**: Check `AgentExecutionLogs` for prior runs in the same period
4. **Compute**: Call `services.py` functions:
   - `compute_score_percentage()` — aggregate attendance, task, collaboration metrics
   - `rating_category_from_score()` — map percentage to A/B/C/D rating
   - `alert_type_from_rating()` — determine if PIP or warning is needed
5. **AI Enhancement** (planned): Gemini produces qualitative adjustments and anomaly signals
6. **Persist**: Write `WeeklyScores`, `PerformanceMetrics` transactionally
7. **Notify**: Create `Notifications` for employees and `AdminAlerts` for managers
8. **PIP Trigger**: Auto-create PIPs via `alert_type_from_rating()` for low performers

### Primary Models (AI Pipeline)

- `WeeklyScores` — weekly computed scores per employee
- `PerformanceMetrics` — task completion, attendance, collaboration, quality scores
- `AgentExecutionLogs` — idempotency tracking for evaluation runs
- `Notifications` — employee-facing notifications
- `AdminAlerts` — manager/admin alerts for action items

---

## Source One Performance Module

The Source One module is a Django-backed structured performance evaluation framework that sits alongside the AI-driven weekly pipeline. It handles formal HR performance processes.

### Sub-Modules

| Sub-Module | Purpose | Endpoints |
| --- | --- | --- |
| **Review Cycles** | Define annual/six-monthly evaluation periods | `GET/POST /api/v1/performance/cycles/` |
| **Monthly Reviews** | Structured monthly employee evaluations with recruiter metrics, team lead metrics, scores, and comments | `GET/POST /api/v1/performance/monthly/`, `GET/PUT .../monthly/{id}/` |
| **Digital Signatures** | Collect employee, manager, and HR sign-offs on monthly reviews | `POST .../monthly/{id}/sign/` |
| **Appraisals** | Annual and six-monthly appraisals linked to review cycles | `GET/POST .../appraisals/`, `GET/PUT .../appraisals/{id}/` |
| **Eligibility** | Check which employees are eligible for appraisals in a financial year | `GET .../appraisals/eligibility/?financial_year=YYYY-YYYY` |
| **PIPs** | Performance Improvement Plans (60-day, 90-day) with goals, weekly check-ins, and support plans | `GET/POST .../pip/`, `GET/PUT .../pip/{id}/` |

### Django Models

- `ReviewCycle` — cycle type (annual/six_monthly), period label, period start/end, financial year, status
- `MonthlyReview` — employee FK, review month/year, recruiter metrics (JSON), team lead metrics (JSON), rating, score percentage, reviewer remarks, strengths, areas for improvement, action items, triple signature (employee/manager/HR with timestamps), status
- `Appraisal` — employee FK, cycle FK, review type (annual/six_monthly), monthly summary, conversion KPIs, recruiter/team lead competencies, self-assessment, overall rating, final category, outcome decision, triple signature, eligibility flag
- `PIP` — employee FK, PIP type (60_day/90_day), triggered by monthly/appraisal, specific targets (JSON), weekly check-ins (JSON), start/end dates, status, outcome

### Rating Scale

| Score | Category | Outcome |
|-------|----------|---------|
| 5 (90-100%) | Outstanding | Promotion + salary revision |
| 4 (75-89%) | Excellent | Salary revision |
| 3 (60-74%) | Good | Standard increment |
| 2 (40-59%) | Needs Improvement | 60-day PIP |
| 1 (<40%) | Unsatisfactory | 90-day PIP + warning |

### Business Logic (services.py)

| Function | Purpose |
|----------|---------|
| `compute_score_percentage()` | Calculates overall score from recruiter/team lead metrics |
| `rating_category_from_score()` | Maps percentage → Outstanding/Excellent/Good/Needs Improvement/Unsatisfactory |
| `rating_from_category()` | Maps category label → numeric 1-5 |
| `alert_type_from_rating()` | Determines if appreciation email, alert email, or PIP is triggered |
| `check_six_monthly_eligibility()` | Validates 4/6 months rated 4-5, no month below 3 |
| `aggregate_monthly_summary()` | Rolls up 6 or 12 monthly reviews into appraisal summary |
| `outcome_from_rating()` | Maps final rating → HR outcome (promotion, increment, PIP) |
| `category_from_rating()` | Numeric rating → display label |

### Architecture

- Feature API client (`features/performance/api/client.ts`) calls Django directly via `lib/api-client.ts` — this is the primary active path
- Legacy Next.js proxy routes in `app/api/performance/` forward to Django via `proxyToDjango()` with circuit breaker + retry — deprecated
- Django views use `IsAuthenticated` + `HasPermission` with `performance.view`/`performance.manage`/`performance.review` codenames
- `is_tenant_admin` bypass on all permission checks
- Tenant-scoped queries via `TenantDatabaseRouter` (`performance` in `tenant_scoped_apps`)
- `unique_together` constraints prevent duplicate monthly reviews per employee/month/year

---

## Security

- Cron auth via `CRON_SECRET` bearer token
- JWT authentication (SimpleJWT) on all API endpoints
- Tenant isolation via DB-per-tenant routing
- RBAC: `performance.view` (read), `performance.manage` (create/update), `performance.review` (reviewer actions)
- Admin bypass via `is_tenant_admin` flag
- Idempotency on AI evaluation runs via `AgentExecutionLogs`

---

## Key Files

| Layer | File | Purpose |
|-------|------|---------|
| **Frontend** | `features/performance/api/client.ts` | Typed API client (PerformanceAPI) with all 20+ methods |
| **Frontend** | `components/performance/AdminPerformanceView.tsx` | Admin performance dashboard |
| **Frontend** | `components/performance/PerformanceTemplateEditor.tsx` | Template CRUD editor |
| **Transport** | `lib/api-client.ts` | Django HTTP client with JWT, tenant headers, case transforms |
| **Transport** | `lib/django-proxy.ts` | Legacy proxy with circuit breaker + retry (deprecated) |
| **Proxy** | `app/api/performance/*.ts` | Legacy Next.js proxy routes (deprecated) |
| **Cron** | `app/api/cron/evaluate-performance/route.ts` | AI evaluation stub (501) |
| **Django** | `apps/performance/urls.py` | 14 URL patterns |
| **Django** | `apps/performance/views.py` | 14 APIView classes |
| **Django** | `apps/performance/serializers.py` | Read/create/update serializers |
| **Django** | `apps/performance/services.py` | Business logic (scoring, rating, eligibility) |
| **Django** | `apps/performance/models.py` | 7 models (Review, Template, Metrics, Cycle, Monthly, Appraisal, PIP) |

---

## Testing

- **Unit tests**: 36 tests in `__tests__/api/performance-sourceone.test.ts` — proxy route verification, error propagation, method handling
- **Load tests**: `scripts/load_test_performance.js` — 13 endpoints, concurrent workers, P50/P95/P99 percentiles, 96.9% success rate

---

## Related Systems

- Manual daily/monthly performance reviews via `/api/performance`
- Desktop telemetry ingestion via `/api/agent/*`
- Daily activity reporting via `DailyActivityReport`
