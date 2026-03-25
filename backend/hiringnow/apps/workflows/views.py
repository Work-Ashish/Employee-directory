from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.workflows.models import WorkflowTemplate, WorkflowInstance, WorkflowAction
from apps.workflows.serializers import (
    WorkflowTemplateSerializer,
    WorkflowTemplateCreateSerializer,
    WorkflowInstanceSerializer,
    WorkflowInstanceCreateSerializer,
    WorkflowActionCreateSerializer,
)


class WorkflowTemplateListCreateView(APIView):

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('settings.manage')]
        return [IsAuthenticated(), HasPermission('settings.view')]

    def get(self, request):
        queryset = WorkflowTemplate.objects.select_related('created_by').prefetch_related('steps').order_by('-created_at')

        entity_type = request.query_params.get('entity_type')
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        try:
            page = max(int(request.query_params.get('page', 1)), 1)
            limit = min(int(request.query_params.get('limit', 50)), 100)
        except (TypeError, ValueError):
            page, limit = 1, 50

        total = queryset.count()
        start = (page - 1) * limit
        page_qs = queryset[start:start + limit]

        return Response({
            'results': WorkflowTemplateSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = WorkflowTemplateCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee_profile = getattr(request.user, 'employee_profile', None)
        if employee_profile:
            serializer.validated_data['created_by_id'] = employee_profile.id

        template = serializer.save()
        return Response(
            WorkflowTemplateSerializer(template).data,
            status=status.HTTP_201_CREATED,
        )


class WorkflowTemplateDetailView(APIView):

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('settings.view')]
        return [IsAuthenticated(), HasPermission('settings.manage')]

    def _get_template(self, pk):
        return get_object_or_404(
            WorkflowTemplate.objects.select_related('created_by').prefetch_related('steps'),
            pk=pk,
        )

    def get(self, request, pk):
        template = self._get_template(pk)
        return Response(WorkflowTemplateSerializer(template).data)

    def put(self, request, pk):
        template = self._get_template(pk)
        for field in ('name', 'description', 'entity_type', 'status'):
            if field in request.data:
                setattr(template, field, request.data[field])
        template.save()
        return Response(WorkflowTemplateSerializer(template).data)

    def delete(self, request, pk):
        template = self._get_template(pk)
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WorkflowInstanceListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee = getattr(request.user, 'employee_profile', None)
        queryset = WorkflowInstance.objects.select_related(
            'template', 'initiated_by',
        ).prefetch_related('actions__step', 'actions__actor', 'template__steps')

        # Admin / HR see all; employees see only their own
        from apps.rbac.models import UserRole
        user_roles = list(
            UserRole.objects.filter(user=request.user).values_list('role__slug', flat=True)
        )
        full_access_roles = {'admin', 'hr_manager'}
        if not full_access_roles.intersection(user_roles):
            if employee:
                queryset = queryset.filter(initiated_by=employee)
            else:
                queryset = queryset.none()

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        template_id = request.query_params.get('template_id')
        if template_id:
            queryset = queryset.filter(template_id=template_id)

        try:
            page = max(int(request.query_params.get('page', 1)), 1)
            limit = min(int(request.query_params.get('limit', 50)), 100)
        except (TypeError, ValueError):
            page, limit = 1, 50

        total = queryset.count()
        start = (page - 1) * limit
        page_qs = queryset[start:start + limit]

        return Response({
            'results': WorkflowInstanceSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = WorkflowInstanceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee = getattr(request.user, 'employee_profile', None)
        if not employee:
            return Response(
                {'detail': 'Employee profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer.validated_data['initiated_by_id'] = employee.id
        instance = serializer.save()
        return Response(
            WorkflowInstanceSerializer(instance).data,
            status=status.HTTP_201_CREATED,
        )


class WorkflowInstanceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_instance(self, pk):
        return get_object_or_404(
            WorkflowInstance.objects.select_related(
                'template', 'initiated_by',
            ).prefetch_related('actions__step', 'actions__actor', 'template__steps'),
            pk=pk,
        )

    def get(self, request, pk):
        instance = self._get_instance(pk)
        return Response(WorkflowInstanceSerializer(instance).data)


class WorkflowInstanceActionView(APIView):
    """POST /workflows/instances/<pk>/action/ — approve, reject, or return a step."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        instance = get_object_or_404(WorkflowInstance, pk=pk)

        if instance.status not in (WorkflowInstance.Status.PENDING, WorkflowInstance.Status.IN_PROGRESS):
            return Response(
                {'detail': 'This workflow is no longer actionable.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = WorkflowActionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee = getattr(request.user, 'employee_profile', None)
        if not employee:
            return Response(
                {'detail': 'Employee profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Resolve current step
        current_step = instance.template.steps.filter(order=instance.current_step).first()
        if not current_step:
            return Response(
                {'detail': 'Current step not found in template.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        decision = serializer.validated_data['decision']

        action = WorkflowAction.objects.create(
            instance=instance,
            step=current_step,
            actor=employee,
            decision=decision,
            comments=serializer.validated_data.get('comments', ''),
        )

        # Advance or finalize the workflow
        if decision == WorkflowAction.Decision.APPROVED:
            total_steps = instance.template.steps.count()
            if instance.current_step >= total_steps:
                instance.status = WorkflowInstance.Status.APPROVED
            else:
                instance.current_step += 1
                instance.status = WorkflowInstance.Status.IN_PROGRESS
        elif decision == WorkflowAction.Decision.REJECTED:
            instance.status = WorkflowInstance.Status.REJECTED
        elif decision == WorkflowAction.Decision.RETURNED:
            # Return to step 1
            instance.current_step = 1
            instance.status = WorkflowInstance.Status.IN_PROGRESS

        instance.save()

        # Re-fetch for full serialized response
        instance.refresh_from_db()
        instance = WorkflowInstance.objects.select_related(
            'template', 'initiated_by',
        ).prefetch_related('actions__step', 'actions__actor', 'template__steps').get(pk=instance.pk)

        return Response(WorkflowInstanceSerializer(instance).data)
