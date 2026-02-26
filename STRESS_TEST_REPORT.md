# ☠️ 50,000-User Stress Test Report

> **Scenario:** 50,000 concurrent users hitting every endpoint simultaneously
> **Deployment:** Vercel serverless (50-100 cold-start instances), Supabase PostgreSQL (max ~200 connections)
> **Date:** 2026-02-25

---

## 💀 CATEGORY 1: SERVER CRASH (Will Take Down the System)

### KILL SHOT #1 — Database Connection Pool Exhaustion
**File:** `lib/prisma.ts:22` | **Severity:** 🔴 INSTANT DEATH

```typescript
const pool = new Pool({
    max: 3,  // ← 3 connections per serverless instance
})
```

**What happens at 50K users:**
- Vercel spins up ~50-100 serverless instances under load
- Each creates its own `pg.Pool` with `max: 3` connections
- **50 instances × 3 = 150 connections** from the app alone
- Supabase free tier: **60 connection limit**. Pro tier: **200 connections**
- Result: **`connectionTimeoutMillis` fires → every request gets 500 after 5 seconds**

**Fix:**
```typescript
const pool = new Pool({
    max: 2,              // Reduce per-instance (serverless = many instances)
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 3000,
})
```
↳ Also: Use **Supabase connection pooler** (PgBouncer) mode in `DATABASE_URL` — this is the real fix for serverless at scale.

---

### KILL SHOT #2 — Dashboard Route: 9 Sequential DB Queries
**File:** `app/api/dashboard/route.ts` | **Severity:** 🔴 CASCADING FAILURE

Every admin dashboard load executes:
1. `employee.count()` × 3 via `Promise.all` (lines 14-17)
2. `employee.aggregate` (line 21)
3. `department.findMany` with include (line 26)
4. **6 sequential `employee.count()` calls IN A FOR LOOP** (lines 45-61)
5. **`employee.findMany({ select: { salary: true } })`** — loads ALL 50K employee salaries into memory (line 64)
6. `employee.findMany` for recent hires (line 74)

**What happens at 50K users:**
- Query #5 returns **50,000 rows** → ~2MB per request
- If 1,000 admins load the dashboard simultaneously: **2GB of salary data in memory**
- The for-loop (6 sequential COUNT queries) holds a DB connection for ~600ms per request
- Connection pool starved → all other routes start failing

**Fix:** Replace the salary query with a `GROUP BY` aggregation:
```typescript
// Replace lines 64-71 with:
const salaryStats = await prisma.$queryRaw`
    SELECT 
        COUNT(*) FILTER (WHERE salary >= 30000 AND salary < 50000) as "range_30_50",
        COUNT(*) FILTER (WHERE salary >= 50000 AND salary < 80000) as "range_50_80",
        COUNT(*) FILTER (WHERE salary >= 80000 AND salary < 120000) as "range_80_120",
        COUNT(*) FILTER (WHERE salary >= 120000) as "range_120_plus",
        COALESCE(AVG(salary), 0) as avg_salary
    FROM "Employee"
`
```
Also parallelize the hiring trend loop into a single query.

---

### KILL SHOT #3 — Admin Time-Tracker Dashboard: Full Table Scan with N+1
**File:** `app/api/admin/time-tracker/dashboard/route.ts:23` | **Severity:** 🔴 OOM CRASH

```typescript
const employees = await prisma.employee.findMany({
    select: { ... },
    // NO WHERE CLAUSE, NO LIMIT
    // Loads ALL employees with nested includes:
    //   → timeSessions (with WHERE today)
    //     → snapshots (take 1)
    //     → activities (take 1)
})
```

**What happens at 50K users:**
- Returns 50,000 employees, each with nested join data
- Prisma generates **1 main query + 3 subqueries per employee model**
- Estimated response size: **15-25MB JSON**
- PostgreSQL: The query takes 5-10 seconds, holding a pool connection the entire time
- Multiple admins viewing this = pool starvation + memory spike

---

### KILL SHOT #4 — Heartbeat Endpoint: 50K Writes/Minute
**File:** `app/api/time-tracker/heartbeat/route.ts` | **Severity:** 🔴 DB OVERLOAD

```typescript
// Every active employee's browser sends this every 60 seconds:
const snapshot = await prisma.activitySnapshot.create({
    data: { sessionId, status, mouseClicks, keystrokes }
})
```

