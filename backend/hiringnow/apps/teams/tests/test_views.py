"""Tests for Teams API views."""

import pytest

from apps.users.models import User
from apps.teams.models import Team, TeamMember

TEAMS_URL = "/api/v1/teams/"


def _detail_url(team_id):
    return f"/api/v1/teams/{team_id}/"


ORG_CHART_URL = "/api/v1/teams/org-chart/"


# -- List ------------------------------------------------------------------


@pytest.mark.django_db
def test_list_teams_paginated(auth_client, department, employee):
    """GET /teams/ returns paginated envelope for admin."""
    Team.objects.create(name="Backend", department=department, lead=employee)
    Team.objects.create(name="Frontend", department=department)

    response = auth_client.get(TEAMS_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 2


@pytest.mark.django_db
def test_list_teams_filter_by_department(auth_client, department, employee):
    """GET /teams/?department_id=... filters by department."""
    Team.objects.create(name="Backend", department=department)
    response = auth_client.get(TEAMS_URL, {"department_id": str(department.pk)})
    assert response.status_code == 200
    assert response.json()["total"] >= 1


# -- Create ----------------------------------------------------------------


@pytest.mark.django_db
def test_create_team(auth_client, department, employee):
    """POST /teams/ creates a new team."""
    payload = {
        "name": "Platform",
        "description": "Platform engineering team",
        "department_id": str(department.pk),
        "lead_id": str(employee.pk),
    }
    response = auth_client.post(TEAMS_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["name"] == "Platform"
    assert data["department_name"] == "Engineering"
    assert data["lead_name"] == "Test Employee"


@pytest.mark.django_db
def test_create_team_minimal(auth_client):
    """POST /teams/ with only required field (name) succeeds."""
    payload = {"name": "Skeleton Crew"}
    response = auth_client.post(TEAMS_URL, payload, format="json")
    assert response.status_code == 201
    assert response.json()["name"] == "Skeleton Crew"


# -- Detail ----------------------------------------------------------------


@pytest.mark.django_db
def test_get_team_detail(auth_client, department, employee):
    """GET /teams/{id}/ returns single team with members list."""
    team = Team.objects.create(name="QA", department=department, lead=employee)
    TeamMember.objects.create(team=team, employee=employee, role="Lead")

    response = auth_client.get(_detail_url(team.pk))
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == str(team.pk)
    assert data["name"] == "QA"
    assert len(data["members"]) == 1
    assert data["members"][0]["role"] == "Lead"


# -- Update ----------------------------------------------------------------


@pytest.mark.django_db
def test_update_team(auth_client, department):
    """PUT /teams/{id}/ updates team fields."""
    team = Team.objects.create(name="Old Name", department=department)
    response = auth_client.put(
        _detail_url(team.pk),
        {"name": "New Name", "description": "Updated desc"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"


# -- Delete ----------------------------------------------------------------


@pytest.mark.django_db
def test_delete_team(auth_client, department):
    """DELETE /teams/{id}/ removes the team."""
    team = Team.objects.create(name="Temp Team", department=department)
    response = auth_client.delete(_detail_url(team.pk))
    assert response.status_code == 204
    assert not Team.objects.filter(pk=team.pk).exists()


# -- Org Chart -------------------------------------------------------------


@pytest.mark.django_db
def test_org_chart(auth_client, employee, employee2):
    """GET /teams/org-chart/ returns org chart tree."""
    response = auth_client.get(ORG_CHART_URL)
    assert response.status_code == 200

    data = response.json()
    assert "org_chart" in data
    assert isinstance(data["org_chart"], list)


# -- Unauthenticated ------------------------------------------------------


@pytest.mark.django_db
def test_unauthenticated_teams(api_client):
    """Unauthenticated request returns 403."""
    response = api_client.get(TEAMS_URL)
    assert response.status_code == 403


@pytest.mark.django_db
def test_team_lead_sees_team_by_matching_email_even_without_employee_user_link(api_client, department):
    """A lead should still see their team if the employee.user link is missing but email matches."""
    user = User.objects.create_user(
        username='leaduser',
        email='lead@test.com',
        password='TestPass123!',
    )
    lead_employee = Team._meta.get_field('lead').related_model.objects.create(
        first_name='Lead',
        last_name='User',
        email='lead@test.com',
        employee_code='EMP-0100',
        department_ref=department,
        designation='Team Lead',
        status='active',
    )
    team = Team.objects.create(name="QA Leads", department=department, lead=lead_employee)

    api_client.force_authenticate(user=user)
    response = api_client.get(TEAMS_URL)

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["results"][0]["id"] == str(team.pk)
