from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.rbac.services import user_has_permission
from apps.leave.models import Leave
from apps.leave.serializers import (
    LeaveSerializer,
    LeaveCreateSerializer,
    LeaveUpdateSerializer,
)


# ── Leave List / Create ──────────────────────────────────────────────

class LeaveListCreateView(APIView):
    """
    GET  /leaves/  — list leaves (tenant admin sees all; others see own)
    POST /leaves/  — create a new leave request
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('leaves.manage')]
        return [IsAuthenticated(), HasPermission('leaves.view')]

    def get(self, request):
        queryset = Leave.objects.select_related('employee').order_by('-start_date')

        # ── Row-level scoping ────────────────────────────────────────
        # Admin / leaves.manage → see all leaves
        # Manager → own + direct reports + team members
        # Regular employee → own leaves only
        user = request.user
        is_admin = getattr(user, 'is_tenant_admin', False)
        has_manage = user_has_permission(user, 'leaves.manage')

        if not is_admin and not has_manage:
            from apps.employees.models import Employee
            from apps.teams.models import TeamMember

            emp = Employee.objects.filter(
                user=user, deleted_at__isnull=True,
            ).first()

            if emp:
                visible = Q(employee=emp)

                # Direct reports
                direct_report_ids = list(
                    Employee.objects.filter(
                        reporting_to=emp, deleted_at__isnull=True,
                    ).values_list('id', flat=True)
                )
                if direct_report_ids:
                    visible |= Q(employee_id__in=direct_report_ids)

                # Team members (teams this user leads)
                led_team_ids = list(emp.led_teams.values_list('id', flat=True))
                if led_team_ids:
                    team_member_ids = list(
                        TeamMember.objects.filter(
                            team_id__in=led_team_ids,
                        ).values_list('employee_id', flat=True)
                    )
                    if team_member_ids:
                        visible |= Q(employee_id__in=team_member_ids)

                queryset = queryset.filter(visible)
            else:
                queryset = queryset.none()

        # ── Filters
        status_filter = request.query_params.get('status')
        employee_id = request.query_params.get('employee_id')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

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
            'results': LeaveSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = LeaveCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # If employee_id not provided, resolve from the requesting user
        if not serializer.validated_data.get('employee_id'):
            employee_profile = getattr(request.user, 'employee_profile', None)
            if not employee_profile:
                return Response(
                    {'detail': 'No employee profile linked to your account.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer.validated_data['employee_id'] = employee_profile.id

            # Re-run overlap validation now that we have the employee_id
            from django.db.models import Q
            overlapping = Leave.objects.filter(
                employee_id=employee_profile.id,
                status=Leave.Status.PENDING,
            ).filter(
                Q(start_date__lte=serializer.validated_data['end_date'])
                & Q(end_date__gte=serializer.validated_data['start_date']),
            ).exists()

            if overlapping:
                return Response(
                    {'detail': 'You already have a pending leave that overlaps with this date range.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        leave = serializer.save()
        return Response(
            LeaveSerializer(leave).data,
            status=status.HTTP_201_CREATED,
        )


# ── Leave Detail ─────────────────────────────────────────────────────

class LeaveDetailView(APIView):
    """
    GET    /leaves/{id}/ — retrieve a single leave
    PUT    /leaves/{id}/ — approve or reject a leave
    DELETE /leaves/{id}/ — delete a pending leave
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('leaves.view')]
        return [IsAuthenticated(), HasPermission('leaves.manage')]

    def _get_leave(self, pk):
        return get_object_or_404(
            Leave.objects.select_related('employee'),
            pk=pk,
        )

    def get(self, request, pk):
        leave = self._get_leave(pk)
        return Response(LeaveSerializer(leave).data)

    def put(self, request, pk):
        leave = self._get_leave(pk)

        if leave.status != Leave.Status.PENDING:
            return Response(
                {'detail': f'Cannot update a leave that is already {leave.status}.'},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = LeaveUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        leave.status = serializer.validated_data['status']
        leave.save(update_fields=['status', 'updated_at'])

        return Response(LeaveSerializer(leave).data)

    def delete(self, request, pk):
        leave = self._get_leave(pk)

        if leave.status != Leave.Status.PENDING:
            return Response(
                {'detail': f'Cannot delete a leave that is already {leave.status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        leave.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
