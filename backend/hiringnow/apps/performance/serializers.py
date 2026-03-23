from rest_framework import serializers

from apps.performance.models import (
    PerformanceReview,
    PerformanceTemplate,
    PerformanceMetrics,
    ReviewCycle,
    MonthlyReview,
    Appraisal,
    PIP,
)


# -- Performance Review Serializers --------------------------------------------

class PerformanceReviewSerializer(serializers.ModelSerializer):
    """Read serializer — includes all fields plus computed names."""

    employee_name = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = PerformanceReview
        fields = [
            'id',
            'employee',
            'employee_name',
            'reviewer',
            'reviewer_name',
            'template',
            'period',
            'overall_score',
            'strengths',
            'improvements',
            'goals',
            'status',
            'status_display',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"

    def get_reviewer_name(self, obj):
        if obj.reviewer:
            return f"{obj.reviewer.first_name} {obj.reviewer.last_name}"
        return None


class PerformanceReviewCreateSerializer(serializers.Serializer):
    """Write serializer for creating a performance review."""

    employee_id = serializers.UUIDField()
    reviewer_id = serializers.UUIDField(required=False, allow_null=True)
    template_id = serializers.UUIDField(required=False, allow_null=True)
    period = serializers.CharField(max_length=50)
    overall_score = serializers.DecimalField(
        max_digits=4, decimal_places=2, required=False, allow_null=True,
    )
    strengths = serializers.CharField(required=False, allow_blank=True, default='')
    improvements = serializers.CharField(required=False, allow_blank=True, default='')
    goals = serializers.CharField(required=False, allow_blank=True, default='')

    def create(self, validated_data):
        return PerformanceReview.objects.create(
            employee_id=validated_data['employee_id'],
            reviewer_id=validated_data.get('reviewer_id'),
            template_id=validated_data.get('template_id'),
            period=validated_data['period'],
            overall_score=validated_data.get('overall_score'),
            strengths=validated_data.get('strengths', ''),
            improvements=validated_data.get('improvements', ''),
            goals=validated_data.get('goals', ''),
            status=PerformanceReview.Status.DRAFT,
        )


class PerformanceReviewUpdateSerializer(serializers.Serializer):
    """Write serializer for updating a performance review."""

    overall_score = serializers.DecimalField(
        max_digits=4, decimal_places=2, required=False, allow_null=True,
    )
    strengths = serializers.CharField(required=False, allow_blank=True)
    improvements = serializers.CharField(required=False, allow_blank=True)
    goals = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=PerformanceReview.Status.choices, required=False,
    )


# -- Performance Template Serializers -----------------------------------------

