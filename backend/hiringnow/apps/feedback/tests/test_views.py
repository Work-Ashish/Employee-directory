"""Tests for Feedback API views."""

import pytest

from apps.feedback.models import EmployeeFeedback

FEEDBACK_URL = "/api/v1/feedback/"


def _detail_url(feedback_id):
    return f"/api/v1/feedback/{feedback_id}/"


# -- List ------------------------------------------------------------------


@pytest.mark.django_db
def test_list_feedback_paginated(auth_client, employee, employee2):
    """GET /feedback/ returns paginated envelope for admin."""
    EmployeeFeedback.objects.create(
        from_employee=employee,
        to_employee=employee2,
        type=EmployeeFeedback.FeedbackType.PEER,
        rating=4,
        content="Great teamwork!",
    )
    response = auth_client.get(FEEDBACK_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.django_db
def test_list_feedback_filtered_by_type(auth_client, employee, employee2):
    """GET /feedback/?type=PEER returns only peer feedback."""
    EmployeeFeedback.objects.create(
        from_employee=employee,
        to_employee=employee2,
        type=EmployeeFeedback.FeedbackType.PEER,
        rating=5,
        content="Excellent collaboration",
    )
    EmployeeFeedback.objects.create(
        from_employee=employee,
        to_employee=employee2,
        type=EmployeeFeedback.FeedbackType.MANAGER,
        rating=3,
        content="Needs improvement",
    )

    response = auth_client.get(FEEDBACK_URL, {"type": "PEER"})
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["results"][0]["type"] == "PEER"


# -- Create ----------------------------------------------------------------


@pytest.mark.django_db
def test_create_feedback(auth_client, employee, employee2):
    """POST /feedback/ creates a feedback entry."""
    payload = {
        "from_employee_id": str(employee.pk),
        "to_employee_id": str(employee2.pk),
        "type": "PEER",
        "rating": 4,
        "content": "Very helpful colleague.",
    }
    response = auth_client.post(FEEDBACK_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["type"] == "PEER"
    assert data["rating"] == 4
    assert data["content"] == "Very helpful colleague."


@pytest.mark.django_db
def test_create_anonymous_feedback(auth_client, employee, employee2):
    """POST /feedback/ with type=ANONYMOUS forces is_anonymous=True."""
    payload = {
        "from_employee_id": str(employee.pk),
        "to_employee_id": str(employee2.pk),
        "type": "ANONYMOUS",
        "rating": 2,
        "content": "Could communicate better.",
    }
    response = auth_client.post(FEEDBACK_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["is_anonymous"] is True
    assert data["from_employee_name"] == "Anonymous"


@pytest.mark.django_db
def test_create_feedback_without_to_employee(auth_client, employee):
    """POST /feedback/ allows creating general feedback without a target employee."""
    payload = {
        "from_employee_id": str(employee.pk),
        "type": "MANAGER",
        "rating": 5,
        "content": "The team morale is high.",
    }
    response = auth_client.post(FEEDBACK_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["to_employee"] is None
    assert data["to_employee_name"] is None


# -- Detail ----------------------------------------------------------------


@pytest.mark.django_db
def test_get_feedback_detail(auth_client, employee, employee2):
    """GET /feedback/{id}/ returns single feedback entry."""
    feedback = EmployeeFeedback.objects.create(
        from_employee=employee,
        to_employee=employee2,
        type=EmployeeFeedback.FeedbackType.PEER,
        rating=3,
        content="Solid performance.",
    )
    response = auth_client.get(_detail_url(feedback.pk))
    assert response.status_code == 200
    assert response.json()["id"] == str(feedback.pk)


# -- Unauthenticated ------------------------------------------------------


@pytest.mark.django_db
def test_unauthenticated_feedback(api_client):
    """Unauthenticated request returns 403."""
    response = api_client.get(FEEDBACK_URL)
    assert response.status_code == 403
