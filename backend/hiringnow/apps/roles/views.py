from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.roles.models import FunctionalRole, RoleCapability, EmployeeFunctionalRole
from apps.roles.serializers import (
    FunctionalRoleSerializer,
    FunctionalRoleCreateSerializer,
    FunctionalRoleUpdateSerializer,
)


# ── Shared queryset ─────────────────────────────────────────────────


def _role_queryset():
    """Base queryset for functional roles with capabilities prefetched."""
    return FunctionalRole.objects.prefetch_related('capabilities')


# ── Role List / Create ───────────────────────────────────────────────


class RoleListCreateView(APIView):
    """
    GET  /roles/  — list functional roles
    POST /roles/  — create a new functional role
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('roles.manage')]
        return [IsAuthenticated(), HasPermission('roles.view')]

    def get(self, request):
        queryset = _role_queryset()

        # ── Filters
        is_active = request.query_params.get('is_active')
        search = request.query_params.get('search')

        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        if search:
            queryset = queryset.filter(name__icontains=search)

        # ── Pagination
        try:
            page = max(int(request.query_params.get('page', 1)), 1)
            limit = min(int(request.query_params.get('limit', 50)), 100)
        except (TypeError, ValueError):
            page, limit = 1, 50

        total = queryset.count()
        start = (page - 1) * limit
        page_qs = queryset[start:start + limit]

        return Response({
            'results': FunctionalRoleSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = FunctionalRoleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.save()

        return Response(
            FunctionalRoleSerializer(role).data,
            status=status.HTTP_201_CREATED,
        )


# ── Role Detail ──────────────────────────────────────────────────────


class RoleDetailView(APIView):
    """
    GET    /roles/{id}/ — retrieve a single functional role
    PUT    /roles/{id}/ — update a functional role
    DELETE /roles/{id}/ — delete a functional role
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('roles.view')]
        return [IsAuthenticated(), HasPermission('roles.manage')]

    def _get_role(self, pk):
        return get_object_or_404(_role_queryset(), pk=pk)

    def get(self, request, pk):
        role = self._get_role(pk)
        return Response(FunctionalRoleSerializer(role).data)

    def put(self, request, pk):
        role = self._get_role(pk)
        serializer = FunctionalRoleUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            # Update scalar fields
            for field in ('name', 'description', 'is_active'):
                if field in serializer.validated_data:
                    setattr(role, field, serializer.validated_data[field])

            update_fields = [
                f for f in ('name', 'description', 'is_active')
                if f in serializer.validated_data
            ]
            if update_fields:
                role.save(update_fields=[*update_fields, 'updated_at'])

            # Replace capabilities if provided
            capabilities = serializer.validated_data.get('capabilities')
            if capabilities is not None:
                role.capabilities.all().delete()
                RoleCapability.objects.bulk_create([
                    RoleCapability(role=role, capability=cap)
                    for cap in capabilities
                ])

        # Refresh to pick up new capabilities
        role = self._get_role(pk)
        return Response(FunctionalRoleSerializer(role).data)

    def delete(self, request, pk):
        role = self._get_role(pk)
        role.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Capabilities ─────────────────────────────────────────────────────


class CapabilitiesView(APIView):
    """
    GET /roles/capabilities/ — returns all capabilities for the
    authenticated user based on their assigned functional roles.
    """

    def get_permissions(self):
        return [IsAuthenticated()]

    def get(self, request):
        employee_profile = getattr(request.user, 'employee_profile', None)
        if not employee_profile:
            return Response(
                {'detail': 'No employee profile linked to your account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Fetch all functional role assignments for the employee
        assignments = EmployeeFunctionalRole.objects.filter(
            employee=employee_profile,
        ).select_related('role').order_by('-assigned_at')

        # Fetch all unique capabilities across assigned roles in a single query
        capabilities = (
            RoleCapability.objects
            .filter(role__assignments__employee=employee_profile)
            .values_list('capability', flat=True)
            .distinct()
        )

        roles = [
            {
                'id': str(a.role.id),
                'name': a.role.name,
                'assigned_at': a.assigned_at.isoformat(),
            }
            for a in assignments
        ]

        return Response({
            'roles': roles,
            'capabilities': list(capabilities),
        })
