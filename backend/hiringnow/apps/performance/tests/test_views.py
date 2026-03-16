"""Tests for Performance API views."""

import pytest

from apps.performance.models import PerformanceReview, PerformanceTemplate

REVIEWS_URL = "/api/v1/performance/reviews/"
TEMPLATES_URL = "/api/v1/performance/templates/"
METRICS_URL = "/api/v1/performance/metrics/"


def _review_detail_url(review_id):
    return f"/api/v1/performance/reviews/{review_id}/"


def _template_detail_url(template_id):
    return f"/api/v1/performance/templates/{template_id}/"


# -- Review List -----------------------------------------------------------


@pytest.mark.django_db
def test_list_reviews_paginated(auth_client, employee, employee2):
    """GET /performance/reviews/ returns paginated envelope."""
    PerformanceReview.objects.create(
        employee=employee, reviewer=employee2, period="Q1-2026",
    )
    response = auth_client.get(REVIEWS_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 1


# -- Review Create ---------------------------------------------------------


@pytest.mark.django_db
def test_create_review(auth_client, employee, employee2):
    """POST /performance/reviews/ creates a new review."""
    payload = {
        "employee_id": str(employee.pk),
        "reviewer_id": str(employee2.pk),
        "period": "Q2-2026",
        "overall_score": "4.50",
        "strengths": "Great communication",
        "improvements": "Time management",
        "goals": "Lead a project",
    }
    response = auth_client.post(REVIEWS_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["period"] == "Q2-2026"
    assert data["status"] == "DRAFT"
    assert data["employee_name"] == "Test Employee"


# -- Review Detail ---------------------------------------------------------


@pytest.mark.django_db
def test_get_review_detail(auth_client, employee):
    """GET /performance/reviews/{id}/ returns single review."""
    review = PerformanceReview.objects.create(
        employee=employee, period="Q1-2026",
    )
    response = auth_client.get(_review_detail_url(review.pk))
    assert response.status_code == 200
    assert response.json()["id"] == str(review.pk)


# -- Review Update ---------------------------------------------------------


@pytest.mark.django_db
def test_update_review(auth_client, employee):
    """PUT /performance/reviews/{id}/ updates review fields."""
    review = PerformanceReview.objects.create(
        employee=employee, period="Q1-2026",
    )
    response = auth_client.put(
        _review_detail_url(review.pk),
        {"status": "SUBMITTED", "overall_score": "3.75"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["status"] == "SUBMITTED"


# -- Template List ---------------------------------------------------------


@pytest.mark.django_db
def test_list_templates_paginated(auth_client):
    """GET /performance/templates/ returns paginated envelope."""
    PerformanceTemplate.objects.create(
        name="Quarterly Review", criteria=[{"name": "Quality"}],
    )
    response = auth_client.get(TEMPLATES_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert data["total"] >= 1


# -- Template Create -------------------------------------------------------


@pytest.mark.django_db
def test_create_template(auth_client):
    """POST /performance/templates/ creates a new template."""
    payload = {
        "name": "Annual Review",
        "description": "Yearly performance evaluation",
        "criteria": [{"name": "Quality", "weight": 40}],
        "is_active": True,
    }
    response = auth_client.post(TEMPLATES_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["name"] == "Annual Review"
    assert data["is_active"] is True
    assert len(data["criteria"]) == 1


# -- Template Delete -------------------------------------------------------


@pytest.mark.django_db
def test_delete_template(auth_client):
    """DELETE /performance/templates/{id}/ removes the template."""
    template = PerformanceTemplate.objects.create(name="Old Template")
    response = auth_client.delete(_template_detail_url(template.pk))
    assert response.status_code == 204
    assert not PerformanceTemplate.objects.filter(pk=template.pk).exists()


# -- Metrics ---------------------------------------------------------------


@pytest.mark.django_db
def test_list_metrics(auth_client, employee):
    """GET /performance/metrics/ returns paginated envelope."""
    response = auth_client.get(METRICS_URL)
    assert response.status_code == 200
    assert "results" in response.json()


# -- Unauthenticated ------------------------------------------------------


@pytest.mark.django_db
def test_unauthenticated_reviews(api_client):
    """Unauthenticated request to reviews returns 403."""
    response = api_client.get(REVIEWS_URL)
    assert response.status_code == 403


@pytest.mark.django_db
def test_unauthenticated_templates(api_client):
    """Unauthenticated request to templates returns 403."""
    response = api_client.get(TEMPLATES_URL)
    assert response.status_code == 403
