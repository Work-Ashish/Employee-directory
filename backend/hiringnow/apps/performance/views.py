from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.employees.models import Employee
from apps.rbac.models import UserRole
from apps.rbac.permissions import HasPermission
from apps.rbac.services import user_has_permission
from apps.teams.models import TeamMember
from apps.performance.models import (
    PerformanceReview,
    PerformanceTemplate,
    PerformanceMetrics,
    ReviewCycle,
    MonthlyReview,
    Appraisal,
    PIP,
)
from apps.performance.serializers import (
    PerformanceReviewSerializer,
    PerformanceReviewCreateSerializer,
    PerformanceReviewUpdateSerializer,
    PerformanceTemplateSerializer,
    PerformanceTemplateCreateSerializer,
    PerformanceMetricsSerializer,
    ReviewCycleSerializer,
    ReviewCycleCreateSerializer,
    MonthlyReviewSerializer,
    MonthlyReviewCreateSerializer,
    MonthlyReviewUpdateSerializer,
    AppraisalSerializer,
    AppraisalCreateSerializer,
    AppraisalUpdateSerializer,
    PIPSerializer,
    PIPCreateSerializer,
    PIPUpdateSerializer,
)
from apps.performance.services import (
    compute_score_percentage,
    rating_category_from_score,
    rating_from_category,
    alert_type_from_rating,
    check_six_monthly_eligibility,
    aggregate_monthly_summary,
    outcome_from_rating,
    category_from_rating,
)


def _is_full_access(user):
    """Admin, CEO, and HR get unscoped (full) access."""
    if getattr(user, 'is_tenant_admin', False):
        return True
    # Check the user's role slugs via RBAC — admin/ceo/hr_manager get full access
    FULL_ACCESS_SLUGS = {'admin', 'ceo', 'hr_manager'}
    user_slugs = set(
        UserRole.objects.filter(user=user)
        .values_list('role__slug', flat=True)
    )
    return bool(user_slugs & FULL_ACCESS_SLUGS)


def _scope_queryset(queryset, user, permission_codename='performance.manage'):
    """
    Apply 3-tier row-level scoping:
      - Admin / CEO / HR  → see ALL records
      - Team Lead (has manage but not full-access) → own + direct reports + team members
      - Employee (view only) → own records only
    """
    if _is_full_access(user):
        return queryset

    emp = Employee.objects.filter(user=user, deleted_at__isnull=True).first()
    if not emp:
        return queryset.none()

    visible = Q(employee=emp)

    # If the user has manage permission (e.g. team_lead), expand to reports + team
    has_manage = user_has_permission(user, permission_codename)
    if has_manage:
        # Direct reports
        direct_report_ids = list(
            Employee.objects.filter(reporting_to=emp, deleted_at__isnull=True)
            .values_list('id', flat=True)
        )
        if direct_report_ids:
            visible |= Q(employee_id__in=direct_report_ids)
        # Team members (teams the user leads)
        led_team_ids = list(emp.led_teams.values_list('id', flat=True))
        if led_team_ids:
            team_member_ids = list(
                TeamMember.objects.filter(team_id__in=led_team_ids)
                .values_list('employee_id', flat=True)
            )
            if team_member_ids:
                visible |= Q(employee_id__in=team_member_ids)

    return queryset.filter(visible)


def _can_access_record(record, user):
    """Check if user can access a specific employee-linked record (detail views)."""
    if _is_full_access(user):
        return True
    emp = Employee.objects.filter(user=user, deleted_at__isnull=True).first()
    if not emp:
        return False
    record_emp_id = str(getattr(record, 'employee_id', ''))
    # Own record
    if record_emp_id == str(emp.id):
        return True
    # Manager with manage perm: direct reports + team members
    if user_has_permission(user, 'performance.manage'):
        direct_ids = set(
            str(i) for i in Employee.objects.filter(
                reporting_to=emp, deleted_at__isnull=True
            ).values_list('id', flat=True)
        )
        if record_emp_id in direct_ids:
            return True
        led_team_ids = list(emp.led_teams.values_list('id', flat=True))
        if led_team_ids:
            team_ids = set(
                str(i) for i in TeamMember.objects.filter(
                    team_id__in=led_team_ids
                ).values_list('employee_id', flat=True)
            )
            if record_emp_id in team_ids:
                return True
    return False


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
        ).order_by('-created_at')

        queryset = _scope_queryset(queryset, request.user)

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
        if not _can_access_record(review, request.user):
            return Response({'error': 'Not authorized to view this review'}, status=status.HTTP_403_FORBIDDEN)
        return Response(PerformanceReviewSerializer(review).data)

    def put(self, request, pk):
        review = self._get_review(pk)
        if not _can_access_record(review, request.user):
            return Response({'error': 'Not authorized to modify this review'}, status=status.HTTP_403_FORBIDDEN)

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
        queryset = PerformanceMetrics.objects.select_related('employee').order_by('-created_at')

        queryset = _scope_queryset(queryset, request.user)

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


