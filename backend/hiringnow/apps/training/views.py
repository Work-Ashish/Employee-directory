from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.training.models import Training, TrainingEnrollment
from apps.training.serializers import (
    TrainingSerializer,
    TrainingCreateSerializer,
    TrainingUpdateSerializer,
    TrainingEnrollmentSerializer,
)


# -- Training List / Create ----------------------------------------------------

class TrainingListCreateView(APIView):
    """
    GET  /training/  -- list trainings (paginated)
    POST /training/  -- create a new training
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('training.manage')]
        return [IsAuthenticated(), HasPermission('training.view')]

    def get(self, request):
        queryset = Training.objects.select_related('department').order_by('-start_date')

        # Non-admin users can only see trainings they are enrolled in
        user = request.user
        if not getattr(user, 'is_tenant_admin', False):
            queryset = queryset.filter(enrollments__employee__user=user).distinct()

        # -- Filters
        status_filter = request.query_params.get('status')
        department_id = request.query_params.get('department_id')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if department_id:
            queryset = queryset.filter(department_id=department_id)

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
            'results': TrainingSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = TrainingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        training = serializer.save()
        return Response(
            TrainingSerializer(training).data,
            status=status.HTTP_201_CREATED,
        )


# -- Training Detail -----------------------------------------------------------

class TrainingDetailView(APIView):
    """
    GET    /training/{id}/  -- retrieve a training with enrollments
    PUT    /training/{id}/  -- update a training
    DELETE /training/{id}/  -- delete a training
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('training.view')]
        return [IsAuthenticated(), HasPermission('training.manage')]

    def _get_training(self, pk):
        return get_object_or_404(
            Training.objects.select_related('department'),
            pk=pk,
        )

    def get(self, request, pk):
        training = get_object_or_404(
            Training.objects.select_related('department').prefetch_related(
                'enrollments__employee',
            ),
            pk=pk,
        )
        data = TrainingSerializer(training).data
        data['enrollments'] = TrainingEnrollmentSerializer(
            training.enrollments.all(), many=True,
        ).data
        return Response(data)

    def put(self, request, pk):
        training = self._get_training(pk)
        serializer = TrainingUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(training, field, value)
        training.save()

        return Response(TrainingSerializer(training).data)

    def delete(self, request, pk):
        training = self._get_training(pk)
        training.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# -- Training Enroll / Unenroll ------------------------------------------------

class TrainingEnrollView(APIView):
    """
    POST   /training/{id}/enroll/  -- enroll in a training
    DELETE /training/{id}/enroll/  -- unenroll from a training
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('training.manage')]

    def _get_training(self, pk):
        return get_object_or_404(Training, pk=pk)

    def post(self, request, pk):
        training = self._get_training(pk)

        # Determine employee: from request body or from requesting user
        employee_id = request.data.get('employee_id')
        if not employee_id:
            employee_profile = getattr(request.user, 'employee_profile', None)
            if not employee_profile:
                return Response(
                    {'detail': 'No employee profile linked to your account.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            employee_id = employee_profile.id

        # Check max participants
        current_enrolled = training.enrollments.filter(
            status=TrainingEnrollment.Status.ENROLLED,
        ).count()
        if current_enrolled >= training.max_participants:
            return Response(
                {'detail': 'Training has reached maximum participants.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if already enrolled
        if TrainingEnrollment.objects.filter(
            training=training, employee_id=employee_id,
        ).exists():
            return Response(
                {'detail': 'Employee is already enrolled in this training.'},
                status=status.HTTP_409_CONFLICT,
            )

        enrollment = TrainingEnrollment.objects.create(
            training=training,
            employee_id=employee_id,
            status=TrainingEnrollment.Status.ENROLLED,
        )

        return Response(
            TrainingEnrollmentSerializer(enrollment).data,
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, pk):
        training = self._get_training(pk)

        employee_id = request.data.get('employee_id')
        if not employee_id:
            employee_profile = getattr(request.user, 'employee_profile', None)
            if not employee_profile:
                return Response(
                    {'detail': 'No employee profile linked to your account.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            employee_id = employee_profile.id

        enrollment = TrainingEnrollment.objects.filter(
            training=training, employee_id=employee_id,
        ).first()

        if not enrollment:
            return Response(
                {'detail': 'Employee is not enrolled in this training.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        enrollment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
