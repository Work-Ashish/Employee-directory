from rest_framework import serializers

from apps.reimbursements.models import Reimbursement


class ReimbursementSerializer(serializers.ModelSerializer):
    """Read serializer — includes all fields plus computed employee names."""

    employee_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Reimbursement
        fields = [
            'id',
            'employee',
            'employee_name',
            'amount',
            'category',
            'category_display',
            'description',
            'receipt_url',
            'status',
            'status_display',
            'approved_by',
            'approved_by_name',
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


class ReimbursementCreateSerializer(serializers.Serializer):
    """Write serializer for submitting a reimbursement claim."""

    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
    category = serializers.ChoiceField(choices=Reimbursement.Category.choices)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    receipt_url = serializers.URLField(max_length=500, required=False, allow_blank=True, default='')
    employee_id = serializers.UUIDField(required=False)

    def create(self, validated_data):
        return Reimbursement.objects.create(
            employee_id=validated_data['employee_id'],
            amount=validated_data['amount'],
            category=validated_data['category'],
            description=validated_data.get('description', ''),
            receipt_url=validated_data.get('receipt_url', ''),
            status=Reimbursement.Status.PENDING,
        )


class ReimbursementUpdateSerializer(serializers.Serializer):
    """Write serializer for approving or rejecting a reimbursement."""

    status = serializers.ChoiceField(
        choices=[
            Reimbursement.Status.APPROVED,
            Reimbursement.Status.REJECTED,
            Reimbursement.Status.PAID,
        ],
    )