# ── Source One: Review Cycle List / Create ──────────────────────────────

class ReviewCycleListCreateView(APIView):
    """
    GET  /performance/cycles/  -- list review cycles
    POST /performance/cycles/  -- create a new cycle
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('performance.manage')]
        return [IsAuthenticated(), HasPermission('performance.view')]

    def get(self, request):
        queryset = ReviewCycle.objects.all().order_by('-created_at')

        # -- Filters
        cycle_type = request.query_params.get('cycle_type')
        financial_year = request.query_params.get('financial_year')

        if cycle_type:
            queryset = queryset.filter(cycle_type=cycle_type)
        if financial_year:
            queryset = queryset.filter(financial_year=financial_year)

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
            'results': ReviewCycleSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = ReviewCycleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cycle = serializer.save()
        return Response(
            ReviewCycleSerializer(cycle).data,
            status=status.HTTP_201_CREATED,
        )


# ── Source One: Monthly Review List / Create ────────────────────────────

class MonthlyReviewListCreateView(APIView):
    """
    GET  /performance/monthly/  -- list monthly reviews
    POST /performance/monthly/  -- create a monthly review
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('performance.manage')]
        return [IsAuthenticated(), HasPermission('performance.view')]

    def get(self, request):
        queryset = MonthlyReview.objects.select_related(
            'employee', 'reviewer', 'reporting_manager', 'cycle',
        ).order_by('-review_year', '-review_month')

        queryset = _scope_queryset(queryset, request.user)

        # -- Filters
        employee_id = request.query_params.get('employee_id')
        review_month = request.query_params.get('review_month')
        review_year = request.query_params.get('review_year')
        status_filter = request.query_params.get('status')

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if review_month:
            queryset = queryset.filter(review_month=review_month)
        if review_year:
            queryset = queryset.filter(review_year=review_year)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

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
            'results': MonthlyReviewSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = MonthlyReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        # If reviewer_id not provided, use requesting user's employee profile
        if not data.get('reviewer_id'):
            employee_profile = getattr(request.user, 'employee_profile', None)
            if employee_profile:
                data['reviewer_id'] = employee_profile.id

        # Auto-compute score_percentage from recruiter_metrics
        recruiter_metrics = data.get('recruiter_metrics', [])
        score_pct = compute_score_percentage(recruiter_metrics)
        data['score_percentage'] = score_pct

        # Auto-set rating_category, rating, and appreciation_or_alert
        category = rating_category_from_score(score_pct)
        data['rating_category'] = category
        rating = rating_from_category(category)
        data['rating'] = rating
        data['appreciation_or_alert'] = alert_type_from_rating(rating)

        review = serializer.save()
        return Response(
            MonthlyReviewSerializer(review).data,
            status=status.HTTP_201_CREATED,
        )


# ── Source One: Monthly Review Detail ───────────────────────────────────

