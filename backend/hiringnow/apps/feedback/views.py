from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.feedback.models import EmployeeFeedback
from apps.feedback.serializers import (
    FeedbackSerializer,
    FeedbackCreateSerializer,
)


# -- Feedback List / Create ---------------------------------------------------

class FeedbackListCreateView(APIView):
    """
    GET  /feedback/  -- list feedback (admin sees all; others see own given/received)
    POST /feedback/  -- submit new feedback
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('feedback.manage')]
        return [IsAuthenticated(), HasPermission('feedback.view')]

    def get(self, request):
        queryset = EmployeeFeedback.objects.select_related(
            'from_employee', 'to_employee',
        )

        # Non-admin users see feedback they gave or received
        user = request.user
        if not getattr(user, 'is_tenant_admin', False):
            queryset = queryset.filter(
                Q(from_employee__user=user)
                | Q(to_employee__user=user),
            )

        # -- Filters
        feedback_type = request.query_params.get('type')
        to_employee_id = request.query_params.get('to_employee_id')
        from_employee_id = request.query_params.get('from_employee_id')

        if feedback_type:
            queryset = queryset.filter(type=feedback_type)
        if to_employee_id:
            queryset = queryset.filter(to_employee_id=to_employee_id)
        if from_employee_id:
            queryset = queryset.filter(from_employee_id=from_employee_id)

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
            'results': FeedbackSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = FeedbackCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Resolve from_employee_id from the requesting user if not provided
        if not serializer.validated_data.get('from_employee_id'):
            employee_profile = getattr(request.user, 'employee_profile', None)
            if not employee_profile:
                return Response(
                    {'detail': 'No employee profile linked to your account.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer.validated_data['from_employee_id'] = employee_profile.id

        feedback = serializer.save()
        return Response(
            FeedbackSerializer(feedback).data,
            status=status.HTTP_201_CREATED,
        )


# -- Feedback Detail -----------------------------------------------------------

class FeedbackDetailView(APIView):
    """
    GET /feedback/{id}/ -- retrieve a single feedback entry
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('feedback.view')]

    def get(self, request, pk):
        feedback = get_object_or_404(
            EmployeeFeedback.objects.select_related('from_employee', 'to_employee'),
            pk=pk,
        )
        return Response(FeedbackSerializer(feedback).data)
