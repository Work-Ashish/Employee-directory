# EMS Pro - Employee Management System

## Overview

EMS Pro is a production-grade, multi-tenant Employee Management System. The **frontend** is built with **Next.js 16**, **React 19**, and **TailwindCSS 3.4**. The **backend** runs on **Django 5.1 + Django REST Framework** with DB-per-tenant PostgreSQL isolation. The system includes 7 roles, 18 permissioned modules (63 codenames), 100+ API routes, structured performance reviews, and a desktop agent-based workforce activity tracking surface.

## Build Status

**TypeScript checks pass. Unit tests pass. 57/57 Playwright E2E tests pass. Frontend build clean. Django backend models and views ready.**

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TailwindCSS 3.4, Radix UI |
| Backend | Django 5.1, Django REST Framework, SimpleJWT |
| Backend (Legacy) | Next.js API Routes, Prisma 7.4 (being phased out) |
| Database | PostgreSQL — DB-per-tenant isolation |
| Auth | Django SimpleJWT with tenant-aware claims (`lib/django-auth.ts`) |
| AI | Google Gemini 2.0 Flash |
| Cache / Queue | Upstash Redis with in-memory fallback |
| File Storage | Supabase Storage |
| Email | Resend |
| Validation | Zod 4.3 + react-hook-form (frontend), DRF serializers (backend) |
| Export | XLSX, jsPDF |
| Testing | Vitest (unit), Playwright (E2E), pytest (Django) |

---

## Features

### Core HR

- Employee directory with CRUD, avatar upload, and bulk CSV/XLSX import
- Department management with guarded deletion
- Teams with team lead assignment and membership management
- Organization chart and reporting hierarchy management

### HR Operations

- Attendance and time tracking with check-in/out, breaks, heartbeat, and regularization
- Leave management with apply, approve/reject, and duplicate detection
- Payroll management with PF calculations, import/export, and payslip generation
- Provident fund tracking
- Training enrollment and completion tracking

### Performance and AI

- Daily and monthly performance review forms
- Weekly AI-driven performance evaluation with burnout detection
- AI chatbot for employee and HR support
- Onboarding companion for new employees

### Workforce Monitoring

- Desktop agent registration and device authentication
- Agent heartbeat, config fetch, command polling, and command confirmation
- Activity snapshot ingestion and idle-event capture
- Productivity scoring, app usage summaries, and website usage summaries
- Employee daily activity reports with AI summary and email delivery
- Admin dashboard for device health, stale devices, top apps, top websites, and org-level activity metrics

### Admin and Compliance

- Document management
- Asset management
- Recruitment pipeline
- Resignation workflows
- Configurable workflows
- Report builder and exports
- Session management and revocation
- Calendar and event scheduling
- Webhook subscriptions and deliveries

### Platform

- RBAC with 7 roles across 18 modules (63 Django codenames)
- Multi-tenant scoping via DB-per-tenant isolation
- Feature flags (Django-backed, sidebar + route gating)
- Structured logging, request tracing, and audit logs
- Metrics collection and alerting hooks
- Queue-backed jobs for webhooks and agent report/aggregation flows
- Command palette (Cmd+K) and custom UI design system

---

## Role-Based Access Control

| Role | Permissions |
| --- | --- |
| **admin** | All 63 permissions across all 18 modules |
| **hr_manager** | 39 perms — employees, attendance, leaves, performance, training, documents, tickets, recruitment, resignation, reimbursement, reports, teams, calendar, feedback, announcements, dashboard |
| **payroll_admin** | 11 perms — payroll, employees.view, attendance.view, leaves.view, reimbursement, reports |
| **team_lead** | 13 perms — employees.view, attendance.view, leaves.view/approve, performance.view/review, training.view, teams, feedback, calendar, dashboard |
| **recruiter** | 6 perms — employees.view, recruitment, calendar, dashboard |
| **hiring_manager** | 4 perms — employees.view, recruitment.view, calendar.view, dashboard.view |
| **interviewer** | 5 perms — read-only subset |

RBAC is defined in `lib/permissions.ts` (static matrix) and Django `seed_rbac.py` (63 codenames). Enforced via `withAuth()` middleware (Next.js) and `HasPermission` (Django).

---

## Migration Status (Django)

| Status | Modules |
| --- | --- |
| **Done (12)** | Employees, Attendance, Leaves, Training, Announcements, Assets, Documents, Tickets, Recruitment, Resignation, Organization, Teams |
| **Partial (6)** | Payroll, Performance, Feedback, Reports, Settings, Dashboard |

Frontend clients for all 18 modules already call Django `/api/v1/` endpoints. The 6 partial modules need Django apps (models, views, serializers) to be built.

---

## Getting Started

### Frontend

```bash
npm install
cp .env.example .env    # configure DATABASE_URL, AUTH_SECRET, GEMINI_API_KEY
npm run dev
```

### Django Backend

```bash
cd backend/hiringnow
pip install -r requirements.txt
cp .env.example .env    # configure DB_NAME, DB_USER, DB_PASSWORD, SECRET_KEY
python manage.py migrate
python manage.py seed_rbac --tenant-slug sourceoneai
python manage.py seed_features --tenant-slug sourceoneai
python manage.py runserver
```

### Docker (Full Stack)

```bash
docker-compose up -d
```

### Running Tests

```bash
# Unit tests
npm test

# E2E tests (requires dev server running)
npx playwright test

# Django tests
cd backend/hiringnow && pytest
```

---

## Important Environment Variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Django backend URL (default: `http://localhost:8000`) |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Django PostgreSQL connection |
| `SECRET_KEY` | Django secret key |
| `DATABASE_URL` | Legacy Prisma/Supabase connection string |
| `AUTH_SECRET` | Legacy NextAuth signing secret |
| `GEMINI_API_KEY` | Gemini API access |
| `CRON_SECRET` | Auth for cron routes |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Cache, rate limiting, and queue backend |
| `RESEND_API_KEY` | Email delivery for activity reports |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins for Django CORS |

---

## Documentation

- [System Architecture](docs/SYSTEM_ARCHITECTURE.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [User Flows](docs/USER_FLOWS.md)
- [Contributing](docs/CONTRIBUTING.md)
- [Changelog](docs/CHANGELOG.md)
- [Project Backlog](docs/PROJECT_BACKLOG.md)
