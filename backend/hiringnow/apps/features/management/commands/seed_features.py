from __future__ import annotations

from typing import Dict

from django.core.management.base import BaseCommand, CommandError

from apps.tenants.models import Tenant, FeatureFlag
from apps.features.models import TenantFeature


FEATURE_FLAGS: Dict[str, Dict] = {
    "employees": {
        "name": "Employees",
        "default_enabled": True,
        "description": "Employee management module",
    },
    "payroll": {
        "name": "Payroll",
        "default_enabled": True,
        "description": "Payroll processing module",
    },
    "attendance": {
        "name": "Attendance",
        "default_enabled": True,
        "description": "Attendance tracking module",
    },
    "leave": {
        "name": "Leave",
        "default_enabled": True,
        "description": "Leave management module",
    },
    "performance": {
        "name": "Performance",
        "default_enabled": True,
        "description": "Performance review module",
    },
    "training": {
        "name": "Training",
        "default_enabled": True,
        "description": "Training program module",
    },
    "recruitment": {
        "name": "Recruitment",
        "default_enabled": False,
        "description": "Recruitment and hiring module",
    },
    "documents": {
        "name": "Documents",
        "default_enabled": True,
        "description": "Document management module",
    },
    "assets": {
        "name": "Assets",
        "default_enabled": True,
        "description": "Asset tracking module",
    },
    "help_desk": {
        "name": "Help Desk",
        "default_enabled": True,
        "description": "Ticket and help desk module",
    },
    "announcements": {
        "name": "Announcements",
        "default_enabled": True,
        "description": "Company announcements module",
    },
    "reimbursement": {
        "name": "Reimbursement",
        "default_enabled": True,
        "description": "Reimbursement claims module",
    },
    "workflows": {
        "name": "Workflows",
        "default_enabled": False,
        "description": "Custom workflow engine",
    },
    "teams": {
        "name": "Teams",
        "default_enabled": True,
        "description": "Team management module",
    },
    "feedback": {
        "name": "Feedback",
        "default_enabled": True,
        "description": "Employee feedback module",
    },
    "resignation": {
        "name": "Resignation",
        "default_enabled": True,
        "description": "Resignation management module",
    },
    "reports": {
        "name": "Reports",
        "default_enabled": True,
        "description": "Reporting and analytics module",
    },
}


class Command(BaseCommand):
    help = "Seed registry feature flags and optionally create tenant overrides."

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant-slug",
            required=False,
            default=None,
            help="Slug of the tenant to create TenantFeature overrides for.",
        )
        parser.add_argument(
            "--enable-all",
            action="store_true",
            default=False,
            help="If set, all tenant feature overrides will be enabled regardless of defaults.",
        )

    def handle(self, *args, **options):
        tenant_slug = options["tenant_slug"]
        enable_all = options["enable_all"]

        # ── Step 1: Seed registry FeatureFlags in default DB ───────────
        self.stdout.write(self.style.MIGRATE_HEADING("Seeding registry feature flags..."))
        self._seed_registry_flags()

        # ── Step 2: Optionally seed TenantFeature overrides ────────────
        if tenant_slug:
            tenant_slug = tenant_slug.strip()
            tenant = Tenant.objects.using("default").filter(slug=tenant_slug).first()
            if not tenant:
                raise CommandError(f"Tenant with slug '{tenant_slug}' not found in registry.")

            self.stdout.write(
                self.style.MIGRATE_HEADING(
                    f"Seeding tenant features for '{tenant.slug}' (db={tenant.db_name})..."
                )
            )
            self._seed_tenant_features(tenant, enable_all)

        self.stdout.write(self.style.SUCCESS("Feature flag seeding completed."))

    def _seed_registry_flags(self):
        for codename, cfg in FEATURE_FLAGS.items():
            obj, created = FeatureFlag.objects.using("default").get_or_create(
                codename=codename,
                defaults={
                    "name": cfg["name"],
                    "description": cfg["description"],
                    "default_enabled": cfg["default_enabled"],
                },
            )
            if created:
                self.stdout.write(f"  + Created flag: {obj.codename}")
            else:
                self.stdout.write(f"  = Exists: {obj.codename}")

    def _seed_tenant_features(self, tenant: Tenant, enable_all: bool):
        db_alias = tenant.db_name

        for codename, cfg in FEATURE_FLAGS.items():
            is_enabled = True if enable_all else cfg["default_enabled"]

            obj, created = TenantFeature.objects.using(db_alias).get_or_create(
                feature_codename=codename,
                defaults={
                    "is_enabled": is_enabled,
                    "config": {},
                },
            )
            status = "on" if obj.is_enabled else "off"
            if created:
                self.stdout.write(f"  + Created tenant feature: {obj.feature_codename} ({status})")
            else:
                self.stdout.write(f"  = Exists: {obj.feature_codename} ({status})")
