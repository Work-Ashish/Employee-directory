from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.timetracker.models import TimeSession, BreakEntry, ActivityLog
from apps.timetracker.serializers import (
    TimeSessionSerializer,
    BreakEntrySerializer,
    BreakActionSerializer,
    ActivityLogSerializer,
)
from common.helpers import get_employee_profile as _get_employee_profile


# ── Time Session List ────────────────────────────────────────────────


class TimeSessionListView(APIView):
    """
    GET /time-tracker/ — list time sessions filtered by date range.
    Non-admin users see only their own sessions.
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('timetracker.view')]

    def get(self, request):
        queryset = TimeSession.objects.select_related('employee').prefetch_related('breaks').order_by('-start_time')

        user = request.user
        if not getattr(user, 'is_tenant_admin', False):
            employee = _get_employee_profile(request)
            if not employee:
                return Response(
                    {'detail': 'No employee profile linked to your account.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(employee=employee)

        # ── Filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        employee_id = request.query_params.get('employee_id')
        session_status = request.query_params.get('status')

        if start_date:
            queryset = queryset.filter(start_time__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(start_time__date__lte=end_date)
        if employee_id and getattr(user, 'is_tenant_admin', False):
            queryset = queryset.filter(employee_id=employee_id)
        if session_status:
            queryset = queryset.filter(status=session_status)

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
            'results': TimeSessionSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })


# ── Check-In ─────────────────────────────────────────────────────────


class CheckInView(APIView):
    """
    POST /time-tracker/check-in/ — start a new time session.
    Fails if the user already has an active session.
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('timetracker.manage')]

    def post(self, request):
        employee = _get_employee_profile(request)
        if not employee:
            return Response(
                {'detail': 'No employee profile linked to your account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent multiple active sessions
        active_session = TimeSession.objects.filter(
            employee=employee,
            status=TimeSession.Status.ACTIVE,
        ).first()

        if active_session:
            return Response(
                {'detail': 'You already have an active session. Check out first.'},
                status=status.HTTP_409_CONFLICT,
            )

        session = TimeSession.objects.create(
            employee=employee,
            start_time=timezone.now(),
            status=TimeSession.Status.ACTIVE,
        )

        return Response(
            TimeSessionSerializer(session).data,
            status=status.HTTP_201_CREATED,
        )


# ── Check-Out ────────────────────────────────────────────────────────


class CheckOutView(APIView):
    """
    POST /time-tracker/check-out/ — end the active session.
    Automatically closes any open break before completing.
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('timetracker.manage')]

    def post(self, request):
        employee = _get_employee_profile(request)
        if not employee:
            return Response(
                {'detail': 'No employee profile linked to your account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session = TimeSession.objects.filter(
            employee=employee,
            status__in=[TimeSession.Status.ACTIVE, TimeSession.Status.PAUSED],
        ).first()

        if not session:
            return Response(
                {'detail': 'No active session found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        now = timezone.now()

        # Close any open break
        open_break = session.breaks.filter(end_time__isnull=True).first()
        if open_break:
            open_break.end_time = now
            open_break.save(update_fields=['end_time', 'updated_at'])

        # Recalculate total break minutes
        total_break = 0
        for brk in session.breaks.all():
            if brk.end_time and brk.start_time:
                delta = (brk.end_time - brk.start_time).total_seconds()
                total_break += delta / 60

        session.end_time = now
        session.status = TimeSession.Status.COMPLETED
        session.total_break_minutes = int(total_break)
        session.save(update_fields=['end_time', 'status', 'total_break_minutes', 'updated_at'])

        return Response(TimeSessionSerializer(session).data)


# ── Break ────────────────────────────────────────────────────────────


class BreakView(APIView):
    """
    POST /time-tracker/break/ — start or end a break.
    Body: {"action": "start"|"end", "type": "SHORT"|"LUNCH"|"OTHER"}
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('timetracker.manage')]

    def post(self, request):
        employee = _get_employee_profile(request)
        if not employee:
            return Response(
                {'detail': 'No employee profile linked to your account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = BreakActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data['action']
        break_type = serializer.validated_data.get('type', BreakEntry.BreakType.SHORT)

        session = TimeSession.objects.filter(
            employee=employee,
            status__in=[TimeSession.Status.ACTIVE, TimeSession.Status.PAUSED],
        ).first()

        if not session:
            return Response(
                {'detail': 'No active session found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        now = timezone.now()

        if action == 'start':
            # Cannot start a break if one is already open
            open_break = session.breaks.filter(end_time__isnull=True).first()
            if open_break:
                return Response(
                    {'detail': 'A break is already in progress. End it first.'},
                    status=status.HTTP_409_CONFLICT,
                )

            brk = BreakEntry.objects.create(
                session=session,
                start_time=now,
                type=break_type,
            )

            session.status = TimeSession.Status.PAUSED
            session.save(update_fields=['status', 'updated_at'])

            return Response(
                BreakEntrySerializer(brk).data,
                status=status.HTTP_201_CREATED,
            )

        # action == 'end'
        open_break = session.breaks.filter(end_time__isnull=True).first()
        if not open_break:
            return Response(
                {'detail': 'No open break to end.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        open_break.end_time = now
        open_break.save(update_fields=['end_time', 'updated_at'])

        session.status = TimeSession.Status.ACTIVE
        session.save(update_fields=['status', 'updated_at'])

        return Response(BreakEntrySerializer(open_break).data)


# ── Activity ─────────────────────────────────────────────────────────


class ActivityView(APIView):
    """
    GET /time-tracker/activity/ — list activity logs for a session.
    Query params: session_id (required)
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('timetracker.view')]

    def get(self, request):
        session_id = request.query_params.get('session_id')
        if not session_id:
            return Response(
                {'detail': 'session_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session = get_object_or_404(
            TimeSession.objects.select_related('employee'),
            pk=session_id,
        )

        # Non-admin users can only view their own session activities
        user = request.user
        if not getattr(user, 'is_tenant_admin', False):
            employee = _get_employee_profile(request)
            if not employee or session.employee_id != employee.id:
                return Response(
                    {'detail': 'You can only view activities for your own sessions.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        activities = ActivityLog.objects.filter(session=session).order_by('-created_at')

        # ── Pagination
        try:
            page = max(int(request.query_params.get('page', 1)), 1)
            limit = min(int(request.query_params.get('limit', 50)), 100)
        except (TypeError, ValueError):
            page, limit = 1, 50

        total = activities.count()
        start_idx = (page - 1) * limit
        page_qs = activities[start_idx:start_idx + limit]

        return Response({
            'results': ActivityLogSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })


# ── Status ───────────────────────────────────────────────────────────


class StatusView(APIView):
    """
    GET /time-tracker/status/ — returns the current active session
    for the authenticated user, or null if none exists.
    """

    def get_permissions(self):
        return [IsAuthenticated()]

    def get(self, request):
        employee = _get_employee_profile(request)
        if not employee:
            return Response(
                {'detail': 'No employee profile linked to your account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session = (
            TimeSession.objects
            .filter(
                employee=employee,
                status__in=[TimeSession.Status.ACTIVE, TimeSession.Status.PAUSED],
            )
            .select_related('employee')
            .prefetch_related('breaks')
            .first()
        )

        if not session:
            return Response({'session': None, 'is_active': False})

        return Response({
            'session': TimeSessionSerializer(session).data,
            'is_active': session.status == TimeSession.Status.ACTIVE,
        })
