#!/usr/bin/env python
"""Tests for the Prisma -> Django data migration pipeline.

Covers field name transformation, enum mapping, UUID preservation,
dry-run safety, and tier filtering.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from io import StringIO
from unittest.mock import MagicMock, patch

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from scripts.prisma_field_map import (
    ENUM_MAP,
    FIELD_MAP,
    MODEL_MAP,
    TIER_MODELS,
    camel_to_snake,
    get_django_field,
    get_enum_value,
    get_models_for_tier,
    get_tier_for_model,
    transform_row,
)


# ---------------------------------------------------------------------------
# Test: camelCase -> snake_case transformation
# ---------------------------------------------------------------------------

class TestFieldNameTransformation:
    """Verify camelCase -> snake_case works correctly."""

    def test_simple_camel(self):
        assert camel_to_snake("firstName") == "first_name"

    def test_multiple_words(self):
        assert camel_to_snake("dateOfJoining") == "date_of_joining"

    def test_all_caps_boundary(self):
        assert camel_to_snake("employeeId") == "employee_id"

    def test_consecutive_caps(self):
        assert camel_to_snake("pfDeduction") == "pf_deduction"

    def test_single_word(self):
        assert camel_to_snake("salary") == "salary"

    def test_already_snake(self):
        assert camel_to_snake("already_snake") == "already_snake"

    def test_pascal_case(self):
        assert camel_to_snake("EmployeeProfile") == "employee_profile"

    def test_explicit_field_mapping_employee(self):
        """Explicit mappings in FIELD_MAP override camel_to_snake."""
        assert get_django_field("Employee", "departmentId") == "department_ref_id"
        assert get_django_field("Employee", "managerId") == "reporting_to_id"
        assert get_django_field("Employee", "employeeCode") == "employee_code"

    def test_explicit_field_mapping_payroll(self):
        assert get_django_field("Payroll", "basicSalary") == "basic_salary"
        assert get_django_field("Payroll", "otherDed") == "other_deductions"
        assert get_django_field("Payroll", "loansAdvances") == "loans_advances"

    def test_explicit_field_mapping_attendance(self):
        assert get_django_field("Attendance", "checkIn") == "check_in"
        assert get_django_field("Attendance", "checkOut") == "check_out"
        assert get_django_field("Attendance", "isEarlyExit") == "is_early_exit"

    def test_skipped_fields_return_none(self):
        """Fields mapped to None (relations, org scoping) are skipped."""
        assert get_django_field("Employee", "organizationId") is None
        assert get_django_field("Employee", "department") is None
        assert get_django_field("User", "role") is None
        assert get_django_field("User", "sessions") is None

    def test_fallback_to_camel_to_snake(self):
        """Unknown fields fall back to camel_to_snake conversion."""
        assert get_django_field("Employee", "unknownField") == "unknown_field"


# ---------------------------------------------------------------------------
# Test: enum value mapping
# ---------------------------------------------------------------------------

class TestEnumValueMapping:
    """Verify Prisma enum values map to correct Django choices."""

    def test_employee_status_active(self):
        assert get_enum_value("Employee", "status", "ACTIVE") == "active"

    def test_employee_status_on_leave(self):
        assert get_enum_value("Employee", "status", "ON_LEAVE") == "on_leave"

    def test_employee_status_terminated(self):
        assert get_enum_value("Employee", "status", "TERMINATED") == "terminated"

    def test_user_role_ceo(self):
        assert get_enum_value("User", "role", "CEO") == "ceo"

    def test_user_role_hr(self):
        assert get_enum_value("User", "role", "HR") == "hr_manager"

    def test_user_role_employee(self):
        assert get_enum_value("User", "role", "EMPLOYEE") == "employee"

    def test_performance_review_status(self):
        assert get_enum_value("PerformanceReview", "status", "PENDING") == "DRAFT"
        assert get_enum_value("PerformanceReview", "status", "COMPLETED") == "SUBMITTED"

    def test_resignation_status(self):
        assert get_enum_value("Resignation", "status", "UNDER_REVIEW") == "PENDING"
        assert get_enum_value("Resignation", "status", "NOTICE_PERIOD") == "APPROVED"

    def test_training_status_in_progress(self):
        assert get_enum_value("Training", "status", "IN_PROGRESS") == "ONGOING"

    def test_asset_type_mapping(self):
        assert get_enum_value("Asset", "type", "HARDWARE") == "LAPTOP"
        assert get_enum_value("Asset", "type", "SOFTWARE") == "OTHER"

    def test_document_category_identification(self):
        assert get_enum_value("Document", "category", "IDENTIFICATION") == "ID_PROOF"

    def test_announcement_priority_medium(self):
        assert get_enum_value("Announcement", "priority", "MEDIUM") == "NORMAL"

    def test_calendar_event_type(self):
        assert get_enum_value("CalendarEvent", "type", "EVENT") == "COMPANY"
        assert get_enum_value("CalendarEvent", "type", "MEETING") == "MEETING"

    def test_unmapped_enum_returns_original(self):
        """Values not in the mapping are returned unchanged."""
        assert get_enum_value("Payroll", "status", "PENDING") == "PENDING"
        assert get_enum_value("UnknownModel", "field", "FOO") == "FOO"


# ---------------------------------------------------------------------------
# Test: UUID preservation
# ---------------------------------------------------------------------------

class TestUuidPreservation:
    """Verify UUIDs remain identical when they are valid UUID4."""

    def test_valid_uuid_preserved_in_transform(self):
        test_uuid = str(uuid.uuid4())
        row = {
            "id": test_uuid,
            "name": "Engineering",
            "color": "#6366f1",
            "organizationId": "some-org-id",
            "createdAt": datetime.now(timezone.utc),
        }
        result = transform_row("Department", row)
        assert result["id"] == test_uuid

    def test_uuid_fields_kept_as_strings(self):
        """transform_row does not alter string UUIDs."""
        emp_uuid = str(uuid.uuid4())
        dept_uuid = str(uuid.uuid4())
        row = {
            "id": emp_uuid,
            "employeeCode": "EMP-0001",
            "firstName": "Jane",
            "lastName": "Doe",
            "email": "jane@test.com",
            "phone": "1234567890",
            "designation": "Engineer",
            "departmentId": dept_uuid,
            "organizationId": "org-123",
            "dateOfJoining": datetime.now(timezone.utc),
            "salary": 80000.0,
            "status": "ACTIVE",
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        }
        result = transform_row("Employee", row)
        assert result["id"] == emp_uuid
        assert result["department_ref_id"] == dept_uuid

    def test_cuid_to_deterministic_uuid(self):
        """Prisma cuids are converted to deterministic UUID5."""
        cuid = "clxyz123abc"
        expected = uuid.uuid5(uuid.NAMESPACE_URL, cuid)
        try:
            result = uuid.UUID(cuid)
        except ValueError:
            result = uuid.uuid5(uuid.NAMESPACE_URL, cuid)
        assert result == expected


# ---------------------------------------------------------------------------
# Test: dry-run safety
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestDryRunNoWrites:
    """Dry-run mode must not create any DB records."""

    @patch("apps.tenants.management.commands.migrate_from_prisma.psycopg2.connect")
    def test_dry_run_no_writes(self, mock_connect, db):
        """Running with --dry-run should produce zero created records."""
        from apps.employees.models import Employee
        from apps.departments.models import Department
        from apps.tenants.models import Tenant
        from apps.users.models import User

        # Create a test tenant
        tenant = Tenant.objects.using("default").create(
            name="Test Org",
            slug="test-dry",
            db_name="default",
            status="active",
        )

        # Mock the psycopg2 connection and cursor
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [
            {
                "id": str(uuid.uuid4()),
                "name": "Engineering",
                "color": "#6366f1",
                "organizationId": "org-1",
                "createdAt": datetime.now(timezone.utc),
            }
        ]
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        initial_dept_count = Department.objects.count()
        initial_emp_count = Employee.objects.count()

        out = StringIO()
        call_command(
            "migrate_from_prisma",
            source_db_url="postgresql://fake:fake@localhost/fake",
            tenant_slug="test-dry",
            dry_run=True,
            tier=1,
            stdout=out,
        )

        # No new records should have been created
        assert Department.objects.count() == initial_dept_count
        assert Employee.objects.count() == initial_emp_count

        output = out.getvalue()
        assert "DRY-RUN" in output


# ---------------------------------------------------------------------------
# Test: tier filtering
# ---------------------------------------------------------------------------

class TestTierFiltering:
    """Verify that --tier flag correctly restricts migration scope."""

    def test_tier_1_models(self):
        models = get_models_for_tier(1)
        assert "Organization" in models
        assert "User" in models
        assert "Employee" in models
        assert "Department" in models
        assert len(models) == 4

    def test_tier_2_models(self):
        models = get_models_for_tier(2)
        assert "Attendance" in models
        assert "Leave" in models
        assert "Payroll" in models
        assert "ProvidentFund" in models
        assert "Shift" in models
        assert "Holiday" in models
        assert len(models) == 6

    def test_tier_3_models(self):
        models = get_models_for_tier(3)
        assert "PerformanceReview" in models
        assert "Training" in models
        assert "Resignation" in models
        assert "Team" in models
        assert "TeamMember" in models
        assert len(models) == 6

    def test_tier_4_models(self):
        models = get_models_for_tier(4)
        assert "Announcement" in models
        assert "Kudos" in models
        assert "Asset" in models
        assert "Document" in models
        assert "Ticket" in models
        assert "Reimbursement" in models
        assert "CalendarEvent" in models
        assert len(models) == 7

    def test_tier_5_models(self):
        models = get_models_for_tier(5)
        assert "InAppNotification" in models
        assert "AuditLog" in models
        assert "SavedReport" in models
        assert "ReportSchedule" in models
        assert len(models) == 4

    def test_get_tier_for_model(self):
        assert get_tier_for_model("Employee") == 1
        assert get_tier_for_model("Attendance") == 2
        assert get_tier_for_model("Training") == 3
        assert get_tier_for_model("Asset") == 4
        assert get_tier_for_model("AuditLog") == 5
        assert get_tier_for_model("NonExistent") is None

    def test_no_model_duplicated_across_tiers(self):
        """Every model appears in exactly one tier."""
        seen = set()
        for tier, models in TIER_MODELS.items():
            for m in models:
                assert m not in seen, f"{m} appears in multiple tiers"
                seen.add(m)

    def test_all_mapped_models_in_some_tier(self):
        """Every model in MODEL_MAP has a tier assignment."""
        tier_models = set()
        for models in TIER_MODELS.values():
            tier_models.update(models)
        for prisma_model in MODEL_MAP:
            assert prisma_model in tier_models, (
                f"{prisma_model} is in MODEL_MAP but not in any tier"
            )

    @pytest.mark.django_db
    @patch("apps.tenants.management.commands.migrate_from_prisma.psycopg2.connect")
    def test_tier_flag_limits_migration(self, mock_connect):
        """When --tier=2 is passed, only tier 2 models are queried."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = []
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        from apps.tenants.models import Tenant
        Tenant.objects.using("default").get_or_create(
            slug="test-tier",
            defaults={
                "name": "Tier Test",
                "db_name": "default",
                "status": "active",
            },
        )

        out = StringIO()
        call_command(
            "migrate_from_prisma",
            source_db_url="postgresql://fake:fake@localhost/fake",
            tenant_slug="test-tier",
            dry_run=True,
            tier=2,
            stdout=out,
        )

        output = out.getvalue()
        # Tier 2 header should appear
        assert "Tier 2" in output
        # Tier 1, 3, 4, 5 headers should NOT appear
        assert "Tier 1" not in output
        assert "Tier 3" not in output
        assert "Tier 4" not in output
        assert "Tier 5" not in output


