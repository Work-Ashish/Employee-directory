from django.db.models import Count, Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.departments.models import Department
from apps.departments.serializers import DepartmentSerializer, DepartmentCreateSerializer


class DepartmentListCreateView(APIView):
    """
    GET  /departments/  — list all departments with employee counts
    POST /departments/  — create a new department
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('departments.manage')]
        return [IsAuthenticated(), HasPermission('departments.view')]

    def get(self, request):
        departments = Department.objects.annotate(
            employee_count=Count(
                'employees',
                filter=Q(employees__deleted_at__isnull=True),
            )
        ).order_by('name')
        return Response(DepartmentSerializer(departments, many=True).data)

    def post(self, request):
        serializer = DepartmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        department = serializer.save()
        return Response(
            DepartmentSerializer(department).data,
            status=status.HTTP_201_CREATED,
        )


class DepartmentDetailView(APIView):
    """
    GET    /departments/{id}/ — retrieve department
    DELETE /departments/{id}/ — delete department (blocked if employees exist)
    """

    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsAuthenticated(), HasPermission('departments.manage')]
        return [IsAuthenticated(), HasPermission('departments.view')]

    def get(self, request, pk):
        try:
            dept = Department.objects.annotate(
                employee_count=Count(
                    'employees',
                    filter=Q(employees__deleted_at__isnull=True),
                )
            ).get(pk=pk)
        except Department.DoesNotExist:
            return Response(
                {'detail': 'Department not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(DepartmentSerializer(dept).data)

    def delete(self, request, pk):
        try:
            dept = Department.objects.get(pk=pk)
        except Department.DoesNotExist:
            return Response(
                {'detail': 'Department not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Block deletion if active employees belong to this department
        from apps.employees.models import Employee
        active_count = Employee.objects.filter(
            department_ref=dept,
            deleted_at__isnull=True,
        ).count()

        if active_count > 0:
            return Response(
                {'detail': f'Cannot delete department with {active_count} active employee(s). Reassign them first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dept.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
