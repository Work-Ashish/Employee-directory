from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.events.models import CalendarEvent
from apps.events.serializers import (
    EventSerializer,
    EventCreateSerializer,
    EventUpdateSerializer,
)


# -- Event List / Create ------------------------------------------------------

class EventListCreateView(APIView):
    """
    GET  /events/  -- list events (supports date range filter)
    POST /events/  -- create a new calendar event
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('events.manage')]
        return [IsAuthenticated(), HasPermission('events.view')]

    def get(self, request):
        queryset = CalendarEvent.objects.select_related('created_by').prefetch_related('attendees').order_by('-start_time')

        # Non-admin users see events they created or are attending
        user = request.user
        if not getattr(user, 'is_tenant_admin', False):
            from django.db.models import Q
            queryset = queryset.filter(
                Q(created_by__user=user)
                | Q(attendees__user=user)
                | Q(type__in=[
                    CalendarEvent.EventType.HOLIDAY,
                    CalendarEvent.EventType.COMPANY,
                ]),
            ).distinct()

        # -- Filters
        event_type = request.query_params.get('type')
        start_from = request.query_params.get('start_from')
        start_to = request.query_params.get('start_to')

        if event_type:
            queryset = queryset.filter(type=event_type)
        if start_from:
            queryset = queryset.filter(start_date__gte=start_from)
        if start_to:
            queryset = queryset.filter(start_date__lte=start_to)

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
            'results': EventSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = EventCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Resolve created_by from the requesting user
        employee_profile = getattr(request.user, 'employee_profile', None)
        if employee_profile:
            serializer.validated_data['created_by_id'] = employee_profile.id

        event = serializer.save()
        return Response(
            EventSerializer(event).data,
            status=status.HTTP_201_CREATED,
        )


# -- Event Detail --------------------------------------------------------------

class EventDetailView(APIView):
    """
    GET    /events/{id}/ -- retrieve a single event
    PUT    /events/{id}/ -- update an event
    DELETE /events/{id}/ -- delete an event
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('events.view')]
        return [IsAuthenticated(), HasPermission('events.manage')]

    def _get_event(self, pk):
        return get_object_or_404(
            CalendarEvent.objects.select_related('created_by').prefetch_related('attendees'),
            pk=pk,
        )

    def get(self, request, pk):
        event = self._get_event(pk)
        return Response(EventSerializer(event).data)

    def put(self, request, pk):
        event = self._get_event(pk)

        serializer = EventUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        attendee_ids = data.pop('attendee_ids', None)

        # Update scalar fields
        for field, value in data.items():
            setattr(event, field, value)
        event.save()

        # Update attendees if provided
        if attendee_ids is not None:
            event.attendees.set(attendee_ids)

        return Response(EventSerializer(event).data)

    def delete(self, request, pk):
        event = self._get_event(pk)
        event.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
