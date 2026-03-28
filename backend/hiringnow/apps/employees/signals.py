"""
Auto-sync teams and RBAC roles when an employee's reporting_to field changes.

When an employee is created or their manager changes:
  1. Sync team membership via sync_employee_team()
  2. If the manager has no RBAC role, assign team_lead (they manage people)
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.employees.models import Employee


@receiver(pre_save, sender=Employee)
def track_reporting_to_change(sender, instance, **kwargs):
    """Cache the old reporting_to value before the save."""
    if instance.pk:
        try:
            old = Employee.objects.get(pk=instance.pk)
            instance._old_reporting_to = old.reporting_to_id
        except Employee.DoesNotExist:
            instance._old_reporting_to = None
    else:
        instance._old_reporting_to = None


@receiver(post_save, sender=Employee)
def sync_team_on_reporting_to_change(sender, instance, created, **kwargs):
    """When reporting_to changes (or employee is new), sync team membership."""
    old_rt = getattr(instance, '_old_reporting_to', None)
    new_rt = instance.reporting_to_id
    if created or old_rt != new_rt:
        try:
            from apps.teams.services import sync_employee_team
            sync_employee_team(instance)
        except Exception:
            pass  # Don't break employee save if team sync fails

        # Auto-assign team_lead RBAC role to the manager if they have no role
        if new_rt and instance.reporting_to:
            try:
                _ensure_manager_has_role(instance.reporting_to)
            except Exception:
                pass


def _ensure_manager_has_role(manager_employee):
    """If the manager's user has no RBAC role, assign team_lead."""
    user = getattr(manager_employee, 'user', None)
    if not user:
        return
    from apps.rbac.models import Role, UserRole
    if UserRole.objects.filter(user=user).exists():
        return  # already has a role, don't override
    role = Role.objects.filter(slug='team_lead').first()
    if role:
        UserRole.objects.get_or_create(user=user, role=role)
