from functools import wraps

from rest_framework.response import Response
from rest_framework import status

from apps.rbac.services import user_has_permission


def require_permission(codename: str):
    """
    Decorator for function-based views or APIView methods.
    Returns 403 if the authenticated user does not have the given permission codename.

    Usage:
        @require_permission("employees.view")
        def get(self, request):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(view_or_request, *args, **kwargs):
            if hasattr(view_or_request, 'user'):
                request = view_or_request
            else:
                request = args[0] if args else None

            user = getattr(request, 'user', None)
            if not user_has_permission(user, codename):
                return Response(
                    {'detail': f'Permission denied. Required: {codename}'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            return func(view_or_request, *args, **kwargs)
        return wrapper
    return decorator
