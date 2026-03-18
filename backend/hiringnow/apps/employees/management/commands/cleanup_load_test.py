"""
Clean up load-test data from a tenant database.

Usage:
    python manage.py cleanup_load_test --tenant-slug acme
    python manage.py cleanup_load_test --tenant-slug acme --email-contains loadtest
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.tenants.models import Tenant
from config.tenant_context import set_current_tenant, clear_current_tenant


class Command(BaseCommand):
    help = "Delete load-test data (employees, users, payroll, attendance, leaves) matching a pattern."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-slug", required=True, help="Slug of the tenant")
        parser.add_argument("--email-contains", default="loadtest", help="Email pattern to match (default: 'loadtest')")

    def handle(self, *args, **options):
        slug = options["tenant_slug"]
        pattern = options["email_contains"]

        tenant = Tenant.objects.using("default").filter(slug=slug).first()
        if not tenant:
            raise CommandError(f"Tenant with slug '{slug}' not found.")

        set_current_tenant(tenant)
        db = tenant.db_name

        try:
            from apps.users.models import User, UserSession
            from apps.employees.models import Employee
            from apps.payroll.models import Payroll
            from apps.leave.models import Leave
            from apps.attendance.models import Attendance
            from apps.departments.models import Department

            self.stdout.write(f"Cleaning up load-test data matching '{pattern}' in tenant '{slug}'...")

            with transaction.atomic(using=db):
                # Find load-test employees by email pattern
                employees = Employee.objects.using(db).filter(email__icontains=pattern)
                emp_ids = list(employees.values_list("id", flat=True))

                if not emp_ids:
                    self.stdout.write(self.style.WARNING("No matching employees found."))
                    return

                # Delete in dependency order
                counts = {}
                counts["payroll"] = Payroll.objects.using(db).filter(employee_id__in=emp_ids).delete()[0]
                counts["leave"] = Leave.objects.using(db).filter(employee_id__in=emp_ids).delete()[0]
                counts["attendance"] = Attendance.objects.using(db).filter(employee_id__in=emp_ids).delete()[0]
                counts["employees"] = employees.delete()[0]

                # Find and delete load-test users
                users = User.objects.using(db).filter(email__icontains=pattern)
                user_ids = list(users.values_list("id", flat=True))
                counts["sessions"] = UserSession.objects.using(db).filter(user_id__in=user_ids).delete()[0]
                counts["users"] = users.delete()[0]

                # Delete load-test departments
                counts["departments"] = Department.objects.using(db).filter(name__icontains=pattern).delete()[0]

            for model, count in counts.items():
                self.stdout.write(f"  Deleted {count} {model} records")

            self.stdout.write(self.style.SUCCESS("Load-test data cleanup complete."))
        finally:
            clear_current_tenant()
