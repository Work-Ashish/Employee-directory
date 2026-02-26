# 🚨 PRE-PRODUCTION LAUNCH AUDIT

> **Auditor:** Principal Engineer
> **Date:** 2026-02-25
> **Assumption:** 10,000+ users going live tomorrow.
> **Verdict: DO NOT SHIP.** There are 6 data-corruption risks, 4 scale-breaking issues, and 3 silent failure risks that must be fixed first.

---

## FINDING 1 — CRITICAL: Check-In Race Condition (Data Corruption)

**File:** `app/api/time-tracker/check-in/route.ts` **Lines 12–17**

```typescript
// Line 12-14: READ to check if session exists
const existing = await prisma.timeSession.findFirst({
    where: { employeeId: employee.id, status: "ACTIVE" }
})
// Line 15-17: IF no session, CREATE one
if (existing) {
    return NextResponse.json({ error: "Already checked in" }, { status: 409 })
}
// Line 22: CREATE new session
const session = await prisma.timeSession.create({ ... })
```

**Problem:** Classic TOCTOU (Time-Of-Check to Time-Of-Use). If an employee double-clicks "Check In" or if the request is retried, two concurrent requests both pass the `findFirst` check (both see `null`), and both create new sessions. Result: **employee has 2 simultaneously active sessions → corrupted attendance data.**

With 10,000 users checking in at 9 AM, this WILL happen.

**Fix:**
```typescript
// Use a unique constraint + upsert, or Prisma's createMany with skipDuplicates
// Better: Add a unique constraint in schema:
// @@unique([employeeId, status], name: "one_active_session")

// Then catch the unique violation:
try {
    const session = await prisma.timeSession.create({
        data: { employeeId: employee.id, checkIn: now, status: "ACTIVE", ... }
    })
    return NextResponse.json(session, { status: 201 })
} catch (e: any) {
    if (e.code === "P2002") {
        return NextResponse.json({ error: "Already checked in" }, { status: 409 })
    }
    throw e
}
```

---

## FINDING 2 — CRITICAL: Ticket Code Race Condition (Data Corruption, 2 locations)

**File 1:** `app/api/tickets/route.ts` **Lines 41–42**
```typescript
const count = await prisma.ticket.count()
const ticketCode = `TKT-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`
```

**File 2:** `app/api/chat/route.ts` **Lines 99–104**
```typescript
const ticketCount = await prisma.ticket.count({
    where: { ticketCode: { startsWith: `TKT-${currentYear}` } }
})
const ticketCode = `TKT-${currentYear}-${(ticketCount + 1).toString().padStart(3, '0')}`
```

**Problem:** Two concurrent requests both call `count()`, both get `42`, both generate `TKT-2026-043`. The second `create()` crashes with a unique constraint violation on `ticketCode`. If the chatbot creates a ticket while an employee does it from the UI simultaneously → **P2002 crash, silent failure in the chatbot** (returns `Failed to create ticket` message to user).

**Fix:**
```typescript
// Use cuid() for the code, or use a DB sequence:
import { createId } from "@paralleldrive/cuid2"
const ticketCode = `TKT-${createId().slice(0, 8).toUpperCase()}`
```

---

## FINDING 3 — CRITICAL: Check-Out Breaks Not In Transaction (Data Corruption)

**File:** `app/api/time-tracker/check-out/route.ts` **Lines 23–56**

```typescript
// Lines 24-29: Close open breaks in a LOOP (individual updates)
for (const b of session.breaks) {
    await prisma.breakEntry.update({ where: { id: b.id }, data: { endedAt: now } })
}
// Line 33: Re-fetch ALL breaks for calculation
const allBreaks = await prisma.breakEntry.findMany({ where: { sessionId: session.id } })
// Line 47: Update the session
const updated = await prisma.timeSession.update({ ... })
// Line 72: Update attendance
await prisma.attendance.update({ ... })
```

**Problem:** 4 separate database operations (close breaks, fetch breaks, update session, update attendance) are NOT wrapped in a `$transaction`. If the server crashes or the request times out after closing breaks but before updating the session, the session status remains `ACTIVE` forever with closed breaks — **orphaned session, corrupted work hours.**

