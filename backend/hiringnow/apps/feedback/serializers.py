from rest_framework import serializers

from apps.feedback.models import EmployeeFeedback


class FeedbackSerializer(serializers.ModelSerializer):
    """Read serializer — includes all fields plus computed employee names."""

    from_employee_name = serializers.SerializerMethodField()
    to_employee_name = serializers.SerializerMethodField()
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = EmployeeFeedback
        fields = [
            'id',
            'from_employee',
            'from_employee_name',
            'to_employee',
            'to_employee_name',
            'type',
            'type_display',
            'rating',
            'content',
            'is_anonymous',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_from_employee_name(self, obj):
        if obj.is_anonymous:
            return 'Anonymous'
        return f"{obj.from_employee.first_name} {obj.from_employee.last_name}"

    def get_to_employee_name(self, obj):
        if obj.to_employee:
            return f"{obj.to_employee.first_name} {obj.to_employee.last_name}"
        return None


class FeedbackCreateSerializer(serializers.Serializer):
    """Write serializer for creating feedback."""

    to_employee_id = serializers.UUIDField(required=False, allow_null=True)
    type = serializers.ChoiceField(choices=EmployeeFeedback.FeedbackType.choices)
    rating = serializers.IntegerField(min_value=0, max_value=5, default=0)
    content = serializers.CharField()
    is_anonymous = serializers.BooleanField(default=False)
    from_employee_id = serializers.UUIDField(required=False)

    def validate(self, attrs):
        # If type is ANONYMOUS, force is_anonymous to True
        if attrs.get('type') == EmployeeFeedback.FeedbackType.ANONYMOUS:
            attrs['is_anonymous'] = True
        return attrs

    def create(self, validated_data):
        return EmployeeFeedback.objects.create(
            from_employee_id=validated_data['from_employee_id'],
            to_employee_id=validated_data.get('to_employee_id'),
            type=validated_data['type'],
            rating=validated_data.get('rating', 0),
            content=validated_data['content'],
            is_anonymous=validated_data.get('is_anonymous', False),
        )
