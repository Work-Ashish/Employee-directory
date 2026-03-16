from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.notifications.models import Notification, AdminAlert
from apps.notifications.serializers import (
    NotificationSerializer,
    AdminAlertSerializer,
)


# -- Notification List ---------------------------------------------------------

class NotificationListView(APIView):
    """
    GET /notifications/ -- list notifications for the authenticated user
    Supports ?is_read=true/false filter.
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('notifications.view')]

    def get(self, request):
        queryset = Notification.objects.filter(user=request.user)

        # -- Filters
        is_read = request.query_params.get('is_read')
        notification_type = request.query_params.get('type')

        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        if notification_type:
            queryset = queryset.filter(type=notification_type)

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
            'results': NotificationSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })


# -- Notification Mark Read ----------------------------------------------------

class NotificationMarkReadView(APIView):
    """
    PUT /notifications/<uuid:pk>/read/ -- mark a single notification as read
    PUT /notifications/read/            -- mark ALL notifications as read (pk='all')
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('notifications.view')]

    def put(self, request, pk=None):
        # Mark all unread notifications as read
        if pk is None:
            updated = Notification.objects.filter(
                user=request.user,
                is_read=False,
            ).update(is_read=True, updated_at=timezone.now())

            return Response({
                'detail': f'Marked {updated} notification(s) as read.',
                'updated': updated,
            })

        # Mark a single notification as read
        notification = get_object_or_404(
            Notification,
            pk=pk,
            user=request.user,
        )
        notification.is_read = True
        notification.save(update_fields=['is_read', 'updated_at'])

        return Response(NotificationSerializer(notification).data)


# -- Admin Alert List ----------------------------------------------------------

class AdminAlertListView(APIView):
    """
    GET /notifications/alerts/ -- list admin alerts (admin only)
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('admin_alerts.view')]

    def get(self, request):
        queryset = AdminAlert.objects.all()

        # -- Filters
        severity = request.query_params.get('severity')
        is_resolved = request.query_params.get('is_resolved')

        if severity:
            queryset = queryset.filter(severity=severity)
        if is_resolved is not None:
            queryset = queryset.filter(is_resolved=is_resolved.lower() == 'true')

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
            'results': AdminAlertSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })
