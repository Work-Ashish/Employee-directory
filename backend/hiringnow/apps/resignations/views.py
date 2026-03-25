from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.resignations.models import Resignation
from apps.resignations.serializers import (
    ResignationSerializer,
    ResignationCreateSerializer,
    ResignationUpdateSerializer,
)


# -- Resignation List / Create -----------------------------------------------

class ResignationListCreateView(APIView):
    """
    GET  /resignations/  -- list resignations (admin sees all; others see own)
    POST /resignations/  -- submit a new resignation request
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('resignations.manage')]
        return [IsAuthenticated(), HasPermission('resignations.view')]

    def get(self, request):
        queryset = Resignation.objects.select_related('employee', 'approved_by').order_by('-created_at')

        # Non-admin users can only see their own resignations
        user = request.user
        if not getattr(user, 'is_tenant_admin', False):
            queryset = queryset.filter(employee__user=user)

        # -- Filters
        status_filter = request.query_params.get('status')
        employee_id = request.query_params.get('employee_id')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        # -- Pagination
        try:
            page = max(int(request.query_params.get('page', 1)), 1)
            limit = min(int(request.query_params.get('limit', 50)), 100)
        except (TypeError, ValueError):
            page, limit = 1, 50

        total = queryset.count()
        start = (page - 1) * limit
        page_qs = queryset[start:start + limit]

        return Response({
            'results': ResignationSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = ResignationCreateSerializer(data=request.data)
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

        # Prevent duplicate pending resignations
        existing = Resignation.objects.filter(
            employee_id=serializer.validated_data['employee_id'],
            status=Resignation.Status.PENDING,
        ).exists()

        if existing:
            return Response(
                {'detail': 'A pending resignation already exists for this employee.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resignation = serializer.save()

        # Initiate workflow if a RESIGNATION template is published
        from apps.workflows.services import initiate_workflow
        employee_profile = getattr(request.user, 'employee_profile', None)
        if employee_profile:
            initiate_workflow('RESIGNATION', str(resignation.id), employee_profile)

        return Response(
            ResignationSerializer(resignation).data,
            status=status.HTTP_201_CREATED,
        )


# -- Resignation Detail -------------------------------------------------------

class ResignationDetailView(APIView):
    """
    GET /resignations/{id}/ -- retrieve a single resignation
    PUT /resignations/{id}/ -- approve, reject, or withdraw a resignation
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('resignations.view')]
        return [IsAuthenticated(), HasPermission('resignations.manage')]

    def _get_resignation(self, pk):
        return get_object_or_404(
            Resignation.objects.select_related('employee', 'approved_by'),
            pk=pk,
        )

    def get(self, request, pk):
        resignation = self._get_resignation(pk)
        return Response(ResignationSerializer(resignation).data)

    def put(self, request, pk):
        resignation = self._get_resignation(pk)

        if resignation.status != Resignation.Status.PENDING:
            return Response(
                {'detail': f'Cannot update a resignation that is already {resignation.status}.'},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = ResignationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        resignation.status = serializer.validated_data['status']

        # Record who approved/rejected (resolve from requesting user)
        if serializer.validated_data['status'] in (
            Resignation.Status.APPROVED,
            Resignation.Status.REJECTED,
        ):
            approver_profile = getattr(request.user, 'employee_profile', None)
            if approver_profile:
                resignation.approved_by = approver_profile

        resignation.save(update_fields=['status', 'approved_by', 'updated_at'])

        return Response(ResignationSerializer(resignation).data)