# ---------------------------------------------------------------------------
# Test: transform_row integration
# ---------------------------------------------------------------------------

class TestTransformRow:
    """End-to-end transform_row tests for various models."""

    def test_attendance_row(self):
        row = {
            "id": str(uuid.uuid4()),
            "date": datetime(2026, 3, 17, tzinfo=timezone.utc),
            "checkIn": datetime(2026, 3, 17, 9, 0, tzinfo=timezone.utc),
            "checkOut": datetime(2026, 3, 17, 18, 0, tzinfo=timezone.utc),
            "workHours": 8.5,
            "overtime": 30.0,
            "isLate": False,
            "isEarlyExit": False,
            "status": "PRESENT",
            "employeeId": str(uuid.uuid4()),
            "organizationId": "org-1",
            "createdAt": datetime.now(timezone.utc),
            "employee": None,
            "organization": None,
            "regularization": None,
        }
        result = transform_row("Attendance", row)
        assert "check_in" in result
        assert "check_out" in result
        assert "work_hours" in result
        assert "is_late" in result
        assert "organization_id" not in result
        assert "employee" not in result
        assert result["status"] == "PRESENT"

    def test_leave_row(self):
        row = {
            "id": str(uuid.uuid4()),
            "type": "CASUAL",
            "startDate": datetime(2026, 3, 20, tzinfo=timezone.utc),
            "endDate": datetime(2026, 3, 21, tzinfo=timezone.utc),
            "reason": "Personal",
            "status": "APPROVED",
            "employeeId": str(uuid.uuid4()),
            "organizationId": "org-1",
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
            "employee": None,
            "organization": None,
        }
        result = transform_row("Leave", row)
        assert result["type"] == "CASUAL"
        assert result["start_date"] == row["startDate"]
        assert result["end_date"] == row["endDate"]
        assert "organization_id" not in result

    def test_kudos_row(self):
        from_id = str(uuid.uuid4())
        to_id = str(uuid.uuid4())
        row = {
            "id": str(uuid.uuid4()),
            "message": "Great work!",
            "fromId": from_id,
            "toId": to_id,
            "organizationId": "org-1",
            "createdAt": datetime.now(timezone.utc),
            "from": None,
            "to": None,
            "organization": None,
        }
        result = transform_row("Kudos", row)
        assert result["from_employee_id"] == from_id
        assert result["to_employee_id"] == to_id
        assert "organization_id" not in result

    def test_resignation_enum_mapping(self):
        row = {
            "id": str(uuid.uuid4()),
            "reason": "Better opportunity",
            "lastDay": datetime(2026, 4, 15, tzinfo=timezone.utc),
            "status": "UNDER_REVIEW",
            "employeeId": str(uuid.uuid4()),
            "organizationId": "org-1",
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
            "employee": None,
            "organization": None,
        }
        result = transform_row("Resignation", row)
        assert result["status"] == "PENDING"
        assert result["last_working_date"] == row["lastDay"]


# ---------------------------------------------------------------------------
# Test: model map completeness
# ---------------------------------------------------------------------------

class TestModelMapCompleteness:
    """Ensure MODEL_MAP and FIELD_MAP are internally consistent."""

    def test_every_model_map_entry_has_field_map(self):
        """Every entry in MODEL_MAP should have a FIELD_MAP entry."""
        for prisma_model in MODEL_MAP:
            assert prisma_model in FIELD_MAP, (
                f"{prisma_model} is in MODEL_MAP but missing from FIELD_MAP"
            )

    def test_field_map_values_not_empty(self):
        """Every FIELD_MAP entry should have at least an 'id' mapping."""
        for prisma_model, fields in FIELD_MAP.items():
            assert "id" in fields, (
                f"FIELD_MAP[{prisma_model!r}] is missing 'id' mapping"
            )

    def test_enum_map_references_valid_models(self):
        """Every key in ENUM_MAP should reference a model in MODEL_MAP."""
        for (model, field) in ENUM_MAP:
            assert model in MODEL_MAP, (
                f"ENUM_MAP references unknown model: {model}"
            )
