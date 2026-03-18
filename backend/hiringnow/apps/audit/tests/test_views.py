"""Tests for Audit Log API views."""
import pytest
from apps.audit.models import AuditLog

AUDIT_URL = '/api/v1/audit-logs/'


@pytest.mark.django_db
class TestAuditLogList:

    def test_list_audit_logs(self, auth_client, user):
        """GET /audit-logs/ returns audit entries."""
        AuditLog.objects.create(
            user=user, action='CREATE', resource='employees',
            path='/api/v1/employees/', method='POST', status_code=201,
        )
        response = auth_client.get(AUDIT_URL)
        assert response.status_code == 200
        data = response.json()
        assert 'data' in data
        assert data['meta']['total'] >= 1

    def test_filter_by_action(self, auth_client, user):
        """GET /audit-logs/?action=CREATE filters correctly."""
        AuditLog.objects.create(
            user=user, action='CREATE', resource='employees',
            path='/api/v1/employees/', method='POST', status_code=201,
        )
        AuditLog.objects.create(
            user=user, action='DELETE', resource='employees',
            path='/api/v1/employees/1/', method='DELETE', status_code=204,
        )
        response = auth_client.get(f'{AUDIT_URL}?action=CREATE')
        assert response.status_code == 200
        data = response.json()
        assert all(r['action'] == 'CREATE' for r in data['data'])

    def test_filter_by_resource(self, auth_client, user):
        """GET /audit-logs/?resource=payroll filters correctly."""
        AuditLog.objects.create(
            user=user, action='CREATE', resource='payroll',
            path='/api/v1/payroll/', method='POST', status_code=201,
        )
        response = auth_client.get(f'{AUDIT_URL}?resource=payroll')
        assert response.status_code == 200
        data = response.json()
        assert all(r['resource'] == 'payroll' for r in data['data'])
