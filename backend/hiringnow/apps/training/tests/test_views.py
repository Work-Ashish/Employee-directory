"""Tests for Training API views."""

import datetime

import pytest

from apps.training.models import Training, TrainingEnrollment

TRAINING_URL = "/api/v1/training/"


def _detail_url(training_id):
    return f"/api/v1/training/{training_id}/"


def _enroll_url(training_id):
    return f"/api/v1/training/{training_id}/enroll/"


# -- List ------------------------------------------------------------------


@pytest.mark.django_db
def test_list_trainings_paginated(auth_client, department):
    """GET /training/ returns paginated envelope for admin."""
    Training.objects.create(
        title="Django Basics",
        start_date=datetime.date(2026, 5, 1),
        end_date=datetime.date(2026, 5, 5),
        department=department,
    )
    response = auth_client.get(TRAINING_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 1


# -- Create ----------------------------------------------------------------


@pytest.mark.django_db
def test_create_training(auth_client, department):
    """POST /training/ creates a new training."""
    payload = {
        "title": "React Advanced",
        "description": "Advanced React patterns",
        "instructor": "Jane Smith",
        "start_date": "2026-06-01",
        "end_date": "2026-06-05",
        "max_participants": 30,
        "department_id": str(department.pk),
    }
    response = auth_client.post(TRAINING_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["title"] == "React Advanced"
    assert data["status"] == "UPCOMING"
    assert data["department_name"] == "Engineering"


@pytest.mark.django_db
def test_create_training_end_before_start_rejected(auth_client):
    """POST /training/ rejects if end_date < start_date."""
    payload = {
        "title": "Bad Training",
        "start_date": "2026-06-10",
        "end_date": "2026-06-01",
    }
    response = auth_client.post(TRAINING_URL, payload, format="json")
    assert response.status_code == 400


# -- Detail ----------------------------------------------------------------


@pytest.mark.django_db
def test_get_training_detail(auth_client, department, employee):
    """GET /training/{id}/ returns single training with enrollments."""
    training = Training.objects.create(
        title="Python Workshop",
        start_date=datetime.date(2026, 7, 1),
        end_date=datetime.date(2026, 7, 3),
        department=department,
    )
    TrainingEnrollment.objects.create(training=training, employee=employee)

    response = auth_client.get(_detail_url(training.pk))
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == str(training.pk)
    assert len(data["enrollments"]) == 1


# -- Update ----------------------------------------------------------------


@pytest.mark.django_db
def test_update_training(auth_client):
    """PUT /training/{id}/ updates training fields."""
    training = Training.objects.create(
        title="Old Title",
        start_date=datetime.date(2026, 8, 1),
        end_date=datetime.date(2026, 8, 5),
    )
    response = auth_client.put(
        _detail_url(training.pk),
        {"title": "New Title", "status": "ONGOING"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["title"] == "New Title"
    assert response.json()["status"] == "ONGOING"


# -- Delete ----------------------------------------------------------------


@pytest.mark.django_db
def test_delete_training(auth_client):
    """DELETE /training/{id}/ removes the training."""
    training = Training.objects.create(
        title="Temp Training",
        start_date=datetime.date(2026, 9, 1),
        end_date=datetime.date(2026, 9, 3),
    )
    response = auth_client.delete(_detail_url(training.pk))
    assert response.status_code == 204
    assert not Training.objects.filter(pk=training.pk).exists()


# -- Enroll ----------------------------------------------------------------


@pytest.mark.django_db
def test_enroll_in_training(auth_client, employee):
    """POST /training/{id}/enroll/ enrolls an employee."""
    training = Training.objects.create(
        title="Go Workshop",
        start_date=datetime.date(2026, 10, 1),
        end_date=datetime.date(2026, 10, 3),
        max_participants=10,
    )
    payload = {"employee_id": str(employee.pk)}
    response = auth_client.post(_enroll_url(training.pk), payload, format="json")
    assert response.status_code == 201
    assert response.json()["employee"] == str(employee.pk)


@pytest.mark.django_db
def test_enroll_duplicate_rejected(auth_client, employee):
    """POST /training/{id}/enroll/ rejects duplicate enrollment."""
    training = Training.objects.create(
        title="Duplicate Test",
        start_date=datetime.date(2026, 10, 10),
        end_date=datetime.date(2026, 10, 12),
        max_participants=10,
    )
    TrainingEnrollment.objects.create(training=training, employee=employee)

    payload = {"employee_id": str(employee.pk)}
    response = auth_client.post(_enroll_url(training.pk), payload, format="json")
    assert response.status_code == 409


# -- Unauthenticated ------------------------------------------------------


@pytest.mark.django_db
def test_unauthenticated_training(api_client):
    """Unauthenticated request returns 403."""
    response = api_client.get(TRAINING_URL)
    assert response.status_code == 403
