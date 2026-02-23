# API Documentation – EMS Pro

All API routes are located under `/api/` and follow RESTful conventions.  
Authentication is enforced via NextAuth.js JWT sessions. Admin-only routes return `403 Forbidden` for non-admin users.

---

## Authentication

### `POST /api/auth/[...nextauth]`
Handled by NextAuth.js. Supports credential-based login.

| Field | Type | Required |
|-------|------|----------|
| `email` | string | ✅ |
| `password` | string | ✅ |

---

## Employees

### `GET /api/employees`
List all employees with their departments.  
**Auth**: Any authenticated user.

### `POST /api/employees`
Create a new employee.  
**Auth**: Admin only.

| Field | Type | Required |
|-------|------|----------|
| `employeeCode` | string | ✅ |
| `firstName` | string | ✅ |
| `lastName` | string | ✅ |
| `email` | string | ✅ |
| `phone` | string | |
| `designation` | string | ✅ |
| `departmentId` | string | ✅ |
| `dateOfJoining` | ISO date | ✅ |
| `salary` | number | ✅ |
| `status` | `ACTIVE` \| `ON_LEAVE` \| `RESIGNED` \| `TERMINATED` | |
| `address` | string | |

### `GET /api/employees/[id]`
Get a single employee with assets, documents, leaves, and resignations.  
**Auth**: Any authenticated user.

### `PUT /api/employees/[id]`
Update an employee.  
**Auth**: Admin only. Body: partial employee fields.

### `DELETE /api/employees/[id]`
Delete an employee.  
**Auth**: Admin only.

---

## Departments

### `GET /api/departments`
List all departments with employee counts.  
**Auth**: Any authenticated user.

### `POST /api/departments`
Create a department.  
**Auth**: Admin only.

| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ |
| `color` | string | |

---

## Attendance

### `GET /api/attendance`
List attendance records. Filtered by `?date=` and `?employeeId=`.  
**Auth**: Employees see only their own records.

### `POST /api/attendance`
Create an attendance record (check-in).  
**Auth**: Any authenticated user.

| Field | Type | Required |
|-------|------|----------|
| `date` | ISO date | ✅ |
| `checkIn` | ISO datetime | |
| `checkOut` | ISO datetime | |
| `workHours` | number | |
| `status` | `PRESENT` \| `ABSENT` \| `HALF_DAY` \| `ON_LEAVE` \| `WEEKEND` | |
| `employeeId` | string | ✅ |

---

## Payroll

### `GET /api/payroll`
List payroll records. Filtered by `?month=` and `?employeeId=`.  
**Auth**: Employees see only their own records.

### `POST /api/payroll`
Create a payroll entry.  
**Auth**: Admin only.

| Field | Type | Required |
|-------|------|----------|
| `month` | string (e.g. "Jan 2026") | ✅ |
| `basicSalary` | number | ✅ |
| `allowances` | number | |
| `pfDeduction` | number | |
| `tax` | number | |
| `otherDed` | number | |
| `netSalary` | number | ✅ |
| `status` | `PENDING` \| `PROCESSED` \| `PAID` | |
| `employeeId` | string | ✅ |

---

## Provident Fund

### `GET /api/pf`
List PF records. Filtered by `?employeeId=`.  
**Auth**: Employees see only their own records.

### `POST /api/pf`
Create a PF contribution record.  
**Auth**: Admin only.

| Field | Type | Required |
|-------|------|----------|
| `month` | string | ✅ |
| `accountNumber` | string | ✅ |
| `basicSalary` | number | ✅ |
| `employeeContribution` | number | ✅ |
| `employerContribution` | number | ✅ |
| `totalContribution` | number | ✅ |
| `employeeId` | string | ✅ |

---

## Performance

### `GET /api/performance`
List performance reviews.  
**Auth**: Employees see only their own reviews.

### `POST /api/performance`
Create a performance review.  
**Auth**: Admin only.

| Field | Type | Required |
|-------|------|----------|
| `rating` | number (1–5) | ✅ |
| `progress` | integer (0–100) | |
| `comments` | string | |
| `reviewDate` | ISO date | |
| `status` | `PENDING` \| `COMPLETED` \| `EXCELLENT` \| `GOOD` \| `NEEDS_IMPROVEMENT` | |
| `employeeId` | string | ✅ |

---

## Training

### `GET /api/training`
List all training courses with enrollments.  
**Auth**: Any authenticated user.

### `POST /api/training`
Create a training course.  
**Auth**: Admin only.

| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ |
| `type` | `TECHNICAL` \| `COMPLIANCE` \| `SECURITY` \| `SOFT_SKILLS` \| `LEADERSHIP` | ✅ |
| `description` | string | |
| `status` | `UPCOMING` \| `IN_PROGRESS` \| `COMPLETED` | |
| `progress` | integer | |
| `dueDate` | ISO date | |
| `participants` | integer | |
| `videoUrl` | string | |

### `POST /api/training/assign`
Assign training to one or all employees.  
**Auth**: Admin only.

| Field | Type | Required |
|-------|------|----------|
| `trainingId` | string | ✅ |
| `employeeIds` | array of strings \| "ALL" | ✅ |

---

## Leaves

### `GET /api/leaves`
List leave requests. Filtered by `?status=` and `?employeeId=`.  
**Auth**: Employees see only their own leaves.

### `POST /api/leaves`
Submit a leave request.  
**Auth**: Any authenticated user.

| Field | Type | Required |
|-------|------|----------|
| `type` | `CASUAL` \| `SICK` \| `EARNED` \| `MATERNITY` \| `PATERNITY` \| `UNPAID` | ✅ |
| `startDate` | ISO date | ✅ |
| `endDate` | ISO date | ✅ |
| `reason` | string | |
| `employeeId` | string | ✅ |

### `PUT /api/leaves`
Approve or reject a leave request.  
**Auth**: Admin only.

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✅ |
| `status` | `APPROVED` \| `REJECTED` | ✅ |

---

## Resignations

### `GET /api/resignations`
List resignations. Filtered by `?status=` and `?employeeId=`.  
**Auth**: Employees see only their own.

### `POST /api/resignations`
Submit a resignation.  
**Auth**: Any authenticated user.

| Field | Type | Required |
|-------|------|----------|
| `reason` | string | ✅ |
| `lastDay` | ISO date | ✅ |
| `employeeId` | string | ✅ |

### `PUT /api/resignations`
Update resignation status.  
**Auth**: Admin only.

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✅ |
| `status` | `UNDER_REVIEW` \| `NOTICE_PERIOD` \| `PROCESSED` | ✅ |

---

## Assets

### `GET /api/assets`
List all assets with assigned employees.  
**Auth**: Any authenticated user.

### `POST /api/assets`
Create an asset.  
**Auth**: Admin only.

| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ |
| `type` | `HARDWARE` \| `SOFTWARE` \| `ACCESSORY` | ✅ |
| `serialNumber` | string | ✅ |
| `status` | `AVAILABLE` \| `ASSIGNED` \| `MAINTENANCE` \| `RETIRED` | |
| `purchaseDate` | ISO date | ✅ |
| `value` | number | ✅ |
| `image` | string (URL) | |
| `assignedToId` | string | |

---

## Documents

### `GET /api/documents`
List documents. Employees see only public docs + their own.  
**Auth**: Role-filtered automatically.

### `POST /api/documents`
Upload document metadata.  
**Auth**: Admin only.

| Field | Type | Required |
|-------|------|----------|
| `title` | string | ✅ |
| `category` | `POLICY` \| `CONTRACT` \| `PAYSLIP` \| `TAX` \| `IDENTIFICATION` | ✅ |
| `url` | string | ✅ |
| `size` | string | |
| `isPublic` | boolean | |
| `employeeId` | string | |

---

## Announcements

### `GET /api/announcements`
List announcements (pinned first, then newest).  
**Auth**: Any authenticated user.

### `POST /api/announcements`
Create an announcement.  
**Auth**: Admin only.

| Field | Type | Required |
|-------|------|----------|
| `title` | string | ✅ |
| `content` | string | ✅ |
| `author` | string | |
| `category` | `EVENT` \| `POLICY` \| `MEETING` \| `SYSTEM` \| `GENERAL` | ✅ |
| `priority` | `LOW` \| `MEDIUM` \| `HIGH` | |
| `isPinned` | boolean | |

### `PUT /api/announcements`
Update an existing announcement.  
**Auth**: Admin only.

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✅ |
| `title` | string | |
| `content` | string | |
| `category` | enum | |
| `priority` | enum | |
| `isPinned` | boolean | |

### `DELETE /api/announcements?id=<id>`
Delete an announcement.  
**Auth**: Admin only.

---

## Help Desk (Tickets)

### `GET /api/tickets`
List tickets. Filtered by `?status=` and `?employeeId=`.  
**Auth**: Employees see only their own tickets.

