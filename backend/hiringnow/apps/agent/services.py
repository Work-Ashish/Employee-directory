"""
Agent service layer.

- compute_daily_summary: Build/cache a DailyActivitySummary for a given employee + date
- sync_agent_attendance: Create/update attendance from agent first/last activity
"""

from django.utils import timezone

from apps.agent.models import DailyActivitySummary
from apps.agent.productivity import calculate_daily_productivity


def compute_daily_summary(employee_id, date):
    """
    Compute (or retrieve cached) daily activity summary for an employee.

    Args:
        employee_id: UUID of the employee
        date: datetime.date

    Returns:
        DailyActivitySummary instance, or None if no data exists.
    """
    # Check for existing summary first
    existing = DailyActivitySummary.objects.filter(
        employee_id=employee_id,
        date=date,
    ).first()

    if existing:
        return existing

    # Calculate from raw data
    result = calculate_daily_productivity(employee_id, date)
    if not result:
        return None

    summary = DailyActivitySummary.objects.create(
        employee_id=employee_id,
        date=date,
        total_seconds=result['total_seconds'],
        active_seconds=result['active_seconds'],
        idle_seconds=result['idle_seconds'],
        productive_seconds=result['productive_seconds'],
        unproductive_seconds=result['unproductive_seconds'],
        neutral_seconds=result['neutral_seconds'],
        keystroke_count=result['keystroke_count'],
        mouse_click_count=result['mouse_click_count'],
        screenshot_count=result['screenshot_count'],
        idle_event_count=result['idle_event_count'],
        productivity_score=round(result['score'] * 100, 2),
        top_apps=result['top_apps'],
        top_websites=result['top_websites'],
        clock_in=result['clock_in'],
        clock_out=result['clock_out'],
    )

    return summary


def refresh_daily_summary(employee_id, date):
    """
    Force-recalculate the daily summary (deletes existing and rebuilds).

    Returns:
        DailyActivitySummary instance, or None if no data exists.
    """
    DailyActivitySummary.objects.filter(
        employee_id=employee_id,
        date=date,
    ).delete()

    return compute_daily_summary(employee_id, date)


def sync_agent_attendance(employee_id, date):
    """
    Create/update an attendance record from agent activity data.
    First activity session = clock-in, last session end = clock-out.

    This integrates with the existing attendance system by creating
    a record that the attendance module can read.

    Args:
        employee_id: UUID of the employee
        date: datetime.date

    Returns:
        dict with clock_in and clock_out, or None if no sessions.
    """
    from apps.agent.models import ActivitySession

    sessions = ActivitySession.objects.filter(
        device__employee_id=employee_id,
        started_at__date=date,
    ).order_by('started_at')

    if not sessions.exists():
        return None

    first = sessions.first()
    last = sessions.last()

    clock_in = first.started_at
    clock_out = last.ended_at or last.started_at

    # Update the daily summary if it exists
    DailyActivitySummary.objects.filter(
        employee_id=employee_id,
        date=date,
    ).update(clock_in=clock_in, clock_out=clock_out)

    return {
        'clock_in': clock_in,
        'clock_out': clock_out,
        'session_count': sessions.count(),
    }
