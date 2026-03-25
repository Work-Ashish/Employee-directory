"""
Productivity score calculation service.

Computes a 0.0 - 1.0 daily productivity score for an employee based on:
  40% - Productive time ratio (productive seconds / total active seconds)
  25% - Activity intensity (keystrokes + clicks per active hour, normalized)
  20% - Focus time ratio (uninterrupted productive stretches > 25 min)
  15% - Low idle ratio (less idle time = higher score)
"""

from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum, Q
from django.utils import timezone

from apps.agent.models import (
    ActivitySession,
    AppUsage,
    IdleEvent,
)


# Normalization constants
# Assume ~4000 keystrokes+clicks per hour is a high-activity baseline
ACTIVITY_NORM_PER_HOUR = 4000

# Focus threshold: a productive stretch of at least 25 minutes
FOCUS_THRESHOLD_SECONDS = 25 * 60


def calculate_daily_productivity(employee_id, date):
    """
    Calculate the productivity score for an employee on a given date.

    Args:
        employee_id: UUID of the employee
        date: datetime.date object

    Returns:
        dict with keys:
            score (float): 0.0 - 1.0
            productive_seconds (int)
            unproductive_seconds (int)
            neutral_seconds (int)
            active_seconds (int)
            idle_seconds (int)
            keystroke_count (int)
            mouse_click_count (int)
            idle_event_count (int)
            focus_sessions (int): count of productive stretches > 25 min
            clock_in (datetime or None)
            clock_out (datetime or None)
            top_apps (list)
            top_websites (list)
    """
    from apps.agent.models import WebsiteVisit, Screenshot

    # Get all sessions for this employee on this date
    sessions = ActivitySession.objects.filter(
        device__employee_id=employee_id,
        started_at__date=date,
    ).order_by('started_at')

    if not sessions.exists():
        return None

    session_ids = list(sessions.values_list('id', flat=True))

    # Aggregate session-level data
    agg = sessions.aggregate(
        total_active=Sum('active_seconds'),
        total_idle=Sum('idle_seconds'),
        total_keystrokes=Sum('keystrokes'),
        total_mouse_clicks=Sum('mouse_clicks'),
    )

    active_seconds = agg['total_active'] or 0
    idle_seconds = agg['total_idle'] or 0
    keystroke_count = agg['total_keystrokes'] or 0
    mouse_click_count = agg['total_mouse_clicks'] or 0
    total_seconds = active_seconds + idle_seconds

    # Categorized time from AppUsage
    category_agg = (
        AppUsage.objects
        .filter(session_id__in=session_ids)
        .values('category')
        .annotate(total=Sum('total_seconds'))
    )
    category_map = {row['category']: row['total'] for row in category_agg}
    productive_seconds = category_map.get('PRODUCTIVE', 0)
    unproductive_seconds = category_map.get('UNPRODUCTIVE', 0)
    neutral_seconds = category_map.get('NEUTRAL', 0)

    # Idle event count
    idle_event_count = IdleEvent.objects.filter(
        session_id__in=session_ids,
    ).count()

    # Screenshot count
    screenshot_count = Screenshot.objects.filter(
        session_id__in=session_ids,
    ).count()

    # Clock in/out
    first_session = sessions.first()
    last_session = sessions.last()
    clock_in = first_session.started_at if first_session else None
    clock_out = (last_session.ended_at or last_session.started_at) if last_session else None

    # Top apps (top 10)
    top_apps = list(
        AppUsage.objects
        .filter(session_id__in=session_ids)
        .values('app_name', 'category')
        .annotate(total_seconds=Sum('total_seconds'))
        .order_by('-total_seconds')[:10]
    )

    # Top websites (top 10)
    top_websites = list(
        WebsiteVisit.objects
        .filter(session_id__in=session_ids)
        .values('domain', 'category')
        .annotate(total_seconds=Sum('total_seconds'))
        .order_by('-total_seconds')[:10]
    )

    # ---------------------------------------------------------------
    # Score Components
    # ---------------------------------------------------------------

    # 1. Productive time ratio (40%)
    if active_seconds > 0:
        productive_ratio = productive_seconds / active_seconds
    else:
        productive_ratio = 0.0
    productive_ratio = min(productive_ratio, 1.0)

    # 2. Activity intensity (25%)
    if active_seconds > 0:
        active_hours = active_seconds / 3600
        activity_per_hour = (keystroke_count + mouse_click_count) / max(active_hours, 0.01)
        intensity = min(activity_per_hour / ACTIVITY_NORM_PER_HOUR, 1.0)
    else:
        intensity = 0.0

    # 3. Focus time ratio (20%)
    # Count productive app usage stretches that are >= 25 minutes
    productive_usages = (
        AppUsage.objects
        .filter(session_id__in=session_ids, category='PRODUCTIVE')
        .order_by('session__started_at')
        .values_list('total_seconds', flat=True)
    )
    focus_sessions = sum(1 for s in productive_usages if s >= FOCUS_THRESHOLD_SECONDS)
    # Normalize: assume 4 focus sessions in a day is excellent
    focus_ratio = min(focus_sessions / 4.0, 1.0) if productive_usages else 0.0

    # 4. Low idle ratio (15%)
    if total_seconds > 0:
        idle_ratio = 1.0 - (idle_seconds / total_seconds)
    else:
        idle_ratio = 0.0
    idle_ratio = max(idle_ratio, 0.0)

    # Weighted score
    score = (
        0.40 * productive_ratio +
        0.25 * intensity +
        0.20 * focus_ratio +
        0.15 * idle_ratio
    )
    score = round(min(max(score, 0.0), 1.0), 4)

    return {
        'score': score,
        'productive_seconds': productive_seconds,
        'unproductive_seconds': unproductive_seconds,
        'neutral_seconds': neutral_seconds,
        'active_seconds': active_seconds,
        'idle_seconds': idle_seconds,
        'total_seconds': total_seconds,
        'keystroke_count': keystroke_count,
        'mouse_click_count': mouse_click_count,
        'screenshot_count': screenshot_count,
        'idle_event_count': idle_event_count,
        'focus_sessions': focus_sessions,
        'clock_in': clock_in,
        'clock_out': clock_out,
        'top_apps': top_apps,
        'top_websites': top_websites,
    }
