# AI Agents - EMS Pro

## Overview

EMS Pro currently includes both AI-driven and automation-driven agent systems:

- HR chatbot
- weekly performance evaluation agent
- onboarding companion
- daily activity report generator

Session-auth routes use `withAuth()`. Desktop device routes use `withAgentAuth()`.

---

## 1. HR Chatbot

**Endpoint:** `POST /api/chat` *(Currently disabled/501 pending migration to FastAPI/Django)*

Purpose:

- answer HR policy and workflow questions
- assist employees with leave, attendance, and payroll context
- help create tickets through guided interactions

---

## 2. Weekly Performance Evaluation Agent

**Endpoint:** `POST /api/cron/evaluate-performance`

Purpose:

- score weekly performance
- detect burnout or anomalies
- create admin alerts and notifications

Primary outputs:

- `WeeklyScores`
- `AdminAlerts`
- `Notifications`

---

## 3. Onboarding Companion

**Endpoint:** `POST /api/onboarding/agent`

Purpose:

- support new employees during onboarding
- answer policy, process, and orientation questions

---

## 4. Daily Activity Report Generator

**Core files:** `lib/agent-report-generator.ts`, `lib/activity-classifier.ts`, `lib/email.ts`

Related endpoints:

- `POST /api/cron/agent-aggregate`
- `POST /api/cron/agent-reports`
- `GET /api/agent/report/[date]`

Purpose:

- turn desktop activity telemetry into daily employee-facing reports
- summarize apps, websites, active time, idle time, and focus score
- generate AI summary and recommendations
- send email reports when configured

Primary inputs:

- `AgentActivitySnapshot`
- `AppUsageSummary`
- `WebsiteUsageSummary`
- `IdleEvent`

Primary output:

- `DailyActivityReport`

---

## Configuration

```env
GEMINI_API_KEY=your-gemini-api-key
CRON_SECRET=your-cron-secret
RESEND_API_KEY=your-resend-api-key
```
