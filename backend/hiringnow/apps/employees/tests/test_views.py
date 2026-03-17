"""Tests for Employee API views."""

import pytest

from apps.employees.models import Employee

EMPLOYEE_LIST_URL = "/api/v1/employees/"
MANAGER_LIST_URL = "/api/v1/employees/managers/"


def _detail_url(employee_id):
    return f"/api/v1/employees/{employee_id}/"


def _credentials_url(employee_id):
    return f"/api/v1/employees/{employee_id}/credentials/"


# ── List (paginated) ─────────────────────────────────────────────────

@pytest.mark.django_db
def test_list_employees_paginated(auth_client, employee):
    """GET /employees/ returns paginated envelope with results/total/page/limit/total_pages."""
    response = auth_client.get(EMPLOYEE_LIST_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert "page" in data
    assert "limit" in data
    assert "total_pages" in data
    assert data["total"] >= 1
    assert len(data["results"]) >= 1


# ── Search ───────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_list_employees_search(auth_client, employee, employee2):
    """GET /employees/?search=Jane filters employees by first name."""
    response = auth_client.get(EMPLOYEE_LIST_URL, {"search": "Jane"})
    assert response.status_code == 200

    data = response.json()
    names = [e["first_name"] for e in data["results"]]
    assert "Jane" in names
    # The first employee (first_name="Test") should not appear
    assert "Test" not in names


# ── Create ───────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_employee(auth_client, department):
    """POST /employees/ creates employee with temp_password and auto-generated employee_code."""
    payload = {
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "jane.smith@test.com",
        "department_ref": str(department.pk),
        "status": "active",
    }
    response = auth_client.post(EMPLOYEE_LIST_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["first_name"] == "Jane"
    assert "temp_password" in data
    assert data["employee_code"].startswith("EMP-")


# ── Detail ───────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_get_employee_detail(auth_client, employee, department):
    """GET /employees/{id}/ returns employee with department detail."""
    response = auth_client.get(_detail_url(employee.pk))
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == str(employee.pk)
    assert data["first_name"] == employee.first_name
    # department_detail is nested from department_ref
    assert data["department_detail"]["name"] == department.name


# ── Update ───────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_update_employee(auth_client, employee):
    """PUT /employees/{id}/ updates fields."""
    payload = {"designation": "Senior Engineer"}
    response = auth_client.put(_detail_url(employee.pk), payload, format="json")
    assert response.status_code == 200

    data = response.json()
    assert data["designation"] == "Senior Engineer"


# ── Soft Delete ──────────────────────────────────────────────────────

@pytest.mark.django_db
def test_soft_delete_employee(auth_client, employee2):
    """DELETE /employees/{id}/ sets deleted_at, is_archived=True, status=archived."""
    response = auth_client.delete(_detail_url(employee2.pk))
    assert response.status_code == 204

    employee2.refresh_from_db()
    assert employee2.deleted_at is not None
    assert employee2.is_archived is True
    assert employee2.status == Employee.Status.ARCHIVED


@pytest.mark.django_db
def test_soft_deleted_excluded_from_list(auth_client, employee, employee2):
    """After soft-delete, employee is excluded from the default GET list."""
    # Soft-delete the second employee
    auth_client.delete(_detail_url(employee2.pk))

    response = auth_client.get(EMPLOYEE_LIST_URL)
    assert response.status_code == 200

    ids = [e["id"] for e in response.json()["results"]]
    assert str(employee2.pk) not in ids
    assert str(employee.pk) in ids


# ── Credentials Reset ───────────────────────────────────────────────

@pytest.mark.django_db
def test_credentials_reset(auth_client, employee):
    """POST /employees/{id}/credentials/ returns new temp_password and email."""
    response = auth_client.post(_credentials_url(employee.pk))
    assert response.status_code == 200

    data = response.json()
    assert "temp_password" in data
    assert data["email"] == employee.email
    assert data["employee_id"] == str(employee.pk)


# ── Manager List ─────────────────────────────────────────────────────

@pytest.mark.django_db
def test_manager_list(auth_client, employee, employee2):
    """GET /employees/managers/ returns active employees."""
    response = auth_client.get(MANAGER_LIST_URL)
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2
    # Each entry is minimal: id, employee_code, first_name, last_name, email, designation
    assert "first_name" in data[0]
    assert "employee_code" in data[0]
