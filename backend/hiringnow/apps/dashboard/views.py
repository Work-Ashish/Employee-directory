from django.db.models import Count, Q, Avg
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.employees.models import Employee
from apps.departments.models import Department


class DashboardStatsView(APIView):
    """GET /dashboard/ — aggregated stats for the dashboard."""

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('dashboard.view')]

    def get(self, request):
        active_filter = Q(deleted_at__isnull=True)

        # Employee counts by status
        status_counts = (
            Employee.objects.filter(active_filter)
            .values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )
        status_map = {item['status']: item['count'] for item in status_counts}

        # Department split
        department_split = list(
            Department.objects.annotate(
                employee_count=Count(
                    'employees',
                    filter=Q(employees__deleted_at__isnull=True),
                )
            )
            .values('id', 'name', 'color', 'employee_count')
            .order_by('-employee_count')
        )

        # Recent hires (last 30 days)
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        recent_hires = (
            Employee.objects.filter(
                active_filter,
                created_at__gte=thirty_days_ago,
            )
            .values('id', 'first_name', 'last_name', 'designation', 'created_at')
            .order_by('-created_at')[:10]
        )

        # Total counts
        total_employees = Employee.objects.filter(active_filter).count()
        total_departments = Department.objects.count()

        # Salary stats (only if user has admin dashboard permission)
        salary_stats = None
        if HasPermission('dashboard.admin').has_permission(request, self):
            salary_agg = Employee.objects.filter(
                active_filter, salary__isnull=False,
            ).aggregate(avg_salary=Avg('salary'))
            salary_stats = {
                'average_salary': float(salary_agg['avg_salary'] or 0),
            }

        return Response({
            'total_employees': total_employees,
            'total_departments': total_departments,
            'status_counts': status_map,
            'department_split': department_split,
            'recent_hires': list(recent_hires),
            'salary_stats': salary_stats,
        })


class DashboardLoginsView(APIView):
    """GET /dashboard/logins/ — login analytics from UserSession."""

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('dashboard.admin')]

    def get(self, request):
        from apps.users.models import UserSession

        now = timezone.now()
        seven_days_ago = now - timezone.timedelta(days=7)

        total_sessions = UserSession.objects.count()
        active_sessions = UserSession.objects.filter(
            is_revoked=False, expires_at__gt=now,
        ).count()
        recent_logins = UserSession.objects.filter(
            created_at__gte=seven_days_ago,
        ).count()

        return Response({
            'total_sessions': total_sessions,
            'active_sessions': active_sessions,
            'logins_last_7_days': recent_logins,
        })
