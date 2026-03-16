"""Tests for Attendance API views."""

import datetime

import pytest

from apps.attendance.models import Attendance, Holiday, Shift, AttendancePolicy

ATTENDANCE_URL = "/api/v1/attendance/"
SHIFT_URL = "/api/v1/attendance/shifts/"
SHIFT_ASSIGN_URL = "/api/v1/attendance/shifts/assign/"
POLICY_URL = "/api/v1/attendance/policy/"
HOLIDAY_URL = "/api/v1/attendance/holidays/"
REGULARIZATION_URL = "/api/v1/attendance/regularization/"
TIME_SESSION_URL = "/api/v1/attendance/time-sessions/"


def _detail_url(attendance_id):
    return f"/api/v1/attendance/{attendance_id}/"


# ── Attendance CRUD ──────────────────────────────────────────────────


@pytest.mark.django_db
def test_list_attendance_paginated(auth_client, employee):
    """GET /attendance/ returns paginated envelope."""
    Attendance.objects.create(
        employee=employee, date=datetime.date.today(), status=Attendance.Status.PRESENT,
    )
    response = auth_client.get(ATTENDANCE_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.django_db
def test_create_attendance(auth_client, employee):
    """POST /attendance/ creates an attendance record."""
    payload = {
        "employee_id": str(employee.pk),
        "date": "2026-03-15",
        "status": "PRESENT",
    }
    response = auth_client.post(ATTENDANCE_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["status"] == "PRESENT"
    assert data["date"] == "2026-03-15"


@pytest.mark.django_db
def test_filter_attendance_by_date(auth_client, employee):
    """GET /attendance/?date=... filters by date."""
    Attendance.objects.create(
        employee=employee, date=datetime.date(2026, 3, 10), status=Attendance.Status.PRESENT,
    )
    Attendance.objects.create(
        employee=employee, date=datetime.date(2026, 3, 11), status=Attendance.Status.ABSENT,
    )

    response = auth_client.get(ATTENDANCE_URL, {"date": "2026-03-10"})
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["results"][0]["status"] == "PRESENT"


@pytest.mark.django_db
def test_attendance_detail(auth_client, employee):
    """GET /attendance/{id}/ returns single record."""
    att = Attendance.objects.create(
        employee=employee, date=datetime.date.today(), status=Attendance.Status.HALF_DAY,
    )
    response = auth_client.get(_detail_url(att.pk))
    assert response.status_code == 200
    assert response.json()["id"] == str(att.pk)
    assert response.json()["status"] == "HALF_DAY"


@pytest.mark.django_db
def test_update_attendance(auth_client, employee):
    """PUT /attendance/{id}/ updates fields."""
    att = Attendance.objects.create(
        employee=employee, date=datetime.date.today(), status=Attendance.Status.PRESENT,
    )
    response = auth_client.put(
        _detail_url(att.pk),
        {"status": "HALF_DAY"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["status"] == "HALF_DAY"


@pytest.mark.django_db
def test_delete_attendance(auth_client, employee):
    """DELETE /attendance/{id}/ removes the record."""
    att = Attendance.objects.create(
        employee=employee, date=datetime.date.today(), status=Attendance.Status.PRESENT,
    )
    response = auth_client.delete(_detail_url(att.pk))
    assert response.status_code == 204
    assert not Attendance.objects.filter(pk=att.pk).exists()


# ── Shifts ───────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_list_shifts(auth_client):
    """GET /attendance/shifts/ returns all shifts."""
    Shift.objects.create(
        name="Morning", start_time="09:00", end_time="17:00", work_days=[0, 1, 2, 3, 4],
    )
    response = auth_client.get(SHIFT_URL)
    assert response.status_code == 200
    assert len(response.json()) >= 1


@pytest.mark.django_db
def test_create_shift(auth_client):
    """POST /attendance/shifts/ creates a shift."""
    payload = {
        "name": "Night Shift",
        "start_time": "22:00",
        "end_time": "06:00",
        "work_days": [0, 1, 2, 3, 4],
    }
    response = auth_client.post(SHIFT_URL, payload, format="json")
    assert response.status_code == 201
    assert response.json()["name"] == "Night Shift"


@pytest.mark.django_db
def test_assign_shift(auth_client, employee):
    """POST /attendance/shifts/assign/ assigns shift to employee."""
    shift = Shift.objects.create(
        name="General", start_time="09:00", end_time="18:00", work_days=[0, 1, 2, 3, 4],
    )
    payload = {
        "employee_id": str(employee.pk),
        "shift_id": str(shift.pk),
        "start_date": "2026-04-01",
    }
    response = auth_client.post(SHIFT_ASSIGN_URL, payload, format="json")
    assert response.status_code == 201
    assert response.json()["start_date"] == "2026-04-01"


# ── Policy ───────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_get_default_policy(auth_client):
    """GET /attendance/policy/ returns defaults when no policy exists."""
    response = auth_client.get(POLICY_URL)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "DEFAULT"
    assert data["late_grace_period"] == 15


@pytest.mark.django_db
def test_create_policy(auth_client):
    """POST /attendance/policy/ creates/upserts a policy."""
    payload = {
        "name": "STRICT",
        "late_grace_period": 5,
        "early_exit_grace": 10,
        "ot_threshold": 30,
    }
    response = auth_client.post(POLICY_URL, payload, format="json")
    assert response.status_code == 201
    assert response.json()["late_grace_period"] == 5


# ── Holidays ─────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_list_holidays(auth_client):
    """GET /attendance/holidays/ lists holidays."""
    Holiday.objects.create(name="New Year", date=datetime.date(2026, 1, 1))
    response = auth_client.get(HOLIDAY_URL)
    assert response.status_code == 200
    assert len(response.json()) >= 1


@pytest.mark.django_db
def test_create_holiday(auth_client):
    """POST /attendance/holidays/ creates a holiday."""
    payload = {"name": "Republic Day", "date": "2026-01-26", "is_optional": False}
    response = auth_client.post(HOLIDAY_URL, payload, format="json")
    assert response.status_code == 201
    assert response.json()["name"] == "Republic Day"


@pytest.mark.django_db
def test_filter_holidays_by_year(auth_client):
    """GET /attendance/holidays/?year=2026 filters by year."""
    Holiday.objects.create(name="H1", date=datetime.date(2026, 5, 1))
    Holiday.objects.create(name="H2", date=datetime.date(2025, 5, 1))

    response = auth_client.get(HOLIDAY_URL, {"year": "2026"})
    assert response.status_code == 200
    names = [h["name"] for h in response.json()]
    assert "H1" in names
    assert "H2" not in names


# ── Unauthenticated ──────────────────────────────────────────────────


@pytest.mark.django_db
def test_unauthenticated_attendance(api_client):
    """Unauthenticated request returns 403."""
    response = api_client.get(ATTENDANCE_URL)
    assert response.status_code == 403
