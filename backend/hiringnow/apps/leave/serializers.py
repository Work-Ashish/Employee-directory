from django.db.models import Q
from rest_framework import serializers

from apps.leave.models import Leave


class LeaveSerializer(serializers.ModelSerializer):
    """Read serializer — includes all fields plus computed employee name."""

    employee_name = serializers.SerializerMethodField()
    actioned_by_name = serializers.SerializerMethodField()
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Leave
        fields = [
            'id',
            'type',
            'type_display',
            'start_date',
            'end_date',
            'reason',
            'status',
            'status_display',
            'employee',
            'employee_name',
            'actioned_by',
            'actioned_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"

    def get_actioned_by_name(self, obj):
        if obj.actioned_by:
            return f"{obj.actioned_by.first_name} {obj.actioned_by.last_name}"
        return None


class LeaveCreateSerializer(serializers.Serializer):
    """Write serializer for creating a leave request."""

    type = serializers.ChoiceField(choices=Leave.LeaveType.choices)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    reason = serializers.CharField(required=False, allow_blank=True, default='')
    employee_id = serializers.UUIDField(required=False)

    def validate(self, attrs):
        start_date = attrs['start_date']
        end_date = attrs['end_date']

        if start_date > end_date:
            raise serializers.ValidationError({
                'end_date': 'end_date must be greater than or equal to start_date.',
            })

        # Resolve employee — set by the view if employee_id is not provided
        employee_id = attrs.get('employee_id')
        if not employee_id:
            return attrs

        # Check for overlapping PENDING leaves for the same employee
        overlapping = Leave.objects.filter(
            employee_id=employee_id,
            status=Leave.Status.PENDING,
        ).filter(
            Q(start_date__lte=end_date) & Q(end_date__gte=start_date),
        ).exists()

        if overlapping:
            raise serializers.ValidationError(
                'Employee already has a pending leave that overlaps with this date range.',
            )

        return attrs

    def create(self, validated_data):
        return Leave.objects.create(
            type=validated_data['type'],
            start_date=validated_data['start_date'],
            end_date=validated_data['end_date'],
            reason=validated_data.get('reason', ''),
            status=Leave.Status.PENDING,
            employee_id=validated_data['employee_id'],
        )


class LeaveUpdateSerializer(serializers.Serializer):
    """Write serializer for approving or rejecting a leave request."""

    status = serializers.ChoiceField(
        choices=[Leave.Status.APPROVED, Leave.Status.REJECTED],
    )