**What happens at 50K users:**
- 50,000 users × 1 heartbeat/min = **833 writes/second** to `ActivitySnapshot` table
- Each heartbeat also does: `getSessionEmployee()` (1 query) + `findFirst` (1 query) + possibly `findMany` for idle detection (1 query) + `create` (1 write)
- Total: **~3,300 DB operations/second** just from heartbeats
- This ALONE will exhaust any standard PostgreSQL instance
- `ActivitySnapshot` table grows by **72 million rows/day** (50K × 60min × 24hr)

**Fix:** Batch heartbeats client-side (send every 5min instead of 60s), use a queue (Redis/BullMQ), or write to a time-series DB.

---

## 🧨 CATEGORY 2: DATA CORRUPTION

### CORRUPTION #1 — Organization PUT: Circular Manager Dependencies
**File:** `app/api/organization/route.ts:31-41`

```typescript
// Comment on line 39 says it all:
// "A robust solution would do a graph cycle check here, but we trust the UI for now."

const operations = updates.map(update =>
    prisma.employee.update({
        where: { id: update.id },
        data: { managerId: update.managerId }
    })
)
await prisma.$transaction(operations)
```

**What happens:** A malicious or buggy request can set Employee A's manager to Employee B and Employee B's manager to Employee A → infinite loop in any org chart rendering. No validation exists.

---

### CORRUPTION #2 — Leave Double-Submit Race Condition
**File:** `app/api/leaves/route.ts:57-67`

```typescript
const leave = await prisma.leave.create({
    data: { type, startDate, endDate, reason, status: "PENDING", employeeId }
})
```

**What happens:** User clicks "Submit" twice quickly → two identical PENDING leave requests created. No duplicate detection (same dates + same employee). No transaction, no unique constraint.

---

### CORRUPTION #3 — Payroll/PF Import Without Duplicate Detection
**Files:** `app/api/payroll/import/route.ts`, `app/api/pf/import/route.ts`, `app/api/resignations/import/route.ts`

CSV import loops call `prisma.*.create()` per row with no upsert logic. Importing the same CSV twice doubles all records.

---

## 🔓 CATEGORY 3: PRIVATE DATA EXPOSURE

### LEAK #1 — Organization Endpoint Returns ALL Employee Fields
**File:** `app/api/organization/route.ts:7-9`

```typescript
const employees = await prisma.employee.findMany({
    include: { department: true },
})
return NextResponse.json(employees)
```

**What leaks:** Every employee's `salary`, `bankAccount`, `panCard`, `aadharNumber`, `passportNumber`, `emergencyContactName`, `emergencyContactPhone`, `personalEmail`, `bloodGroup`, `maritalStatus` — ALL serialized to JSON and sent to the browser. Any authenticated user can see everyone's salary and Aadhaar number.

---

### LEAK #2 — Admin Time-Tracker Returns Employee PII
**File:** `app/api/admin/time-tracker/dashboard/route.ts:23-52`

The `select` clause includes `id`, `firstName`, `lastName`, `designation`, `employeeCode`, `avatarUrl` — these are fine. But if the `select` is ever removed or expanded, it would leak everything. Currently safe but fragile.

---

### LEAK #3 — Leaves Include Full Employee Object
**File:** `app/api/leaves/route.ts:23`

```typescript
include: { employee: true }  // Returns ALL 40+ fields of the employee
```

This sends salary, bank details, Aadhaar, PAN card with every leave request.

---

## 🕳️ CATEGORY 4: MEMORY LEAKS

### LEAK #1 — Polling Intervals Without AbortController
**Files:** `AdminDashboard.tsx`, `EmployeeDashboard.tsx`

The `fetchDashboardData` uses `setInterval` with `visibilitychange`. But if the component unmounts during an in-flight fetch, the response arrives and tries to `setState` on an unmounted component → React warning → leaked closure.

**Fix:** Use `AbortController` in the fetch calls and abort on cleanup.

---

### LEAK #2 — AIChatbot Message History
**File:** `components/AIChatbot.tsx`

Chat messages accumulate in state. Over a long session, if a user sends hundreds of messages, memory grows unbounded. No message limit, no virtualization.

---

