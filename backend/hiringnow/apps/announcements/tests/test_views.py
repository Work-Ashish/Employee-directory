"""Tests for Announcement and Kudos API views."""

import pytest

from apps.announcements.models import Announcement, Kudos

ANNOUNCEMENT_URL = "/api/v1/announcements/"
KUDOS_URL = "/api/v1/kudos/"


def _announcement_detail_url(pk):
    return f"/api/v1/announcements/{pk}/"


def _kudos_detail_url(pk):
    return f"/api/v1/kudos/{pk}/"


# =========================================================================
# Announcements
# =========================================================================


# -- List -----------------------------------------------------------------


@pytest.mark.django_db
def test_list_announcements_paginated(auth_client, employee):
    """GET /announcements/ returns paginated envelope for admin."""
    Announcement.objects.create(
        title="Q1 Town Hall",
        content="Join us for the quarterly town hall.",
        priority=Announcement.Priority.NORMAL,
        created_by=employee,
    )
    response = auth_client.get(ANNOUNCEMENT_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 1


# -- Create ---------------------------------------------------------------


@pytest.mark.django_db
def test_create_announcement(auth_client, employee):
    """POST /announcements/ creates an announcement."""
    payload = {
        "title": "Office Closure",
        "content": "Office will be closed on Friday.",
        "priority": "HIGH",
    }
    response = auth_client.post(ANNOUNCEMENT_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["title"] == "Office Closure"
    assert data["priority"] == "HIGH"
    assert data["is_active"] is True


# -- Detail ---------------------------------------------------------------


@pytest.mark.django_db
def test_get_announcement_detail(auth_client, employee):
    """GET /announcements/{id}/ returns single announcement."""
    ann = Announcement.objects.create(
        title="Holiday Notice",
        content="Holiday on Monday.",
        created_by=employee,
    )
    response = auth_client.get(_announcement_detail_url(ann.pk))
    assert response.status_code == 200
    assert response.json()["id"] == str(ann.pk)
    assert response.json()["title"] == "Holiday Notice"


# -- Update ---------------------------------------------------------------


@pytest.mark.django_db
def test_update_announcement(auth_client, employee):
    """PUT /announcements/{id}/ updates an announcement."""
    ann = Announcement.objects.create(
        title="Draft Announcement",
        content="Draft content.",
        created_by=employee,
    )
    response = auth_client.put(
        _announcement_detail_url(ann.pk),
        {"title": "Final Announcement", "priority": "URGENT"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Final Announcement"
    assert response.json()["priority"] == "URGENT"


# -- Delete ---------------------------------------------------------------


@pytest.mark.django_db
def test_delete_announcement(auth_client, employee):
    """DELETE /announcements/{id}/ deletes an announcement."""
    ann = Announcement.objects.create(
        title="Old News",
        content="Outdated content.",
        created_by=employee,
    )
    response = auth_client.delete(_announcement_detail_url(ann.pk))
    assert response.status_code == 204
    assert not Announcement.objects.filter(pk=ann.pk).exists()


# =========================================================================
# Kudos
# =========================================================================


# -- List -----------------------------------------------------------------


@pytest.mark.django_db
def test_list_kudos_paginated(auth_client, employee, employee2):
    """GET /kudos/ returns paginated envelope for admin."""
    Kudos.objects.create(
        from_employee=employee,
        to_employee=employee2,
        message="Great teamwork on the release!",
        category=Kudos.Category.TEAMWORK,
    )
    response = auth_client.get(KUDOS_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 1


# -- Create ---------------------------------------------------------------


@pytest.mark.django_db
def test_create_kudos(auth_client, employee, employee2):
    """POST /kudos/ gives kudos to a colleague."""
    payload = {
        "to_employee_id": str(employee2.pk),
        "message": "Thanks for the code review!",
        "category": "HELPING",
    }
    response = auth_client.post(KUDOS_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["message"] == "Thanks for the code review!"
    assert data["category"] == "HELPING"
    assert data["is_public"] is True


@pytest.mark.django_db
def test_create_kudos_self_rejected(auth_client, employee):
    """POST /kudos/ rejects giving kudos to yourself."""
    payload = {
        "to_employee_id": str(employee.pk),
        "message": "Self-kudos attempt",
    }
    response = auth_client.post(KUDOS_URL, payload, format="json")
    assert response.status_code == 400


# -- Delete ---------------------------------------------------------------


@pytest.mark.django_db
def test_delete_kudos(auth_client, employee, employee2):
    """DELETE /kudos/{id}/ deletes a kudos entry."""
    kudos = Kudos.objects.create(
        from_employee=employee,
        to_employee=employee2,
        message="Removing this kudos.",
    )
    response = auth_client.delete(_kudos_detail_url(kudos.pk))
    assert response.status_code == 204
    assert not Kudos.objects.filter(pk=kudos.pk).exists()


# =========================================================================
# Unauthenticated
# =========================================================================


@pytest.mark.django_db
def test_unauthenticated_announcements(api_client):
    """Unauthenticated request to announcements returns 403."""
    response = api_client.get(ANNOUNCEMENT_URL)
    assert response.status_code == 403


@pytest.mark.django_db
def test_unauthenticated_kudos(api_client):
    """Unauthenticated request to kudos returns 403."""
    response = api_client.get(KUDOS_URL)
    assert response.status_code == 403
