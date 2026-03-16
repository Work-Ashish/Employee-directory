"""Tests for Report API views."""

import pytest

from apps.reports.models import SavedReport

REPORT_URL = "/api/v1/reports/"
GENERATE_URL = "/api/v1/reports/generate/"


def _detail_url(report_id):
    return f"/api/v1/reports/{report_id}/"


# -- List ------------------------------------------------------------------


@pytest.mark.django_db
def test_list_reports_paginated(auth_client, employee):
    """GET /reports/ returns paginated envelope for admin."""
    SavedReport.objects.create(
        name="Headcount Q1",
        type=SavedReport.ReportType.EMPLOYEE,
        created_by=employee,
    )
    response = auth_client.get(REPORT_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.django_db
def test_list_reports_filtered_by_type(auth_client, employee):
    """GET /reports/?type=EMPLOYEE returns only employee reports."""
    SavedReport.objects.create(
        name="Headcount",
        type=SavedReport.ReportType.EMPLOYEE,
        created_by=employee,
    )
    SavedReport.objects.create(
        name="Payroll Summary",
        type=SavedReport.ReportType.PAYROLL,
        created_by=employee,
    )

    response = auth_client.get(REPORT_URL, {"type": "EMPLOYEE"})
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["results"][0]["type"] == "EMPLOYEE"


# -- Create ----------------------------------------------------------------


@pytest.mark.django_db
def test_create_report(auth_client, employee):
    """POST /reports/ creates a saved report."""
    payload = {
        "name": "Monthly Attendance",
        "type": "ATTENDANCE",
        "config": {"month": 3, "year": 2026},
    }
    response = auth_client.post(REPORT_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["name"] == "Monthly Attendance"
    assert data["type"] == "ATTENDANCE"
    assert data["config"] == {"month": 3, "year": 2026}


@pytest.mark.django_db
def test_create_report_invalid_type(auth_client, employee):
    """POST /reports/ with invalid type returns 400."""
    payload = {"name": "Bad Report", "type": "INVALID"}
    response = auth_client.post(REPORT_URL, payload, format="json")
    assert response.status_code == 400


# -- Detail ----------------------------------------------------------------


@pytest.mark.django_db
def test_get_report_detail(auth_client, employee):
    """GET /reports/{id}/ returns single report."""
    report = SavedReport.objects.create(
        name="Leave Summary",
        type=SavedReport.ReportType.LEAVE,
        created_by=employee,
    )
    response = auth_client.get(_detail_url(report.pk))
    assert response.status_code == 200
    assert response.json()["id"] == str(report.pk)
    assert response.json()["name"] == "Leave Summary"


# -- Update ----------------------------------------------------------------


@pytest.mark.django_db
def test_update_report(auth_client, employee):
    """PUT /reports/{id}/ updates an existing report."""
    report = SavedReport.objects.create(
        name="Old Name",
        type=SavedReport.ReportType.CUSTOM,
        created_by=employee,
    )
    response = auth_client.put(
        _detail_url(report.pk),
        {"name": "New Name", "type": "PAYROLL"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"
    assert response.json()["type"] == "PAYROLL"


# -- Delete ----------------------------------------------------------------


@pytest.mark.django_db
def test_delete_report(auth_client, employee):
    """DELETE /reports/{id}/ removes the report."""
    report = SavedReport.objects.create(
        name="Temp Report",
        type=SavedReport.ReportType.EMPLOYEE,
        created_by=employee,
    )
    response = auth_client.delete(_detail_url(report.pk))
    assert response.status_code == 204
    assert not SavedReport.objects.filter(pk=report.pk).exists()


# -- Generate --------------------------------------------------------------


@pytest.mark.django_db
def test_generate_report(auth_client, employee):
    """POST /reports/generate/ returns generated report data."""
    payload = {"type": "EMPLOYEE", "config": {}}
    response = auth_client.post(GENERATE_URL, payload, format="json")
    assert response.status_code == 200

    data = response.json()
    assert data["type"] == "EMPLOYEE"
    assert "generated_at" in data
    assert "data" in data


@pytest.mark.django_db
def test_generate_report_invalid_type(auth_client, employee):
    """POST /reports/generate/ with invalid type returns 400."""
    payload = {"type": "BOGUS"}
    response = auth_client.post(GENERATE_URL, payload, format="json")
    assert response.status_code == 400


# -- Unauthenticated -------------------------------------------------------


@pytest.mark.django_db
def test_unauthenticated_reports(api_client):
    """Unauthenticated request returns 403."""
    response = api_client.get(REPORT_URL)
    assert response.status_code == 403
