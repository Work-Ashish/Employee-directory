"""Tests for Reimbursement API views."""

from decimal import Decimal

import pytest

from apps.reimbursements.models import Reimbursement

REIMBURSEMENT_URL = "/api/v1/reimbursements/"


def _detail_url(reimbursement_id):
    return f"/api/v1/reimbursements/{reimbursement_id}/"


# -- List -----------------------------------------------------------------


@pytest.mark.django_db
def test_list_reimbursements_paginated(auth_client, employee):
    """GET /reimbursements/ returns paginated envelope for admin."""
    Reimbursement.objects.create(
        employee=employee,
        amount=Decimal("150.00"),
        category=Reimbursement.Category.TRAVEL,
        description="Cab fare to office",
    )
    response = auth_client.get(REIMBURSEMENT_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.django_db
def test_list_reimbursements_filtered_by_status(auth_client, employee):
    """GET /reimbursements/?status=PENDING returns only pending claims."""
    Reimbursement.objects.create(
        employee=employee,
        amount=Decimal("100.00"),
        category=Reimbursement.Category.FOOD,
        status=Reimbursement.Status.PENDING,
    )
    Reimbursement.objects.create(
        employee=employee,
        amount=Decimal("200.00"),
        category=Reimbursement.Category.EQUIPMENT,
        status=Reimbursement.Status.APPROVED,
    )

    response = auth_client.get(REIMBURSEMENT_URL, {"status": "PENDING"})
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["results"][0]["status"] == "PENDING"


# -- Create ---------------------------------------------------------------


@pytest.mark.django_db
def test_create_reimbursement(auth_client, employee):
    """POST /reimbursements/ creates a reimbursement claim."""
    payload = {
        "amount": "250.50",
        "category": "MEDICAL",
        "description": "Doctor visit",
        "receipt_url": "https://example.com/receipt.pdf",
    }
    response = auth_client.post(REIMBURSEMENT_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["amount"] == "250.50"
    assert data["category"] == "MEDICAL"
    assert data["status"] == "PENDING"
    assert data["description"] == "Doctor visit"


@pytest.mark.django_db
def test_create_reimbursement_minimal(auth_client, employee):
    """POST /reimbursements/ with minimal required fields."""
    payload = {
        "amount": "50.00",
        "category": "OTHER",
    }
    response = auth_client.post(REIMBURSEMENT_URL, payload, format="json")
    assert response.status_code == 201
    assert response.json()["status"] == "PENDING"


# -- Detail ---------------------------------------------------------------


@pytest.mark.django_db
def test_get_reimbursement_detail(auth_client, employee):
    """GET /reimbursements/{id}/ returns single reimbursement."""
    reimbursement = Reimbursement.objects.create(
        employee=employee,
        amount=Decimal("300.00"),
        category=Reimbursement.Category.EQUIPMENT,
        description="Keyboard purchase",
    )
    response = auth_client.get(_detail_url(reimbursement.pk))
    assert response.status_code == 200
    assert response.json()["id"] == str(reimbursement.pk)
    assert response.json()["description"] == "Keyboard purchase"


# -- Approve / Reject -----------------------------------------------------


@pytest.mark.django_db
def test_approve_reimbursement(auth_client, employee):
    """PUT /reimbursements/{id}/ with status=APPROVED approves the claim."""
    reimbursement = Reimbursement.objects.create(
        employee=employee,
        amount=Decimal("500.00"),
        category=Reimbursement.Category.TRAVEL,
    )
    response = auth_client.put(
        _detail_url(reimbursement.pk),
        {"status": "APPROVED"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"


@pytest.mark.django_db
def test_reject_reimbursement(auth_client, employee):
    """PUT /reimbursements/{id}/ with status=REJECTED rejects the claim."""
    reimbursement = Reimbursement.objects.create(
        employee=employee,
        amount=Decimal("75.00"),
        category=Reimbursement.Category.FOOD,
    )
    response = auth_client.put(
        _detail_url(reimbursement.pk),
        {"status": "REJECTED"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["status"] == "REJECTED"


@pytest.mark.django_db
def test_cannot_update_paid_reimbursement(auth_client, employee):
    """PUT /reimbursements/{id}/ on a paid reimbursement returns 409."""
    reimbursement = Reimbursement.objects.create(
        employee=employee,
        amount=Decimal("1000.00"),
        category=Reimbursement.Category.MEDICAL,
        status=Reimbursement.Status.PAID,
    )
    response = auth_client.put(
        _detail_url(reimbursement.pk),
        {"status": "APPROVED"},
        format="json",
    )
    assert response.status_code == 409


# -- Unauthenticated -----------------------------------------------------


@pytest.mark.django_db
def test_unauthenticated_reimbursements_list(api_client):
    """Unauthenticated request to list returns 403."""
    response = api_client.get(REIMBURSEMENT_URL)
    assert response.status_code == 403


@pytest.mark.django_db
def test_unauthenticated_reimbursements_create(api_client):
    """Unauthenticated request to create returns 403."""
    payload = {"amount": "100.00", "category": "OTHER"}
    response = api_client.post(REIMBURSEMENT_URL, payload, format="json")
    assert response.status_code == 403