class PerformanceTemplateSerializer(serializers.ModelSerializer):
    """Read serializer for performance templates."""

    class Meta:
        model = PerformanceTemplate
        fields = [
            'id',
            'name',
            'description',
            'criteria',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class PerformanceTemplateCreateSerializer(serializers.Serializer):
    """Write serializer for creating/updating a performance template."""

    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    criteria = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    is_active = serializers.BooleanField(required=False, default=True)

    def create(self, validated_data):
        return PerformanceTemplate.objects.create(**validated_data)


# -- Performance Metrics Serializers -------------------------------------------

class PerformanceMetricsSerializer(serializers.ModelSerializer):
    """Read serializer for performance metrics."""

    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = PerformanceMetrics
        fields = [
            'id',
            'employee',
            'employee_name',
            'period',
            'task_completion_rate',
            'attendance_score',
            'collaboration_score',
            'quality_score',
            'overall_score',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"


# ── Source One: Review Cycle Serializers ─────────────────────────────────

class ReviewCycleSerializer(serializers.ModelSerializer):
    cycle_type_display = serializers.CharField(source='get_cycle_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ReviewCycle
        fields = [
            'id', 'cycle_type', 'cycle_type_display', 'period_label',
            'period_start', 'period_end', 'financial_year',
            'status', 'status_display', 'created_at', 'updated_at',
        ]
        read_only_fields = fields


class ReviewCycleCreateSerializer(serializers.Serializer):
    cycle_type = serializers.ChoiceField(choices=ReviewCycle.CycleType.choices)
    period_label = serializers.CharField(max_length=100)
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    financial_year = serializers.CharField(max_length=10)

    def create(self, validated_data):
        return ReviewCycle.objects.create(**validated_data)


# ── Source One: Monthly Review Serializers ────────────────────────────────

class MonthlyReviewSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()
    rating_category_display = serializers.CharField(source='get_rating_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    alert_type_display = serializers.CharField(source='get_appreciation_or_alert_display', read_only=True)

    class Meta:
        model = MonthlyReview
        fields = [
            'id', 'cycle', 'employee', 'employee_name',
            'reviewer', 'reviewer_name', 'reporting_manager', 'manager_name',
            'review_month', 'review_year',
            'recruiter_metrics', 'team_lead_metrics',
            'rating', 'rating_category', 'rating_category_display', 'score_percentage',
            'reviewer_remarks', 'strengths_observed', 'areas_for_improvement',
            'action_items', 'appreciation_or_alert', 'alert_type_display',
            'employee_signed_at', 'manager_signed_at', 'hr_signed_at',
            'status', 'status_display', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"

    def get_reviewer_name(self, obj):
        if obj.reviewer:
            return f"{obj.reviewer.first_name} {obj.reviewer.last_name}"
        return None

    def get_manager_name(self, obj):
        if obj.reporting_manager:
            return f"{obj.reporting_manager.first_name} {obj.reporting_manager.last_name}"
        return None


class MonthlyReviewCreateSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField()
    reviewer_id = serializers.UUIDField(required=False, allow_null=True)
    reporting_manager_id = serializers.UUIDField(required=False, allow_null=True)
    cycle_id = serializers.UUIDField(required=False, allow_null=True)
    review_month = serializers.IntegerField(min_value=1, max_value=12)
    review_year = serializers.IntegerField()
    recruiter_metrics = serializers.ListField(child=serializers.DictField(), default=list)
    team_lead_metrics = serializers.ListField(child=serializers.DictField(), required=False, default=list)

    def create(self, validated_data):
        return MonthlyReview.objects.create(**validated_data)


class MonthlyReviewUpdateSerializer(serializers.Serializer):
    recruiter_metrics = serializers.ListField(child=serializers.DictField(), required=False)
    team_lead_metrics = serializers.ListField(child=serializers.DictField(), required=False)
    rating = serializers.IntegerField(min_value=1, max_value=5, required=False)
    rating_category = serializers.ChoiceField(choices=MonthlyReview.RatingCategory.choices, required=False)
    score_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    reviewer_remarks = serializers.CharField(required=False, allow_blank=True)
    strengths_observed = serializers.CharField(required=False, allow_blank=True)
    areas_for_improvement = serializers.CharField(required=False, allow_blank=True)
    action_items = serializers.CharField(required=False, allow_blank=True)
    appreciation_or_alert = serializers.ChoiceField(choices=MonthlyReview.AlertType.choices, required=False)
    status = serializers.ChoiceField(choices=MonthlyReview.Status.choices, required=False)


# ── Source One: Appraisal Serializers ────────────────────────────────────

class AppraisalSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()
    hr_reviewer_name = serializers.SerializerMethodField()
    review_type_display = serializers.CharField(source='get_review_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    outcome_display = serializers.CharField(source='get_outcome_decision_display', read_only=True)

    class Meta:
        model = Appraisal
        fields = [
            'id', 'cycle', 'employee', 'employee_name',
            'reporting_manager', 'manager_name', 'hr_reviewer', 'hr_reviewer_name',
            'review_type', 'review_type_display', 'review_period', 'financial_year',
            'monthly_summary', 'conversion_kpis',
            'recruiter_competencies', 'team_lead_competencies',
            'self_assessment',
            'overall_rating', 'final_rating_category',
            'key_strengths', 'development_areas', 'goals_next_period',
            'training_recommended', 'promotion_recommendation',
            'salary_revision_recommendation', 'outcome_decision', 'outcome_display',
            'additional_hr_remarks',
            'employee_signed_at', 'manager_signed_at', 'hr_signed_at',
            'is_eligible', 'eligibility_reason',
            'status', 'status_display', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"

    def get_manager_name(self, obj):
        if obj.reporting_manager:
            return f"{obj.reporting_manager.first_name} {obj.reporting_manager.last_name}"
        return None

    def get_hr_reviewer_name(self, obj):
        if obj.hr_reviewer:
            return f"{obj.hr_reviewer.first_name} {obj.hr_reviewer.last_name}"
        return None


class AppraisalCreateSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField()
    reporting_manager_id = serializers.UUIDField(required=False, allow_null=True)
    hr_reviewer_id = serializers.UUIDField(required=False, allow_null=True)
    cycle_id = serializers.UUIDField(required=False, allow_null=True)
    review_type = serializers.ChoiceField(choices=Appraisal.ReviewType.choices)
    review_period = serializers.CharField(max_length=100)
    financial_year = serializers.CharField(max_length=10)
    monthly_summary = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    conversion_kpis = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    recruiter_competencies = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    team_lead_competencies = serializers.ListField(child=serializers.DictField(), required=False, default=list)

    def create(self, validated_data):
        return Appraisal.objects.create(**validated_data)


class AppraisalUpdateSerializer(serializers.Serializer):
    monthly_summary = serializers.ListField(child=serializers.DictField(), required=False)
    conversion_kpis = serializers.ListField(child=serializers.DictField(), required=False)
    recruiter_competencies = serializers.ListField(child=serializers.DictField(), required=False)
    team_lead_competencies = serializers.ListField(child=serializers.DictField(), required=False)
    self_assessment = serializers.DictField(required=False)
    overall_rating = serializers.IntegerField(min_value=1, max_value=5, required=False)
    final_rating_category = serializers.ChoiceField(choices=Appraisal.RatingCategory.choices, required=False)
    key_strengths = serializers.CharField(required=False, allow_blank=True)
    development_areas = serializers.CharField(required=False, allow_blank=True)
    goals_next_period = serializers.CharField(required=False, allow_blank=True)
    training_recommended = serializers.CharField(required=False, allow_blank=True)
    promotion_recommendation = serializers.CharField(required=False, allow_blank=True)
    salary_revision_recommendation = serializers.CharField(required=False, allow_blank=True)
    outcome_decision = serializers.ChoiceField(choices=Appraisal.OutcomeDecision.choices, required=False)
    additional_hr_remarks = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=Appraisal.Status.choices, required=False)


# ── Source One: PIP Serializers ──────────────────────────────────────────

class PIPSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    pip_type_display = serializers.CharField(source='get_pip_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = PIP
        fields = [
            'id', 'employee', 'employee_name',
            'triggered_by_monthly', 'triggered_by_appraisal',
            'pip_type', 'pip_type_display',
            'start_date', 'end_date', 'specific_targets', 'weekly_checkins',
            'status', 'status_display', 'outcome',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"


class PIPCreateSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField()
    triggered_by_monthly_id = serializers.UUIDField(required=False, allow_null=True)
    triggered_by_appraisal_id = serializers.UUIDField(required=False, allow_null=True)
    pip_type = serializers.ChoiceField(choices=PIP.PIPType.choices)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    specific_targets = serializers.ListField(child=serializers.DictField(), required=False, default=list)

    def create(self, validated_data):
        return PIP.objects.create(**validated_data)


class PIPUpdateSerializer(serializers.Serializer):
    weekly_checkins = serializers.ListField(child=serializers.DictField(), required=False)
    specific_targets = serializers.ListField(child=serializers.DictField(), required=False)
    status = serializers.ChoiceField(choices=PIP.Status.choices, required=False)
    outcome = serializers.CharField(required=False, allow_blank=True)
