"""Tests for feature flag services."""
import pytest

from apps.features.models import TenantFeature
from apps.features.services import is_feature_enabled, get_enabled_features
from apps.tenants.models import FeatureFlag


@pytest.mark.django_db
class TestFeatureServices:

    def test_enabled_flag_returns_true(self):
        """Registry flag with default_enabled=True returns True."""
        FeatureFlag.objects.using('default').create(
            codename='test_module', name='Test', default_enabled=True,
        )
        assert is_feature_enabled('test_module') is True

    def test_disabled_flag_returns_false(self):
        """Registry flag with default_enabled=False returns False."""
        FeatureFlag.objects.using('default').create(
            codename='test_off', name='Test Off', default_enabled=False,
        )
        assert is_feature_enabled('test_off') is False

    def test_unknown_flag_returns_false(self):
        """Flag that doesn't exist returns False."""
        assert is_feature_enabled('nonexistent_module') is False

    def test_tenant_override_enables(self):
        """TenantFeature override can enable a disabled flag."""
        FeatureFlag.objects.using('default').create(
            codename='override_test', name='Override', default_enabled=False,
        )
        TenantFeature.objects.create(
            feature_codename='override_test', is_enabled=True,
        )
        assert is_feature_enabled('override_test') is True

    def test_tenant_override_disables(self):
        """TenantFeature override can disable an enabled flag."""
        FeatureFlag.objects.using('default').create(
            codename='disable_test', name='Disable', default_enabled=True,
        )
        TenantFeature.objects.create(
            feature_codename='disable_test', is_enabled=False,
        )
        assert is_feature_enabled('disable_test') is False

    def test_get_enabled_features_returns_list(self):
        """get_enabled_features returns only enabled flags."""
        FeatureFlag.objects.using('default').create(
            codename='enabled_one', name='On', default_enabled=True,
        )
        FeatureFlag.objects.using('default').create(
            codename='disabled_one', name='Off', default_enabled=False,
        )
        enabled = get_enabled_features()
        codenames = [f['codename'] for f in enabled]
        assert 'enabled_one' in codenames
        assert 'disabled_one' not in codenames
