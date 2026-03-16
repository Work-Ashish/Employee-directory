"""Tests for Department API views."""

import pytest

from apps.departments.models import Department

DEPARTMENT_LIST_URL = "/api/v1/departments/"


def _detail_url(pk):
    return f"/api/v1/departments/{pk}/"


# ── List ─────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_list_departments(auth_client, department, employee):
    """GET /departments/ returns departments with employee_count annotation."""
    response = auth_client.get(DEPARTMENT_LIST_URL)
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

    eng = next(d for d in data if d["name"] == "Engineering")
    assert "employee_count" in eng
    assert eng["employee_count"] >= 1


# ── Create ───────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_department(auth_client):
    """POST /departments/ with valid data returns 201."""
    payload = {"name": "Marketing", "color": "#f59e0b"}
    response = auth_client.post(DEPARTMENT_LIST_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["name"] == "Marketing"
    assert data["color"] == "#f59e0b"
    assert "id" in data


@pytest.mark.django_db
def test_create_duplicate_department(auth_client, department):
    """POST /departments/ with a case-insensitive duplicate name returns 400."""
    payload = {"name": "engineering", "color": "#000000"}
    response = auth_client.post(DEPARTMENT_LIST_URL, payload, format="json")
    assert response.status_code == 400


# ── Detail ───────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_get_department_detail(auth_client, department):
    """GET /departments/{id}/ returns the department."""
    response = auth_client.get(_detail_url(department.pk))
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == str(department.pk)
    assert data["name"] == department.name


# ── Delete ───────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_delete_department(auth_client):
    """DELETE /departments/{id}/ with no employees returns 204."""
    dept = Department.objects.create(name="Temp Dept", color="#aabbcc")
    response = auth_client.delete(_detail_url(dept.pk))
    assert response.status_code == 204
    assert not Department.objects.filter(pk=dept.pk).exists()


@pytest.mark.django_db
def test_delete_department_with_employees_blocked(auth_client, department, employee):
    """DELETE /departments/{id}/ with active employees returns 400."""
    response = auth_client.delete(_detail_url(department.pk))
    assert response.status_code == 400

    data = response.json()
    assert "active employee" in data["detail"].lower()


# ── Auth ─────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_unauthenticated_access(api_client):
    """GET /departments/ without auth returns 401 or 403."""
    response = api_client.get(DEPARTMENT_LIST_URL)
    assert response.status_code in (401, 403)
