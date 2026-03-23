from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.employees.models import Employee, EmploymentType
from apps.employees.serializers import (
    EmployeeSerializer,
    EmployeeCreateSerializer,
    EmployeeUpdateSerializer,
    EmployeeMinimalSerializer,
    EmploymentTypeSerializer,
    EmployeeProfileFlatSerializer,
)


# ── Employment Types ──────────────────────────────────────────────────

class EmploymentTypeListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        types = EmploymentType.objects.all()
        return Response(EmploymentTypeSerializer(types, many=True).data)


# ── Employee List / Create ────────────────────────────────────────────

class EmployeeListCreateView(APIView):

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('employees.manage')]
        return [IsAuthenticated(), HasPermission('employees.view')]

    def get(self, request):
        employees = Employee.objects.select_related(
            'employment_type', 'reporting_to', 'user', 'department_ref',
        ).prefetch_related('profile', 'address_info', 'banking')

        # ── Soft-delete filter: exclude archived unless explicitly requested
        include_archived = request.query_params.get('include_archived', '').lower() == 'true'
        if not include_archived:
            employees = employees.filter(deleted_at__isnull=True)

        # ── Filters
        status_filter = request.query_params.get('status')
        department_id = request.query_params.get('department_id')
        department = request.query_params.get('department')  # legacy text filter
        search = request.query_params.get('search')

        if status_filter:
            employees = employees.filter(status=status_filter)
        if department_id:
            employees = employees.filter(department_ref_id=department_id)
        elif department:
            employees = employees.filter(department__icontains=department)
        if search:
            employees = employees.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(employee_code__icontains=search)
            )

        # ── Pagination
        try:
            page = max(int(request.query_params.get('page', 1)), 1)
            per_page = request.query_params.get('per_page') or request.query_params.get('limit', '50')
            limit = min(int(per_page), 500)
        except (TypeError, ValueError):
            page, limit = 1, 50

        total = employees.count()
        start = (page - 1) * limit
        page_qs = employees[start:start + limit]

        return Response({
            'results': EmployeeSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = EmployeeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            employee = serializer.save()

            # If no user account linked, create one with a temp password
            temp_password = None
            if not employee.user:
                from apps.users.models import User
                temp_password = Employee.generate_temp_password()
                user = User.objects.create_user(
                    username=employee.email,
                    email=employee.email,
                    password=temp_password,
                    first_name=employee.first_name,
                    last_name=employee.last_name,
                )
                user.must_change_password = True
                user.save(update_fields=['must_change_password'])
                employee.user = user
                employee.save(update_fields=['user'])

        data = EmployeeSerializer(employee).data
        if temp_password:
            data['temp_password'] = temp_password
        return Response(data, status=status.HTTP_201_CREATED)


# ── Employee Detail ───────────────────────────────────────────────────

class EmployeeDetailView(APIView):

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('employees.view')]
        return [IsAuthenticated(), HasPermission('employees.manage')]

    def get_employee(self, employee_id):
        return get_object_or_404(
            Employee.objects.select_related(
                'employment_type', 'reporting_to', 'user', 'department_ref',
            ).prefetch_related('profile', 'address_info', 'banking'),
            pk=employee_id,
            deleted_at__isnull=True,
        )

    def get(self, request, employee_id):
        return Response(EmployeeSerializer(self.get_employee(employee_id)).data)

    def put(self, request, employee_id):
        employee = self.get_employee(employee_id)
        serializer = EmployeeUpdateSerializer(employee, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(EmployeeSerializer(updated).data)

    def delete(self, request, employee_id):
        """Hard-delete: remove employee and linked user from the database."""
        employee = self.get_employee(employee_id)

        with transaction.atomic():
            # Unassign as manager for any direct reports
            Employee.objects.filter(
                reporting_to=employee,
            ).update(reporting_to=None)

            linked_user = employee.user
            employee.delete()

            # Also remove the linked Django user account
            if linked_user:
                linked_user.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Credentials Reset ────────────────────────────────────────────────

class EmployeeCredentialsView(APIView):
    """POST /employees/{id}/credentials/ — reset password, return temp_password."""

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('employees.manage')]

    def post(self, request, employee_id):
        employee = get_object_or_404(Employee, pk=employee_id, deleted_at__isnull=True)

        if not employee.user:
            return Response(
                {'detail': 'Employee has no linked user account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        temp_password = Employee.generate_temp_password()
        employee.user.set_password(temp_password)
        employee.user.save(update_fields=['password'])

        return Response({
            'employee_id': str(employee.id),
            'email': employee.email,
            'temp_password': temp_password,
        })


# ── Manager List ─────────────────────────────────────────────────────

class ManagerListView(APIView):
    """GET /employees/managers/ — list active employees for manager dropdown."""

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('employees.view')]

    def get(self, request):
        managers = Employee.objects.filter(
            status=Employee.Status.ACTIVE,
            deleted_at__isnull=True,
        ).order_by('first_name', 'last_name')
        return Response(EmployeeMinimalSerializer(managers, many=True).data)


# ── My Profile (current user) ────────────────────────────────────────

class EmployeeMyProfileView(APIView):
    """GET/PUT /employees/profile/ — current user's own employee profile."""

    permission_classes = [IsAuthenticated]

    def _get_employee(self, user):
        try:
            return Employee.objects.select_related(
                'employment_type', 'reporting_to', 'department_ref',
            ).prefetch_related('profile', 'address_info', 'banking').get(
                user=user, deleted_at__isnull=True,
            )
        except Employee.DoesNotExist:
            return None

    def get(self, request):
        employee = self._get_employee(request.user)
        if not employee:
            return Response(
                {'detail': 'No employee profile linked to this account.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(EmployeeProfileFlatSerializer(employee).data)

    def put(self, request):
        employee = self._get_employee(request.user)
        if not employee:
            return Response(
                {'detail': 'No employee profile linked to this account.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = EmployeeProfileFlatSerializer(employee, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(EmployeeProfileFlatSerializer(updated).data)
