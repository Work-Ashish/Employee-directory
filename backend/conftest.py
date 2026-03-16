"""
Root conftest.py for Django test setup.

Provides tenant-aware test fixtures used across all Django apps.
Since tests use SQLite with DATABASE_ROUTERS=[], no tenant context is needed.
"""

import sys
from pathlib import Path


def pytest_configure(config):
    """Add hiringnow/ to sys.path before Django loads apps."""
    hiringnow_dir = str(Path(__file__).resolve().parent / "hiringnow")
    if hiringnow_dir not in sys.path:
        sys.path.insert(0, hiringnow_dir)


import pytest
from rest_framework.test import APIClient


@pytest.fixture(autouse=True)
def _celery_eager(settings):
    """Run Celery tasks synchronously during tests."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True


@pytest.fixture
def api_client():
    """Unauthenticated DRF test client."""
    return APIClient()


@pytest.fixture
def admin_user(db):
    """Tenant admin user with full permissions."""
    from apps.users.models import User
    user = User.objects.create_user(
        email="admin@test.com",
        password="admin123!",
        first_name="Admin",
        last_name="User",
        is_tenant_admin=True,
    )
    return user


@pytest.fixture
def regular_user(db):
    """Regular non-admin user."""
    from apps.users.models import User
    user = User.objects.create_user(
        email="employee@test.com",
        password="emp123!",
        first_name="John",
        last_name="Doe",
    )
    return user


@pytest.fixture
def auth_client(api_client, admin_user):
    """Authenticated DRF client (admin)."""
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def employee_client(api_client, regular_user):
    """Authenticated DRF client (regular employee)."""
    api_client.force_authenticate(user=regular_user)
    return api_client


@pytest.fixture
def department(db):
    """Sample department."""
    from apps.departments.models import Department
    return Department.objects.create(name="Engineering", color="#6366f1")


@pytest.fixture
def employee(db, admin_user, department):
    """Sample employee linked to admin_user."""
    from apps.employees.models import Employee
    return Employee.objects.create(
        user=admin_user,
        first_name="Admin",
        last_name="User",
        email="admin@test.com",
        department_ref=department,
        status=Employee.Status.ACTIVE,
        employee_code="EMP-0001",
    )


@pytest.fixture
def second_employee(db, regular_user, department):
    """Second sample employee linked to regular_user."""
    from apps.employees.models import Employee
    return Employee.objects.create(
        user=regular_user,
        first_name="John",
        last_name="Doe",
        email="employee@test.com",
        department_ref=department,
        status=Employee.Status.ACTIVE,
        employee_code="EMP-0002",
    )
