"""Tests for Time Tracker API views."""

from django.utils import timezone

import pytest

from apps.timetracker.models import TimeSession, BreakEntry, ActivityLog

BASE_URL = "/api/v1/time-tracker/"
CHECKIN_URL = "/api/v1/time-tracker/check-in/"
CHECKOUT_URL = "/api/v1/time-tracker/check-out/"
BREAK_URL = "/api/v1/time-tracker/break/"
ACTIVITY_URL = "/api/v1/time-tracker/activity/"
STATUS_URL = "/api/v1/time-tracker/status/"


# -- List ------------------------------------------------------------------


@pytest.mark.django_db
def test_list_sessions_paginated(auth_client, employee):
    """GET /time-tracker/ returns paginated envelope for admin."""
    TimeSession.objects.create(
        employee=employee,
        start_time=timezone.now(),
        status=TimeSession.Status.ACTIVE,
    )
    response = auth_client.get(BASE_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 1


# -- Check-In -------------------------------------------------------------


@pytest.mark.django_db
def test_check_in(auth_client, employee):
    """POST /time-tracker/check-in/ creates an active session."""
    response = auth_client.post(CHECKIN_URL)
    assert response.status_code == 201

    data = response.json()
    assert data["status"] == "ACTIVE"
    assert data["employee"] == str(employee.pk)


@pytest.mark.django_db
def test_check_in_duplicate_rejected(auth_client, employee):
    """POST /time-tracker/check-in/ with existing active session returns 409."""
    TimeSession.objects.create(
        employee=employee,
        start_time=timezone.now(),
        status=TimeSession.Status.ACTIVE,
    )
    response = auth_client.post(CHECKIN_URL)
    assert response.status_code == 409


# -- Check-Out -------------------------------------------------------------


@pytest.mark.django_db
def test_check_out(auth_client, employee):
    """POST /time-tracker/check-out/ completes the active session."""
    TimeSession.objects.create(
        employee=employee,
        start_time=timezone.now(),
        status=TimeSession.Status.ACTIVE,
    )
    response = auth_client.post(CHECKOUT_URL)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "COMPLETED"
    assert data["end_time"] is not None


@pytest.mark.django_db
def test_check_out_no_session(auth_client, employee):
    """POST /time-tracker/check-out/ with no active session returns 404."""
    response = auth_client.post(CHECKOUT_URL)
    assert response.status_code == 404


# -- Break -----------------------------------------------------------------


@pytest.mark.django_db
def test_break_start(auth_client, employee):
    """POST /time-tracker/break/ with action=start creates a break."""
    TimeSession.objects.create(
        employee=employee,
        start_time=timezone.now(),
        status=TimeSession.Status.ACTIVE,
    )
    response = auth_client.post(
        BREAK_URL,
        {"action": "start", "type": "LUNCH"},
        format="json",
    )
    assert response.status_code == 201
    assert response.json()["type"] == "LUNCH"
    assert response.json()["end_time"] is None


@pytest.mark.django_db
def test_break_end(auth_client, employee):
    """POST /time-tracker/break/ with action=end closes the open break."""
    session = TimeSession.objects.create(
        employee=employee,
        start_time=timezone.now(),
        status=TimeSession.Status.PAUSED,
    )
    BreakEntry.objects.create(
        session=session,
        start_time=timezone.now(),
        type=BreakEntry.BreakType.SHORT,
    )
    response = auth_client.post(
        BREAK_URL,
        {"action": "end"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["end_time"] is not None


@pytest.mark.django_db
def test_break_start_duplicate_rejected(auth_client, employee):
    """POST /time-tracker/break/ action=start while break open returns 409."""
    session = TimeSession.objects.create(
        employee=employee,
        start_time=timezone.now(),
        status=TimeSession.Status.PAUSED,
    )
    BreakEntry.objects.create(
        session=session,
        start_time=timezone.now(),
        type=BreakEntry.BreakType.SHORT,
    )
    response = auth_client.post(
        BREAK_URL,
        {"action": "start"},
        format="json",
    )
    assert response.status_code == 409


# -- Activity --------------------------------------------------------------


@pytest.mark.django_db
def test_activity_list(auth_client, employee):
    """GET /time-tracker/activity/?session_id=... returns activity logs."""
    session = TimeSession.objects.create(
        employee=employee,
        start_time=timezone.now(),
        status=TimeSession.Status.ACTIVE,
    )
    ActivityLog.objects.create(
        session=session,
        app="VS Code",
        title="Editing main.py",
        duration=300,
        category="Development",
    )
    response = auth_client.get(ACTIVITY_URL, {"session_id": str(session.pk)})
    assert response.status_code == 200

    data = response.json()
    assert data["total"] == 1
    assert data["results"][0]["app"] == "VS Code"


@pytest.mark.django_db
def test_activity_missing_session_id(auth_client, employee):
    """GET /time-tracker/activity/ without session_id returns 400."""
    response = auth_client.get(ACTIVITY_URL)
    assert response.status_code == 400


# -- Status ----------------------------------------------------------------


@pytest.mark.django_db
def test_status_with_active_session(auth_client, employee):
    """GET /time-tracker/status/ returns the active session."""
    session = TimeSession.objects.create(
        employee=employee,
        start_time=timezone.now(),
        status=TimeSession.Status.ACTIVE,
    )
    response = auth_client.get(STATUS_URL)
    assert response.status_code == 200
    assert response.json()["session"] is not None
    assert response.json()["session"]["id"] == str(session.pk)


@pytest.mark.django_db
def test_status_no_active_session(auth_client, employee):
    """GET /time-tracker/status/ returns null when no active session."""
    response = auth_client.get(STATUS_URL)
    assert response.status_code == 200
    assert response.json()["session"] is None


# -- Unauthenticated -------------------------------------------------------


@pytest.mark.django_db
def test_unauthenticated_time_tracker(api_client):
    """Unauthenticated request returns 403."""
    response = api_client.get(BASE_URL)
    assert response.status_code == 403


@pytest.mark.django_db
def test_unauthenticated_check_in(api_client):
    """Unauthenticated check-in returns 403."""
    response = api_client.post(CHECKIN_URL)
    assert response.status_code == 403
