"""Tests for Role API views."""

import pytest

from apps.roles.models import FunctionalRole, RoleCapability, EmployeeFunctionalRole

ROLE_URL = "/api/v1/roles/"
CAPABILITIES_URL = "/api/v1/roles/capabilities/"


def _detail_url(role_id):
    return f"/api/v1/roles/{role_id}/"


# -- List ------------------------------------------------------------------


@pytest.mark.django_db
def test_list_roles_paginated(auth_client):
    """GET /roles/ returns paginated envelope for admin."""
    FunctionalRole.objects.create(name="Developer")
    response = auth_client.get(ROLE_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.django_db
def test_list_roles_search_filter(auth_client):
    """GET /roles/?search=Dev returns only matching roles."""
    FunctionalRole.objects.create(name="Developer")
    FunctionalRole.objects.create(name="Manager")

    response = auth_client.get(ROLE_URL, {"search": "Dev"})
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["results"][0]["name"] == "Developer"


# -- Create ----------------------------------------------------------------


@pytest.mark.django_db
def test_create_role(auth_client):
    """POST /roles/ creates a functional role with capabilities."""
    payload = {
        "name": "Senior Engineer",
        "description": "Senior-level engineering role",
        "capabilities": ["code_review", "deploy"],
    }
    response = auth_client.post(ROLE_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["name"] == "Senior Engineer"
    assert data["is_active"] is True
    cap_names = [c["capability"] for c in data["capabilities"]]
    assert "code_review" in cap_names
    assert "deploy" in cap_names


@pytest.mark.django_db
def test_create_role_minimal(auth_client):
    """POST /roles/ creates a role with only the name."""
    payload = {"name": "Intern"}
    response = auth_client.post(ROLE_URL, payload, format="json")
    assert response.status_code == 201
    assert response.json()["name"] == "Intern"
    assert response.json()["capabilities"] == []


# -- Detail ----------------------------------------------------------------


@pytest.mark.django_db
def test_get_role_detail(auth_client):
    """GET /roles/{id}/ returns single role."""
    role = FunctionalRole.objects.create(name="Tester", description="QA tester")
    response = auth_client.get(_detail_url(role.pk))
    assert response.status_code == 200
    assert response.json()["id"] == str(role.pk)
    assert response.json()["name"] == "Tester"


# -- Update ----------------------------------------------------------------


@pytest.mark.django_db
def test_update_role(auth_client):
    """PUT /roles/{id}/ updates name and capabilities."""
    role = FunctionalRole.objects.create(name="Old Name")
    RoleCapability.objects.create(role=role, capability="old_cap")

    response = auth_client.put(
        _detail_url(role.pk),
        {"name": "New Name", "capabilities": ["new_cap_a", "new_cap_b"]},
        format="json",
    )
    assert response.status_code == 200

    data = response.json()
    assert data["name"] == "New Name"
    cap_names = [c["capability"] for c in data["capabilities"]]
    assert "old_cap" not in cap_names
    assert "new_cap_a" in cap_names
    assert "new_cap_b" in cap_names


# -- Delete ----------------------------------------------------------------


@pytest.mark.django_db
def test_delete_role(auth_client):
    """DELETE /roles/{id}/ removes the role."""
    role = FunctionalRole.objects.create(name="Disposable Role")
    response = auth_client.delete(_detail_url(role.pk))
    assert response.status_code == 204
    assert not FunctionalRole.objects.filter(pk=role.pk).exists()


# -- Capabilities ----------------------------------------------------------


@pytest.mark.django_db
def test_capabilities_for_employee(auth_client, employee):
    """GET /roles/capabilities/ returns capabilities for authenticated employee."""
    role = FunctionalRole.objects.create(name="Tech Lead")
    RoleCapability.objects.create(role=role, capability="approve_pr")
    RoleCapability.objects.create(role=role, capability="manage_sprints")
    EmployeeFunctionalRole.objects.create(employee=employee, role=role)

    response = auth_client.get(CAPABILITIES_URL)
    assert response.status_code == 200

    data = response.json()
    assert len(data["roles"]) == 1
    assert data["roles"][0]["name"] == "Tech Lead"
    assert "approve_pr" in data["capabilities"]
    assert "manage_sprints" in data["capabilities"]


# -- Unauthenticated -------------------------------------------------------


@pytest.mark.django_db
def test_unauthenticated_roles(api_client):
    """Unauthenticated request returns 403."""
    response = api_client.get(ROLE_URL)
    assert response.status_code == 403
