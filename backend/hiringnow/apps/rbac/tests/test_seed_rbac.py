"""Tests for seed_rbac management command."""
import pytest

from apps.rbac.management.commands.seed_rbac import PERMISSIONS, SYSTEM_ROLES


class TestSeedRbacData:
    """Verify seed data is well-formed without needing a DB."""

    def test_all_role_permissions_exist_in_registry(self):
        """Every codename assigned to a role exists in PERMISSIONS."""
        all_codenames = set()
        for codenames in PERMISSIONS.values():
            all_codenames.update(codenames)

        for slug, cfg in SYSTEM_ROLES.items():
            for codename in cfg['permissions']:
                assert codename in all_codenames, (
                    f"Role '{slug}' has codename '{codename}' not in PERMISSIONS"
                )

    def test_admin_has_all_permissions(self):
        """Admin role should have every registered codename."""
        all_codenames = set()
        for codenames in PERMISSIONS.values():
            all_codenames.update(codenames)

        admin_perms = set(SYSTEM_ROLES['admin']['permissions'])
        missing = all_codenames - admin_perms
        assert not missing, f"Admin missing codenames: {missing}"

    def test_ceo_matches_admin(self):
        """CEO should have same permissions as admin."""
        assert set(SYSTEM_ROLES['ceo']['permissions']) == set(SYSTEM_ROLES['admin']['permissions'])

    def test_employee_has_basic_access(self):
        """Employee role should have dashboard.view and attendance.view."""
        perms = set(SYSTEM_ROLES['employee']['permissions'])
        assert 'dashboard.view' in perms
        assert 'attendance.view' in perms
        assert 'leaves.view' in perms

    def test_no_duplicate_codenames_in_permissions(self):
        """No duplicate codenames across all modules."""
        all_codenames = []
        for codenames in PERMISSIONS.values():
            all_codenames.extend(codenames)
        assert len(all_codenames) == len(set(all_codenames)), "Duplicate codenames found"

    def test_minimum_module_count(self):
        """Should have at least 25 modules registered."""
        assert len(PERMISSIONS) >= 25, f"Expected >=25 modules, got {len(PERMISSIONS)}"

    def test_minimum_codename_count(self):
        """Should have at least 50 codenames."""
        total = sum(len(v) for v in PERMISSIONS.values())
        assert total >= 50, f"Expected >=50 codenames, got {total}"
