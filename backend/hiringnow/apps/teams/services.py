"""
Auto-create / sync teams from the employee reporting hierarchy.

Each manager who has at least one direct report gets a Team.
Direct reports become TeamMembers. The manager is the Team lead.
"""
from django.db import transaction

from apps.employees.models import Employee
from apps.teams.models import Team, TeamMember


def sync_employee_team(employee: Employee) -> None:
    """
    Ensure *employee* is a member of their manager's team.

    - If `employee.reporting_to` is set, find-or-create a Team led by
      that manager, then add the employee as a member.
    - Idempotent: safe to call multiple times.
    """
    manager = employee.reporting_to
    if not manager:
        return

    team = _ensure_team_for_manager(manager)

    # Add employee as member
    TeamMember.objects.get_or_create(
        team=team,
        employee=employee,
        defaults={'role': employee.designation or ''},
    )


def sync_all_teams() -> dict:
    """
    Bulk-sync: for every manager who has direct reports, create a Team
    and populate its members.  Returns a summary dict.
    """
    active_employees = Employee.objects.filter(
        deleted_at__isnull=True,
        reporting_to__isnull=False,
    ).select_related('reporting_to', 'reporting_to__department_ref')

    # Group employees by manager
    manager_map: dict[str, list[Employee]] = {}
    for emp in active_employees:
        mgr_id = str(emp.reporting_to_id)
        manager_map.setdefault(mgr_id, []).append(emp)

    teams_created = 0
    members_added = 0

    with transaction.atomic():
        for mgr_id, reports in manager_map.items():
            manager = reports[0].reporting_to
            team = _ensure_team_for_manager(manager)

            if team._was_just_created:
                teams_created += 1

            for emp in reports:
                _, created = TeamMember.objects.get_or_create(
                    team=team,
                    employee=emp,
                    defaults={'role': emp.designation or ''},
                )
                if created:
                    members_added += 1

    return {
        'teams_created': teams_created,
        'members_added': members_added,
        'managers_processed': len(manager_map),
    }


def _ensure_team_for_manager(manager: Employee) -> Team:
    """Find or create a Team led by *manager*."""
    team = Team.objects.filter(lead=manager).first()
    if team:
        team._was_just_created = False
        return team

    team_name = f"{manager.first_name} {manager.last_name}'s Team".strip()
    team = Team.objects.create(
        name=team_name,
        lead=manager,
        department=manager.department_ref,
    )
    # Add manager themselves as a member
    TeamMember.objects.get_or_create(
        team=team,
        employee=manager,
        defaults={'role': 'Team Lead'},
    )
    team._was_just_created = True
    return team
