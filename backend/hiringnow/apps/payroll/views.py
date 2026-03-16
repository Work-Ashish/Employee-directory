from decimal import Decimal

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.employees.models import Employee
from apps.payroll.engine import (
    calculate_dynamic_tax,
    calculate_net_salary,
    calculate_pf_contributions,
)
from apps.payroll.models import (
    Payroll,
    PayrollAudit,
    PayrollComplianceConfig,
    ProvidentFund,
    TaxSlab,
)
from apps.payroll.serializers import (
    PayrollConfigCreateSerializer,
    PayrollConfigSerializer,
    PayrollCreateSerializer,
    PayrollRunSerializer,
    PayrollSerializer,
    ProvidentFundSerializer,
)


# ── Payroll List / Create ────────────────────────────────────────────

class PayrollListCreateView(APIView):
    """
    GET  /payroll/       — list payroll records (filterable by month, employee_id)
    POST /payroll/       — create a payroll record manually
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('payroll.manage')]
        return [IsAuthenticated(), HasPermission('payroll.view')]

    def get(self, request):
        qs = Payroll.objects.select_related('employee').order_by('-created_at')

        # Tenant admin sees all; non-admin sees only own payroll
        user = request.user
        if not _is_admin(user):
            qs = qs.filter(employee__user=user)

        # Filters
        month = request.query_params.get('month')
        employee_id = request.query_params.get('employee_id')
        if month:
            qs = qs.filter(month=month)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)

        # Pagination
        try:
            page = max(int(request.query_params.get('page', 1)), 1)
            limit = min(int(request.query_params.get('limit', 50)), 100)
        except (TypeError, ValueError):
            page, limit = 1, 50

        total = qs.count()
        start = (page - 1) * limit
        page_qs = qs[start:start + limit]

        return Response({
            'results': PayrollSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit,
        })

    def post(self, request):
        serializer = PayrollCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        employee = get_object_or_404(Employee, pk=data['employee_id'])

        payroll = Payroll.objects.create(
            employee=employee,
            month=data['month'],
            basic_salary=data['basic_salary'],
            allowances=data.get('allowances', 0),
            arrears=data.get('arrears', 0),
            reimbursements=data.get('reimbursements', 0),
            pf_deduction=data.get('pf_deduction', 0),
            tax=data.get('tax', 0),
            other_deductions=data.get('other_deductions', 0),
            loans_advances=data.get('loans_advances', 0),
            net_salary=data['net_salary'],
            status=data.get('status', Payroll.Status.PENDING),
        )

        return Response(
            PayrollSerializer(payroll).data,
            status=status.HTTP_201_CREATED,
        )


# ── Payroll Detail / Update ──────────────────────────────────────────

class PayrollDetailView(APIView):
    """
    GET /payroll/{id}/   — retrieve single payroll
    PUT /payroll/{id}/   — finalize or manually override a payroll
        action="FINALIZE"       — mark as processed & finalized
        action="MANUAL_OVERRIDE" — update salary components & recalculate
    """

    def get_permissions(self):
        if self.request.method == 'PUT':
            return [IsAuthenticated(), HasPermission('payroll.manage')]
        return [IsAuthenticated(), HasPermission('payroll.view')]

    def get(self, request, payroll_id):
        payroll = get_object_or_404(
            Payroll.objects.select_related('employee'),
            pk=payroll_id,
        )
        return Response(PayrollSerializer(payroll).data)

    def put(self, request, payroll_id):
        payroll = get_object_or_404(
            Payroll.objects.select_related('employee'),
            pk=payroll_id,
        )

        action = request.data.get('action')

        if payroll.is_finalized:
            return Response(
                {'detail': 'This payroll has already been finalized and cannot be modified.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == 'FINALIZE':
            return self._finalize(request, payroll)
        elif action == 'MANUAL_OVERRIDE':
            return self._manual_override(request, payroll)
        else:
            return Response(
                {'detail': 'Invalid action. Expected FINALIZE or MANUAL_OVERRIDE.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # ── private helpers ──────────────────────────────────────────────

    def _finalize(self, request, payroll):
        with transaction.atomic():
            payroll.is_finalized = True
            payroll.status = Payroll.Status.PROCESSED
            payroll.save(update_fields=['is_finalized', 'status', 'updated_at'])

            PayrollAudit.objects.create(
                payroll=payroll,
                action=PayrollAudit.Action.FINALIZED,
                actor_id=request.user.id,
                details={'status': 'PROCESSED', 'is_finalized': True},
            )

        return Response(PayrollSerializer(payroll).data)

    def _manual_override(self, request, payroll):
        updatable_fields = [
            'basic_salary', 'allowances', 'arrears', 'reimbursements',
            'pf_deduction', 'tax', 'other_deductions', 'loans_advances',
        ]
        changes = {}

        with transaction.atomic():
            for field in updatable_fields:
                if field in request.data:
                    old_val = str(getattr(payroll, field))
                    new_val = request.data[field]
                    setattr(payroll, field, new_val)
                    changes[field] = {'old': old_val, 'new': str(new_val)}

            # Recalculate net salary
            payroll.net_salary = calculate_net_salary(
                basic_salary=payroll.basic_salary,
                allowances=payroll.allowances,
                arrears=payroll.arrears,
                reimbursements=payroll.reimbursements,
                pf_deduction=payroll.pf_deduction,
                tax=payroll.tax,
                other_ded=payroll.other_deductions,
                loans_advances=payroll.loans_advances,
            )
            payroll.save()

            PayrollAudit.objects.create(
                payroll=payroll,
                action=PayrollAudit.Action.MANUAL_OVERRIDE,
                actor_id=request.user.id,
                details=changes,
            )

        return Response(PayrollSerializer(payroll).data)


# ── Payroll Run (auto-calculate) ─────────────────────────────────────

class PayrollRunView(APIView):
    """
    POST /payroll/run/   — auto-calculate PF, tax, net salary via engine
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('payroll.manage')]

    def post(self, request):
        serializer = PayrollRunSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        employee = get_object_or_404(Employee, pk=data['employee_id'])

        # Fetch active compliance config
        config = PayrollComplianceConfig.objects.filter(is_active=True).first()
        if not config:
            return Response(
                {'detail': 'No active payroll compliance configuration found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        basic = data['basic_salary']
        allowances = data.get('allowances', 0)
        arrears = data.get('arrears', 0)
        reimbursements = data.get('reimbursements', 0)
        loans_advances = data.get('loans_advances', 0)
        other_ded = data.get('other_deductions', 0)

        # PF
        pf = calculate_pf_contributions(basic, config.pf_percentage)
        pf_deduction = pf['employee_contribution']

        # Tax (annualize basic + allowances for slab calculation)
        annual = (Decimal(str(basic)) + Decimal(str(allowances))) * 12
        tax_result = calculate_dynamic_tax(float(annual), config)
        tax = tax_result['tax_amount']

        # Net salary
        net = calculate_net_salary(
            basic_salary=basic,
            allowances=allowances,
            arrears=arrears,
            reimbursements=reimbursements,
            pf_deduction=pf_deduction,
            tax=tax,
            other_ded=other_ded,
            loans_advances=loans_advances,
        )

        with transaction.atomic():
            payroll = Payroll.objects.create(
                employee=employee,
                month=data['month'],
                basic_salary=basic,
                allowances=allowances,
                arrears=arrears,
                reimbursements=reimbursements,
                pf_deduction=pf_deduction,
                tax=tax,
                other_deductions=other_ded,
                loans_advances=loans_advances,
                net_salary=net,
                status=Payroll.Status.PENDING,
            )

            PayrollAudit.objects.create(
                payroll=payroll,
                action=PayrollAudit.Action.RUN_CALCULATION,
                actor_id=request.user.id,
                details={
                    'pf': {
                        'employee': str(pf['employee_contribution']),
                        'employer': str(pf['employer_contribution']),
                    },
                    'tax': {
                        'monthly': str(tax),
                        'effective_rate': tax_result['effective_rate'],
                    },
                },
            )

        return Response(
            PayrollSerializer(payroll).data,
            status=status.HTTP_201_CREATED,
        )


# ── Payroll Compliance Config ────────────────────────────────────────

class PayrollConfigView(APIView):
    """
    GET  /payroll/config/   — return active compliance config with tax slabs
    POST /payroll/config/   — create new config (deactivates existing)
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('payroll.manage')]
        return [IsAuthenticated(), HasPermission('payroll.view')]

    def get(self, request):
        config = PayrollComplianceConfig.objects.filter(is_active=True).first()
        if not config:
            return Response({})
        return Response(PayrollConfigSerializer(config).data)

    def post(self, request):
        serializer = PayrollConfigCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        tax_slabs_data = data.pop('tax_slabs', [])

        with transaction.atomic():
            # Deactivate all existing configs
            PayrollComplianceConfig.objects.filter(is_active=True).update(is_active=False)

            config = PayrollComplianceConfig.objects.create(**data)

            for slab_data in tax_slabs_data:
                TaxSlab.objects.create(config=config, **slab_data)

        return Response(
            PayrollConfigSerializer(config).data,
            status=status.HTTP_201_CREATED,
        )


# ── Provident Fund List / Create ─────────────────────────────────────

class ProvidentFundListCreateView(APIView):
    """
    GET  /payroll/pf/   — list PF records
    POST /payroll/pf/   — create a PF record
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('payroll.manage')]
        return [IsAuthenticated(), HasPermission('payroll.view')]

    def get(self, request):
        qs = ProvidentFund.objects.select_related('employee').order_by('-created_at')

        # Non-admin sees only own records
        user = request.user
        if not _is_admin(user):
            qs = qs.filter(employee__user=user)

        # Filters
        month = request.query_params.get('month')
        employee_id = request.query_params.get('employee_id')
        if month:
            qs = qs.filter(month=month)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)

        # Pagination
        try:
            page = max(int(request.query_params.get('page', 1)), 1)
            limit = min(int(request.query_params.get('limit', 50)), 100)
        except (TypeError, ValueError):
            page, limit = 1, 50

        total = qs.count()
        start = (page - 1) * limit
        page_qs = qs[start:start + limit]

        return Response({
            'results': ProvidentFundSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit,
        })

    def post(self, request):
        serializer = ProvidentFundSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pf = serializer.save()
        return Response(
            ProvidentFundSerializer(pf).data,
            status=status.HTTP_201_CREATED,
        )


# ── Helpers ──────────────────────────────────────────────────────────

def _is_admin(user):
    """Check whether the user is a tenant admin."""
    if not user or not user.is_authenticated:
        return False
    return getattr(user, 'is_tenant_admin', False)
