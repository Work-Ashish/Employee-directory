"""Tests for Leave API views."""

import datetime

import pytest

from apps.leave.models import Leave

LEAVE_URL = "/api/v1/leaves/"


def _detail_url(leave_id):
    return f"/api/v1/leaves/{leave_id}/"


# ── List ─────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_list_leaves_paginated(auth_client, employee):
    """GET /leaves/ returns paginated envelope for admin."""
    Leave.objects.create(
        employee=employee,
        type=Leave.LeaveType.CASUAL,
        start_date=datetime.date(2026, 4, 1),
        end_date=datetime.date(2026, 4, 2),
    )
    response = auth_client.get(LEAVE_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.django_db
def test_list_leaves_filtered_by_status(auth_client, employee):
    """GET /leaves/?status=PENDING returns only pending leaves."""
    Leave.objects.create(
        employee=employee,
        type=Leave.LeaveType.CASUAL,
        start_date=datetime.date(2026, 4, 1),
        end_date=datetime.date(2026, 4, 2),
        status=Leave.Status.PENDING,
    )
    Leave.objects.create(
        employee=employee,
        type=Leave.LeaveType.SICK,
        start_date=datetime.date(2026, 5, 1),
        end_date=datetime.date(2026, 5, 2),
        status=Leave.Status.APPROVED,
    )

    response = auth_client.get(LEAVE_URL, {"status": "PENDING"})
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["results"][0]["type"] == "CASUAL"


# ── Create ───────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_create_leave(auth_client, employee):
    """POST /leaves/ creates a leave request."""
    payload = {
        "type": "SICK",
        "start_date": "2026-06-01",
        "end_date": "2026-06-03",
        "reason": "Flu",
        "employee_id": str(employee.pk),
    }
    response = auth_client.post(LEAVE_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["type"] == "SICK"
    assert data["status"] == "PENDING"
    assert data["reason"] == "Flu"


@pytest.mark.django_db
def test_create_leave_end_before_start_rejected(auth_client, employee):
    """POST /leaves/ rejects if end_date < start_date."""
    payload = {
        "type": "CASUAL",
        "start_date": "2026-06-05",
        "end_date": "2026-06-01",
        "employee_id": str(employee.pk),
    }
    response = auth_client.post(LEAVE_URL, payload, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_create_leave_overlap_rejected(auth_client, employee):
    """POST /leaves/ rejects overlapping pending leaves."""
    Leave.objects.create(
        employee=employee,
        type=Leave.LeaveType.CASUAL,
        start_date=datetime.date(2026, 7, 1),
        end_date=datetime.date(2026, 7, 5),
        status=Leave.Status.PENDING,
    )

    payload = {
        "type": "SICK",
        "start_date": "2026-07-03",
        "end_date": "2026-07-07",
        "employee_id": str(employee.pk),
    }
    response = auth_client.post(LEAVE_URL, payload, format="json")
    assert response.status_code == 400


# ── Detail ───────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_get_leave_detail(auth_client, employee):
    """GET /leaves/{id}/ returns single leave."""
    leave = Leave.objects.create(
        employee=employee,
        type=Leave.LeaveType.EARNED,
        start_date=datetime.date(2026, 8, 1),
        end_date=datetime.date(2026, 8, 5),
    )
    response = auth_client.get(_detail_url(leave.pk))
    assert response.status_code == 200
    assert response.json()["id"] == str(leave.pk)


# ── Approve / Reject ─────────────────────────────────────────────────


@pytest.mark.django_db
def test_approve_leave(auth_client, employee):
    """PUT /leaves/{id}/ with status=APPROVED approves the leave."""
    leave = Leave.objects.create(
        employee=employee,
        type=Leave.LeaveType.CASUAL,
        start_date=datetime.date(2026, 9, 1),
        end_date=datetime.date(2026, 9, 2),
    )
    response = auth_client.put(
        _detail_url(leave.pk),
        {"status": "APPROVED"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"


@pytest.mark.django_db
def test_reject_leave(auth_client, employee):
    """PUT /leaves/{id}/ with status=REJECTED rejects the leave."""
    leave = Leave.objects.create(
        employee=employee,
        type=Leave.LeaveType.CASUAL,
        start_date=datetime.date(2026, 9, 10),
        end_date=datetime.date(2026, 9, 11),
    )
    response = auth_client.put(
        _detail_url(leave.pk),
        {"status": "REJECTED"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["status"] == "REJECTED"


@pytest.mark.django_db
def test_cannot_update_approved_leave(auth_client, employee):
    """PUT /leaves/{id}/ on already-approved leave returns 409."""
    leave = Leave.objects.create(
        employee=employee,
        type=Leave.LeaveType.CASUAL,
        start_date=datetime.date(2026, 10, 1),
        end_date=datetime.date(2026, 10, 2),
        status=Leave.Status.APPROVED,
    )
    response = auth_client.put(
        _detail_url(leave.pk),
        {"status": "REJECTED"},
        format="json",
    )
    assert response.status_code == 409


# ── Delete ───────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_delete_pending_leave(auth_client, employee):
    """DELETE /leaves/{id}/ deletes a pending leave."""
    leave = Leave.objects.create(
        employee=employee,
        type=Leave.LeaveType.UNPAID,
        start_date=datetime.date(2026, 11, 1),
        end_date=datetime.date(2026, 11, 3),
    )
    response = auth_client.delete(_detail_url(leave.pk))
    assert response.status_code == 204
    assert not Leave.objects.filter(pk=leave.pk).exists()


@pytest.mark.django_db
def test_cannot_delete_approved_leave(auth_client, employee):
    """DELETE /leaves/{id}/ on approved leave returns 400."""
    leave = Leave.objects.create(
        employee=employee,
        type=Leave.LeaveType.CASUAL,
        start_date=datetime.date(2026, 12, 1),
        end_date=datetime.date(2026, 12, 2),
        status=Leave.Status.APPROVED,
    )
    response = auth_client.delete(_detail_url(leave.pk))
    assert response.status_code == 400


# ── Unauthenticated ──────────────────────────────────────────────────


@pytest.mark.django_db
def test_unauthenticated_leaves(api_client):
    """Unauthenticated request returns 403."""
    response = api_client.get(LEAVE_URL)
    assert response.status_code == 403
