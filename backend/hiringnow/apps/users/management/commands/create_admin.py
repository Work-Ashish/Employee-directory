"""
Create or update a tenant admin user.

Usage:
    python manage.py create_admin --tenant-slug acme
    python manage.py create_admin --tenant-slug acme --email admin@acme.com --password Secret123!
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.hashers import make_password

from apps.tenants.models import Tenant
from config.tenant_context import set_current_tenant, clear_current_tenant


class Command(BaseCommand):
    help = "Create or update a tenant admin user with CEO-level access."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-slug", required=True, help="Slug of the tenant")
        parser.add_argument("--email", default="superadmin@emspro.com")
        parser.add_argument("--password", default="Super@dmin2026!")
        parser.add_argument("--name", default="Super Admin")

    def handle(self, *args, **options):
        slug = options["tenant_slug"]
        email = options["email"]
        password = options["password"]
        name = options["name"]

        tenant = Tenant.objects.using("default").filter(slug=slug).first()
        if not tenant:
            raise CommandError(f"Tenant with slug '{slug}' not found.")

        set_current_tenant(tenant)
        db = tenant.db_name

        try:
            from apps.users.models import User

            user, created = User.objects.using(db).update_or_create(
                email=email,
                defaults={
                    "username": email,
                    "first_name": name.split()[0] if name else "Super",
                    "last_name": " ".join(name.split()[1:]) if len(name.split()) > 1 else "Admin",
                    "password": make_password(password),
                    "is_staff": True,
                    "is_tenant_admin": True,
                    "is_active": True,
                },
            )

            action = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(
                f"{action} admin user: {email} (tenant: {slug})"
            ))
            self.stdout.write(f"  Email:    {email}")
            self.stdout.write(f"  Password: {password}")
        finally:
            clear_current_tenant()
