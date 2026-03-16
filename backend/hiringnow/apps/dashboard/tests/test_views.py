"""Tests for Dashboard API views."""

import pytest
from django.utils import timezone

DASHBOARD_URL = "/api/v1/dashboard/"
DASHBOARD_LOGINS_URL = "/api/v1/dashboard/logins/"


# ── Dashboard Stats ──────────────────────────────────────────────────

@pytest.mark.django_db
def test_dashboard_stats(auth_client, department, employee):
    """GET /dashboard/ returns aggregated stats."""
    response = auth_client.get(DASHBOARD_URL)
    assert response.status_code == 200

    data = response.json()
    assert "total_employees" in data
    assert "total_departments" in data
    assert "status_counts" in data
    assert "department_split" in data
    assert "recent_hires" in data

    assert data["total_employees"] >= 1
    assert data["total_departments"] >= 1
    assert isinstance(data["department_split"], list)
    assert isinstance(data["recent_hires"], list)


@pytest.mark.django_db
def test_dashboard_stats_salary_for_admin(auth_client, employee):
    """Admin (is_tenant_admin=True) sees salary_stats in the response."""
    # Give the employee a salary so the aggregation has data
    employee.salary = 75000
    employee.save(update_fields=["salary"])

    response = auth_client.get(DASHBOARD_URL)
    assert response.status_code == 200

    data = response.json()
    assert data["salary_stats"] is not None
    assert "average_salary" in data["salary_stats"]
    assert data["salary_stats"]["average_salary"] > 0


# ── Dashboard Logins ─────────────────────────────────────────────────

@pytest.mark.django_db
def test_dashboard_logins(auth_client, admin_user):
    """GET /dashboard/logins/ returns session analytics."""
    from apps.users.models import UserSession

    # Create a sample session
    UserSession.objects.create(
        user=admin_user,
        session_token="test-session-token-abc",
        ip_address="127.0.0.1",
        is_revoked=False,
        expires_at=timezone.now() + timezone.timedelta(hours=24),
    )

    response = auth_client.get(DASHBOARD_LOGINS_URL)
    assert response.status_code == 200

    data = response.json()
    assert "total_sessions" in data
    assert "active_sessions" in data
    assert "logins_last_7_days" in data
    assert data["total_sessions"] >= 1
    assert data["active_sessions"] >= 1
    assert data["logins_last_7_days"] >= 1
