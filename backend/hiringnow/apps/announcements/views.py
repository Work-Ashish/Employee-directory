from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.announcements.models import Announcement, Kudos
from apps.announcements.serializers import (
    AnnouncementSerializer,
    AnnouncementCreateSerializer,
    AnnouncementUpdateSerializer,
    KudosSerializer,
    KudosCreateSerializer,
)


# -- Announcement List / Create ------------------------------------------------

class AnnouncementListCreateView(APIView):
    """
    GET  /announcements/  -- list active announcements
    POST /announcements/  -- create a new announcement (admin only)
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('announcements.manage')]
        return [IsAuthenticated(), HasPermission('announcements.view')]

    def get(self, request):
        queryset = Announcement.objects.select_related('created_by').filter(is_active=True).order_by('-created_at')

        # Exclude expired announcements
        now = timezone.now()
        from django.db.models import Q
        queryset = queryset.filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now),
        )

        # -- Filters
        priority = request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)

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
            'results': AnnouncementSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = AnnouncementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Resolve created_by from the requesting user if not provided
        if not serializer.validated_data.get('created_by_id'):
            employee_profile = getattr(request.user, 'employee_profile', None)
            if not employee_profile:
                return Response(
                    {'detail': 'No employee profile linked to your account.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer.validated_data['created_by_id'] = employee_profile.id

        announcement = serializer.save()
        return Response(
            AnnouncementSerializer(announcement).data,
            status=status.HTTP_201_CREATED,
        )


# -- Announcement Detail -------------------------------------------------------

class AnnouncementDetailView(APIView):
    """
    GET    /announcements/{id}/ -- retrieve a single announcement
    PUT    /announcements/{id}/ -- update an announcement
    DELETE /announcements/{id}/ -- delete an announcement
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('announcements.view')]
        return [IsAuthenticated(), HasPermission('announcements.manage')]

    def _get_announcement(self, pk):
        return get_object_or_404(
            Announcement.objects.select_related('created_by'),
            pk=pk,
        )

    def get(self, request, pk):
        announcement = self._get_announcement(pk)
        return Response(AnnouncementSerializer(announcement).data)

    def put(self, request, pk):
        announcement = self._get_announcement(pk)

        serializer = AnnouncementUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        update_fields = ['updated_at']
        for field in ('title', 'content', 'priority', 'is_active', 'expires_at'):
            if field in serializer.validated_data:
                setattr(announcement, field, serializer.validated_data[field])
                update_fields.append(field)

        announcement.save(update_fields=update_fields)
        return Response(AnnouncementSerializer(announcement).data)

    def delete(self, request, pk):
        announcement = self._get_announcement(pk)
        announcement.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# -- Kudos List / Create -------------------------------------------------------

class KudosListCreateView(APIView):
    """
    GET  /kudos/  -- list recent kudos (public ones for non-admin)
    POST /kudos/  -- give kudos to a colleague
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('kudos.manage')]
        return [IsAuthenticated(), HasPermission('kudos.view')]

    def get(self, request):
        queryset = Kudos.objects.select_related('from_employee', 'to_employee').order_by('-created_at')

        # Non-admin users can only see public kudos or their own
        user = request.user
        if not getattr(user, 'is_tenant_admin', False):
            from django.db.models import Q
            queryset = queryset.filter(
                Q(is_public=True)
                | Q(from_employee__user=user)
                | Q(to_employee__user=user),
            )

        # -- Filters
        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

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
            'results': KudosSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = KudosCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Resolve from_employee from the requesting user if not provided
        if not serializer.validated_data.get('from_employee_id'):
            employee_profile = getattr(request.user, 'employee_profile', None)
            if not employee_profile:
                return Response(
                    {'detail': 'No employee profile linked to your account.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer.validated_data['from_employee_id'] = employee_profile.id

            # Re-validate self-kudos now that we have from_employee_id
            if str(employee_profile.id) == str(serializer.validated_data['to_employee_id']):
                return Response(
                    {'detail': 'You cannot give kudos to yourself.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        kudos = serializer.save()
        return Response(
            KudosSerializer(kudos).data,
            status=status.HTTP_201_CREATED,
        )


# -- Kudos Detail --------------------------------------------------------------

class KudosDetailView(APIView):
    """
    GET    /kudos/{id}/ -- retrieve a single kudos
    DELETE /kudos/{id}/ -- delete a kudos (only creator or admin)
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('kudos.view')]
        return [IsAuthenticated(), HasPermission('kudos.manage')]

    def _get_kudos(self, pk):
        return get_object_or_404(
            Kudos.objects.select_related('from_employee', 'to_employee'),
            pk=pk,
        )

    def get(self, request, pk):
        kudos = self._get_kudos(pk)
        return Response(KudosSerializer(kudos).data)

    def delete(self, request, pk):
        kudos = self._get_kudos(pk)
        kudos.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
