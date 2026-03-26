from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.reports.models import SavedReport, ReportSchedule
from apps.reports.serializers import (
    SavedReportSerializer,
    SavedReportCreateSerializer,
    SavedReportUpdateSerializer,
    ReportGenerateSerializer,
)


# ── Report List / Create ────────────────────────────────────────────


class ReportListCreateView(APIView):
    """
    GET  /reports/  — list saved reports
    POST /reports/  — create a new saved report
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('reports.manage')]
        return [IsAuthenticated(), HasPermission('reports.view')]

    def get(self, request):
        queryset = SavedReport.objects.select_related('created_by').prefetch_related('schedules').order_by('-created_at')

        # ── Filters
        report_type = request.query_params.get('type')
        if report_type:
            queryset = queryset.filter(type=report_type)

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
            'results': SavedReportSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = SavedReportCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Resolve creator from the requesting user's employee profile
        employee_profile = getattr(request.user, 'employee_profile', None)
        report = serializer.save(created_by=employee_profile)

        return Response(
            SavedReportSerializer(report).data,
            status=status.HTTP_201_CREATED,
        )


# ── Report Detail ────────────────────────────────────────────────────


class ReportDetailView(APIView):
    """
    GET    /reports/{id}/ — retrieve a single saved report
    PUT    /reports/{id}/ — update a saved report
    DELETE /reports/{id}/ — delete a saved report
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('reports.view')]
        return [IsAuthenticated(), HasPermission('reports.manage')]

    def _get_report(self, pk):
        return get_object_or_404(
            SavedReport.objects.select_related('created_by').prefetch_related('schedules'),
            pk=pk,
        )

    def get(self, request, pk):
        report = self._get_report(pk)
        return Response(SavedReportSerializer(report).data)

    def put(self, request, pk):
        report = self._get_report(pk)
        serializer = SavedReportUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(report, field, value)

        report.save(update_fields=[*serializer.validated_data.keys(), 'updated_at'])
        return Response(SavedReportSerializer(report).data)

    def delete(self, request, pk):
        report = self._get_report(pk)
        report.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Report Generate ──────────────────────────────────────────────────


class ReportGenerateView(APIView):
    """
    POST /reports/generate/ — generate report data based on type and config.

    Accepts a report type and optional config filters, then returns
    the aggregated data.  Currently returns a stub structure; each
    report type can be extended with real queries.
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('reports.view')]

    def post(self, request):
        serializer = ReportGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        report_type = serializer.validated_data['type']
        config = serializer.validated_data.get('config', {})

        data = self._generate(report_type, config)

        return Response({
            'type': report_type,
            'generated_at': timezone.now().isoformat(),
            'config': config,
            'data': data,
        })

    # ── private helpers ──────────────────────────────────────────────

    def _generate(self, report_type, config):
        """
        Dispatch to the appropriate generator.  Each method returns a list
        of dicts that form the report rows.
        """
        generators = {
            SavedReport.ReportType.EMPLOYEE: self._generate_employee_report,
            SavedReport.ReportType.ATTENDANCE: self._generate_attendance_report,
            SavedReport.ReportType.PAYROLL: self._generate_payroll_report,
            SavedReport.ReportType.LEAVE: self._generate_leave_report,
            SavedReport.ReportType.PERFORMANCE: self._generate_performance_report,
            SavedReport.ReportType.CUSTOM: self._generate_custom_report,
        }
        generator = generators.get(report_type, self._generate_custom_report)
        return generator(config)

    def _generate_employee_report(self, config):
        from apps.employees.models import Employee

        qs = Employee.objects.all()
        status_filter = config.get('status')
        department = config.get('department')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if department:
            qs = qs.filter(department=department)

        return list(qs.values(
            'id', 'employee_code', 'first_name', 'last_name',
            'email', 'department', 'designation', 'status', 'date_of_joining',
        ))

    def _generate_attendance_report(self, config):
        from apps.attendance.models import Attendance

        qs = Attendance.objects.select_related('employee')
        start_date = config.get('start_date')
        end_date = config.get('end_date')

        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)

        return list(qs.values(
            'id', 'employee__first_name', 'employee__last_name',
            'date', 'status', 'check_in', 'check_out',
        ))

    def _generate_payroll_report(self, config):
        from apps.payroll.models import Payroll

        qs = Payroll.objects.select_related('employee')
        month = config.get('month')
        year = config.get('year')

        if month:
            qs = qs.filter(month=month)
        if year:
            qs = qs.filter(year=year)

        return list(qs.values(
            'id', 'employee__first_name', 'employee__last_name',
            'month', 'basic_salary', 'net_salary', 'status',
        ))

    def _generate_leave_report(self, config):
        from apps.leave.models import Leave

        qs = Leave.objects.select_related('employee')
        leave_status = config.get('status')

        if leave_status:
            qs = qs.filter(status=leave_status)

        return list(qs.values(
            'id', 'employee__first_name', 'employee__last_name',
            'type', 'start_date', 'end_date', 'status',
        ))

    def _generate_performance_report(self, config):
        """Stub — extend when performance models are wired."""
        return []

    def _generate_custom_report(self, config):
        """Custom reports return an empty dataset until a query builder is added."""
        return []