class MonthlyReviewDetailView(APIView):
    """
    GET /performance/monthly/{id}/  -- retrieve a single monthly review
    PUT /performance/monthly/{id}/  -- update a monthly review
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('performance.view')]
        return [IsAuthenticated(), HasPermission('performance.manage')]

    def _get_review(self, pk):
        return get_object_or_404(
            MonthlyReview.objects.select_related(
                'employee', 'reviewer', 'reporting_manager',
            ),
            pk=pk,
        )

    def get(self, request, pk):
        review = self._get_review(pk)
        if not _can_access_record(review, request.user):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        return Response(MonthlyReviewSerializer(review).data)

    def put(self, request, pk):
        review = self._get_review(pk)
        if not _can_access_record(review, request.user):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        serializer = MonthlyReviewUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(review, field, value)

        # If rating changed, recompute rating_category and appreciation_or_alert
        if 'rating' in serializer.validated_data:
            new_rating = serializer.validated_data['rating']
            review.rating_category = category_from_rating(new_rating)
            review.appreciation_or_alert = alert_type_from_rating(new_rating)

        review.save()
        return Response(MonthlyReviewSerializer(review).data)


# ── Source One: Monthly Review Sign ─────────────────────────────────────

class MonthlyReviewSignView(APIView):
    """
    POST /performance/monthly/{id}/sign/  -- sign a monthly review
    Accept {"role": "employee"|"manager"|"hr"} and set the corresponding
    _signed_at timestamp to now().
    Validates that the signer matches the role they claim.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        review = get_object_or_404(MonthlyReview, pk=pk)
        role = request.data.get('role', '').lower()

        field_map = {
            'employee': 'employee_signed_at',
            'manager': 'manager_signed_at',
            'hr': 'hr_signed_at',
        }

        field = field_map.get(role)
        if not field:
            return Response(
                {'error': 'role must be one of: employee, manager, hr'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate signer matches claimed role
        user_emp = Employee.objects.filter(user=request.user, deleted_at__isnull=True).first()
        if role == 'employee' and (not user_emp or user_emp.id != review.employee_id):
            return Response({'error': 'You can only sign your own review as employee'}, status=status.HTTP_403_FORBIDDEN)
        if role == 'manager' and (not user_emp or user_emp.id != review.reporting_manager_id):
            return Response({'error': 'Only the reporting manager can sign as manager'}, status=status.HTTP_403_FORBIDDEN)
        if role == 'hr' and not _is_full_access(request.user):
            return Response({'error': 'Only HR/Admin can sign as HR'}, status=status.HTTP_403_FORBIDDEN)

        setattr(review, field, timezone.now())
        review.save(update_fields=[field, 'updated_at'])
        return Response(MonthlyReviewSerializer(review).data)


# ── Source One: Appraisal List / Create ─────────────────────────────────

class AppraisalListCreateView(APIView):
    """
    GET  /performance/appraisals/  -- list appraisals
    POST /performance/appraisals/  -- create an appraisal
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('performance.manage')]
        return [IsAuthenticated(), HasPermission('performance.view')]

    def get(self, request):
        queryset = Appraisal.objects.select_related(
            'employee', 'reporting_manager', 'hr_reviewer', 'cycle',
        ).order_by('-created_at')

        queryset = _scope_queryset(queryset, request.user)

        # -- Filters
        review_type = request.query_params.get('review_type')
        financial_year = request.query_params.get('financial_year')
        status_filter = request.query_params.get('status')
        employee_id = request.query_params.get('employee_id')

        if review_type:
            queryset = queryset.filter(review_type=review_type)
        if financial_year:
            queryset = queryset.filter(financial_year=financial_year)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

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
            'results': AppraisalSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = AppraisalCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        # For SIX_MONTHLY type, auto-check eligibility
        if data.get('review_type') == 'SIX_MONTHLY':
            eligibility = check_six_monthly_eligibility(
                data['employee_id'], data['financial_year'],
            )
            data['is_eligible'] = eligibility['eligible']
            data['eligibility_reason'] = eligibility['reason']

        # Auto-populate monthly_summary if not provided
        if not data.get('monthly_summary'):
            fy = data.get('financial_year', '')
            if fy:
                fy_start_year = int('20' + fy.split('-')[0])
                if data.get('review_type') == 'SIX_MONTHLY':
                    start_month, end_month = 4, 9
                    start_year = end_year = fy_start_year
                else:
                    start_month, start_year = 4, fy_start_year
                    end_month, end_year = 3, fy_start_year + 1
                data['monthly_summary'] = aggregate_monthly_summary(
                    data['employee_id'],
                    start_month, start_year,
                    end_month, end_year,
                )

        appraisal = serializer.save()
        return Response(
            AppraisalSerializer(appraisal).data,
            status=status.HTTP_201_CREATED,
        )


# ── Source One: Appraisal Detail ────────────────────────────────────────

class AppraisalDetailView(APIView):
    """
    GET /performance/appraisals/{id}/  -- retrieve a single appraisal
    PUT /performance/appraisals/{id}/  -- update an appraisal
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('performance.view')]
        return [IsAuthenticated(), HasPermission('performance.manage')]

    def _get_appraisal(self, pk):
        return get_object_or_404(
            Appraisal.objects.select_related(
                'employee', 'reporting_manager', 'hr_reviewer', 'cycle',
            ),
            pk=pk,
        )

    def get(self, request, pk):
        appraisal = self._get_appraisal(pk)
        if not _can_access_record(appraisal, request.user):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        return Response(AppraisalSerializer(appraisal).data)

    def put(self, request, pk):
        appraisal = self._get_appraisal(pk)
        if not _can_access_record(appraisal, request.user):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        serializer = AppraisalUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(appraisal, field, value)

        # If overall_rating changed, auto-set outcome_decision and final_rating_category
        if 'overall_rating' in serializer.validated_data:
            new_rating = serializer.validated_data['overall_rating']
            appraisal.outcome_decision = outcome_from_rating(new_rating)
            appraisal.final_rating_category = category_from_rating(new_rating)

        appraisal.save()
        return Response(AppraisalSerializer(appraisal).data)


# ── Source One: Appraisal Eligibility ───────────────────────────────────

class AppraisalEligibilityView(APIView):
    """
    GET /performance/appraisals/eligibility/?financial_year=25-26
    Return eligibility status for all active employees for six-monthly appraisal.
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('performance.manage')]

    def get(self, request):
        financial_year = request.query_params.get('financial_year')
        if not financial_year:
            return Response(
                {'error': 'financial_year query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        employees = Employee.objects.filter(
            status='active',
        ).order_by('first_name', 'last_name')

        # Scope employee list: admin/CEO/HR see all, team lead sees own team only
        if not _is_full_access(request.user):
            user_emp = Employee.objects.filter(user=request.user, deleted_at__isnull=True).first()
            if user_emp:
                visible_ids = {user_emp.id}
                # Direct reports
                visible_ids.update(
                    Employee.objects.filter(reporting_to=user_emp, deleted_at__isnull=True)
                    .values_list('id', flat=True)
                )
                # Team members
                led_team_ids = list(user_emp.led_teams.values_list('id', flat=True))
                if led_team_ids:
                    visible_ids.update(
                        TeamMember.objects.filter(team_id__in=led_team_ids)
                        .values_list('employee_id', flat=True)
                    )
                employees = employees.filter(id__in=visible_ids)
            else:
                employees = employees.none()

        results = []
        for emp in employees:
            eligibility = check_six_monthly_eligibility(emp.id, financial_year)
            results.append({
                'employee_id': str(emp.id),
                'employee_name': f"{emp.first_name} {emp.last_name}",
                'eligible': eligibility['eligible'],
                'reason': eligibility['reason'],
            })

        return Response({
            'results': results,
            'total': len(results),
            'financial_year': financial_year,
        })


# ── Source One: PIP List / Create ───────────────────────────────────────

class PIPListCreateView(APIView):
    """
    GET  /performance/pip/  -- list PIPs
    POST /performance/pip/  -- create a PIP
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('performance.manage')]
        return [IsAuthenticated(), HasPermission('performance.view')]

    def get(self, request):
        queryset = PIP.objects.select_related(
            'employee', 'triggered_by_monthly', 'triggered_by_appraisal',
        ).order_by('-created_at')

        queryset = _scope_queryset(queryset, request.user)

        # -- Filters
        employee_id = request.query_params.get('employee_id')
        status_filter = request.query_params.get('status')
        pip_type = request.query_params.get('pip_type')

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if pip_type:
            queryset = queryset.filter(pip_type=pip_type)

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
            'results': PIPSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = PIPCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pip = serializer.save()
        return Response(
            PIPSerializer(pip).data,
            status=status.HTTP_201_CREATED,
        )


# ── Source One: PIP Detail ──────────────────────────────────────────────

class PIPDetailView(APIView):
    """
    GET /performance/pip/{id}/  -- retrieve a single PIP
    PUT /performance/pip/{id}/  -- update a PIP
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('performance.view')]
        return [IsAuthenticated(), HasPermission('performance.manage')]

    def _get_pip(self, pk):
        return get_object_or_404(
            PIP.objects.select_related(
                'employee', 'triggered_by_monthly', 'triggered_by_appraisal',
            ),
            pk=pk,
        )

    def get(self, request, pk):
        pip = self._get_pip(pk)
        if not _can_access_record(pip, request.user):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        return Response(PIPSerializer(pip).data)

    def put(self, request, pk):
        pip = self._get_pip(pk)
        if not _can_access_record(pip, request.user):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        serializer = PIPUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(pip, field, value)
        pip.save()

        return Response(PIPSerializer(pip).data)
