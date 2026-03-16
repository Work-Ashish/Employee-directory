from rest_framework import serializers

from apps.performance.models import (
    PerformanceReview,
    PerformanceTemplate,
    PerformanceMetrics,
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
