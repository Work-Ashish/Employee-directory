from uuid import UUID

from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.models import Role, RolePermission, UserRole
from apps.rbac.permissions import HasPermission
from apps.rbac.serializers import (
    RegistryPermissionSerializer,
    RoleSerializer,
    RolePermissionReadSerializer,
    RolePermissionsUpdateSerializer,
    UserRolesUpdateSerializer,
)
from apps.rbac.services import normalize_codenames
from apps.tenants.models import Permission as RegistryPermission
from apps.users.models import User


# list all permissions from registry catalog
class PermissionListView(generics.ListAPIView):
    serializer_class = RegistryPermissionSerializer
    permission_classes = [IsAuthenticated]  # optionally add HasPermission("permissions.view")

    def get_queryset(self):
        return RegistryPermission.objects.using("default").all().order_by("module", "codename")


# list and create roles in current tenant DB
class RoleListCreateView(generics.ListCreateAPIView):
    queryset = Role.objects.all().order_by("name")
    serializer_class = RoleSerializer

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission("roles.manage")]


# retrieve, update, or delete a single role
class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission("roles.manage")]


class RolePermissionsView(APIView):

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission("roles.manage")]

    # helper to fetch a role or return 404
    def get_role(self, pk: UUID) -> Role:
        return get_object_or_404(Role, pk=pk)

    # return permissions assigned to a role
    def get(self, request, pk):
        role = self.get_role(pk)
        assignments = RolePermission.objects.filter(role=role)

        codenames = list(assignments.values_list("permission_codename", flat=True))
        registry_map = {
            p.codename: p
            for p in RegistryPermission.objects.using("default")
            .filter(codename__in=codenames)
        }

        data = []
        for a in assignments:
            perm = registry_map.get(a.permission_codename)
            data.append(
                {
                    "codename": a.permission_codename,
                    "name": getattr(perm, "name", None),
                    "module": getattr(perm, "module", None),
                }
            )

        serializer = RolePermissionReadSerializer(data, many=True)
        return Response(serializer.data)

    # replace permissions assigned to a role
    def put(self, request, pk):
        role = self.get_role(pk)
        serializer = RolePermissionsUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        codenames = normalize_codenames(serializer.validated_data["permission_codenames"])

        # Validate against registry
        registry_qs = RegistryPermission.objects.using("default").filter(codename__in=codenames)
        found = set(registry_qs.values_list("codename", flat=True))
        missing = [c for c in codenames if c not in found]
        if missing:
            return Response(
                {"detail": f"Unknown permission codenames: {', '.join(missing)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        RolePermission.objects.filter(role=role).delete()
        RolePermission.objects.bulk_create(
            [RolePermission(role=role, permission_codename=c) for c in codenames]
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


class UserRolesView(APIView):

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission("users.manage_roles")]

    # helper to fetch a user from current tenant DB
    def get_user(self, user_id: UUID) -> User:
        return get_object_or_404(User, pk=user_id)

    # list roles assigned to a user
    def get(self, request, user_id):
        user = self.get_user(user_id)
        roles = Role.objects.filter(user_roles__user=user).order_by("name")
        serializer = RoleSerializer(roles, many=True)
        return Response(serializer.data)

    # replace roles assigned to a user
    def put(self, request, user_id):
        # block self-assignment — no one should modify their own roles via API
        if str(request.user.id) == str(user_id):
            return Response(
                {'detail': 'You cannot modify your own roles.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = self.get_user(user_id)
        serializer = UserRolesUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role_ids = serializer.validated_data["role_ids"]

        roles = list(Role.objects.filter(id__in=role_ids))
        if len(roles) != len(role_ids):
            existing = {str(r.id) for r in roles}
            missing = [str(rid) for rid in role_ids if str(rid) not in existing]
            return Response(
                {"detail": f"Unknown role IDs: {', '.join(missing)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        UserRole.objects.filter(user=user).delete()
        UserRole.objects.bulk_create(
            [UserRole(user=user, role=role) for role in roles]
        )

        # Invalidate cached permissions so changes take effect immediately
        from apps.rbac.services import invalidate_permission_cache
        invalidate_permission_cache(user)

        return Response(status=status.HTTP_204_NO_CONTENT)


class BulkAssignDefaultRolesView(APIView):
    """
    POST /rbac/assign-default-roles/
    Assign default RBAC roles to all users who currently have none.
    Managers (employees with direct reports) get team_lead, others get viewer.
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('roles.manage')]

    def post(self, request):
        from apps.rbac.services import auto_assign_default_role

        users_without_roles = User.objects.exclude(
            id__in=UserRole.objects.values_list('user_id', flat=True)
        ).exclude(is_tenant_admin=True)

        assigned = []
        for user in users_without_roles:
            try:
                auto_assign_default_role(user)
                ur = UserRole.objects.filter(user=user).first()
                assigned.append({
                    'email': user.email,
                    'role': ur.role.slug if ur else None,
                })
            except Exception as exc:
                assigned.append({'email': user.email, 'error': str(exc)})

        return Response({
            'users_processed': len(assigned),
            'assignments': assigned,
        })
