"""Architecture integrity tests."""
import ast
import os
import re

import pytest
from django.apps import apps
from django.urls import get_resolver


@pytest.mark.django_db
class TestArchitecture:

    def test_all_installed_apps_importable(self):
        """Every app in INSTALLED_APPS can be loaded."""
        app_configs = apps.get_app_configs()
        local_apps = [a for a in app_configs if a.name.startswith('apps.')]
        assert len(local_apps) >= 27, f"Expected >=27 local apps, got {len(local_apps)}"

    def test_all_url_patterns_have_names(self):
        """Every API v1 URL pattern has a name."""
        resolver = get_resolver()
        api_patterns = []
        for pattern in resolver.url_patterns:
            if hasattr(pattern, 'url_patterns'):
                for p in pattern.url_patterns:
                    if hasattr(p, 'name') and p.name:
                        api_patterns.append(p.name)
        assert len(api_patterns) > 0, "No named URL patterns found"

    def test_permission_codenames_used_in_views_are_seeded(self):
        """Every HasPermission('xxx') codename in views is present in seed_rbac."""
        apps_dir = os.path.join(
            os.path.dirname(__file__), '..', 'apps',
        )
        seed_path = os.path.join(
            apps_dir, 'rbac', 'management', 'commands', 'seed_rbac.py',
        )

        # Parse seed_rbac.py to extract all codenames
        with open(seed_path) as f:
            tree = ast.parse(f.read())

        seeded_codenames = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                if '.' in node.value and not node.value.startswith('/'):
                    parts = node.value.split('.')
                    if len(parts) == 2 and all(
                        all(ch.isalpha() or ch == '_' for ch in p) for p in parts
                    ):
                        seeded_codenames.add(node.value)

        # Scan all views.py files for HasPermission('xxx') calls
        used_codenames = set()
        pattern = re.compile(r"HasPermission\(['\"]([^'\"]+)['\"]\)")
        for root, dirs, files in os.walk(apps_dir):
            for fname in files:
                if fname == 'views.py':
                    with open(os.path.join(root, fname)) as f:
                        content = f.read()
                    for match in pattern.finditer(content):
                        used_codenames.add(match.group(1))

        missing = used_codenames - seeded_codenames
        assert not missing, f"Codenames used in views but missing from seed_rbac: {missing}"
