# Performance Agent Architecture

## Overview

EMS Pro includes a weekly AI-driven performance evaluation pipeline. This is separate from the desktop agent tracking and daily activity reporting system.

The performance agent:
- processes active employees in batches
- aggregates recent time and performance signals
- generates weekly scores
- creates notifications and admin alerts

---

## Flow

1. cron triggers weekly evaluation
2. active employees are loaded in batches
3. prior runs are checked through idempotency keys
4. base score is computed from rule-based inputs
5. Gemini produces qualitative adjustments and anomaly signals
6. results are persisted transactionally
7. notifications and alerts are created where needed

---

## Primary Models

- `WeeklyScores`
- `PerformanceMetrics`
- `AgentExecutionLogs`
- `Notifications`
- `AdminAlerts`

---

## Related Systems

- manual daily/monthly performance reviews via `/api/performance`
- desktop telemetry ingestion via `/api/agent/*`
- daily activity reporting via `DailyActivityReport`

---

## Security

- cron auth via `CRON_SECRET`
- organization scoping
- RBAC on admin and employee read paths
- idempotency on evaluation runs