**Fix:**
```typescript
const updated = await prisma.$transaction(async (tx) => {
    // Close open breaks
    await tx.breakEntry.updateMany({
        where: { sessionId: session.id, endedAt: null },
        data: { endedAt: now }
    })
    // Calculate totals from within the transaction
    const allBreaks = await tx.breakEntry.findMany({ where: { sessionId: session.id } })
    // ... calculate totalBreakSec, totalWorkSec ...
    const result = await tx.timeSession.update({ where: { id: session.id }, data: { ... } })
    // Update attendance
    if (attendance) {
        await tx.attendance.update({ where: { id: attendance.id }, data: { ... } })
    }
    return result
})
```

---

## FINDING 4 — CRITICAL: Burnout Endpoint Is a Memory Bomb

**File:** `app/api/admin/analytics/burnout/route.ts` **Lines 24–34**

```typescript
const employees = await prisma.employee.findMany({
    include: {
        attendanceRecords: { where: { date: { gte: sevenDaysAgo } } },
        timeSessions: {
            where: { createdAt: { gte: sevenDaysAgo } },
            include: { activities: true, snapshots: true }  // <-- EXPLOSION
        }
    }
})
```

**Math at scale:**
- 10,000 employees × 5 sessions/week × 50 activities/session = **2,500,000 ActivityLog rows loaded into memory**
- Each ActivityLog has ~7 fields × ~50 bytes = **~125 MB of raw data in a single request**
- Plus snapshots: 10,000 × 5 × 480 snapshots/day × 7 = **168,000,000 rows** — instant OOM

**Fix:**
```typescript
// Don't load raw data. Use Prisma aggregations or raw SQL:
const stats = await prisma.$queryRaw`
    SELECT e.id, e."firstName", e."lastName",
           COALESCE(SUM(a."workHours"), 0) as "totalWorkHours",
           COUNT(DISTINCT ts.id) as "sessionCount",
           COALESCE(SUM(ts."totalIdle"), 0) as "totalIdleSeconds"
    FROM "Employee" e
    LEFT JOIN "Attendance" a ON a."employeeId" = e.id AND a.date >= ${sevenDaysAgo}
    LEFT JOIN "TimeSession" ts ON ts."employeeId" = e.id AND ts."createdAt" >= ${sevenDaysAgo}
    GROUP BY e.id, e."firstName", e."lastName"
`
```

---

## FINDING 5 — HIGH: Database Pool Has No Limits

**File:** `lib/prisma.ts` **Line 20**

```typescript
const pool = new Pool({ connectionString })
```

**Problem:** `pg.Pool` defaults to `max: 10` connections. With 10,000 concurrent users hitting API routes, serverless functions will spin up hundreds of instances, each creating a pool of 10 connections. Your Supabase database likely has a **max of 60 direct connections** (free tier) or 200 (pro). You'll exhaust the connection pool in seconds → **every request fails with `ConnectionError`.**

Your `DATABASE_URL` already has `?pgbouncer=true`, which helps, but the Pool on the Node.js side has no limits.

**Fix:**
```typescript
const pool = new Pool({
    connectionString,
    max: 3,          // Limit connections per serverless instance
    idleTimeoutMillis: 10000,  // Release idle connections quickly
    connectionTimeoutMillis: 5000, // Fail fast if pool is exhausted
})
```

---

## FINDING 6 — HIGH: GET /api/employees Returns ALL 10,000 Employees

**File:** `app/api/employees/route.ts` **Lines 14–20**

```typescript
const employees = await prisma.employee.findMany({
    include: { department: true, user: { select: { ... } } },
    orderBy: { createdAt: "desc" },
})
return NextResponse.json(employees)
```

**Problem:** With 10,000 employees, each having 100+ fields plus a joined department and user record, this response is **~5–10 MB of JSON**. Every time someone opens the admin employee list, the server serializes 10K records and the client parses 10 MB. Page load takes 10+ seconds.

**Fix:**
```typescript
const { searchParams } = new URL(req.url)
const page = parseInt(searchParams.get("page") || "1")
const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
const skip = (page - 1) * limit

const [employees, total] = await prisma.$transaction([
    prisma.employee.findMany({
        include: { department: true, user: { select: { lastLoginAt: true, mustChangePassword: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
    }),
    prisma.employee.count(),
])

return NextResponse.json({ data: employees, total, page, limit })
```

