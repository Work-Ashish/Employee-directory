from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.performance.models import (
    PerformanceReview,
    PerformanceTemplate,
    PerformanceMetrics,
)
from apps.performance.serializers import (
    PerformanceReviewSerializer,
    PerformanceReviewCreateSerializer,
    PerformanceReviewUpdateSerializer,
    PerformanceTemplateSerializer,
    PerformanceTemplateCreateSerializer,
    PerformanceMetricsSerializer,
)


# -- Performance Review List / Create -----------------------------------------

class PerformanceReviewListCreateView(APIView):
    """
    GET  /performance/reviews/  -- list reviews (admin sees all; employee sees own)
    POST /performance/reviews/  -- create a new review
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('performance.manage')]
        return [IsAuthenticated(), HasPermission('performance.view')]

    def get(self, request):
        queryset = PerformanceReview.objects.select_related(
            'employee', 'reviewer', 'template',
        )

        # Non-admin users can only see their own reviews
        user = request.user
        if not getattr(user, 'is_tenant_admin', False):
            queryset = queryset.filter(employee__user=user)

        # -- Filters
        status_filter = request.query_params.get('status')
        employee_id = request.query_params.get('employee_id')
        period = request.query_params.get('period')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if period:
            queryset = queryset.filter(period=period)

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
            'results': PerformanceReviewSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = PerformanceReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # If reviewer_id not provided, use requesting user's employee profile
        if not serializer.validated_data.get('reviewer_id'):
            employee_profile = getattr(request.user, 'employee_profile', None)
            if employee_profile:
                serializer.validated_data['reviewer_id'] = employee_profile.id

        review = serializer.save()
        return Response(
            PerformanceReviewSerializer(review).data,
            status=status.HTTP_201_CREATED,
        )


# -- Performance Review Detail ------------------------------------------------

class PerformanceReviewDetailView(APIView):
    """
    GET /performance/reviews/{id}/  -- retrieve a single review
    PUT /performance/reviews/{id}/  -- update a review
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('performance.view')]
        return [IsAuthenticated(), HasPermission('performance.manage')]

    def _get_review(self, pk):
        return get_object_or_404(
            PerformanceReview.objects.select_related(
                'employee', 'reviewer', 'template',
            ),
            pk=pk,
        )

    def get(self, request, pk):
        review = self._get_review(pk)
        return Response(PerformanceReviewSerializer(review).data)

    def put(self, request, pk):
        review = self._get_review(pk)

        serializer = PerformanceReviewUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(review, field, value)
        review.save()

        return Response(PerformanceReviewSerializer(review).data)


# -- Performance Template List / Create ----------------------------------------

class PerformanceTemplateListCreateView(APIView):
    """
    GET  /performance/templates/  -- list templates
    POST /performance/templates/  -- create a new template
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('performance.manage')]
        return [IsAuthenticated(), HasPermission('performance.view')]

    def get(self, request):
        queryset = PerformanceTemplate.objects.all()

        # -- Filter by active status
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

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
            'results': PerformanceTemplateSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = PerformanceTemplateCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        template = serializer.save()
        return Response(
            PerformanceTemplateSerializer(template).data,
            status=status.HTTP_201_CREATED,
        )


# -- Performance Template Detail -----------------------------------------------

class PerformanceTemplateDetailView(APIView):
    """
    GET    /performance/templates/{id}/  -- retrieve a template
    PUT    /performance/templates/{id}/  -- update a template
    DELETE /performance/templates/{id}/  -- delete a template
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('performance.view')]
        return [IsAuthenticated(), HasPermission('performance.manage')]

    def _get_template(self, pk):
        return get_object_or_404(PerformanceTemplate, pk=pk)

    def get(self, request, pk):
        template = self._get_template(pk)
        return Response(PerformanceTemplateSerializer(template).data)

    def put(self, request, pk):
        template = self._get_template(pk)
        serializer = PerformanceTemplateCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(template, field, value)
        template.save()

        return Response(PerformanceTemplateSerializer(template).data)

    def delete(self, request, pk):
        template = self._get_template(pk)
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# -- Performance Metrics -------------------------------------------------------

class PerformanceMetricsView(APIView):
    """
    GET /performance/metrics/  -- get metrics (filter by employee_id, period)
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('performance.view')]

    def get(self, request):
        queryset = PerformanceMetrics.objects.select_related('employee')

        # Non-admin users can only see their own metrics
        user = request.user
        if not getattr(user, 'is_tenant_admin', False):
            queryset = queryset.filter(employee__user=user)

        # -- Filters
        employee_id = request.query_params.get('employee_id')
        period = request.query_params.get('period')

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if period:
            queryset = queryset.filter(period=period)

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
            'results': PerformanceMetricsSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })
