# EMS Pro - Employee Management System

## Overview

EMS Pro is a production-grade, multi-tenant Employee Management System built with **Next.js 16**, **React 19**, **Prisma 7.4 ORM**, **PostgreSQL (Supabase)**, **NextAuth.js v5**, and **Google Gemini AI**. The current codebase includes 5 roles, 19 permissioned modules, 100+ API routes, structured performance reviews, and a new desktop agent-based workforce activity tracking surface.

## Build Status

**TypeScript checks pass. 100+ API routes compile cleanly. 63 database models, 38 enums.**

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TailwindCSS 3.4, Radix UI |
| Backend | Next.js API Routes, Prisma 7.4 |
| Database | PostgreSQL via Supabase |
| Auth | NextAuth.js v5, Google OAuth, Auth0 |
| AI | Google Gemini 2.5 Flash |
| Cache / Queue | Upstash Redis with in-memory fallback |
| File Storage | Supabase Storage |
| Email | Resend |
| Validation | Zod + react-hook-form |
| Export | XLSX, jsPDF |
| Testing | Vitest, Playwright |

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

```bash
npm install
cp .env.example .env
npx prisma db push
node scripts/create_admin.js
npm run dev
```

## Important Environment Variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth signing secret |
| `NEXTAUTH_URL` | App base URL |
| `GEMINI_API_KEY` | Gemini API access |
| `CRON_SECRET` | Auth for cron routes |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Cache, rate limiting, and queue backend |
| `RESEND_API_KEY` | Email delivery for activity reports |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `AUTH0_CLIENT_ID` / `AUTH0_CLIENT_SECRET` / `AUTH0_ISSUER` | Optional Auth0 support |

---

## Documentation

- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- [USER_FLOWS.md](./USER_FLOWS.md)
- [PERFORMANCE_AGENT_ARCHITECTURE.md](./PERFORMANCE_AGENT_ARCHITECTURE.md)
- [AI_AGENTS.md](./AI_AGENTS.md)
- [QA_AUDIT_REPORT.md](./QA_AUDIT_REPORT.md)
