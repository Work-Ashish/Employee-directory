from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.tickets.models import Ticket
from apps.tickets.serializers import (
    TicketSerializer,
    TicketCreateSerializer,
    TicketUpdateSerializer,
)


# -- Ticket List / Create -----------------------------------------------------

class TicketListCreateView(APIView):
    """
    GET  /tickets/  -- list tickets (admin sees all; others see own)
    POST /tickets/  -- create a new ticket
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('tickets.manage')]
        return [IsAuthenticated(), HasPermission('tickets.view')]

    def get(self, request):
        queryset = Ticket.objects.select_related('created_by', 'assigned_to')

        # Non-admin users can only see their own tickets
        user = request.user
        if not getattr(user, 'is_tenant_admin', False):
            queryset = queryset.filter(created_by__user=user)

        # -- Filters
        status_filter = request.query_params.get('status')
        priority = request.query_params.get('priority')
        category = request.query_params.get('category')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if priority:
            queryset = queryset.filter(priority=priority)
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
            'results': TicketSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = TicketCreateSerializer(data=request.data)
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

        ticket = serializer.save()
        return Response(
            TicketSerializer(ticket).data,
            status=status.HTTP_201_CREATED,
        )


# -- Ticket Detail -------------------------------------------------------------

class TicketDetailView(APIView):
    """
    GET /tickets/{id}/ -- retrieve a single ticket
    PUT /tickets/{id}/ -- update a ticket (status, assignment, priority)
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('tickets.view')]
        return [IsAuthenticated(), HasPermission('tickets.manage')]

    def _get_ticket(self, pk):
        return get_object_or_404(
            Ticket.objects.select_related('created_by', 'assigned_to'),
            pk=pk,
        )

    def get(self, request, pk):
        ticket = self._get_ticket(pk)
        return Response(TicketSerializer(ticket).data)

    def put(self, request, pk):
        ticket = self._get_ticket(pk)

        if ticket.status == Ticket.Status.CLOSED:
            return Response(
                {'detail': 'Cannot update a closed ticket.'},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = TicketUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        update_fields = ['updated_at']
        for field in ('status', 'priority', 'description'):
            if field in serializer.validated_data:
                setattr(ticket, field, serializer.validated_data[field])
                update_fields.append(field)

        if 'assigned_to_id' in serializer.validated_data:
            ticket.assigned_to_id = serializer.validated_data['assigned_to_id']
            update_fields.append('assigned_to_id')

        ticket.save(update_fields=update_fields)
        return Response(TicketSerializer(ticket).data)
