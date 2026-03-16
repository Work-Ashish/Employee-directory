"""Tests for Calendar Event API views."""

import pytest

from apps.events.models import CalendarEvent

EVENTS_URL = "/api/v1/events/"


def _detail_url(event_id):
    return f"/api/v1/events/{event_id}/"


# -- List ------------------------------------------------------------------


@pytest.mark.django_db
def test_list_events_paginated(auth_client, employee):
    """GET /events/ returns paginated envelope for admin."""
    CalendarEvent.objects.create(
        title="Sprint Planning",
        start_date="2026-04-01T09:00:00Z",
        end_date="2026-04-01T10:00:00Z",
        type=CalendarEvent.EventType.MEETING,
        created_by=employee,
    )
    response = auth_client.get(EVENTS_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.django_db
def test_list_events_filtered_by_type(auth_client, employee):
    """GET /events/?type=MEETING returns only meetings."""
    CalendarEvent.objects.create(
        title="Team Standup",
        start_date="2026-04-02T09:00:00Z",
        end_date="2026-04-02T09:30:00Z",
        type=CalendarEvent.EventType.MEETING,
        created_by=employee,
    )
    CalendarEvent.objects.create(
        title="National Holiday",
        start_date="2026-04-14T00:00:00Z",
        end_date="2026-04-14T23:59:00Z",
        type=CalendarEvent.EventType.HOLIDAY,
        is_all_day=True,
        created_by=employee,
    )

    response = auth_client.get(EVENTS_URL, {"type": "MEETING"})
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["results"][0]["type"] == "MEETING"


# -- Create ----------------------------------------------------------------


@pytest.mark.django_db
def test_create_event(auth_client, employee):
    """POST /events/ creates a calendar event."""
    payload = {
        "title": "Quarterly Review",
        "description": "Q2 review meeting",
        "start_date": "2026-06-01T14:00:00Z",
        "end_date": "2026-06-01T16:00:00Z",
        "type": "MEETING",
    }
    response = auth_client.post(EVENTS_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["title"] == "Quarterly Review"
    assert data["type"] == "MEETING"


@pytest.mark.django_db
def test_create_event_end_before_start_rejected(auth_client, employee):
    """POST /events/ rejects if end_date < start_date."""
    payload = {
        "title": "Invalid Event",
        "start_date": "2026-06-10T16:00:00Z",
        "end_date": "2026-06-10T14:00:00Z",
        "type": "MEETING",
    }
    response = auth_client.post(EVENTS_URL, payload, format="json")
    assert response.status_code == 400


# -- Detail ----------------------------------------------------------------


@pytest.mark.django_db
def test_get_event_detail(auth_client, employee):
    """GET /events/{id}/ returns single event."""
    event = CalendarEvent.objects.create(
        title="1:1 with Manager",
        start_date="2026-05-10T10:00:00Z",
        end_date="2026-05-10T10:30:00Z",
        type=CalendarEvent.EventType.MEETING,
        created_by=employee,
    )
    response = auth_client.get(_detail_url(event.pk))
    assert response.status_code == 200
    assert response.json()["id"] == str(event.pk)


# -- Update ----------------------------------------------------------------


@pytest.mark.django_db
def test_update_event(auth_client, employee):
    """PUT /events/{id}/ updates an event."""
    event = CalendarEvent.objects.create(
        title="Old Title",
        start_date="2026-05-15T09:00:00Z",
        end_date="2026-05-15T10:00:00Z",
        type=CalendarEvent.EventType.MEETING,
        created_by=employee,
    )
    response = auth_client.put(
        _detail_url(event.pk),
        {"title": "Updated Title"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Title"


# -- Delete ----------------------------------------------------------------


@pytest.mark.django_db
def test_delete_event(auth_client, employee):
    """DELETE /events/{id}/ deletes the event."""
    event = CalendarEvent.objects.create(
        title="Disposable Event",
        start_date="2026-07-01T09:00:00Z",
        end_date="2026-07-01T10:00:00Z",
        type=CalendarEvent.EventType.MEETING,
        created_by=employee,
    )
    response = auth_client.delete(_detail_url(event.pk))
    assert response.status_code == 204
    assert not CalendarEvent.objects.filter(pk=event.pk).exists()


# -- Unauthenticated ------------------------------------------------------


@pytest.mark.django_db
def test_unauthenticated_events(api_client):
    """Unauthenticated request returns 403."""
    response = api_client.get(EVENTS_URL)
    assert response.status_code == 403