## ⏱️ CATEGORY 5: DOWNTIME VECTORS

### DOWNTIME #1 — No Rate Limiting on Any Endpoint
**File:** `middleware.ts`

A single malicious actor can:
- Hit `/api/chat` 1000 times/second → exhausts Gemini API quota → all AI features stop
- Hit `/api/dashboard` 1000 times/second → exhausts DB pool → entire app goes down
- Hit `/api/upload` repeatedly with 10MB files → exhausts Supabase storage

---

### DOWNTIME #2 — No Circuit Breaker on Gemini API
**Files:** `app/api/chat/route.ts`, `app/api/admin/analytics/burnout/route.ts`, `app/api/onboarding/agent/route.ts`

If Gemini API goes down, every request waits the full 15-20s timeout. With 50K users, this means thousands of hanging requests → pool exhaustion → cascade failure. No circuit breaker to fast-fail after N consecutive timeouts.

---

### DOWNTIME #3 — Unbounded GET Endpoints
**14+ routes** return ALL records with no `take` limit:

| Route | Table | At 50K users with data |
|-------|-------|----------------------|
| `/api/attendance` | Attendance | 50K × 365 = 18M rows |
| `/api/leaves` | Leave | 50K × 10 = 500K rows |
| `/api/payroll` | Payroll | 50K × 12 = 600K rows |
| `/api/pf` | ProvidentFund | 50K rows |
| `/api/performance` | PerformanceReview | 50K × 2 = 100K rows |
| `/api/resignations` | Resignation | Variable |
| `/api/events` | CalendarEvent | Variable |
| `/api/announcements` | Announcement | Variable |
| `/api/documents` | Document | 50K × 5 = 250K rows |
| `/api/tickets` | Ticket | 50K × 3 = 150K rows |
| `/api/training` | Training | Variable |
| `/api/recruitment` | Candidate | Variable |
| `/api/organization` | Employee + Department | 50K rows + PII |
| `/api/dashboard/logins` | User | Bounded (take: 10/20) ✅ |

**Result:** A single GET to `/api/attendance` returns an 18 million row JSON response → **~5GB response** → server OOM → crash.

---

## 🏁 CATEGORY 6: RACE CONDITIONS

### RACE #1 — Leave Approval: No Optimistic Locking
**File:** `app/api/leaves/route.ts:86-89`

```typescript
const leave = await prisma.leave.update({
    where: { id: body.id },
    data: { status: body.status },  // No check if already approved/rejected
})
```

Two admins can approve → reject the same leave simultaneously. No `where: { status: "PENDING" }` guard.

---

### RACE #2 — Ticket Status: No State Machine
**File:** `app/api/tickets/route.ts`

Tickets can be moved from any status to any status. No valid transition checks (e.g., CLOSED → OPEN should be prevented).

---

## FINAL SEVERITY MATRIX

| # | Issue | Category | Impact at 50K Users |
|---|-------|----------|-------------------|
| **K1** | pg Pool 3 × 100 instances = 300 connections | 💀 Crash | ALL requests fail |
| **K2** | Dashboard: 9 queries + 50K salary rows in memory | 💀 Crash | Admin dashboard kills server |
| **K3** | Time-tracker dashboard: unbounded employee dump | 💀 Crash | Admin page causes OOM |
| **K4** | Heartbeat: 833 writes/sec to ActivitySnapshot | 💀 Crash | DB overloaded in minutes |
| **K5** | Organization endpoint leaks salary, Aadhaar, PAN | 🔓 Data leak | Full PII exposure |
| **K6** | Leaves `include: employee: true` leaks salary/bank | 🔓 Data leak | PII in every leave response |
| **K7** | 14 endpoints return unbounded results | 💀 Crash | Single GET = server OOM |
| **K8** | Leave double-submit race | 🧩 Corruption | Duplicate leave records |
| **K9** | Org chart: no cycle validation | 🧩 Corruption | Infinite loop in org tree |
| **K10** | CSV import: no duplicate detection | 🧩 Corruption | Double payroll records |
| **K11** | No rate limiting | ⏱️ Downtime | Single attacker kills system |
| **K12** | No circuit breaker on Gemini | ⏱️ Downtime | AI outage cascades to all |
| **K13** | Leave approval: no optimistic locking | 🏁 Race | Conflicting approve/reject |
