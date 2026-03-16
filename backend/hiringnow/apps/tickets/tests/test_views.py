"""Tests for Ticket API views."""

import pytest

from apps.tickets.models import Ticket

TICKET_URL = "/api/v1/tickets/"


def _detail_url(ticket_id):
    return f"/api/v1/tickets/{ticket_id}/"


# -- List -----------------------------------------------------------------


@pytest.mark.django_db
def test_list_tickets_paginated(auth_client, employee):
    """GET /tickets/ returns paginated envelope for admin."""
    Ticket.objects.create(
        subject="Laptop not working",
        description="Screen flicker issue",
        category=Ticket.Category.IT,
        priority=Ticket.Priority.HIGH,
        created_by=employee,
    )
    response = auth_client.get(TICKET_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.django_db
def test_list_tickets_filtered_by_status(auth_client, employee):
    """GET /tickets/?status=OPEN returns only open tickets."""
    Ticket.objects.create(
        subject="Open ticket",
        category=Ticket.Category.IT,
        status=Ticket.Status.OPEN,
        created_by=employee,
    )
    Ticket.objects.create(
        subject="Resolved ticket",
        category=Ticket.Category.HR,
        status=Ticket.Status.RESOLVED,
        created_by=employee,
    )

    response = auth_client.get(TICKET_URL, {"status": "OPEN"})
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["results"][0]["status"] == "OPEN"


# -- Create ---------------------------------------------------------------


@pytest.mark.django_db
def test_create_ticket(auth_client, employee):
    """POST /tickets/ creates a ticket."""
    payload = {
        "subject": "VPN access request",
        "description": "Need VPN for remote work",
        "category": "IT",
        "priority": "MEDIUM",
    }
    response = auth_client.post(TICKET_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["subject"] == "VPN access request"
    assert data["status"] == "OPEN"
    assert data["priority"] == "MEDIUM"


@pytest.mark.django_db
def test_create_ticket_defaults(auth_client, employee):
    """POST /tickets/ with minimal fields uses defaults."""
    payload = {"subject": "General query"}
    response = auth_client.post(TICKET_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["category"] == "OTHER"
    assert data["priority"] == "MEDIUM"
    assert data["status"] == "OPEN"


# -- Detail ---------------------------------------------------------------


@pytest.mark.django_db
def test_get_ticket_detail(auth_client, employee):
    """GET /tickets/{id}/ returns single ticket."""
    ticket = Ticket.objects.create(
        subject="Payslip error",
        category=Ticket.Category.FINANCE,
        created_by=employee,
    )
    response = auth_client.get(_detail_url(ticket.pk))
    assert response.status_code == 200
    assert response.json()["id"] == str(ticket.pk)
    assert response.json()["subject"] == "Payslip error"


# -- Update ---------------------------------------------------------------


@pytest.mark.django_db
def test_update_ticket_status(auth_client, employee):
    """PUT /tickets/{id}/ updates ticket status."""
    ticket = Ticket.objects.create(
        subject="Broken chair",
        category=Ticket.Category.FACILITIES,
        created_by=employee,
    )
    response = auth_client.put(
        _detail_url(ticket.pk),
        {"status": "IN_PROGRESS"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["status"] == "IN_PROGRESS"


@pytest.mark.django_db
def test_cannot_update_closed_ticket(auth_client, employee):
    """PUT /tickets/{id}/ on a closed ticket returns 409."""
    ticket = Ticket.objects.create(
        subject="Old issue",
        category=Ticket.Category.IT,
        status=Ticket.Status.CLOSED,
        created_by=employee,
    )
    response = auth_client.put(
        _detail_url(ticket.pk),
        {"status": "OPEN"},
        format="json",
    )
    assert response.status_code == 409


# -- Unauthenticated -----------------------------------------------------


@pytest.mark.django_db
def test_unauthenticated_tickets_list(api_client):
    """Unauthenticated request to list returns 403."""
    response = api_client.get(TICKET_URL)
    assert response.status_code == 403


@pytest.mark.django_db
def test_unauthenticated_tickets_create(api_client):
    """Unauthenticated request to create returns 403."""
    payload = {"subject": "Unauthorized ticket"}
    response = api_client.post(TICKET_URL, payload, format="json")
    assert response.status_code == 403
