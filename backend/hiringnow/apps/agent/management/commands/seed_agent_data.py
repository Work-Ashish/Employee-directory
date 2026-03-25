"""
Seed realistic agent tracking data for a tenant.

Usage:
    python manage.py seed_agent_data --tenant-slug hrmscorp
"""
from __future__ import annotations

import random
from datetime import timedelta
from uuid import uuid4

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.tenants.models import Tenant
from apps.employees.models import Employee
from apps.agent.models import (
    AgentDevice,
    ActivitySession,
    AppUsage,
    WebsiteVisit,
    IdleEvent,
    AgentCommand,
    Screenshot,
)
from config.tenant_context import set_current_tenant


DEVICE_TEMPLATES = [
    ("DESKTOP-WIN-001", "WINDOWS"),
    ("DESKTOP-WIN-002", "WINDOWS"),
    ("DESKTOP-WIN-003", "WINDOWS"),
    ("MACBOOK-PRO-001", "MACOS"),
    ("MACBOOK-PRO-002", "MACOS"),
    ("MACBOOK-AIR-001", "MACOS"),
    ("LINUX-DEV-001", "LINUX"),
    ("LINUX-DEV-002", "LINUX"),
    ("DESKTOP-WIN-004", "WINDOWS"),
    ("MACBOOK-PRO-003", "MACOS"),
]

APP_CATALOG = [
    ("VS Code", "PRODUCTIVE"),
    ("Google Chrome", "NEUTRAL"),
    ("Slack", "PRODUCTIVE"),
    ("Microsoft Teams", "PRODUCTIVE"),
    ("Terminal", "PRODUCTIVE"),
    ("Figma", "PRODUCTIVE"),
    ("Spotify", "UNPRODUCTIVE"),
    ("Finder", "NEUTRAL"),
    ("File Explorer", "NEUTRAL"),
    ("Microsoft Word", "PRODUCTIVE"),
    ("Microsoft Excel", "PRODUCTIVE"),
    ("Zoom", "PRODUCTIVE"),
    ("YouTube", "UNPRODUCTIVE"),
    ("Notion", "PRODUCTIVE"),
    ("Postman", "PRODUCTIVE"),
    ("Discord", "UNPRODUCTIVE"),
    ("Calculator", "NEUTRAL"),
]

WEBSITE_CATALOG = [
    ("github.com", "PRODUCTIVE"),
    ("stackoverflow.com", "PRODUCTIVE"),
    ("docs.google.com", "PRODUCTIVE"),
    ("mail.google.com", "PRODUCTIVE"),
    ("linkedin.com", "NEUTRAL"),
    ("youtube.com", "UNPRODUCTIVE"),
    ("twitter.com", "UNPRODUCTIVE"),
    ("reddit.com", "UNPRODUCTIVE"),
    ("figma.com", "PRODUCTIVE"),
    ("notion.so", "PRODUCTIVE"),
    ("jira.atlassian.net", "PRODUCTIVE"),
    ("aws.amazon.com", "PRODUCTIVE"),
    ("vercel.com", "PRODUCTIVE"),
    ("news.ycombinator.com", "NEUTRAL"),
    ("medium.com", "NEUTRAL"),
]