---

## FINDING 7 — HIGH: Tickets GET Still Has No Auth

**File:** `app/api/tickets/route.ts` **Line 8**

```typescript
// Auth check disabled for dev – returns all records
```

**This comment is still there.** The middleware handles global auth, so it's guarded at the edge, but the endpoint itself has no role check. Any authenticated employee can see ALL tickets (including confidential HR tickets filed by other employees).

**Fix:** Add employee-scoped filtering:
```typescript
const session = await auth()
const employee = await getSessionEmployee()
const where: Record<string, unknown> = {}

// Non-admins can only see their own tickets
if (session?.user?.role !== "ADMIN") {
    if (employee) where.employeeId = employee.id
}
```

---

## FINDING 8 — HIGH: Dashboard Polling Creates Connection Storm

**Files:**
- `components/dashboard/AdminDashboard.tsx` line 69: `setInterval(() => { ... }, 10000)`
- `components/dashboard/EmployeeDashboard.tsx` line 37: `setInterval(() => { ... }, 10000)`
- `components/dashboard/TimeTracker.tsx` line 80, 109, 135: **THREE** `setInterval` calls

**Problem:** Each browser tab creates 3–5 stacking intervals. With 1,000 users keeping the dashboard open:
- 1,000 × 1 request/10 sec = **100 requests/second** just from dashboard polling
- TimeTracker alone adds 3 intervals per user = **300 req/sec from the timer component**
- Total: **400+ req/sec of polling traffic**

**Fix:** Use React Query / SWR with `staleTime` and `refetchInterval`, or at minimum debounce and use `visibilitychange` to pause polling when the tab is hidden:
```typescript
useEffect(() => {
    const handleVisibility = () => {
        if (document.hidden) clearInterval(intervalRef.current)
        else intervalRef.current = setInterval(fetchData, 30000) // 30s, not 10s
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
}, [])
```

---

## FINDING 9 — HIGH: Chat Endpoint Returns 200 On Errors

**File:** `app/api/chat/route.ts` **Lines 129–132**

```typescript
return NextResponse.json(
    { reply: "Something went wrong. Please try again." },
    { status: 200 }  // <-- WRONG
)
```

**Problem:** The catch block returns HTTP 200. Monitoring, error dashboards, and client error handlers will all treat this as a success. You'll have zero visibility into Gemini API failures, rate limits, or token quota exhaustion in production.

**Fix:** Return 500:
```typescript
{ status: 500 }
```

---

## FINDING 10 — HIGH: Temp Password Logged in Plaintext

**File:** `app/api/employees/route.ts` **Line 91**

```typescript
console.log(`[NEW_EMPLOYEE] ${result.username} created. Temp password: ${employeeCode}@${new Date().getFullYear()}`)
```

**Problem:** In production, `console.log` goes to Vercel's log viewer, CloudWatch, or whichever log aggregator you use. **Every ops engineer, DevOps person, and anyone with log access can read every user's temporary password.** This is a regulatory violation (GDPR, SOC 2).

**Fix:**
```typescript
console.log(`[NEW_EMPLOYEE] ${result.username} created. Temp password set. Employee must change on first login.`)
```

---

## FINDING 11 — MEDIUM: bcrypt Cost 12 per Request

**File:** `lib/auth.ts` **Line 42**

```typescript
const isPasswordValid = await bcrypt.compare(credentials.password as string, user.hashedPassword)
```

**Also line 78:** `await bcrypt.hash(randomPassword, 12)` inside the Google OAuth `signIn` callback.

**Problem:** `bcrypt.compare()` with cost 12 takes ~250ms on modern hardware. In the auth flow, this blocks the event loop for 250ms per login. During a 9 AM login storm with 1,000 employees logging in within 5 minutes, you get 200 login requests per minute, each blocking for 250ms. The Node.js event loop becomes saturated and **all other requests stall.**

**Fix:** Use `bcrypt.compare()` (which is already async in bcryptjs — acceptable) but consider reducing cost to 10 for production, or switch to `argon2` which is multithreaded:
```typescript
const hashedPassword = await bcrypt.hash(tempPassword, 10) // cost 10 instead of 12
```

