from rest_framework import serializers

from apps.payroll.models import (
    Payroll,
    PayrollAudit,
    PayrollComplianceConfig,
    ProvidentFund,
    TaxSlab,
)


# ── Tax Slab (nested) ───────────────────────────────────────────────

class TaxSlabSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxSlab
        fields = [
            'id', 'min_income', 'max_income', 'tax_rate', 'base_tax',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ── Payroll — read ───────────────────────────────────────────────────

class PayrollSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = Payroll
        fields = [
            'id', 'employee', 'employee_name', 'month',
            'basic_salary', 'allowances', 'arrears', 'reimbursements',
            'pf_deduction', 'tax', 'other_deductions', 'loans_advances',
            'net_salary', 'status', 'is_finalized', 'pdf_url',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_employee_name(self, obj):
        emp = obj.employee
        return f"{emp.first_name} {emp.last_name}"


# ── Payroll — create ────────────────────────────────────────────────

class PayrollCreateSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField()
    month = serializers.CharField(max_length=7)
    basic_salary = serializers.DecimalField(max_digits=12, decimal_places=2)
    allowances = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    arrears = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    reimbursements = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    pf_deduction = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_deductions = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    loans_advances = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_salary = serializers.DecimalField(max_digits=12, decimal_places=2)
    status = serializers.ChoiceField(
        choices=Payroll.Status.choices,
        default=Payroll.Status.PENDING,
    )

    def validate(self, attrs):
        employee_id = attrs.get('employee_id')
        month = attrs.get('month')
        if Payroll.objects.filter(employee_id=employee_id, month=month).exists():
            raise serializers.ValidationError(
                {'month': f'A payroll record already exists for this employee in {month}.'}
            )
        return attrs


# ── Payroll Run — write ──────────────────────────────────────────────

class PayrollRunSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField()
    month = serializers.CharField(max_length=7)
    basic_salary = serializers.DecimalField(max_digits=12, decimal_places=2)
    allowances = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    arrears = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    reimbursements = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    loans_advances = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_deductions = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)


# ── Provident Fund ───────────────────────────────────────────────────

class ProvidentFundSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = ProvidentFund
        fields = [
            'id', 'employee', 'employee_name', 'month',
            'account_number', 'basic_salary',
            'employee_contribution', 'employer_contribution',
            'total_contribution', 'status',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_employee_name(self, obj):
        emp = obj.employee
        return f"{emp.first_name} {emp.last_name}"


# ── Compliance Config — read ─────────────────────────────────────────

class PayrollConfigSerializer(serializers.ModelSerializer):
    tax_slabs = TaxSlabSerializer(many=True, read_only=True)

    class Meta:
        model = PayrollComplianceConfig
        fields = [
            'id', 'regime_name', 'pf_percentage',
            'standard_deduction', 'health_cess', 'is_active',
            'tax_slabs',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ── Compliance Config — create ───────────────────────────────────────

class TaxSlabWriteSerializer(serializers.Serializer):
    min_income = serializers.FloatField()
    max_income = serializers.FloatField(required=False, allow_null=True)
    tax_rate = serializers.FloatField()
    base_tax = serializers.FloatField(default=0)


class PayrollConfigCreateSerializer(serializers.Serializer):
    regime_name = serializers.CharField(max_length=100, default='DEFAULT')
    pf_percentage = serializers.FloatField(default=12.0)
    standard_deduction = serializers.FloatField(default=50000.0)
    health_cess = serializers.FloatField(default=4.0)
    is_active = serializers.BooleanField(default=True)
    tax_slabs = TaxSlabWriteSerializer(many=True, required=False, default=[])


# ── Payroll Audit — read ─────────────────────────────────────────────

class PayrollAuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollAudit
        fields = [
            'id', 'payroll', 'action', 'actor_id', 'details',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
