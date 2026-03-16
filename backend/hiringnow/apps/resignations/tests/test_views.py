"""Tests for Resignation API views."""

import datetime

import pytest

from apps.resignations.models import Resignation

RESIGN_URL = "/api/v1/resignations/"


def _detail_url(resign_id):
    return f"/api/v1/resignations/{resign_id}/"


# -- List ------------------------------------------------------------------


@pytest.mark.django_db
def test_list_resignations_paginated(auth_client, employee):
    """GET /resignations/ returns paginated envelope for admin."""
    Resignation.objects.create(
        employee=employee,
        reason="Personal reasons",
        last_working_date=datetime.date(2026, 5, 1),
    )
    response = auth_client.get(RESIGN_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.django_db
def test_list_resignations_filtered_by_status(auth_client, employee):
    """GET /resignations/?status=PENDING returns only pending resignations."""
    Resignation.objects.create(
        employee=employee,
        reason="Moving abroad",
        last_working_date=datetime.date(2026, 5, 15),
        status=Resignation.Status.PENDING,
    )
    Resignation.objects.create(
        employee=employee,
        reason="Career change",
        last_working_date=datetime.date(2026, 6, 1),
        status=Resignation.Status.APPROVED,
    )

    response = auth_client.get(RESIGN_URL, {"status": "PENDING"})
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["results"][0]["status"] == "PENDING"


# -- Create ----------------------------------------------------------------


@pytest.mark.django_db
def test_create_resignation(auth_client, employee):
    """POST /resignations/ creates a pending resignation."""
    payload = {
        "reason": "Better opportunity",
        "last_working_date": "2026-07-01",
        "employee_id": str(employee.pk),
    }
    response = auth_client.post(RESIGN_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["status"] == "PENDING"
    assert data["reason"] == "Better opportunity"


@pytest.mark.django_db
def test_create_duplicate_pending_rejected(auth_client, employee):
    """POST /resignations/ rejects if employee already has a pending resignation."""
    Resignation.objects.create(
        employee=employee,
        reason="First attempt",
        last_working_date=datetime.date(2026, 8, 1),
        status=Resignation.Status.PENDING,
    )
    payload = {
        "reason": "Second attempt",
        "last_working_date": "2026-09-01",
        "employee_id": str(employee.pk),
    }
    response = auth_client.post(RESIGN_URL, payload, format="json")
    assert response.status_code == 400


# -- Detail ----------------------------------------------------------------


@pytest.mark.django_db
def test_get_resignation_detail(auth_client, employee):
    """GET /resignations/{id}/ returns single resignation."""
    resignation = Resignation.objects.create(
        employee=employee,
        reason="Relocating",
        last_working_date=datetime.date(2026, 6, 15),
    )
    response = auth_client.get(_detail_url(resignation.pk))
    assert response.status_code == 200
    assert response.json()["id"] == str(resignation.pk)


# -- Approve / Reject -----------------------------------------------------


@pytest.mark.django_db
def test_approve_resignation(auth_client, employee):
    """PUT /resignations/{id}/ with status=APPROVED approves the resignation."""
    resignation = Resignation.objects.create(
        employee=employee,
        reason="Personal",
        last_working_date=datetime.date(2026, 7, 15),
    )
    response = auth_client.put(
        _detail_url(resignation.pk),
        {"status": "APPROVED"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"


@pytest.mark.django_db
def test_reject_resignation(auth_client, employee):
    """PUT /resignations/{id}/ with status=REJECTED rejects the resignation."""
    resignation = Resignation.objects.create(
        employee=employee,
        reason="Personal",
        last_working_date=datetime.date(2026, 8, 15),
    )
    response = auth_client.put(
        _detail_url(resignation.pk),
        {"status": "REJECTED"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["status"] == "REJECTED"


@pytest.mark.django_db
def test_cannot_update_approved_resignation(auth_client, employee):
    """PUT /resignations/{id}/ on already-approved resignation returns 409."""
    resignation = Resignation.objects.create(
        employee=employee,
        reason="Done",
        last_working_date=datetime.date(2026, 9, 1),
        status=Resignation.Status.APPROVED,
    )
    response = auth_client.put(
        _detail_url(resignation.pk),
        {"status": "REJECTED"},
        format="json",
    )
    assert response.status_code == 409


# -- Unauthenticated ------------------------------------------------------


@pytest.mark.django_db
def test_unauthenticated_resignations(api_client):
    """Unauthenticated request returns 403."""
    response = api_client.get(RESIGN_URL)
    assert response.status_code == 403
