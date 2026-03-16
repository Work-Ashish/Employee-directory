import uuid

from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee


# ── Payroll ──────────────────────────────────────────────────────────

class Payroll(BaseModel):

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PROCESSED = 'PROCESSED', 'Processed'
        PAID = 'PAID', 'Paid'

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='payrolls',
    )

    month = models.CharField(max_length=7)  # "YYYY-MM"

    # Earnings
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    arrears = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reimbursements = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Deductions
    pf_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    loans_advances = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Computed
    net_salary = models.DecimalField(max_digits=12, decimal_places=2)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    is_finalized = models.BooleanField(default=False)
    pdf_url = models.URLField(max_length=500, null=True, blank=True)

    class Meta:
        db_table = 'payrolls'
        ordering = ['-created_at']
        unique_together = [('employee', 'month')]

    def __str__(self):
        return f"Payroll {self.month} — {self.employee}"


# ── Provident Fund ───────────────────────────────────────────────────

class ProvidentFund(BaseModel):

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='pf_records',
    )

    month = models.CharField(max_length=7)
    account_number = models.CharField(max_length=50)
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    employee_contribution = models.DecimalField(max_digits=12, decimal_places=2)
    employer_contribution = models.DecimalField(max_digits=12, decimal_places=2)
    total_contribution = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, default='Credited')

    class Meta:
        db_table = 'provident_funds'
        ordering = ['-created_at']

    def __str__(self):
        return f"PF {self.month} — {self.employee}"


# ── Compliance Configuration ─────────────────────────────────────────

class PayrollComplianceConfig(BaseModel):

    regime_name = models.CharField(max_length=100, default='DEFAULT')
    pf_percentage = models.FloatField(default=12.0)
    standard_deduction = models.FloatField(default=50000.0)
    health_cess = models.FloatField(default=4.0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'payroll_compliance_configs'

    def __str__(self):
        return f"{self.regime_name} ({'Active' if self.is_active else 'Inactive'})"


# ── Tax Slabs ────────────────────────────────────────────────────────

class TaxSlab(BaseModel):

    config = models.ForeignKey(
        PayrollComplianceConfig,
        on_delete=models.CASCADE,
        related_name='tax_slabs',
    )

    min_income = models.FloatField()
    max_income = models.FloatField(null=True, blank=True)  # null = unlimited
    tax_rate = models.FloatField()           # e.g. 0.05 for 5%
    base_tax = models.FloatField(default=0)  # precomputed tax for previous slabs

    class Meta:
        db_table = 'tax_slabs'
        ordering = ['min_income']

    def __str__(self):
        ceiling = self.max_income or 'unlimited'
        return f"Slab {self.min_income}–{ceiling} @ {self.tax_rate}"


# ── Payroll Audit Trail ──────────────────────────────────────────────

class PayrollAudit(BaseModel):

    class Action(models.TextChoices):
        RUN_CALCULATION = 'RUN_CALCULATION', 'Run Calculation'
        MANUAL_OVERRIDE = 'MANUAL_OVERRIDE', 'Manual Override'
        FINALIZED = 'FINALIZED', 'Finalized'
        LOCKED = 'LOCKED', 'Locked'

    payroll = models.ForeignKey(
        Payroll,
        on_delete=models.CASCADE,
        related_name='audits',
    )

    action = models.CharField(max_length=30, choices=Action.choices)
    actor_id = models.UUIDField()  # user who performed the action
    details = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'payroll_audits'
        ordering = ['-created_at']

    def __str__(self):
        return f"Audit {self.action} on {self.payroll}"
