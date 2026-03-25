import logging

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from common.pagination import StandardResultsPagination
from apps.audit.models import AuditLog
from apps.audit.serializers import AuditLogSerializer

logger = logging.getLogger(__name__)


class AuditLogListView(APIView):
    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('audit.view')]

    def get(self, request):
        qs = AuditLog.objects.select_related('user').all().order_by('-created_at')

        action = request.query_params.get('action')
        resource = request.query_params.get('resource')
        user_id = request.query_params.get('user')
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')

        if action:
            qs = qs.filter(action=action)
        if resource:
            qs = qs.filter(resource=resource)
        if user_id:
            qs = qs.filter(user_id=user_id)
        if from_date:
            qs = qs.filter(created_at__date__gte=from_date)
        if to_date:
            qs = qs.filter(created_at__date__lte=to_date)

        paginator = StandardResultsPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            return paginator.get_paginated_response(
                AuditLogSerializer(page, many=True).data
            )
        return Response(AuditLogSerializer(qs[:100], many=True).data)


class AuditLogCreateView(generics.CreateAPIView):
    """Authenticated audit log ingestion endpoint for Next.js audit dispatch."""
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
        )
