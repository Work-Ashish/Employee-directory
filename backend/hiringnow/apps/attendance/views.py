from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.attendance.models import (
    Attendance,
    AttendancePolicy,
    AttendanceRegularization,
    Holiday,
    Shift,
    ShiftAssignment,
    TimeSession,
)
from apps.attendance.serializers import (
    AttendanceCreateSerializer,
    AttendancePolicySerializer,
    AttendanceSerializer,
    HolidayCreateSerializer,
    HolidaySerializer,
    RegularizationCreateSerializer,
    RegularizationSerializer,
    ShiftAssignmentCreateSerializer,
    ShiftAssignmentSerializer,
    ShiftCreateSerializer,
    ShiftSerializer,
    TimeSessionSerializer,
)


# ── Attendance List / Create ─────────────────────────────────────────

class AttendanceListCreateView(APIView):

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('attendance.manage')]
        return [IsAuthenticated(), HasPermission('attendance.view')]

    def get(self, request):
        qs = Attendance.objects.select_related('employee').order_by('-date')

        # Filters
        date_filter = request.query_params.get('date')
        employee_id = request.query_params.get('employee_id')
        status_filter = request.query_params.get('status')

        if date_filter:
            qs = qs.filter(date=date_filter)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if status_filter:
            qs = qs.filter(status=status_filter)

        # Pagination
        try:
            page = max(int(request.query_params.get('page', 1)), 1)
            limit = min(int(request.query_params.get('limit', 50)), 100)
        except (TypeError, ValueError):
            page, limit = 1, 50

        total = qs.count()
        start = (page - 1) * limit
        page_qs = qs[start:start + limit]

        return Response({
            'results': AttendanceSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = AttendanceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Auto-set employee from authenticated user if not provided
        if 'employee_id' not in serializer.validated_data:
            from apps.employees.models import Employee
            employee = Employee.objects.filter(
                user=request.user, deleted_at__isnull=True,
            ).first()
            if not employee:
                return Response(
                    {'detail': 'No employee profile linked to your account.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer.validated_data['employee_id'] = employee.pk

        attendance = serializer.save()
        return Response(
            AttendanceSerializer(attendance).data,
            status=status.HTTP_201_CREATED,
        )


# ── Attendance Detail ────────────────────────────────────────────────

class AttendanceDetailView(APIView):

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('attendance.view')]
        return [IsAuthenticated(), HasPermission('attendance.manage')]

    def _get_attendance(self, attendance_id):
        return get_object_or_404(
            Attendance.objects.select_related('employee'),
            pk=attendance_id,
        )

    def get(self, request, attendance_id):
        return Response(AttendanceSerializer(self._get_attendance(attendance_id)).data)

    def put(self, request, attendance_id):
        attendance = self._get_attendance(attendance_id)
        serializer = AttendanceCreateSerializer(
            attendance, data=request.data, partial=True,
        )
        serializer.is_valid(raise_exception=True)

        for attr, value in serializer.validated_data.items():
            setattr(attendance, attr, value)
        attendance.save()

        return Response(AttendanceSerializer(attendance).data)

    def delete(self, request, attendance_id):
        attendance = self._get_attendance(attendance_id)
        attendance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Shift List / Create ─────────────────────────────────────────────

class ShiftListCreateView(APIView):

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('attendance.manage')]
        return [IsAuthenticated(), HasPermission('attendance.view')]

    def get(self, request):
        shifts = Shift.objects.all()
        return Response(ShiftSerializer(shifts, many=True).data)

    def post(self, request):
        serializer = ShiftCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        shift = serializer.save()
        return Response(ShiftSerializer(shift).data, status=status.HTTP_201_CREATED)


# ── Shift Assign ─────────────────────────────────────────────────────

class ShiftAssignView(APIView):

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('attendance.manage')]

    def post(self, request):
        serializer = ShiftAssignmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assignment = serializer.save()
        return Response(
            ShiftAssignmentSerializer(assignment).data,
            status=status.HTTP_201_CREATED,
        )


# ── Attendance Policy ────────────────────────────────────────────────

class AttendancePolicyView(APIView):

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('attendance.manage')]
        return [IsAuthenticated(), HasPermission('attendance.view')]

    def get(self, request):
        policy = AttendancePolicy.objects.first()
        if not policy:
            # Return sensible defaults when no policy exists yet
            return Response({
                'id': None,
                'name': 'DEFAULT',
                'late_grace_period': 15,
                'early_exit_grace': 15,
                'ot_threshold': 60,
            })
        return Response(AttendancePolicySerializer(policy).data)

    def post(self, request):
        serializer = AttendancePolicySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Upsert: update existing DEFAULT policy or create new one
        policy, _created = AttendancePolicy.objects.update_or_create(
            name=serializer.validated_data.get('name', 'DEFAULT'),
            defaults=serializer.validated_data,
        )
        return Response(
            AttendancePolicySerializer(policy).data,
            status=status.HTTP_201_CREATED if _created else status.HTTP_200_OK,
        )


# ── Holiday List / Create ────────────────────────────────────────────

class HolidayListCreateView(APIView):

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('attendance.manage')]
        return [IsAuthenticated(), HasPermission('attendance.view')]

    def get(self, request):
        holidays = Holiday.objects.all()

        year = request.query_params.get('year')
        if year:
            holidays = holidays.filter(date__year=year)

        return Response(HolidaySerializer(holidays, many=True).data)

    def post(self, request):
        serializer = HolidayCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        holiday = serializer.save()
        return Response(
            HolidaySerializer(holiday).data,
            status=status.HTTP_201_CREATED,
        )


# ── Regularization List / Create ─────────────────────────────────────

class RegularizationListCreateView(APIView):

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('attendance.manage')]
        return [IsAuthenticated(), HasPermission('attendance.view')]

    def get(self, request):
        qs = AttendanceRegularization.objects.select_related(
            'attendance', 'employee',
        )

        employee_id = request.query_params.get('employee_id')
        status_filter = request.query_params.get('status')

        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if status_filter:
            qs = qs.filter(status=status_filter)

        return Response(RegularizationSerializer(qs, many=True).data)

    def post(self, request):
        serializer = RegularizationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Auto-set employee from authenticated user if not provided
        if 'employee_id' not in serializer.validated_data:
            from apps.employees.models import Employee
            employee = Employee.objects.filter(
                user=request.user, deleted_at__isnull=True,
            ).first()
            if not employee:
                return Response(
                    {'detail': 'No employee profile linked to your account.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer.validated_data['employee_id'] = employee.pk

        regularization = serializer.save()
        return Response(
            RegularizationSerializer(regularization).data,
            status=status.HTTP_201_CREATED,
        )


# ── Time Session List ────────────────────────────────────────────────

class TimeSessionListView(APIView):

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('attendance.view')]

    def get(self, request):
        qs = TimeSession.objects.select_related('employee').prefetch_related('breaks').order_by('-check_in')

        employee_id = request.query_params.get('employee_id')
        status_filter = request.query_params.get('status')
        date_filter = request.query_params.get('date')

        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if date_filter:
            qs = qs.filter(check_in__date=date_filter)

        # Pagination
        try:
            page = max(int(request.query_params.get('page', 1)), 1)
            limit = min(int(request.query_params.get('limit', 50)), 100)
        except (TypeError, ValueError):
            page, limit = 1, 50

        total = qs.count()
        start = (page - 1) * limit
        page_qs = qs[start:start + limit]

        return Response({
            'results': TimeSessionSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })
