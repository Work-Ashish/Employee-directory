"""Tests for Session API views."""

import pytest

from apps.sessions.models import UserSession

SESSION_URL = "/api/v1/sessions/"


def _detail_url(session_id):
    return f"/api/v1/sessions/{session_id}/"


# -- List ------------------------------------------------------------------


@pytest.mark.django_db
def test_list_sessions_paginated(auth_client, user):
    """GET /sessions/ returns paginated envelope for admin."""
    UserSession.objects.create(
        user=user,
        ip_address="192.168.1.10",
        user_agent="TestBrowser/1.0",
    )
    response = auth_client.get(SESSION_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.django_db
def test_list_sessions_filter_active(auth_client, user):
    """GET /sessions/?is_active=true returns only active sessions."""
    UserSession.objects.create(user=user, ip_address="10.0.0.1", is_active=True)
    UserSession.objects.create(user=user, ip_address="10.0.0.2", is_active=False)

    response = auth_client.get(SESSION_URL, {"is_active": "true"})
    assert response.status_code == 200
    assert response.json()["total"] == 1


@pytest.mark.django_db
def test_list_sessions_shows_user_email(auth_client, user):
    """GET /sessions/ includes user_email in each result."""
    UserSession.objects.create(user=user, ip_address="10.0.0.1")

    response = auth_client.get(SESSION_URL)
    assert response.status_code == 200
    assert response.json()["results"][0]["user_email"] == user.email


# -- Terminate -------------------------------------------------------------


@pytest.mark.django_db
def test_terminate_session(auth_client, user):
    """DELETE /sessions/{id}/ deactivates an active session."""
    session = UserSession.objects.create(
        user=user,
        ip_address="172.16.0.1",
        user_agent="Chrome/120",
        is_active=True,
    )
    response = auth_client.delete(_detail_url(session.pk))
    assert response.status_code == 204

    session.refresh_from_db()
    assert session.is_active is False


@pytest.mark.django_db
def test_terminate_already_inactive_session(auth_client, user):
    """DELETE /sessions/{id}/ on already-terminated session returns 400."""
    session = UserSession.objects.create(
        user=user,
        ip_address="172.16.0.2",
        is_active=False,
    )
    response = auth_client.delete(_detail_url(session.pk))
    assert response.status_code == 400


@pytest.mark.django_db
def test_terminate_nonexistent_session(auth_client):
    """DELETE /sessions/{uuid}/ for non-existent session returns 404."""
    import uuid
    fake_id = uuid.uuid4()
    response = auth_client.delete(_detail_url(fake_id))
    assert response.status_code == 404


# -- Unauthenticated -------------------------------------------------------


@pytest.mark.django_db
def test_unauthenticated_sessions(api_client):
    """Unauthenticated request returns 403."""
    response = api_client.get(SESSION_URL)
    assert response.status_code == 403


@pytest.mark.django_db
def test_unauthenticated_terminate(api_client):
    """Unauthenticated terminate request returns 403."""
    import uuid
    response = api_client.delete(_detail_url(uuid.uuid4()))
    assert response.status_code == 403
