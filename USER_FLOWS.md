# User Flows – EMS Pro

This document describes every user-facing flow in EMS Pro, organized by role and module.

---

## Table of Contents

- [1. Authentication](#1-authentication)
- [2. Dashboard](#2-dashboard)
- [3. Employee Management](#3-employee-management)
- [4. Attendance](#4-attendance)
- [5. Leave Management](#5-leave-management)
- [6. Payroll](#6-payroll)
- [7. Provident Fund](#7-provident-fund)
- [8. Performance Reviews](#8-performance-reviews)
- [9. Training & Development](#9-training--development)
- [10. Recruitment](#10-recruitment)
- [11. Assets](#11-assets)
- [12. Documents](#12-documents)
- [13. Announcements](#13-announcements)
- [14. Help Desk](#14-help-desk)
- [15. Calendar](#15-calendar)
- [16. Resignation](#16-resignation)
- [17. Organization Chart](#17-organization-chart)
- [18. Settings](#18-settings)
- [19. AI Assistant](#19-ai-assistant)
- [20. Command Palette](#20-command-palette)

---

## 1. Authentication

### 1.1 Login

```
User visits /login
  → Enters email and password
  → Clicks "Sign In"
  → System validates credentials against hashed password (bcryptjs)
  → On success → JWT session created → Redirect to /dashboard
  → On failure → Error message displayed
```

### 1.2 Session Management

```
Every page load:
  → AuthContext checks for active session
  → If valid → Load user data (name, email, role, avatar)
  → If expired/missing → Redirect to /login
```

### 1.3 Logout

```
User clicks profile menu → "Logout"
  → Session destroyed
  → Redirect to /login
```

---

## 2. Dashboard

### 2.1 Admin Dashboard

```
Admin lands on /dashboard
  → System fetches /api/dashboard
  → Sees live overview cards:
     • Total employees, Active employees, On Leave count
     • Monthly Payroll (live calculation from employee salaries)
  → Views Hiring Trend chart (Last 6 months hires)
  → Views Department Distribution (dynamic pie chart)
  → Views Recent Hires (interactive list)
  → Can filter charts by selecting specific departments
```

### 2.2 Employee Dashboard

```
Employee lands on /dashboard
  → System fetches /api/dashboard
  → Sees personal real-time summary:
     • Attendance Days (current month), Leave Balance (calculated)
     • Pending Training count, Next Review status
  → Time Tracker widget:
     • Click "Check In" → Timer starts (HH:MM:SS live)
     • Click "Break" → Timer pauses
     • Click "Check Out" → Timer stops → Work hours logged
  → Today's Schedule (Live events from calendar)
  → My Team Status (Real-time online/offline status of teammates)
```

---

## 3. Employee Management

### 3.1 View Employee List (Admin)

```
Admin navigates to /employees
  → DataTable loads all employees (GET /api/employees)
  → Columns: Name, Code, Department, Designation, Status, Actions
  → Can search by name or employee code
  → Can filter by department or status
  → Can sort any column
  → Pagination controls at bottom
```

### 3.2 Add New Employee (Admin)

```
Admin clicks "Add Employee" button
  → Modal opens with form:
     • First name, Last name, Email, Phone
     • Employee code, Designation
     • Department (dropdown), Date of joining, Salary
  → Fills all required fields → Clicks "Save"
  → POST /api/employees → Employee created
  → Table refreshes → New employee appears
  → Toast notification: "Employee added successfully"
```

### 3.3 Edit Employee (Admin)

```
Admin clicks ✏️ icon on employee row
  → Edit modal opens pre-filled with current data
  → Admin modifies fields → Clicks "Update"
  → PUT /api/employees/[id] → Employee updated
  → Table refreshes
```

### 3.4 Delete Employee (Admin)

```
Admin clicks 🗑️ icon on employee row
  → Confirmation dialog: "Are you sure?"
  → Admin confirms → DELETE /api/employees/[id]
  → Employee removed from table
```

### 3.5 View Employee Profile

```
User clicks on employee name
  → GET /api/employees/[id] (includes assets, documents, leaves)
  → Profile page shows:
     • Personal details, contact info
     • Department and designation
     • Assigned assets list
     • Document history
     • Leave history
```

### 3.6 Export Data (Admin)

```
Admin clicks "Export" dropdown
  → Selects "CSV" or "PDF"
  → CSV: Downloads .csv with all visible columns
  → PDF: Generates PDF report using jsPDF + jspdf-autotable
```

---

## 4. Attendance

### 4.1 Admin — View All Attendance

```
Admin navigates to /attendance
  → AdminAttendanceView loads
  → Summary cards: Present today, Absent, Half-day, Total work hours
  → Table: Employee name, Date, Check-in, Check-out, Work hours, Status
  → Can filter by date (date picker) or by employee
  → Attendance policy section displayed below
```

### 4.2 Employee — View Own Attendance

```
Employee navigates to /attendance
  → EmployeeAttendanceView loads
  → Shows personal attendance history (GET /api/attendance?employeeId=self)
  → Summary: Days present (month), Average work hours
  → Calendar heatmap showing attendance pattern
```

### 4.3 Check-In / Check-Out

```
Employee uses Time Tracker on dashboard
  → Click "Check In":
     • POST /api/attendance → Record created with checkIn timestamp
     • Live timer starts
  → Click "Check Out":
     • PUT updates record with checkOut timestamp and calculated workHours
     • Timer stops
```

---

## 5. Leave Management

### 5.1 Employee — Apply for Leave

```
Employee navigates to /leave
  → EmployeeLeaveView shows leave balance:
     • Casual: X/12, Sick: X/10, Earned: X/15
  → Clicks "Apply Leave"
  → Form: Leave type (dropdown), Start date, End date, Reason
  → Submits → POST /api/leaves → Status set to PENDING
  → Leave appears in "My Requests" table with "Pending" badge
```

### 5.2 Admin — View & Manage Leave Requests

```
Admin navigates to /leave
  → AdminLeaveView loads all requests (GET /api/leaves)
  → Tabs: Pending | Approved | Rejected | All
  → Table: Employee, Type, Dates, Reason, Status, Actions
  → For "Pending" requests:
     • Click ✅ "Approve" → PUT /api/leaves → Status → APPROVED
     • Click ❌ "Reject" → PUT /api/leaves → Status → REJECTED
  → Toast notification sent
```

### 5.3 Leave Calendar Integration

```
When leave is approved:
  → Appears on Team Calendar (/calendar) as a leave event
  → Visible to all users
```

---

## 6. Payroll

### 6.1 Admin — View Payroll Records

```
Admin navigates to /payroll
  → AdminPayrollView loads
  → Summary cards: Total payroll, Average salary, Pending processing, Paid this month
  → Table: Employee, Month, Basic, Allowances, PF, Tax, Net Salary, Status
  → Can filter by month or search by employee name
  → Click "Download Payslip" → Generates PDF for selected employee
```

### 6.2 Admin — Process Payroll

```
Admin clicks "Run Payroll" / adds entry
  → Form: Select employee, Month, Basic salary, Allowances, Deductions
  → Net salary auto-calculated: Basic + Allowances – PF – Tax – Other
  → Submit → POST /api/payroll → Status: PENDING
  → Admin can then mark as PROCESSED → PAID
```

### 6.3 Employee — View Own Payslips

```
Employee navigates to /payroll
  → EmployeePayrollView loads (GET /api/payroll?employeeId=self)
  → Shows salary history table
  → Breakdown per month: Basic, Allowances, Deductions, Net
  → Can download individual payslip as PDF
```

---

## 7. Provident Fund

### 7.1 Admin — Manage PF Records

```
Admin navigates to /pf
  → AdminPFView shows overall PF statistics:
     • Total PF pool, Active accounts, Monthly contribution average
  → Table: Employee, Account No., Basic, Employee Contrib, Employer Contrib, Total, Status
  → Can add new PF records → POST /api/pf
```

### 7.2 Employee — View PF Statement

```
Employee navigates to /pf
  → EmployeePFView loads (GET /api/pf?employeeId=self)
  → Shows PF account number and contribution history
  → Monthly breakdown: Employee share (12%), Employer share (12%), Total
  → Running total displayed
```

---

## 8. Performance Reviews

### 8.1 Admin — Conduct Reviews

```
Admin navigates to /performance
  → AdminPerformanceView shows:
     • Average score, Top performers count, Pending reviews, Goal completion rate
  → Table: Employee, Department, Rating (★), Progress (%), Last review date, Status
  → Click "Add Review" → Form:
     • Select employee, Rating (1–5), Progress %, Comments
     • Submit → POST /api/performance
  → Review appears in table
```

### 8.2 Employee — View Own Performance

```
Employee navigates to /performance
  → EmployeePerformanceView loads (GET /api/performance?employeeId=self)
  → Shows personal review history
  → Current rating with star visualization
  → Goal progress bar
  → Manager comments from most recent review
```

---

## 9. Training & Development

### 9.1 Admin — Manage Training Courses

```
Admin navigates to /training
  → AdminTrainingView shows live metrics:
     • Active courses, Completion rate, Average Score
  → Top Performers / Rewards Center populated from real test scores
  → Table: Course name, Type, Status, Progress, Due date, Participants
  → Click "Add Course" → Form:
     • Name, Type, Description, Due date, Video URL (YouTube/Vimeo)
  → Assign to: Select specific employees or "Assign to All"
  → Submit → POST /api/training
```

### 9.2 Employee — View Assigned Training

```
Employee navigates to /training
  → EmployeeTrainingView loads
  → Sees assigned courses with real progress bars
  → Click on "Start Course" → Opens Course Hub
  → Can watch training videos via embedded player
  → Progress updates automatically upon completion
```

---

## 10. Recruitment

### 10.1 Admin — Candidate Pipeline

```
Admin navigates to /recruitment
  → Page shows:
     • Job statistics: Active openings, Total candidates, Interviews scheduled
     • Kanban board with stages:
       Application → Screening → Interview → Technical Round → Offer → Hired
  → Each card shows: Candidate name, Role applied for, Status badge
```

### 10.2 Admin — Add Candidate

```
Admin clicks "Add Candidate"
  → Form: Name, Email, Phone, Role, Department, Stage
  → Submit → POST /api/recruitment
  → Candidate card appears in the appropriate stage column
```

### 10.3 Admin — Move Candidate Through Stages

```
Admin drags candidate card to next stage (or uses edit)
  → PUT /api/recruitment → stage updated
  → Card moves to new column
  → If moved to "Hired" → Can trigger employee creation flow
  → If moved to "Rejected" → Card marked with rejection badge
```

---

## 11. Assets

### 11.1 Admin — Manage Assets

```
Admin navigates to /assets (or asset section in employee management)
  → Asset list loads (GET /api/assets)
  → Table: Asset name, Type, Serial No., Status, Assigned to, Purchase date, Value
  → Color-coded status: Available (green), Assigned (blue), Maintenance (yellow), Retired (gray)
```

### 11.2 Admin — Add Asset

```
Admin clicks "Add Asset"
  → Form: Name, Type (Hardware/Software/Accessory), Serial number, Purchase date, Value
  → Optional: Assign to employee (dropdown), Upload image
  → Submit → POST /api/assets
```

### 11.3 Admin — Assign / Reassign Asset

```
Admin edits an asset
  → Selects "Assigned To" → Picks employee from dropdown
  → Status auto-changes to "Assigned"
  → Asset appears in the employee's profile under "Assigned Assets"
```

---

## 12. Documents

### 12.1 Admin — Upload Documents

```
Admin navigates to /documents (or documents section)
  → Document list loads (GET /api/documents)
  → Click "Upload Document"
  → Form: Title, Category (Policy/Contract/Payslip/Tax/Identification)
  → Select file URL, Set public/private, Assign to employee (optional)
  → Submit → POST /api/documents
```

### 12.2 Employee — View Documents

```
Employee views documents
  → GET /api/documents → Sees:
     • Public documents (company policies, handbooks)
     • Own private documents (payslips, contracts, tax forms)
  → Can download/view any visible document
```

---

## 13. Announcements

### 13.1 Admin — Create & Update Announcements

```
Admin navigates to /announcements
  → Views existing announcements (pinned/recent)
  → "New Announcement" opens a modal form:
     • Title, Content, Category, Priority, Pin toggle
  → "Edit" (pencil icon) allows updating existing announcements
  → Submit → POST/PUT /api/announcements
  → Google Calendar widget on sidebar shows live organization events
```

### 13.2 Admin — Delete Announcement

```
Admin clicks 🗑️ on announcement
  → Confirmation dialog
  → Confirm → DELETE /api/announcements?id=<id>
  → Announcement removed
```

### 13.3 All Users — View Announcements

```
Any user navigates to /announcements
  → GET /api/announcements
  → Pinned announcements shown in highlighted section at top
  → Regular announcements listed below with badges:
     • Priority colors: High (red), Medium (yellow), Low (green)
     • Category tags
  → Upcoming holidays section shown on sidebar
```

---

## 14. Help Desk

### 14.1 Employee — Create Support Ticket

```
Employee navigates to /help-desk
  → Views own tickets (GET /api/tickets?employeeId=self)
  → Clicks "New Ticket"
  → Form: Subject, Description, Category (IT/HR/Finance/Facilities/Other)
  → Priority: Low/Medium/High/Urgent
  → Submit → POST /api/tickets
  → Ticket code auto-generated: TKT-2026-001
  → Ticket appears with "Open" status
```

### 14.2 Admin — Manage Tickets

```
Admin navigates to /help-desk
  → Views all tickets (GET /api/tickets)
  → Can filter by: Status (Open/In Progress/Resolved/Closed), Category
  → Table: Ticket code, Subject, Employee, Category, Priority, Status, Date
  → Click on ticket → View details
  → Update status: Open → In Progress → Resolved → Closed
  → PUT /api/tickets
```

### 14.3 Ticket Lifecycle

```
Created (OPEN)
  → Admin reviews → Sets to IN_PROGRESS
  → Issue resolved → Sets to RESOLVED
  → Employee confirms → Sets to CLOSED
```

---

## 15. Calendar

### 15.1 View Team Calendar

```
Any user navigates to /calendar
  → GET /api/events → Full calendar renders (react-big-calendar)
  → Events color-coded by type:
     • 🟢 Holiday (green)
     • 🔵 Leave (blue)
     • 🟡 Birthday (yellow)
     • 🟣 Event (purple)
     • 🔴 Meeting (red)
  → Month/Week/Day/Agenda views available
  → Click on event → View details popup
```

### 15.2 Admin — Add Calendar Event

```
Admin clicks on a date or "Add Event" button
  → Form: Title, Start date/time, End date/time, All-day toggle
  → Type: Holiday/Leave/Birthday/Event/Meeting
  → Submit → POST /api/events
  → Event appears on calendar
```

### 15.3 Admin — Remove Calendar Event

```
Admin clicks on event → "Delete"
  → Confirm → DELETE /api/events?id=<id>
  → Event removed from calendar
```

---

## 16. Resignation

### 16.1 Employee — Submit Resignation

```
Employee navigates to /resignation
  → Sees resignation form (if no active resignation)
  → Form: Reason for leaving, Preferred last working day
  → Submit → POST /api/resignations → Status: UNDER_REVIEW
  → Resignation appears in "My Resignation" section with status tracker
```

### 16.2 Admin — Process Resignations

```
Admin navigates to /resignation
  → Overview cards: Total resignations, Under review, Notice period, Processed
  → Reason breakdown chart (pie/bar)
  → Table: Employee, Department, Reason, Last day, Status, Actions
  → Status workflow:
     • UNDER_REVIEW → Click "Accept" → Status: NOTICE_PERIOD
     • NOTICE_PERIOD → (after last day) → Click "Mark Processed" → Status: PROCESSED
  → PUT /api/resignations with updated status
  → Employee status can be updated to RESIGNED
```

### 16.3 Resignation Timeline

```
Submitted (UNDER_REVIEW)
  → Admin reviews and accepts → NOTICE_PERIOD
  → Employee serves notice → Admin marks → PROCESSED
  → Employee record updated to RESIGNED status
```

---

## 17. Organization Chart

### 17.1 View Org Chart

```
Any user navigates to /organization
  → ReactFlow renders interactive hierarchy:
     • CEO/Founder at top
     • Department heads as children
     • Team members under each head
  → Each node shows: Name, Designation, Avatar
  → Nodes are draggable and zoomable
  → MiniMap visible on desktop (hidden on mobile)
  → Zoom controls: +, –, Fit to screen

### 17.2 Manage Hierarchy (Admin)

```
Admin navigates to /organization
  → Drags an employee node and drops it onto another node
  → Relationship modal opens: "Confirm manager change?"
  → Admin confirms
  → PUT /api/organization → Records Atomic updates to managerId
  → Chart refreshes to show new reporting line
  → Toast: "Hierarchy updated successfully"
```
```

---

## 18. Settings

### 18.1 Profile & Appearance Settings

```
User navigates to /settings
  → "Profile" tab:
     • Edit: Name, Bio
     • Click "Save Changes" → PUT /api/user/profile → Persisted
  → "Appearance" tab:
     • Select Theme: Light / Dark / System
     • Select Accent Color: Real-time update and persistence
```

### 18.2 Security Settings (Password)

```
User switches to "Security" tab
  → Fields: Current password, New password, Confirm new password
  → Validation: Password must be secure; Current password verified via bcrypt
  → Click "Update Password" → PUT /api/user/password
```

### 18.3 Theme Preferences

```
User switches to "Appearance" tab
  → Toggle: Light / Dark / System
  → Powered by next-themes
  → Preference persisted in localStorage
  → Applied immediately across the app
```

---

## Navigation Summary

```
┌────────────────────────────────────────────────┐
│  Sidebar Navigation                            │
├────────────────────────────────────────────────┤
│  📊  Dashboard          →  /dashboard          │
│  👥  Employees          →  /employees          │
│  📋  Attendance         →  /attendance          │
│  🏖️  Leave              →  /leave               │
│  💰  Payroll            →  /payroll             │
│  🏦  Provident Fund     →  /pf                  │
│  ⭐  Performance        →  /performance         │
│  📚  Training           →  /training            │
│  🎯  Recruitment        →  /recruitment         │
│  📦  Assets             →  /assets              │
│  📄  Documents          →  /documents           │
│  📢  Announcements      →  /announcements       │
│  🎫  Help Desk          →  /help-desk           │
│  📅  Calendar           →  /calendar            │
│  🚪  Resignation        →  /resignation         │
│  🏢  Organization       →  /organization        │
│  ⚙️  Settings           →  /settings            │
└────────────────────────────────────────────────┘
```

---

## Role Permissions Matrix

| Module | Employee | Admin |
|--------|----------|-------|
| Dashboard | Own summary | Full overview |
| Employees | View list | Full CRUD |
| Attendance | Own records | All records |
| Leave | Apply + view own | Approve/reject all |
| Payroll | View own payslips | Manage all + process |
| PF | View own statement | Manage all records |
| Performance | View own reviews | Create + manage all |
| Training | View enrolled | Create + manage courses |
| Recruitment | ❌ No access | Full pipeline management |
| Assets | View assigned | Full CRUD + assign |
| Documents | Public + own docs | Upload + manage all |
| Announcements | View | Create + delete |
| Help Desk | Create + view own | Manage all tickets |
| Calendar | View | Create + delete events |
| Resignation | Submit own | Process all |
| Organization | View | View |
| Settings | Own profile | Own profile |

---

## 19. AI Assistant

### 19.1 Open Chatbot

```
User clicks the floating 🤖 button (bottom-right)
  → AI Chatbot window slides up
  → Welcome message displayed: "Hey there! 👋 I'm your EMS Pro Assistant..."
  → Input field auto-focuses
```

### 19.2 Ask HR Related Questions

```
User types query: "How is PF calculated?"
  → Clicks Send (or presses Enter)
  → POST /api/chat sends messages history + system instructions
  → Typing indicator shown (animated dots)
  → System returns Gemini-generated response
  → Chat auto-scrolls to bottom
```

### 19.3 Navigate via Assistant

```
User asks: "Where do I apply for leave?"
  → Assistant provides answer: "You can apply for leave on the /leave page..."
  → (In future versions, assistant may provide direct navigation links)
```

---

## 20. Command Palette

### 20.1 Open Command Palette

```
User presses Ctrl + K (or Cmd + K on macOS)
  → Command palette modal opens with backdrop blur
  → Input field auto-focuses: "Type a command or search..."
```

### 20.2 Navigate Pages

```
User types "Employees"
  → List filters to show "Employees" page
  → User presses Enter (or clicks item)
  → Router pushes to /employees
  → Modal closes automatically
```

### 20.3 Trigger Quick Actions

```
User opens palette → Scrolls to "Actions" section
  → Selects "New Employee" or "Request Leave"
  → Navigates to the respective page or opens relevant modal
```