---

## FINDING 12 — MEDIUM: `require()` Inside Auth Callback

**File:** `lib/auth.ts` **Lines 76–77**

```typescript
const randomPassword = require("crypto").randomBytes(32).toString("hex")
const bcrypt = require("bcryptjs")
```

**Problem:** `require()` is synchronous and called inside an async callback. While Node.js caches modules after first load, this is an anti-pattern in ESM/Next.js. It also shadows the top-level `bcrypt` import.

**Fix:** Use top-level imports:
```typescript
// At the top of the file (line 5):
import crypto from "crypto"
// already imported: import bcrypt from "bcryptjs"

// Line 76-78:
const randomPassword = crypto.randomBytes(32).toString("hex")
const hashedRandom = await bcrypt.hash(randomPassword, 12)
```

---

## FINDING 13 — MEDIUM: Upload Has No File Size or Type Validation

**File:** `app/api/upload/route.ts` **Lines 12–28**

```typescript
const file = formData.get("file") as File
// ... no size check ...
// ... no MIME type validation ...
const fileExt = file.name.split(".").pop()  // User-controlled extension!
```

**Problem:** A malicious user can upload a 500 MB file, or upload an `.exe` disguised as a `.pdf`. The extension is derived from the user-provided filename — no server-side MIME type validation.

**Fix:**
```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 413 })
}

const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 415 })
}
```

---

## FINDING 14 — MEDIUM: No Request Timeout on AI Endpoints

**Files:** `app/api/chat/route.ts`, `app/api/admin/analytics/burnout/route.ts`, `app/api/onboarding/agent/route.ts`

**Problem:** Gemini API calls can take 30+ seconds. If the model is slow or the API is degraded, the request hangs indefinitely. Vercel's serverless function timeout is 10 seconds on the free tier, 60 on Pro. There's no `AbortSignal` or timeout wrapper.

**Fix:**
```typescript
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 15000) // 15s max

try {
    const { text } = await generateText({
        model: google("gemini-2.0-flash"),
        system: systemInstruction,
        messages,
        abortSignal: controller.signal,
    } as any)
} finally {
    clearTimeout(timeout)
}
```

---

## FINDING 15 — MEDIUM: Error Message Leaks Internal Details

**File:** `app/api/employees/route.ts` **Line 124**

```typescript
return NextResponse.json(
    { error: "Internal Server Error", details: error.message },
    { status: 500 }
)
```

**Problem:** `error.message` from Prisma includes database column names, constraint names, and sometimes partial SQL. This leaks your schema to attackers.

**Fix:**
```typescript
return NextResponse.json(
    { error: "Internal Server Error" },
    { status: 500 }
)
// Log the full error server-side only:
console.error("[EMPLOYEES_POST] FULL ERROR:", error)
```

---

## LAUNCH VERDICT

| Category | Finding Count | Severity |
|----------|---------------|----------|
| **Data Corruption Risk** | 3 (check-in TOCTOU, check-out no-tx, ticket race) | 🔴 BLOCKER |
| **Scale-Breaking** | 4 (burnout OOM, no pagination, poll storm, pool exhaustion) | 🔴 BLOCKER |
| **Silent Failure** | 2 (chat 200-on-error, no AI timeout) | 🟡 HIGH |
| **Security** | 3 (temp password logged, no upload limits, error detail leaks) | 🟡 HIGH |
| **Code Quality** | 3 (require() in callback, tickets auth comment, bcrypt cost) | 🟡 MEDIUM |

### Minimum Fixes Before Launch (in priority order):
1. **Wrap check-out in `$transaction`** (30 min fix, prevents data corruption)
2. **Add `max: 3` to pg Pool** (1 line fix, prevents total outage)
3. **Add pagination to `/api/employees`** (30 min fix)
4. **Fix ticket code to use cuid** (15 min fix, prevents P2002 crashes)
5. **Fix chat route to return 500 on error** (1 line fix)
6. **Add file size/type validation to upload** (10 min fix)
7. **Remove plaintext password from log** (1 line fix)
8. **Remove `details: error.message` from responses** (5 min fix)
