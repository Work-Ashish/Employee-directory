"""
Export a tenant database snapshot to JSON for backup/DR.

Usage:
    python manage.py export_snapshot --tenant-slug acme
    python manage.py export_snapshot --tenant-slug acme --output /backups/acme.json
"""
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.tenants.models import Tenant
from config.tenant_context import set_current_tenant, clear_current_tenant


class Command(BaseCommand):
    help = "Export core tenant data (users, departments, employees) to a JSON snapshot."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-slug", required=True, help="Slug of the tenant")
        parser.add_argument("--output", default=None, help="Output file path (default: backups/snapshot-<ts>.json)")

    def handle(self, *args, **options):
        slug = options["tenant_slug"]
        tenant = Tenant.objects.using("default").filter(slug=slug).first()
        if not tenant:
            raise CommandError(f"Tenant with slug '{slug}' not found.")

        set_current_tenant(tenant)
        db = tenant.db_name

        try:
            from apps.users.models import User
            from apps.departments.models import Department
            from apps.employees.models import Employee

            self.stdout.write("Fetching core entities...")

            users = list(
                User.objects.using(db)
                .values("id", "email", "first_name", "last_name", "is_active", "is_tenant_admin", "created_at")
            )
            departments = list(Department.objects.using(db).values("id", "name", "color", "created_at"))
            employees = list(
                Employee.objects.using(db)
                .values(
                    "id", "employee_code", "first_name", "last_name", "email",
                    "phone", "department", "designation", "status", "date_of_joining",
                    "salary", "created_at",
                )
            )

            snapshot = {
                "metadata": {
                    "tenant": slug,
                    "exported_at": timezone.now().isoformat(),
                    "record_counts": {
                        "users": len(users),
                        "departments": len(departments),
                        "employees": len(employees),
                    },
                },
                "data": {
                    "users": users,
                    "departments": departments,
                    "employees": employees,
                },
            }

            # Determine output path
            if options["output"]:
                out_path = Path(options["output"])
            else:
                backup_dir = Path(__file__).resolve().parents[5] / "backups"
                backup_dir.mkdir(exist_ok=True)
                ts = timezone.now().strftime("%Y%m%d-%H%M%S")
                out_path = backup_dir / f"snapshot-{slug}-{ts}.json"

            out_path.write_text(json.dumps(snapshot, indent=2, default=str), encoding="utf-8")

            self.stdout.write(self.style.SUCCESS(f"Snapshot saved to: {out_path}"))
            self.stdout.write(f"  Users: {len(users)}, Departments: {len(departments)}, Employees: {len(employees)}")
        finally:
            clear_current_tenant()
