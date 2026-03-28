from __future__ import annotations

import logging
from typing import Iterable, Set

from apps.rbac.models import Role, RolePermission, UserRole

logger = logging.getLogger(__name__)


def auto_assign_default_role(user) -> None:
    """
    Assign a sensible RBAC role to a user who has none.

    Logic:
      - If the user's employee profile is a manager to anyone -> team_lead
      - Otherwise -> viewer
    """
    slug = "viewer"
    try:
        from apps.employees.models import Employee
        emp = Employee.objects.filter(user=user, deleted_at__isnull=True).first()
        if emp and Employee.objects.filter(reporting_to=emp, deleted_at__isnull=True).exists():
            slug = "team_lead"
    except Exception:
        pass

    role = Role.objects.filter(slug=slug).first()
    if role:
        UserRole.objects.get_or_create(user=user, role=role)
        logger.info(f"RBAC: Auto-assigned '{slug}' role to {getattr(user, 'email', '?')}")
    else:
        logger.warning(f"RBAC: Role '{slug}' not found -- run seed_rbac")


# compute and cache permission codenames for a user in current tenant DB
def get_user_permission_codenames(user) -> Set[str]:
    if user is None:
        return set()

    cached = getattr(user, "_permission_codenames_cache", None)
    if cached is not None:
        return cached

    try:
        role_ids = list(UserRole.objects.filter(user=user).values_list("role_id", flat=True))
        codenames = set(
            RolePermission.objects.filter(role_id__in=role_ids)
            .values_list("permission_codename", flat=True)
            .distinct()
        )
        if not codenames and not role_ids:
            logger.warning(
                f"RBAC: User {getattr(user, 'email', '?')} has no roles -- auto-assigning"
            )
            try:
                auto_assign_default_role(user)
                # Re-fetch after assignment
                role_ids = list(UserRole.objects.filter(user=user).values_list("role_id", flat=True))
                codenames = set(
                    RolePermission.objects.filter(role_id__in=role_ids)
                    .values_list("permission_codename", flat=True)
                    .distinct()
                )
            except Exception:
                codenames = set()  # no permissions -- safe default
    except Exception as exc:
        logger.warning(f"RBAC tables error ({exc}) -- denying all permissions")
        codenames = set()

    user._permission_codenames_cache = codenames
    return codenames


# check if a user has a given permission codename (with tenant admin bypass)
def user_has_permission(user, codename: str) -> bool:
    if user is None or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_tenant_admin", False):
        return True
    perms = get_user_permission_codenames(user)
    return codename in perms


def invalidate_permission_cache(user) -> None:
    """Clear the cached permission codenames for a user.
    Call this after role assignment changes."""
    if user is not None:
        user._permission_codenames_cache = None


# normalize permission codename list (strip, dedupe, preserve order)
def normalize_codenames(items: Iterable[str]) -> list[str]:
    out: list[str] = []
    seen = set()
    for raw in items:
        c = (raw or "").strip()
        if not c or c in seen:
            continue
        seen.add(c)
        out.append(c)
    return out