### `POST /api/tickets`
Create a support ticket. Ticket code is auto-generated (`TKT-YYYY-NNN`).  
**Auth**: Any authenticated user.

| Field | Type | Required |
|-------|------|----------|
| `subject` | string | ✅ |
| `description` | string | |
| `category` | `IT` \| `HR` \| `FINANCE` \| `FACILITIES` \| `OTHER` | ✅ |
| `priority` | `LOW` \| `MEDIUM` \| `HIGH` \| `URGENT` | |
| `employeeId` | string | ✅ |

### `PUT /api/tickets`
Update ticket status/priority.  
**Auth**: Any authenticated user.

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✅ |
| `status` | `OPEN` \| `IN_PROGRESS` \| `RESOLVED` \| `CLOSED` | |
| `priority` | `LOW` \| `MEDIUM` \| `HIGH` \| `URGENT` | |

---

## Calendar Events

### `GET /api/events`
List all calendar events sorted by start date.  
**Auth**: Any authenticated user.

### `POST /api/events`
Create a calendar event.  
**Auth**: Admin only.

| Field | Type | Required |
|-------|------|----------|
| `title` | string | ✅ |
| `start` | ISO datetime | ✅ |
| `end` | ISO datetime | ✅ |
| `allDay` | boolean | |
| `type` | `HOLIDAY` \| `LEAVE` \| `BIRTHDAY` \| `EVENT` \| `MEETING` | |

### `DELETE /api/events?id=<id>`
Delete a calendar event.  
**Auth**: Admin only.

---

## Recruitment

### `GET /api/recruitment`
List all candidates. Filtered by `?stage=`.  
**Auth**: Admin only.

### `POST /api/recruitment`
Add a candidate.  
**Auth**: Admin only.

| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ |
| `email` | string | ✅ |
| `phone` | string | |
| `role` | string | ✅ |
| `stage` | `APPLICATION` \| `SCREENING` \| `INTERVIEW` \| `TECHNICAL_ROUND` \| `OFFER` \| `HIRED` \| `REJECTED` | |
| `status` | `NEW` \| `SCHEDULED` \| `EVALUATED` \| `PENDING` \| `ACCEPTED` \| `REJECTED` | |
| `interviewDate` | ISO datetime | |
| `notes` | string | |
| `departmentId` | string | |

### `PUT /api/recruitment`
Update candidate stage/status.  
**Auth**: Admin only.

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✅ |
| `stage` | enum (see above) | |
| `status` | enum (see above) | |
| `interviewDate` | ISO datetime | |
| `notes` | string | |

---

## AI Chatbot

### `POST /api/chat`
Send a message to the Gemini AI assistant.  
**Auth**: Any authenticated user.

| Field | Type | Required |
|-------|------|----------|
| `messages` | array of `{ role: string, content: string }` | ✅ |

---

## User Settings

### `GET /api/user/profile`
Fetch current user's profile details.  
**Auth**: Any authenticated user.

### `PUT /api/user/profile`
Update current user's profile settings.  
**Auth**: Any authenticated user.

| Field | Type | Required |
|-------|------|----------|
| `name` | string | |
| `bio` | string | |
| `accentColor` | string (hex) | |

### `PUT /api/user/password`
Update current user's password.  
**Auth**: Any authenticated user.

| Field | Type | Required |
|-------|------|----------|
| `currentPassword` | string | ✅ |
| `newPassword` | string | ✅ |

---

## Dashboard

### `GET /api/dashboard`
Unified dashboard metrics route. Returns data tailored to your role.  
**Auth**: Any authenticated user.

**Admin Response**: Stats (employees, payroll), Dept Split, Hiring Trend, Recent Hires.  
**Employee Response**: Stats (attendance, leave, training), Today's Schedule, Team Status.

---

## Organization

### `GET /api/organization`
Get the full organization hierarchy.  
**Auth**: Any authenticated user.

### `PUT /api/organization`
Update manager-employee relationships (drag-and-drop).  
**Auth**: Admin only.

| Field | Type | Required |
|-------|------|----------|
| `updates` | array of `{ id: string, managerId: string | null }` | ✅ |

---

## Error Responses

All endpoints return consistent error responses:

```json
{ "error": "Unauthorized" }     // 401 – Not logged in
{ "error": "Forbidden" }        // 403 – Insufficient permissions
{ "error": "Not found" }        // 404 – Resource not found
{ "error": "ID required" }      // 400 – Missing required parameter
{ "error": "Internal Server Error" }  // 500 – Server error
```
