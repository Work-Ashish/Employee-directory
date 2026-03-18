"""
Restore a tenant database from a JSON snapshot.

Usage:
    python manage.py import_snapshot --tenant-slug acme
    python manage.py import_snapshot --tenant-slug acme --file /backups/snapshot.json
"""
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.tenants.models import Tenant
from config.tenant_context import set_current_tenant, clear_current_tenant


class Command(BaseCommand):
    help = "Import a JSON snapshot into a tenant database (upsert mode)."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-slug", required=True, help="Slug of the tenant")
        parser.add_argument("--file", default=None, help="Path to snapshot JSON (default: latest in backups/)")

    def handle(self, *args, **options):
        slug = options["tenant_slug"]
        tenant = Tenant.objects.using("default").filter(slug=slug).first()
        if not tenant:
            raise CommandError(f"Tenant with slug '{slug}' not found.")

        # Locate snapshot file
        if options["file"]:
            snap_path = Path(options["file"])
        else:
            backup_dir = Path(__file__).resolve().parents[5] / "backups"
            files = sorted(backup_dir.glob("snapshot-*.json"), reverse=True)
            if not files:
                raise CommandError("No snapshot files found in backups/")
            snap_path = files[0]

        self.stdout.write(f"Reading snapshot: {snap_path.name}")
        snapshot = json.loads(snap_path.read_text(encoding="utf-8"))
        data = snapshot["data"]

        set_current_tenant(tenant)
        db = tenant.db_name

        try:
            from apps.users.models import User
            from apps.departments.models import Department
            from apps.employees.models import Employee
            from django.contrib.auth.hashers import make_password

            with transaction.atomic(using=db):
                # Departments
                self.stdout.write(f"Restoring {len(data.get('departments', []))} departments...")
                for dept in data.get("departments", []):
                    Department.objects.using(db).update_or_create(
                        id=dept["id"],
                        defaults={"name": dept["name"], "color": dept.get("color", "#6366f1")},
                    )

                # Users
                self.stdout.write(f"Restoring {len(data.get('users', []))} users...")
                for u in data.get("users", []):
                    User.objects.using(db).update_or_create(
                        id=u["id"],
                        defaults={
                            "email": u["email"],
                            "username": u["email"],
                            "first_name": u.get("first_name", ""),
                            "last_name": u.get("last_name", ""),
                            "is_active": u.get("is_active", True),
                            "is_tenant_admin": u.get("is_tenant_admin", False),
                            "password": make_password("RESTORED_NO_HASH"),
                        },
                    )

                # Employees
                self.stdout.write(f"Restoring {len(data.get('employees', []))} employees...")
                for emp in data.get("employees", []):
                    Employee.objects.using(db).update_or_create(
                        id=emp["id"],
                        defaults={
                            "first_name": emp.get("first_name", ""),
                            "last_name": emp.get("last_name", ""),
                            "email": emp.get("email", ""),
                            "phone": emp.get("phone", ""),
                            "department": emp.get("department", ""),
                            "designation": emp.get("designation", ""),
                            "status": emp.get("status", "active"),
                            "salary": emp.get("salary"),
                            "date_of_joining": emp.get("date_of_joining"),
                        },
                    )

            self.stdout.write(self.style.SUCCESS("Restore completed successfully."))
        finally:
            clear_current_tenant()
