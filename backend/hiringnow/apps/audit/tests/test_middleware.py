"""Tests for AuditLogMiddleware."""
import pytest
from apps.audit.models import AuditLog

EMPLOYEES_URL = '/api/v1/employees/'


@pytest.mark.django_db
class TestAuditMiddleware:

    def test_post_request_creates_audit_log(self, auth_client, department):
        """POST requests create an audit log entry."""
        initial_count = AuditLog.objects.count()
        auth_client.post(EMPLOYEES_URL, {
            'first_name': 'Audit', 'last_name': 'Test',
            'email': 'audit@test.com', 'employee_code': 'AUD-001',
            'department_ref': str(department.pk), 'designation': 'Tester',
        }, format='json')
        assert AuditLog.objects.count() > initial_count

    def test_get_request_no_audit_log(self, auth_client):
        """GET requests should NOT create audit log entries."""
        initial_count = AuditLog.objects.count()
        auth_client.get(EMPLOYEES_URL)
        assert AuditLog.objects.count() == initial_count

    def test_health_endpoint_not_logged(self, api_client):
        """Health endpoint should be skipped by audit middleware."""
        initial_count = AuditLog.objects.count()
        api_client.get('/health/')
        assert AuditLog.objects.count() == initial_count
