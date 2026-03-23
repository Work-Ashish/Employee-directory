"""Shared helpers used across multiple Django apps."""


def get_employee_profile(request):
    """Return the employee profile linked to the requesting user, or None.

    This centralises the pattern used by timetracker, training, leave,
    announcements, kudos, and roles views so it stays DRY.
    """
    return getattr(request.user, 'employee_profile', None)
