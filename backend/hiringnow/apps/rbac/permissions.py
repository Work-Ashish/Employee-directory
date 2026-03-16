from rest_framework.permissions import BasePermission

from apps.rbac.services import user_has_permission


# DRF permission class that enforces a single RBAC codename
class HasPermission(BasePermission):
    def __init__(self, codename: str):
        self.codename = codename

    def has_permission(self, request, view) -> bool:
        return user_has_permission(getattr(request, "user", None), self.codename)