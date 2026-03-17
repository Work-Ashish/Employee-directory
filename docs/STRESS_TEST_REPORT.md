# Stress Test Report - EMS Pro

**Date:** 2026-03-12
**Status:** Architectural review, live load test still recommended
**Schema:** 63 models, 38 enums
**RBAC:** 5 roles x 19 modules x 8 actions

---

## Current Architecture Limits

| Layer | Capability | Bottleneck Risk |
|---|---|---|
| Next.js API | 100+ route handlers, serverless-friendly | cold starts and burst concurrency |
| PostgreSQL | pooled access via Prisma + Pg adapter | connection saturation under heavy fan-out |
| Redis | cache, rate limiting, queue backend | in-memory fallback is not production-grade |
| Gemini AI | used by multiple agent/report flows | external API throughput and cost |
| Resend | transactional activity report delivery | delivery quotas and bounce handling |

---

## Key Performance Surfaces

| Surface | Notes |
|---|---|
| Employee and admin list views | paginated and bounded |
| Time tracker | transactional writes on critical paths |
| Performance evaluation cron | batch-based and AI-dependent |
| Agent activity ingestion | frequent write-heavy path |
| Agent aggregation/reporting | queue-backed background work |
| Admin agent dashboard | aggregation-heavy read path |

---

## Load Considerations

### Agent Tracking

Potential high-volume flows:
- device heartbeat
- batch activity snapshot uploads
- idle-event ingestion
- daily aggregation jobs
- report generation and email delivery

Recommended production focus:
1. validate queue throughput under concurrent tenants
2. monitor write amplification from activity snapshots
3. monitor report generation duration and email delivery lag
4. test stale-device dashboard accuracy under delayed heartbeat conditions

### Performance AI

The weekly performance evaluation flow still scales mainly with:
- employee count
- Gemini throughput
- batching strategy

---

## Production Recommendations

1. Use production Redis rather than in-memory fallback.
2. Run tenant-scale load tests on agent ingestion endpoints.
3. Add capacity monitoring around queue depth and worker lag.
4. Monitor Prisma connection usage during cron and dashboard peaks.
5. Treat agent reporting as a staged rollout feature for large orgs.
