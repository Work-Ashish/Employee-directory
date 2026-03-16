# EMS Pro - Employee Management System

## Overview

EMS Pro is a production-grade, multi-tenant Employee Management System. The **frontend** is built with **Next.js 16**, **React 19**, and **TailwindCSS 3.4**. The **backend** is being migrated to **Django 5.1 + Django REST Framework** with schema-per-tenant PostgreSQL isolation (adopting the HiringNow platform architecture). The system includes 10 roles, 19+ permissioned modules, 100+ API routes, structured performance reviews, and a desktop agent-based workforce activity tracking surface.

## Build Status

**TypeScript checks pass. 131/136 tests pass. Frontend build clean. Django backend models and views ready.**

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TailwindCSS 3.4, Radix UI |
| Backend (New) | Django 5.1, Django REST Framework, SimpleJWT |
| Backend (Legacy) | Next.js API Routes, Prisma 7.4 |
| Database (New) | PostgreSQL — schema-per-tenant isolation |
| Database (Legacy) | PostgreSQL via Supabase (shared schema) |
| Auth (New) | Django SimpleJWT with tenant-aware claims |
| Auth (Legacy) | NextAuth.js v5, Google OAuth, Auth0 |
| AI | Google Gemini 2.5 Flash |
| Cache / Queue | Upstash Redis with in-memory fallback |
| File Storage | Supabase Storage |
| Email | Resend |
| Validation | Zod + react-hook-form (frontend), DRF serializers (backend) |
| Export | XLSX, jsPDF |
| Testing | Vitest, Playwright, pytest |

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

- Daily performance review forms
- Monthly performance review forms
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

- RBAC with 5 roles across 19 modules
- Multi-tenant scoping via `organizationId`
- Structured logging and request tracing
- Metrics collection and alerting hooks
- Queue-backed jobs for webhooks and agent report/aggregation flows
- Command palette and custom UI design system

---

## Role-Based Access Control

| Role | Access Summary |
| --- | --- |
| CEO | Full access across all 19 modules including organization, settings, and agent tracking |
| HR | Employee management, attendance, leaves, training, recruitment, workflows, and agent tracking visibility |
| PAYROLL | Payroll CRUD, PF, attendance view, reports, and payroll operations |
| TEAM_LEAD | Team overview, performance reviews, leave approvals, tickets, and limited agent visibility |
| EMPLOYEE | Own attendance, leaves, feedback, tickets, resignation, and personal activity visibility |

RBAC is defined in `lib/permissions.ts` and enforced through `withAuth({ module, action })` for session-auth routes and `withAgentAuth()` for desktop agent routes.

---

## Dashboards

| Role | Dashboard Highlights |
| --- | --- |
| CEO / HR | Org stats, hiring trends, salary distribution, recent hires, agent tracking insights |
| PAYROLL | Personal stats, payroll operations, PF, and time tracker |
| TEAM_LEAD | Personal stats, team overview, attendance visibility, review actions, to-do list |
| EMPLOYEE | Attendance, leave balance, training, time tracker, kudos, onboarding companion, activity tracker, to-do list |

---

## Getting Started

### Frontend

```bash
npm install
cp .env.example .env
npm run dev
```

### Django Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # configure DB_NAME, DB_USER, DB_PASSWORD, SECRET_KEY
python manage.py migrate
python manage.py seed_rbac --tenant-slug demo
python manage.py runserver
```

### Docker (Full Stack)

```bash
cd backend
docker-compose up -d
```

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

- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- [USER_FLOWS.md](./USER_FLOWS.md)
- [PERFORMANCE_AGENT_ARCHITECTURE.md](./PERFORMANCE_AGENT_ARCHITECTURE.md)
- [AI_AGENTS.md](./AI_AGENTS.md)
- [QA_AUDIT_REPORT.md](./QA_AUDIT_REPORT.md)
