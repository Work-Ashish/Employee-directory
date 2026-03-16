"""Tests for Notification and Admin Alert API views."""

import pytest

from apps.notifications.models import Notification, AdminAlert

NOTIF_URL = "/api/v1/notifications/"
ALERTS_URL = "/api/v1/notifications/alerts/"


def _mark_read_url(notif_id):
    return f"/api/v1/notifications/{notif_id}/read/"


MARK_ALL_READ_URL = "/api/v1/notifications/read/"


# -- Notification List -----------------------------------------------------


@pytest.mark.django_db
def test_list_notifications_paginated(auth_client, user):
    """GET /notifications/ returns paginated envelope for the authenticated user."""
    Notification.objects.create(
        user=user,
        title="Welcome",
        message="Welcome to the platform!",
        type=Notification.NotificationType.INFO,
    )
    response = auth_client.get(NOTIF_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.django_db
def test_list_notifications_filtered_by_is_read(auth_client, user):
    """GET /notifications/?is_read=false returns only unread notifications."""
    Notification.objects.create(
        user=user,
        title="Unread",
        message="You have a task.",
        is_read=False,
    )
    Notification.objects.create(
        user=user,
        title="Read",
        message="Already seen.",
        is_read=True,
    )

    response = auth_client.get(NOTIF_URL, {"is_read": "false"})
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["results"][0]["title"] == "Unread"


# -- Mark Read -------------------------------------------------------------


@pytest.mark.django_db
def test_mark_single_notification_read(auth_client, user):
    """PUT /notifications/{id}/read/ marks one notification as read."""
    notif = Notification.objects.create(
        user=user,
        title="Action Required",
        message="Please review.",
        is_read=False,
    )
    response = auth_client.put(_mark_read_url(notif.pk))
    assert response.status_code == 200
    assert response.json()["is_read"] is True


@pytest.mark.django_db
def test_mark_all_notifications_read(auth_client, user):
    """PUT /notifications/read/ marks all unread notifications as read."""
    for i in range(3):
        Notification.objects.create(
            user=user,
            title=f"Notification {i}",
            message=f"Message {i}",
            is_read=False,
        )

    response = auth_client.put(MARK_ALL_READ_URL)
    assert response.status_code == 200
    assert response.json()["updated"] == 3

    # Verify all are now read
    assert Notification.objects.filter(user=user, is_read=False).count() == 0


# -- Admin Alerts ----------------------------------------------------------


@pytest.mark.django_db
def test_list_admin_alerts_paginated(auth_client):
    """GET /notifications/alerts/ returns paginated alerts for admin."""
    AdminAlert.objects.create(
        title="High CPU Usage",
        message="Server CPU above 90%.",
        severity=AdminAlert.Severity.WARNING,
    )
    response = auth_client.get(ALERTS_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.django_db
def test_list_admin_alerts_filtered_by_severity(auth_client):
    """GET /notifications/alerts/?severity=CRITICAL returns only critical alerts."""
    AdminAlert.objects.create(
        title="Disk Full",
        message="Disk usage at 99%.",
        severity=AdminAlert.Severity.CRITICAL,
    )
    AdminAlert.objects.create(
        title="New user",
        message="A new user signed up.",
        severity=AdminAlert.Severity.INFO,
    )

    response = auth_client.get(ALERTS_URL, {"severity": "CRITICAL"})
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["results"][0]["severity"] == "CRITICAL"


# -- Unauthenticated ------------------------------------------------------


@pytest.mark.django_db
def test_unauthenticated_notifications(api_client):
    """Unauthenticated request to /notifications/ returns 403."""
    response = api_client.get(NOTIF_URL)
    assert response.status_code == 403


@pytest.mark.django_db
def test_unauthenticated_alerts(api_client):
    """Unauthenticated request to /notifications/alerts/ returns 403."""
    response = api_client.get(ALERTS_URL)
    assert response.status_code == 403
