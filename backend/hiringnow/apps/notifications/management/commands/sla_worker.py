"""
Check for workflow SLA breaches and create admin alerts.

Designed to run as a periodic cron job / celery beat task.

Usage:
    python manage.py sla_worker --tenant-slug acme

NOTE: Requires the workflow models (WorkflowInstance, WorkflowStep) to be
implemented. Currently a stub that logs a warning until those models exist.
"""
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.tenants.models import Tenant
from config.tenant_context import set_current_tenant, clear_current_tenant


class Command(BaseCommand):
    help = "Check pending workflow instances for SLA breaches and escalate via admin alerts."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-slug", required=True, help="Slug of the tenant")

    def handle(self, *args, **options):
        slug = options["tenant_slug"]
        tenant = Tenant.objects.using("default").filter(slug=slug).first()
        if not tenant:
            raise CommandError(f"Tenant with slug '{slug}' not found.")

        set_current_tenant(tenant)
        db = tenant.db_name

        try:
            self._check_sla_breaches(db)
        finally:
            clear_current_tenant()

    def _check_sla_breaches(self, db):
        # Try to import workflow models — they may not exist yet
        try:
            from apps.workflows.models import WorkflowInstance
        except (ImportError, ModuleNotFoundError):
            self.stdout.write(self.style.WARNING(
                "Workflow models not yet implemented. SLA worker is a no-op until "
                "apps.workflows.models.WorkflowInstance exists."
            ))
            return

        from apps.notifications.models import AdminAlert

        now = timezone.now()
        pending = WorkflowInstance.objects.using(db).filter(status="PENDING").select_related("template")
        breached = 0

        for instance in pending:
            steps = instance.template.steps.all().order_by("order")
            current_step = None
            for step in steps:
                if step.order == instance.current_step:
                    current_step = step
                    break

            if not current_step or not getattr(current_step, "sla_hours", None):
                continue

            # Determine when this step started
            step_start = instance.created_at
            last_action = (
                instance.actions.using(db)
                .exclude(step_id=current_step.id)
                .order_by("-created_at")
                .first()
            )
            if last_action:
                step_start = last_action.created_at

            deadline = step_start + timezone.timedelta(hours=current_step.sla_hours)

            if now > deadline:
                breached += 1
                AdminAlert.objects.using(db).create(
                    title=f"Workflow SLA Breach: {instance.template.name}",
                    message=(
                        f"Workflow instance {instance.id} is stuck on step "
                        f"{instance.current_step} and requires intervention."
                    ),
                    severity="CRITICAL",
                )
                self.stdout.write(f"  [!] SLA breached: instance {instance.id}, step {instance.current_step}")

        self.stdout.write(self.style.SUCCESS(
            f"SLA check complete. {breached} breach(es) detected and escalated."
        ))
