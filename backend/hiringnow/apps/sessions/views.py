from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.sessions.models import UserSession
from apps.sessions.serializers import UserSessionSerializer


# ── Session List ─────────────────────────────────────────────────────


class SessionListView(APIView):
    """
    GET /sessions/ — list active sessions.
    Tenant admins see all sessions; regular users see only their own.
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('sessions.view')]

    def get(self, request):
        queryset = UserSession.objects.select_related('user')

        user = request.user
        if not getattr(user, 'is_tenant_admin', False):
            queryset = queryset.filter(user=user)

        # ── Filters
        is_active = request.query_params.get('is_active')
        user_id = request.query_params.get('user_id')

        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        if user_id and getattr(user, 'is_tenant_admin', False):
            queryset = queryset.filter(user_id=user_id)

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
            'results': UserSessionSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })


# ── Session Terminate ────────────────────────────────────────────────


class SessionTerminateView(APIView):
    """
    DELETE /sessions/{id}/ — terminate (deactivate) a session.
    Admins can terminate any session; regular users can only terminate
    their own sessions.
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('sessions.manage')]

    def delete(self, request, pk):
        session = get_object_or_404(
            UserSession.objects.select_related('user'),
            pk=pk,
        )

        user = request.user

        # Non-admin users may only terminate their own sessions
        if not getattr(user, 'is_tenant_admin', False) and session.user_id != user.id:
            return Response(
                {'detail': 'You can only terminate your own sessions.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not session.is_active:
            return Response(
                {'detail': 'Session is already terminated.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session.is_active = False
        session.save(update_fields=['is_active', 'updated_at'])

        return Response(status=status.HTTP_204_NO_CONTENT)
