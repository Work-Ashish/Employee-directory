#!/usr/bin/env python
"""Prisma-to-Django field mapping for data migration.

Maps Prisma model names, field names (camelCase -> snake_case),
enum values, and foreign key references to their Django equivalents.
Organised by migration tier (1-5) for staged migration.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Utility: generic camelCase -> snake_case converter
# ---------------------------------------------------------------------------

def camel_to_snake(name: str) -> str:
    """Convert a camelCase or PascalCase string to snake_case."""
    s1 = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s1).lower()


# ---------------------------------------------------------------------------
# Model name mapping: Prisma model -> (django_app, DjangoModel)
# ---------------------------------------------------------------------------

MODEL_MAP: Dict[str, Tuple[str, str]] = {
    # ── Tier 1 ──
    "Organization": ("tenants", "Tenant"),
    "User": ("users", "User"),
    "Employee": ("employees", "Employee"),
    "Department": ("departments", "Department"),

    # ── Tier 2 ──
    "Attendance": ("attendance", "Attendance"),
    "Leave": ("leave", "Leave"),
    "Payroll": ("payroll", "Payroll"),
    "ProvidentFund": ("payroll", "ProvidentFund"),
    "Shift": ("attendance", "Shift"),
    "Holiday": ("attendance", "Holiday"),

    # ── Tier 3 ──
    "PerformanceReview": ("performance", "PerformanceReview"),
    "Training": ("training", "Training"),
    "TrainingEnrollment": ("training", "TrainingEnrollment"),
    "Resignation": ("resignations", "Resignation"),
    "Team": ("teams", "Team"),
    "TeamMember": ("teams", "TeamMember"),

    # ── Tier 4 ──
    "Announcement": ("announcements", "Announcement"),
    "Kudos": ("announcements", "Kudos"),
    "Asset": ("assets", "Asset"),
    "Document": ("documents", "Document"),
    "Ticket": ("tickets", "Ticket"),
    "Reimbursement": ("reimbursements", "Reimbursement"),
    "CalendarEvent": ("events", "CalendarEvent"),

    # ── Tier 5 ──
    "InAppNotification": ("notifications", "Notification"),
    "AuditLog": ("audit", "AuditLog"),
    "SavedReport": ("reports", "SavedReport"),
    "ReportSchedule": ("reports", "ReportSchedule"),
}


# ---------------------------------------------------------------------------
# Tier definitions: ordered list of Prisma model names per tier.
# Within each tier the order respects FK dependencies (parents first).
# ---------------------------------------------------------------------------

TIER_MODELS: Dict[int, List[str]] = {
    1: ["Organization", "User", "Department", "Employee"],
    2: ["Shift", "Holiday", "Attendance", "Leave", "Payroll", "ProvidentFund"],
    3: [
        "PerformanceReview", "Training", "TrainingEnrollment",
        "Resignation", "Team", "TeamMember",
    ],
    4: [
        "Announcement", "Kudos", "Asset", "Document",
        "Ticket", "Reimbursement", "CalendarEvent",
    ],
    5: [
        "InAppNotification", "AuditLog", "SavedReport", "ReportSchedule",
    ],
}


# ---------------------------------------------------------------------------
# Per-model field mappings: prisma_field -> django_field
# Only fields that need *explicit* renaming are listed.
# Fields not listed are transformed via ``camel_to_snake()``.
# A value of ``None`` means "skip this field" (e.g. relation-only fields).
# ---------------------------------------------------------------------------

FIELD_MAP: Dict[str, Dict[str, Optional[str]]] = {
    # ── Tier 1 ──────────────────────────────────────────────────────────

    "Organization": {
        "id": "id",
        "name": "name",
        "domain": "domain",
        "createdAt": "created_at",
        "updatedAt": "updated_at",
        # Prisma relation-only fields to skip
        "users": None,
        "employees": None,
        "departments": None,
        "announcements": None,
        "candidates": None,
        "leaves": None,
        "attendances": None,
        "tickets": None,
        "performanceMetrics": None,
        "weeklyScores": None,
        "notifications": None,
        "adminAlerts": None,
        "assets": None,
        "documents": None,
        "payroll": None,
        "providentFunds": None,
        "performanceReviews": None,
        "resignations": None,
        "trainings": None,
        "events": None,
        "trainingEnrollments": None,
        "documentEmbeddings": None,
        "workflowTemplates": None,
        "workflowInstances": None,
        "workflowFieldConfigs": None,
        "teams": None,
        "employeeFeedback": None,
        "auditLogs": None,
        "shifts": None,
        "shiftAssignments": None,
        "attendancePolicies": None,
        "holidays": None,
        "regularizations": None,
        "payrollConfigs": None,
        "payrollAudits": None,
        "webhooks": None,
        "kudos": None,
        "agentDevices": None,
        "appUsageSummaries": None,
        "websiteUsageSummaries": None,
        "idleEvents": None,
        "dailyActivityReports": None,
        "reimbursements": None,
        "scimSecret": None,
        "userSessions": None,
        "savedReports": None,
        "reportSchedules": None,
        "inAppNotifications": None,
        "performanceTemplate": None,
        "functionalRoles": None,
        "searchIndexEntries": None,
    },

    "User": {
        "id": "id",
        "name": None,  # split into first_name / last_name during transform
        "email": "email",
        "hashedPassword": "password",  # preserved hash
        "role": None,  # mapped to RBAC role assignment separately
        "organizationId": None,  # tenant scoping handled separately
        "avatar": "avatar",
        "createdAt": "created_at",
        "updatedAt": "updated_at",
        "accentColor": "accent_color",
        "bio": "bio",
        "lastLoginAt": "last_login_at",
        "mustChangePassword": "must_change_password",
        # relation fields
        "organization": None,
        "employee": None,
        "sessions": None,
    },

    "Department": {
        "id": "id",
        "name": "name",
        "color": "color",
        "organizationId": None,  # tenant scoping
        "createdAt": "created_at",
        # relation fields
        "organization": None,
        "candidates": None,
        "employees": None,
    },

    "Employee": {
        "id": "id",
        "employeeCode": "employee_code",
        "firstName": "first_name",
        "lastName": "last_name",
        "email": "email",
        "phone": "phone",
        "designation": "designation",
        "departmentId": "department_ref_id",
        "organizationId": None,  # tenant scoping
        "dateOfJoining": "date_of_joining",
        "salary": "salary",
        "status": "status",
        "avatarUrl": "avatar_url",
        "address": "address",
        "createdAt": "created_at",
        "updatedAt": "updated_at",
        "userId": "user_id",
        "managerId": "reporting_to_id",
        "deletedAt": "deleted_at",
        "isArchived": "is_archived",
        # relation fields
        "organization": None,
        "department": None,
        "manager": None,
        "reports": None,
        "user": None,
        "profile": None,
        "addressInfo": None,
        "banking": None,
        "assets": None,
        "attendanceRecords": None,
        "documents": None,
        "educations": None,
        "leaves": None,
        "payrollRecords": None,
        "performanceReviews": None,
        "reviewsConducted": None,
        "pfRecords": None,
        "resignations": None,
        "tickets": None,
        "trainings": None,
        "timeSessions": None,
        "performanceMetrics": None,
        "weeklyScores": None,
        "notifications": None,
        "adminAlerts": None,
        "shiftAssignments": None,
        "regularizations": None,
        "teamMemberships": None,
        "teamsLed": None,
        "feedbackGiven": None,
        "feedbackReceived": None,
        "requestedWorkflows": None,
        "workflowActions": None,
        "kudosSent": None,
        "kudosReceived": None,
        "agentDevices": None,
        "appUsageSummaries": None,
        "websiteUsageSummaries": None,
        "idleEvents": None,
        "dailyActivityReports": None,
        "reimbursements": None,
        "functionalRoles": None,
    },

    # ── Tier 2 ──────────────────────────────────────────────────────────

    "Attendance": {
        "id": "id",
        "date": "date",
        "checkIn": "check_in",
        "checkOut": "check_out",
        "workHours": "work_hours",
        "overtime": "overtime",
        "isLate": "is_late",
        "isEarlyExit": "is_early_exit",
        "status": "status",
        "employeeId": "employee_id",
        "organizationId": None,
        "createdAt": "created_at",
        # relation fields
        "employee": None,
        "organization": None,
        "regularization": None,
    },

    "Leave": {
        "id": "id",
        "type": "type",
        "startDate": "start_date",
        "endDate": "end_date",
        "reason": "reason",
        "status": "status",
        "employeeId": "employee_id",
        "organizationId": None,
        "createdAt": "created_at",
        "updatedAt": "updated_at",
        # relation fields
        "employee": None,
        "organization": None,
    },

    "Payroll": {
        "id": "id",
        "month": "month",
        "basicSalary": "basic_salary",
        "allowances": "allowances",
        "pfDeduction": "pf_deduction",
        "tax": "tax",
        "otherDed": "other_deductions",
        "arrears": "arrears",
        "reimbursements": "reimbursements",
        "loansAdvances": "loans_advances",
        "netSalary": "net_salary",
        "status": "status",
        "isFinalized": "is_finalized",
        "pdfUrl": "pdf_url",
        "employeeId": "employee_id",
        "organizationId": None,
        "createdAt": "created_at",
        "updatedAt": "updated_at",
        # relation fields
        "employee": None,
        "organization": None,
        "audits": None,
    },

    "ProvidentFund": {
        "id": "id",
        "month": "month",
        "accountNumber": "account_number",
        "basicSalary": "basic_salary",
        "employeeContribution": "employee_contribution",
        "employerContribution": "employer_contribution",
        "totalContribution": "total_contribution",
        "status": "status",
        "employeeId": "employee_id",
        "organizationId": None,
        "createdAt": "created_at",
        # relation fields
        "employee": None,
        "organization": None,
    },

    "Shift": {
        "id": "id",
        "name": "name",
        "startTime": "start_time",
        "endTime": "end_time",
        "workDays": "work_days",
        "organizationId": None,
        "createdAt": "created_at",
        "updatedAt": "updated_at",
        # relation fields
        "organization": None,
        "assignments": None,
    },

    "Holiday": {
        "id": "id",
        "name": "name",
        "date": "date",
        "isOptional": "is_optional",
        "organizationId": None,
        "createdAt": "created_at",
        # relation fields
        "organization": None,
    },

    # ── Tier 3 ──────────────────────────────────────────────────────────

    "PerformanceReview": {
        "id": "id",
        "rating": "overall_score",
        "progress": None,  # no direct equivalent
        "comments": "strengths",
        "reviewDate": None,  # no direct equivalent
        "status": "status",
        "employeeId": "employee_id",
        "organizationId": None,
        "createdAt": "created_at",
        "updatedAt": "updated_at",
        "reviewerId": "reviewer_id",
        "reviewType": None,  # no equivalent in Django model
        "reviewPeriod": "period",
        "formType": None,
        "formData": None,
        # relation fields
        "employee": None,
        "reviewer": None,
        "organization": None,
    },

    "Training": {
        "id": "id",
        "name": "title",
        "type": None,  # Prisma uses enum; Django model has no type field
        "description": "description",
        "status": "status",
        "progress": None,
        "dueDate": "end_date",
        "participants": "max_participants",
        "videoUrl": None,
        "organizationId": None,
        "createdAt": "created_at",
        "updatedAt": "updated_at",
        # relation fields
        "organization": None,
        "enrollments": None,
    },

    "TrainingEnrollment": {
        "id": "id",
        "score": None,  # no direct equivalent
        "completed": None,  # mapped via status
        "trainingId": "training_id",
        "employeeId": "employee_id",
        "organizationId": None,
        "enrolledAt": "created_at",
        # relation fields
        "employee": None,
        "training": None,
        "organization": None,
    },

    "Resignation": {
        "id": "id",
        "reason": "reason",
        "lastDay": "last_working_date",
        "status": "status",
        "employeeId": "employee_id",
        "organizationId": None,
        "createdAt": "created_at",
        "updatedAt": "updated_at",
        # relation fields
        "employee": None,
        "organization": None,
    },

    "Team": {
        "id": "id",
        "name": "name",
        "description": "description",
        "leadId": "lead_id",
        "createdById": None,
        "organizationId": None,
        "createdAt": "created_at",
        "updatedAt": "updated_at",
        # relation fields
        "lead": None,
        "organization": None,
        "members": None,
    },

    "TeamMember": {
        "id": "id",
        "teamId": "team_id",
        "employeeId": "employee_id",
        "joinedAt": "created_at",
        # relation fields
        "team": None,
        "employee": None,
    },

    # ── Tier 4 ──────────────────────────────────────────────────────────

    "Announcement": {
        "id": "id",
        "title": "title",
        "content": "content",
        "author": None,  # Prisma stores as plain string; Django uses FK
        "category": None,  # different enum sets
        "priority": "priority",
        "isPinned": None,  # no equivalent in Django model
        "organizationId": None,
        "createdAt": "created_at",
        "updatedAt": "updated_at",
        # relation fields
        "organization": None,
    },

    "Kudos": {
        "id": "id",
        "message": "message",
        "fromId": "from_employee_id",
        "toId": "to_employee_id",
        "organizationId": None,
        "createdAt": "created_at",
        # relation fields
        "from": None,
        "to": None,
        "organization": None,
    },

    "Asset": {
        "id": "id",
        "name": "name",
        "type": "type",
        "serialNumber": "serial_number",
        "status": "status",
        "purchaseDate": "purchase_date",
        "value": None,  # no equivalent in Django model
        "image": None,
        "assignedToId": "assigned_to_id",
        "assignedDate": None,
        "organizationId": None,
        "createdAt": "created_at",
        "updatedAt": "updated_at",
        # relation fields
        "assignedTo": None,
        "organization": None,
    },

    "Document": {
        "id": "id",
        "title": "title",
        "category": "category",
        "url": "file_url",
        "size": "size",
        "isPublic": "is_public",
        "employeeId": "uploaded_by_id",
        "organizationId": None,
        "uploadDate": "created_at",
        # relation fields
        "employee": None,
        "organization": None,
    },

    "Ticket": {
        "id": "id",
        "ticketCode": None,  # Django model does not have a ticket_code
        "subject": "subject",
        "description": "description",
        "category": "category",
        "priority": "priority",
        "status": "status",
        "employeeId": "created_by_id",
        "organizationId": None,
        "createdAt": "created_at",
        "updatedAt": "updated_at",
        # relation fields
        "employee": None,
        "organization": None,
    },

    "Reimbursement": {
        "id": "id",
        "amount": "amount",
        "category": "category",
        "description": "description",
        "receiptUrl": "receipt_url",
        "status": "status",
        "employeeId": "employee_id",
        "organizationId": None,
        "createdAt": "created_at",
        "updatedAt": "updated_at",
        # relation fields
        "employee": None,
        "organization": None,
    },

    "CalendarEvent": {
        "id": "id",
        "title": "title",
        "start": "start_date",
        "end": "end_date",
        "allDay": "is_all_day",
        "type": "type",
        "organizationId": None,
        "createdAt": "created_at",
        # relation fields
        "organization": None,
    },

    # ── Tier 5 ──────────────────────────────────────────────────────────

    "InAppNotification": {
        "id": "id",
        "userId": "user_id",
        "title": "title",
        "description": "message",
        "type": "type",
        "isRead": "is_read",
        "organizationId": None,
        "createdAt": "created_at",
    },

    "AuditLog": {
        "id": "id",
        "userId": "user_id",
        "action": "action",
        "entityType": "resource",
        "entityId": "resource_id",
        "changes": "changes",
        "ipAddress": "ip_address",
        "userAgent": "user_agent",
        "organizationId": None,
        "createdAt": "created_at",
        # relation fields
        "organization": None,
    },

    "SavedReport": {
        "id": "id",
        "name": "name",
        "description": None,
        "config": "config",
        "entityType": "type",
        "organizationId": None,
        "creatorId": "created_by_id",
        "createdAt": "created_at",
        "updatedAt": "updated_at",
        # relation fields
        "organization": None,
        "schedules": None,
    },

    "ReportSchedule": {
        "id": "id",
        "reportId": "report_id",
        "frequency": "frequency",
        "format": None,  # no equivalent in Django model
        "recipients": None,
        "lastRunAt": None,
        "nextRunAt": "next_run",
        "isActive": "is_active",
        "organizationId": None,
        "createdAt": "created_at",
        # relation fields
        "report": None,
        "organization": None,
    },
}


# ---------------------------------------------------------------------------
# Prisma table names: Prisma model -> actual PostgreSQL table name
# (Prisma uses the model name as-is for the table by default)
# ---------------------------------------------------------------------------

PRISMA_TABLE_MAP: Dict[str, str] = {
    model: f'"{model}"' for model in MODEL_MAP
}


# ---------------------------------------------------------------------------
# Enum value mapping: (prisma_model, field) -> {prisma_value: django_value}
# Only non-trivial mappings are listed. If Prisma and Django share the same
# value (e.g. "PENDING" -> "PENDING") it can be omitted.
# ---------------------------------------------------------------------------

ENUM_MAP: Dict[Tuple[str, str], Dict[str, str]] = {
    # ── Employee status ──
    ("Employee", "status"): {
        "ACTIVE": "active",
        "ON_LEAVE": "on_leave",
        "RESIGNED": "resigned",
        "TERMINATED": "terminated",
        "INACTIVE": "inactive",
        "ARCHIVED": "archived",
    },

    # ── User role -> RBAC slug ──
    ("User", "role"): {
        "CEO": "ceo",
        "HR": "hr_manager",
        "PAYROLL": "payroll_admin",
        "TEAM_LEAD": "team_lead",
        "EMPLOYEE": "employee",
    },

    # ── Attendance status ──
    # Both use uppercase, no transformation needed - included for completeness
    ("Attendance", "status"): {
        "PRESENT": "PRESENT",
        "ABSENT": "ABSENT",
        "HALF_DAY": "HALF_DAY",
        "ON_LEAVE": "ON_LEAVE",
        "WEEKEND": "WEEKEND",
    },

    # ── Leave type ──
    ("Leave", "type"): {
        "CASUAL": "CASUAL",
        "SICK": "SICK",
        "EARNED": "EARNED",
        "MATERNITY": "MATERNITY",
        "PATERNITY": "PATERNITY",
        "UNPAID": "UNPAID",
    },

    # ── Leave status ──
    ("Leave", "status"): {
        "PENDING": "PENDING",
        "APPROVED": "APPROVED",
        "REJECTED": "REJECTED",
    },

    # ── Payroll status ──
    ("Payroll", "status"): {
        "PENDING": "PENDING",
        "PROCESSED": "PROCESSED",
        "PAID": "PAID",
    },

    # ── Performance review status ──
    ("PerformanceReview", "status"): {
        "PENDING": "DRAFT",
        "COMPLETED": "SUBMITTED",
        "EXCELLENT": "SUBMITTED",
        "GOOD": "SUBMITTED",
        "NEEDS_IMPROVEMENT": "SUBMITTED",
    },

    # ── Training status ──
    ("Training", "status"): {
        "UPCOMING": "UPCOMING",
        "IN_PROGRESS": "ONGOING",
        "COMPLETED": "COMPLETED",
    },

    # ── Resignation status ──
    ("Resignation", "status"): {
        "UNDER_REVIEW": "PENDING",
        "NOTICE_PERIOD": "APPROVED",
        "PROCESSED": "APPROVED",
    },

    # ── Asset type ──
    ("Asset", "type"): {
        "HARDWARE": "LAPTOP",
        "SOFTWARE": "OTHER",
        "ACCESSORY": "OTHER",
    },

    # ── Asset status ──
    ("Asset", "status"): {
        "AVAILABLE": "AVAILABLE",
        "ASSIGNED": "ASSIGNED",
        "MAINTENANCE": "MAINTENANCE",
        "RETIRED": "RETIRED",
    },

    # ── Document category ──
    ("Document", "category"): {
        "POLICY": "POLICY",
        "CONTRACT": "CONTRACT",
        "PAYSLIP": "OTHER",
        "TAX": "OTHER",
        "IDENTIFICATION": "ID_PROOF",
    },

    # ── Ticket category ──
    ("Ticket", "category"): {
        "IT": "IT",
        "HR": "HR",
        "FINANCE": "FINANCE",
        "FACILITIES": "FACILITIES",
        "OTHER": "OTHER",
    },

    # ── Ticket priority ──
    ("Ticket", "priority"): {
        "LOW": "LOW",
        "MEDIUM": "MEDIUM",
        "HIGH": "HIGH",
        "URGENT": "URGENT",
    },

    # ── Ticket status ──
    ("Ticket", "status"): {
        "OPEN": "OPEN",
        "IN_PROGRESS": "IN_PROGRESS",
        "RESOLVED": "RESOLVED",
        "CLOSED": "CLOSED",
    },

    # ── CalendarEvent type ──
    ("CalendarEvent", "type"): {
        "HOLIDAY": "HOLIDAY",
        "LEAVE": "MEETING",
        "BIRTHDAY": "BIRTHDAY",
        "EVENT": "COMPANY",
        "MEETING": "MEETING",
    },

    # ── Announcement priority ──
    ("Announcement", "priority"): {
        "LOW": "LOW",
        "MEDIUM": "NORMAL",
        "HIGH": "HIGH",
    },

    # ── Reimbursement category ──
    ("Reimbursement", "category"): {
        "TRAVEL": "TRAVEL",
        "FOOD": "FOOD",
        "EQUIPMENT": "EQUIPMENT",
        "MEDICAL": "MEDICAL",
        "OTHER": "OTHER",
    },

    # ── Reimbursement status ──
    ("Reimbursement", "status"): {
        "PENDING": "PENDING",
        "APPROVED": "APPROVED",
        "REJECTED": "REJECTED",
        "PAID": "PAID",
    },

    # ── SavedReport entityType -> type ──
    ("SavedReport", "entityType"): {
        "EMPLOYEE": "EMPLOYEE",
        "PAYROLL": "PAYROLL",
        "ATTENDANCE": "ATTENDANCE",
        "PERFORMANCE": "PERFORMANCE",
        "LEAVE": "LEAVE",
    },

    # ── ReportSchedule frequency ──
    ("ReportSchedule", "frequency"): {
        "DAILY": "DAILY",
        "WEEKLY": "WEEKLY",
        "MONTHLY": "MONTHLY",
    },

    # ── Notification / InAppNotification type ──
    ("InAppNotification", "type"): {
        "INFO": "INFO",
        "SUCCESS": "SUCCESS",
        "WARNING": "WARNING",
        "ERROR": "ERROR",
    },
}


# ---------------------------------------------------------------------------
# Foreign key relationship map: (prisma_model, prisma_fk_field) ->
#   (target_prisma_model, target_django_field)
# Used to look up IDs during migration and verify FK integrity.
# ---------------------------------------------------------------------------

FK_MAP: Dict[Tuple[str, str], Tuple[str, str]] = {
    # Tier 1
    ("Employee", "departmentId"): ("Department", "department_ref_id"),
    ("Employee", "userId"): ("User", "user_id"),
    ("Employee", "managerId"): ("Employee", "reporting_to_id"),

    # Tier 2
    ("Attendance", "employeeId"): ("Employee", "employee_id"),
    ("Leave", "employeeId"): ("Employee", "employee_id"),
    ("Payroll", "employeeId"): ("Employee", "employee_id"),
    ("ProvidentFund", "employeeId"): ("Employee", "employee_id"),

    # Tier 3
    ("PerformanceReview", "employeeId"): ("Employee", "employee_id"),
    ("PerformanceReview", "reviewerId"): ("Employee", "reviewer_id"),
    ("Training", "organizationId"): ("Organization", None),
    ("TrainingEnrollment", "trainingId"): ("Training", "training_id"),
    ("TrainingEnrollment", "employeeId"): ("Employee", "employee_id"),
    ("Resignation", "employeeId"): ("Employee", "employee_id"),
    ("Team", "leadId"): ("Employee", "lead_id"),
    ("TeamMember", "teamId"): ("Team", "team_id"),
    ("TeamMember", "employeeId"): ("Employee", "employee_id"),

    # Tier 4
    ("Kudos", "fromId"): ("Employee", "from_employee_id"),
    ("Kudos", "toId"): ("Employee", "to_employee_id"),
    ("Asset", "assignedToId"): ("Employee", "assigned_to_id"),
    ("Document", "employeeId"): ("Employee", "uploaded_by_id"),
    ("Ticket", "employeeId"): ("Employee", "created_by_id"),
    ("Reimbursement", "employeeId"): ("Employee", "employee_id"),

    # Tier 5
    ("InAppNotification", "userId"): ("User", "user_id"),
    ("AuditLog", "userId"): ("User", "user_id"),
    ("SavedReport", "creatorId"): ("Employee", "created_by_id"),
    ("ReportSchedule", "reportId"): ("SavedReport", "report_id"),
}


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def get_django_field(prisma_model: str, prisma_field: str) -> Optional[str]:
    """Return the Django field name for a Prisma model/field pair.

    Returns ``None`` if the field should be skipped.
    Falls back to ``camel_to_snake(prisma_field)`` when no explicit
    mapping exists.
    """
    model_fields = FIELD_MAP.get(prisma_model, {})
    if prisma_field in model_fields:
        return model_fields[prisma_field]
    return camel_to_snake(prisma_field)


def get_enum_value(
    prisma_model: str, prisma_field: str, prisma_value: Any,
) -> Any:
    """Map a Prisma enum value to its Django equivalent.

    Returns the original value unchanged when no mapping exists.
    """
    key = (prisma_model, prisma_field)
    mapping = ENUM_MAP.get(key)
    if mapping and prisma_value in mapping:
        return mapping[prisma_value]
    return prisma_value


def get_tier_for_model(prisma_model: str) -> Optional[int]:
    """Return the tier number (1-5) for a Prisma model, or None."""
    for tier, models in TIER_MODELS.items():
        if prisma_model in models:
            return tier
    return None


def get_models_for_tier(tier: int) -> List[str]:
    """Return the ordered list of Prisma model names for a given tier."""
    return TIER_MODELS.get(tier, [])


def transform_row(
    prisma_model: str, row: Dict[str, Any],
) -> Dict[str, Any]:
    """Transform a full Prisma row dict into Django-compatible field names.

    * Skips fields mapped to ``None``
    * Applies enum mappings
    * Converts camelCase fallback fields via ``camel_to_snake``
    """
    result: Dict[str, Any] = {}
    enum_fields = {
        field for (model, field) in ENUM_MAP if model == prisma_model
    }

    for prisma_field, value in row.items():
        django_field = get_django_field(prisma_model, prisma_field)
        if django_field is None:
            continue
        if prisma_field in enum_fields:
            value = get_enum_value(prisma_model, prisma_field, value)
        result[django_field] = value

    return result
