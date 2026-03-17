"""Root conftest — shared pytest fixtures for the Django backend."""

import pytest
from rest_framework.test import APIClient

from apps.users.models import User
from apps.employees.models import Employee
from apps.departments.models import Department


# ── Fixtures ─────────────────────────────────────────────────────────


@pytest.fixture
def api_client():
    """Unauthenticated DRF test client."""
    return APIClient()


@pytest.fixture
def user(db):
    """A tenant-admin user for testing."""
    return User.objects.create_user(
        username='testadmin',
        email='admin@test.com',
        password='TestPass123!',
        is_tenant_admin=True,
        is_staff=True,
    )


@pytest.fixture
def department(db):
    """A test department."""
    return Department.objects.create(name='Engineering')


@pytest.fixture
def employee(db, user, department):
    """A test employee linked to the test user."""
    return Employee.objects.create(
        user=user,
        first_name='Test',
        last_name='Employee',
        email='admin@test.com',
        employee_code='EMP-0001',
        department_ref=department,
        designation='Software Engineer',
        status=Employee.Status.ACTIVE,
    )


@pytest.fixture
def auth_client(api_client, user):
    """Authenticated DRF test client (force-authenticated, no JWT needed)."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def employee2(db, department):
    """A second employee for relationship tests."""
    user2 = User.objects.create_user(
        username='testuser2',
        email='user2@test.com',
        password='TestPass123!',
    )
    return Employee.objects.create(
        user=user2,
        first_name='Jane',
        last_name='Doe',
        email='user2@test.com',
        employee_code='EMP-0002',
        department_ref=department,
        designation='Product Manager',
        status=Employee.Status.ACTIVE,
    )
