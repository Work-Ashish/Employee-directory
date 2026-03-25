from rest_framework import serializers

from apps.resignations.models import Resignation


class ResignationSerializer(serializers.ModelSerializer):
    """Read serializer — includes all fields plus computed employee name."""

    employee_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    approved_by_name = serializers.SerializerMethodField()
    workflow_status = serializers.SerializerMethodField()

    class Meta:
        model = Resignation
        fields = [
            'id',
            'employee',
            'employee_name',
            'reason',
            'last_working_date',
            'status',
            'status_display',
            'approved_by',
            'approved_by_name',
            'workflow_status',
            'submitted_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return f"{obj.approved_by.first_name} {obj.approved_by.last_name}"
        return None

    def get_workflow_status(self, obj):
        from apps.workflows.services import get_workflow_status
        instance = get_workflow_status('RESIGNATION', str(obj.id))
        if instance:
            return {
                'instance_id': str(instance.id),
                'status': instance.status,
                'current_step': instance.current_step,
                'total_steps': instance.template.steps.count(),
            }
        return None


class ResignationCreateSerializer(serializers.Serializer):
    """Write serializer for submitting a resignation request."""

    reason = serializers.CharField()
    last_working_date = serializers.DateField()
    employee_id = serializers.UUIDField(required=False)

    def create(self, validated_data):
        return Resignation.objects.create(
            employee_id=validated_data['employee_id'],
            reason=validated_data['reason'],
            last_working_date=validated_data['last_working_date'],
            status=Resignation.Status.PENDING,
        )


class ResignationUpdateSerializer(serializers.Serializer):
    """Write serializer for approving, rejecting, or withdrawing a resignation."""

    status = serializers.ChoiceField(
        choices=[
            Resignation.Status.APPROVED,
            Resignation.Status.REJECTED,
            Resignation.Status.WITHDRAWN,
        ],
    )
