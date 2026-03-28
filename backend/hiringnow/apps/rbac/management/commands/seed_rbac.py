from __future__ import annotations

from typing import Dict, List

from django.core.management.base import BaseCommand, CommandError

from apps.rbac.models import Role, RolePermission
from apps.tenants.models import Tenant, Permission as RegistryPermission


PERMISSIONS: Dict[str, List[str]] = {
    "roles": [
        "roles.view",
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
    "performance": [
        "performance.view",
        "performance.manage",
    ],
    "training": [
        "training.view",
        "training.manage",
    ],
    "teams": [
        "teams.view",
        "teams.manage",
    ],
    "feedback": [
        "feedback.view",
        "feedback.manage",
    ],
    "announcements": [
        "announcements.view",
        "announcements.manage",
    ],
    "assets": [
        "assets.view",
        "assets.manage",
    ],
    "documents": [
        "documents.view",
        "documents.manage",
    ],
    "tickets": [
        "tickets.view",
        "tickets.manage",
    ],
    "reimbursements": [
        "reimbursements.view",
        "reimbursements.manage",
    ],
    "resignations": [
        "resignations.view",
        "resignations.manage",
    ],
    "events": [
        "events.view",
        "events.manage",
    ],
    "notifications": [
        "notifications.view",
        "notifications.manage",
    ],
    "reports": [
        "reports.view",
        "reports.manage",
    ],
    "sessions": [
        "sessions.view",
        "sessions.manage",
    ],
    "timetracker": [
        "timetracker.view",
        "timetracker.manage",
    ],
    "audit": [
        "audit.view",
    ],
    "permissions": [
        "permissions.view",
    ],
    "kudos": [
        "kudos.view",
        "kudos.manage",
    ],
    "admin_alerts": [
        "admin_alerts.view",
    ],
}

SYSTEM_ROLES = {
    "admin": {
        "name": "Admin",
        "description": "Full access to all tenant features.",
        "permissions": [
            "roles.view", "roles.manage",
            "users.view", "users.manage", "users.manage_roles",
            "employees.view", "employees.manage", "employees.export", "employees.import",
            "departments.view", "departments.manage",
            "dashboard.view", "dashboard.admin",
            "organization.view", "organization.manage",
            "settings.view", "settings.manage",
            "attendance.view", "attendance.manage",
            "leaves.view", "leaves.manage",
            "payroll.view", "payroll.manage",
            "performance.view", "performance.manage",
            "training.view", "training.manage",
            "teams.view", "teams.manage",
            "feedback.view", "feedback.manage",
            "announcements.view", "announcements.manage",
            "assets.view", "assets.manage",
            "documents.view", "documents.manage",
            "tickets.view", "tickets.manage",
            "reimbursements.view", "reimbursements.manage",
            "resignations.view", "resignations.manage",
            "events.view", "events.manage",
            "notifications.view", "notifications.manage",
            "reports.view", "reports.manage",
            "sessions.view", "sessions.manage",
            "timetracker.view", "timetracker.manage",
            "audit.view",
            "permissions.view",
            "kudos.view", "kudos.manage",
            "admin_alerts.view",
        ],
    },
    "ceo": {
        "name": "CEO",
        "description": "Executive access to all features.",
        "permissions": [
            "roles.view", "roles.manage",
            "users.view", "users.manage", "users.manage_roles",
            "employees.view", "employees.manage", "employees.export", "employees.import",
            "departments.view", "departments.manage",
            "dashboard.view", "dashboard.admin",
            "organization.view", "organization.manage",
            "settings.view", "settings.manage",
            "attendance.view", "attendance.manage",
            "leaves.view", "leaves.manage",
            "payroll.view", "payroll.manage",
            "performance.view", "performance.manage",
            "training.view", "training.manage",
            "teams.view", "teams.manage",
            "feedback.view", "feedback.manage",
            "announcements.view", "announcements.manage",
            "assets.view", "assets.manage",
            "documents.view", "documents.manage",
            "tickets.view", "tickets.manage",
            "reimbursements.view", "reimbursements.manage",
            "resignations.view", "resignations.manage",
            "events.view", "events.manage",
            "notifications.view", "notifications.manage",
            "reports.view", "reports.manage",
            "sessions.view", "sessions.manage",
            "timetracker.view", "timetracker.manage",
            "audit.view",
            "permissions.view",
            "kudos.view", "kudos.manage",
            "admin_alerts.view",
        ],
    },
    "hr_manager": {
        "name": "HR Manager",
        "description": "Manages employees, departments, and HR operations.",
        "permissions": [
            "roles.view",
            "users.view", "users.manage",
            "employees.view", "employees.manage", "employees.export", "employees.import",
            "departments.view", "departments.manage",
            "dashboard.view", "dashboard.admin",
            "organization.view",
            "attendance.view", "attendance.manage",
            "leaves.view", "leaves.manage",
            "payroll.view", "payroll.manage",
            "performance.view", "performance.manage",
            "training.view", "training.manage",
            "teams.view", "teams.manage",
            "feedback.view", "feedback.manage",
            "announcements.view", "announcements.manage",
            "assets.view", "assets.manage",
            "documents.view", "documents.manage",
            "tickets.view", "tickets.manage",
            "reimbursements.view", "reimbursements.manage",
            "resignations.view", "resignations.manage",
            "events.view", "events.manage",
            "notifications.view", "notifications.manage",
            "reports.view", "reports.manage",
            "sessions.view", "sessions.manage",
            "timetracker.view", "timetracker.manage",
            "audit.view",
            "permissions.view",
            "kudos.view", "kudos.manage",
            "admin_alerts.view",
        ],
    },
    "recruiter": {
        "name": "Recruiter",
        "description": "Can manage employees and candidates.",
        "permissions": [
            "roles.view",
            "employees.view", "employees.manage",
            "departments.view",
            "dashboard.view",
            "teams.view",
        ],
    },
    "payroll_admin": {
        "name": "Payroll Admin",
        "description": "Manages payroll and compensation.",
        "permissions": [
            "roles.view",
            "employees.view", "employees.export",
            "departments.view",
            "dashboard.view",
            "attendance.view",
            "payroll.view", "payroll.manage",
            "reimbursements.view", "reimbursements.manage",
            "reports.view",
        ],
    },
    "team_lead": {
        "name": "Team Lead",
        "description": "Manages team members and views department data.",
        "permissions": [
            "roles.view",
            "employees.view",
            "departments.view",
            "dashboard.view",
            "attendance.view",
            "leaves.view",
            "performance.view", "performance.manage",
            "training.view",
            "teams.view",
            "feedback.view", "feedback.manage",
            "announcements.view",
            "assets.view",
            "documents.view",
            "tickets.view", "tickets.manage",
            "reimbursements.view",
            "resignations.view",
            "events.view",
            "notifications.view",
            "timetracker.view",
            "kudos.view",
        ],
    },
    "hiring_manager": {
        "name": "Hiring Manager",
        "description": "Can view candidates and provide interview feedback.",
        "permissions": [
            "roles.view",
            "employees.view",
            "departments.view",
            "dashboard.view",
            "teams.view",
        ],
    },
    "interviewer": {
        "name": "Interviewer",
        "description": "Can view assigned candidates and submit feedback.",
        "permissions": [
            "roles.view",
            "employees.view",
        ],
    },
    "employee": {
        "name": "Employee",
        "description": "Basic employee access — dashboard, attendance, leaves.",
        "permissions": [
            "roles.view",
            "dashboard.view",
            "attendance.view",
            "leaves.view",
            "payroll.view",
            "performance.view",
            "training.view",
            "teams.view",
            "feedback.view", "feedback.manage",
            "announcements.view",
            "assets.view",
            "documents.view",
            "tickets.view", "tickets.manage",
            "reimbursements.view", "reimbursements.manage",
            "resignations.view", "resignations.manage",
            "events.view",
            "notifications.view",
            "timetracker.view",
            "kudos.view", "kudos.manage",
        ],
    },
    "viewer": {
        "name": "Viewer",
        "description": "Read-only access.",
        "permissions": [
            "roles.view",
            "employees.view",
            "departments.view",
            "dashboard.view",
            "performance.view",
            "training.view",
            "teams.view",
            "feedback.view",
            "announcements.view",
            "assets.view",
            "documents.view",
            "tickets.view",
            "reimbursements.view",
            "resignations.view",
            "events.view",
            "notifications.view",
            "reports.view",
            "sessions.view",
            "timetracker.view",
            "audit.view",
            "kudos.view",
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
        from django.conf import settings
        db_alias = tenant.db_name if tenant.db_name in settings.DATABASES else "default"

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
