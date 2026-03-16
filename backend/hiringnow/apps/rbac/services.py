from __future__ import annotations

from typing import Iterable, Set

from apps.rbac.models import RolePermission, UserRole


# compute and cache permission codenames for a user in current tenant DB
def get_user_permission_codenames(user) -> Set[str]:
    if user is None:
        return set()

    cached = getattr(user, "_permission_codenames_cache", None)
    if cached is not None:
        return cached

    role_ids = UserRole.objects.filter(user=user).values_list("role_id", flat=True)
    codenames = set(
        RolePermission.objects.filter(role_id__in=role_ids)
        .values_list("permission_codename", flat=True)
        .distinct()
    )

    user._permission_codenames_cache = codenames
    return codenames


# check if a user has a given permission codename (with tenant admin bypass)
def user_has_permission(user, codename: str) -> bool:
    if user is None or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_tenant_admin", False):
        return True
    return codename in get_user_permission_codenames(user)


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