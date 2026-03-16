from __future__ import annotations

from typing import Dict, List

from django.core.management.base import BaseCommand, CommandError

from apps.rbac.models import Role, RolePermission
from apps.tenants.models import Tenant, Permission as RegistryPermission


PERMISSIONS: Dict[str, List[str]] = {
    "roles": [
        "roles.manage",
    ],
    "users": [
        "users.view",
        "users.manage",
        "users.manage_roles",
    ],
    "employees": [
        "employees.view",
        "employees.manage",
        "employees.export",
        "employees.import",
    ],
    "departments": [
        "departments.view",
        "departments.manage",
    ],
    "dashboard": [
        "dashboard.view",
        "dashboard.admin",
    ],
    "organization": [
        "organization.view",
        "organization.manage",
    ],
    "settings": [
        "settings.view",
        "settings.manage",
    ],
    "attendance": [
        "attendance.view",
        "attendance.manage",
    ],
    "leaves": [
        "leaves.view",
        "leaves.manage",
    ],
    "payroll": [
        "payroll.view",
        "payroll.manage",
    ],
}

SYSTEM_ROLES = {
    "admin": {
        "name": "Admin",
        "description": "Full access to all tenant features.",
        "permissions": [
            "roles.manage",
            "users.view", "users.manage", "users.manage_roles",
            "employees.view", "employees.manage", "employees.export", "employees.import",
            "departments.view", "departments.manage",
            "dashboard.view", "dashboard.admin",
            "organization.view", "organization.manage",
            "settings.view", "settings.manage",
            "attendance.view", "attendance.manage",
            "leaves.view", "leaves.manage",
            "payroll.view", "payroll.manage",
        ],
    },
    "ceo": {
        "name": "CEO",
        "description": "Executive access to all features.",
        "permissions": [
            "roles.manage",
            "users.view", "users.manage", "users.manage_roles",
            "employees.view", "employees.manage", "employees.export", "employees.import",
            "departments.view", "departments.manage",
            "dashboard.view", "dashboard.admin",
            "organization.view", "organization.manage",
            "settings.view", "settings.manage",
            "attendance.view", "attendance.manage",
            "leaves.view", "leaves.manage",
            "payroll.view", "payroll.manage",
        ],
    },
    "hr_manager": {
        "name": "HR Manager",
        "description": "Manages employees, departments, and HR operations.",
        "permissions": [
            "users.view", "users.manage",
            "employees.view", "employees.manage", "employees.export", "employees.import",
            "departments.view", "departments.manage",
            "dashboard.view", "dashboard.admin",
            "organization.view",
            "attendance.view", "attendance.manage",
            "leaves.view", "leaves.manage",
            "payroll.view", "payroll.manage",
        ],
    },
    "recruiter": {
        "name": "Recruiter",
        "description": "Can manage employees and candidates.",
        "permissions": [
            "employees.view", "employees.manage",
            "departments.view",
            "dashboard.view",
        ],
    },
    "payroll_admin": {
        "name": "Payroll Admin",
        "description": "Manages payroll and compensation.",
        "permissions": [
            "employees.view", "employees.export",
            "departments.view",
            "dashboard.view",
            "attendance.view",
            "payroll.view", "payroll.manage",
        ],
    },
    "team_lead": {
        "name": "Team Lead",
        "description": "Manages team members and views department data.",
        "permissions": [
            "employees.view",
            "departments.view",
            "dashboard.view",
            "attendance.view",
            "leaves.view",
        ],
    },
    "hiring_manager": {
        "name": "Hiring Manager",
        "description": "Can view candidates and provide interview feedback.",
        "permissions": [
            "employees.view",
            "departments.view",
            "dashboard.view",
        ],
    },
    "interviewer": {
        "name": "Interviewer",
        "description": "Can view assigned candidates and submit feedback.",
        "permissions": [
            "employees.view",
        ],
    },
    "employee": {
        "name": "Employee",
        "description": "Basic employee access — dashboard, attendance, leaves.",
        "permissions": [
            "dashboard.view",
            "attendance.view",
            "leaves.view",
            "payroll.view",
        ],
    },
    "viewer": {
        "name": "Viewer",
        "description": "Read-only access.",
        "permissions": [
            "employees.view",
            "departments.view",
            "dashboard.view",
        ],
    },
}


class Command(BaseCommand):
    help = "Seed registry permissions and default roles for a tenant."

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant-slug",
            required=True,
            help="Slug of the tenant to seed (registry tenants.slug).",
        )

    def handle(self, *args, **options):
        tenant_slug = options["tenant_slug"].strip()
        tenant = Tenant.objects.using("default").filter(slug=tenant_slug).first()
        if not tenant:
            raise CommandError(f"Tenant with slug '{tenant_slug}' not found in registry.")

        self.stdout.write(self.style.MIGRATE_HEADING("Seeding registry permissions..."))
        self._seed_registry_permissions()

        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"Seeding system roles for tenant '{tenant.slug}' (db={tenant.db_name})..."
            )
        )
        self._seed_tenant_roles(tenant)

        self.stdout.write(self.style.SUCCESS("RBAC seeding completed."))

    def _seed_registry_permissions(self):
        for module, codenames in PERMISSIONS.items():
            for codename in codenames:
                obj, created = RegistryPermission.objects.using("default").get_or_create(
                    codename=codename,
                    defaults={
                        "name": codename.replace(".", " ").title(),
                        "module": module,
                    },
                )
                if created:
                    self.stdout.write(f"  + Created permission: {obj.codename}")
                else:
                    self.stdout.write(f"  = Exists: {obj.codename}")

    def _seed_tenant_roles(self, tenant: Tenant):
        db_alias = tenant.db_name

        for slug, cfg in SYSTEM_ROLES.items():
            role, created = Role.objects.using(db_alias).get_or_create(
                slug=slug,
                defaults={
                    "name": cfg["name"],
                    "description": cfg["description"],
                    "is_system": True,
                },
            )
            if created:
                self.stdout.write(f"  + Created role: {role.slug}")
            else:
                self.stdout.write(f"  = Role exists: {role.slug}")

            perms = cfg["permissions"]
            # clear and re-create role permissions to keep them in sync
            RolePermission.objects.using(db_alias).filter(role=role).delete()
            RolePermission.objects.using(db_alias).bulk_create(
                [
                    RolePermission(role_id=role.id, permission_codename=codename)
                    for codename in perms
                ]
            )
            self.stdout.write(f"    -> Set {len(perms)} permissions for {role.slug}")