class Command(BaseCommand):
    help = "Seed realistic agent tracking data for a tenant."

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant-slug",
            required=True,
            help="Slug of the tenant to seed data for.",
        )

    def handle(self, *args, **options):
        tenant_slug = options["tenant_slug"].strip()
        tenant = Tenant.objects.using("default").filter(slug=tenant_slug).first()
        if not tenant:
            raise CommandError(f"Tenant '{tenant_slug}' not found in registry.")

        db_alias = tenant.db_name

        # Ensure DB alias is registered
        if db_alias not in settings.DATABASES:
            default = settings.DATABASES["default"].copy()
            default["NAME"] = db_alias
            settings.DATABASES[db_alias] = default

        # Set tenant context so the router works
        set_current_tenant(tenant)

        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"Seeding agent data for tenant '{tenant.slug}' (db={db_alias})..."
            )
        )

        employees = list(
            Employee.objects.using(db_alias)
            .filter(status='active')
            .order_by('?')[:10]
        )
        if not employees:
            raise CommandError(
                f"No active employees found in tenant '{tenant_slug}'. "
                "Seed employees first."
            )

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        created_devices = 0
        created_sessions = 0

        for idx, emp in enumerate(employees):
            template = DEVICE_TEMPLATES[idx % len(DEVICE_TEMPLATES)]
            device_name = template[0]
            platform = template[1]
            machine_id = f"MACHINE-{emp.employee_code}-{uuid4().hex[:8].upper()}"

            # Skip if this employee already has a device
            if AgentDevice.objects.using(db_alias).filter(employee=emp).exists():
                self.stdout.write(f"  = Device exists for {emp.first_name} {emp.last_name}")
                continue

            # Randomize status: mostly active, some pending
            status_choices = ['ACTIVE'] * 7 + ['PENDING'] * 2 + ['SUSPENDED']
            device_status = random.choice(status_choices)

            heartbeat_offset = random.randint(0, 600)  # 0-10 min ago
            last_hb = now - timedelta(seconds=heartbeat_offset) if device_status == 'ACTIVE' else None

            device = AgentDevice.objects.using(db_alias).create(
                employee=emp,
                device_name=device_name,
                platform=platform,
                agent_version=random.choice(['1.0.0', '1.1.0', '1.2.0', '1.2.1']),
                status=device_status,
                last_heartbeat=last_hb,
                machine_id=machine_id,
            )
            created_devices += 1
            self.stdout.write(
                f"  + Device: {device.device_name} -> "
                f"{emp.first_name} {emp.last_name} ({device.status})"
            )

            if device_status != 'ACTIVE':
                continue

            # Create 2-4 sessions for today
            session_count = random.randint(2, 4)
            session_start = today_start + timedelta(hours=9)  # 9 AM

            for _ in range(session_count):
                active_secs = random.randint(1800, 7200)  # 30min - 2h
                idle_secs = random.randint(120, 900)
                session_end = session_start + timedelta(seconds=active_secs + idle_secs)

                session = ActivitySession.objects.using(db_alias).create(
                    device=device,
                    started_at=session_start,
                    ended_at=session_end,
                    active_seconds=active_secs,
                    idle_seconds=idle_secs,
                    keystrokes=random.randint(500, 5000),
                    mouse_clicks=random.randint(200, 2000),
                )
                created_sessions += 1

                # App usages (3-6 per session)
                app_count = random.randint(3, 6)
                sampled_apps = random.sample(APP_CATALOG, min(app_count, len(APP_CATALOG)))
                app_objects = []
                for app_name, category in sampled_apps:
                    app_objects.append(AppUsage(
                        session=session,
                        app_name=app_name,
                        window_title=f"{app_name} - workspace",
                        total_seconds=random.randint(60, active_secs // app_count),
                        category=category,
                    ))
                AppUsage.objects.using(db_alias).bulk_create(app_objects)

                # Website visits (2-5 per session)
                web_count = random.randint(2, 5)
                sampled_sites = random.sample(WEBSITE_CATALOG, min(web_count, len(WEBSITE_CATALOG)))
                web_objects = []
                for domain, category in sampled_sites:
                    web_objects.append(WebsiteVisit(
                        session=session,
                        domain=domain,
                        url=f"https://{domain}/",
                        total_seconds=random.randint(30, active_secs // (web_count * 2)),
                        category=category,
                    ))
                WebsiteVisit.objects.using(db_alias).bulk_create(web_objects)

                # Idle events (0-1 per session)
                if random.random() < 0.3:
                    idle_start = session_start + timedelta(seconds=random.randint(600, active_secs))
                    idle_dur = random.randint(600, 1800)
                    IdleEvent.objects.using(db_alias).create(
                        session=session,
                        started_at=idle_start,
                        ended_at=idle_start + timedelta(seconds=idle_dur),
                        duration_seconds=idle_dur,
                        response=random.choice(['WORKING', 'BREAK', 'NO_RESPONSE']),
                        work_description='Was reviewing documents offline.' if random.random() > 0.5 else '',
                    )

                # Screenshots (1-3 per session)
                for sc_idx in range(random.randint(1, 3)):
                    cap_time = session_start + timedelta(
                        seconds=random.randint(60, active_secs)
                    )
                    Screenshot.objects.using(db_alias).create(
                        session=session,
                        image_url=f"https://storage.example.com/screenshots/{session.id}/{sc_idx}.png",
                        captured_at=cap_time,
                    )

                # Move to next session
                session_start = session_end + timedelta(minutes=random.randint(5, 30))

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {created_devices} devices, {created_sessions} sessions."
            )
        )
