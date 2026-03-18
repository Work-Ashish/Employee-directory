"""Tests for RBAC permission service functions."""
import pytest

from apps.rbac.services import user_has_permission, get_user_permission_codenames
from apps.rbac.models import Role, RolePermission, UserRole


@pytest.mark.django_db
class TestPermissionService:

    def test_tenant_admin_bypasses_all(self, user):
        """is_tenant_admin=True always returns True."""
        user.is_tenant_admin = True
        user.save()
        assert user_has_permission(user, 'anything.goes') is True

    def test_unauthenticated_user_denied(self):
        """None user always returns False."""
        assert user_has_permission(None, 'employees.view') is False

    def test_user_without_roles_denied(self, user):
        """User with no roles has empty codenames."""
        user.is_tenant_admin = False
        user.save()
        codenames = get_user_permission_codenames(user)
        assert len(codenames) == 0
        assert user_has_permission(user, 'employees.view') is False

    def test_role_assignment_grants_permission(self, user):
        """Assigning a role with a codename grants access."""
        user.is_tenant_admin = False
        user.save()

        role = Role.objects.create(name='Test Role', slug='test-role', is_system=False)
        RolePermission.objects.create(role=role, permission_codename='employees.view')
        UserRole.objects.create(user=user, role=role)

        # Clear cache
        if hasattr(user, '_permission_codenames_cache'):
            del user._permission_codenames_cache

        assert user_has_permission(user, 'employees.view') is True
        assert user_has_permission(user, 'employees.manage') is False
