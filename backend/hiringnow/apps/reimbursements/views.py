from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.reimbursements.models import Reimbursement
from apps.reimbursements.serializers import (
    ReimbursementSerializer,
    ReimbursementCreateSerializer,
    ReimbursementUpdateSerializer,
)


# -- Reimbursement List / Create -----------------------------------------------

class ReimbursementListCreateView(APIView):
    """
    GET  /reimbursements/  -- list reimbursements (admin sees all; others see own)
    POST /reimbursements/  -- submit a new reimbursement claim
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('reimbursements.manage')]
        return [IsAuthenticated(), HasPermission('reimbursements.view')]

    def get(self, request):
        queryset = Reimbursement.objects.select_related('employee', 'approved_by').order_by('-created_at')

        # Non-admin users can only see their own reimbursements
        user = request.user
        if not getattr(user, 'is_tenant_admin', False):
            queryset = queryset.filter(employee__user=user)

        # -- Filters
        status_filter = request.query_params.get('status')
        category = request.query_params.get('category')
        employee_id = request.query_params.get('employee_id')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if category:
            queryset = queryset.filter(category=category)
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
            'results': ReimbursementSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = ReimbursementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Resolve employee from the requesting user if not provided
        if not serializer.validated_data.get('employee_id'):
            employee_profile = getattr(request.user, 'employee_profile', None)
            if not employee_profile:
                return Response(
                    {'detail': 'No employee profile linked to your account.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer.validated_data['employee_id'] = employee_profile.id

        reimbursement = serializer.save()
        return Response(
            ReimbursementSerializer(reimbursement).data,
            status=status.HTTP_201_CREATED,
        )


# -- Reimbursement Detail ------------------------------------------------------

class ReimbursementDetailView(APIView):
    """
    GET /reimbursements/{id}/ -- retrieve a single reimbursement
    PUT /reimbursements/{id}/ -- approve, reject, or mark as paid
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('reimbursements.view')]
        return [IsAuthenticated(), HasPermission('reimbursements.manage')]

    def _get_reimbursement(self, pk):
        return get_object_or_404(
            Reimbursement.objects.select_related('employee', 'approved_by'),
            pk=pk,
        )

    def get(self, request, pk):
        reimbursement = self._get_reimbursement(pk)
        return Response(ReimbursementSerializer(reimbursement).data)

    def put(self, request, pk):
        reimbursement = self._get_reimbursement(pk)

        if reimbursement.status == Reimbursement.Status.PAID:
            return Response(
                {'detail': 'Cannot update a reimbursement that has already been paid.'},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = ReimbursementUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']

        # Set approved_by when approving
        update_fields = ['status', 'updated_at']
        reimbursement.status = new_status

        if new_status in (Reimbursement.Status.APPROVED, Reimbursement.Status.PAID):
            employee_profile = getattr(request.user, 'employee_profile', None)
            if employee_profile:
                reimbursement.approved_by_id = employee_profile.id
                update_fields.append('approved_by_id')

        reimbursement.save(update_fields=update_fields)
        return Response(ReimbursementSerializer(reimbursement).data)
