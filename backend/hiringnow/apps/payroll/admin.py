from django.contrib import admin

from apps.payroll.models import (
    Payroll,
    PayrollComplianceConfig,
    ProvidentFund,
)


@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = ['employee', 'month', 'net_salary', 'status', 'is_finalized', 'created_at']
    list_filter = ['status', 'is_finalized', 'month']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_code']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(ProvidentFund)
class ProvidentFundAdmin(admin.ModelAdmin):
    list_display = ['employee', 'month', 'total_contribution', 'status', 'created_at']
    list_filter = ['status', 'month']
    search_fields = ['employee__first_name', 'employee__last_name', 'account_number']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(PayrollComplianceConfig)
class PayrollComplianceConfigAdmin(admin.ModelAdmin):
    list_display = ['regime_name', 'pf_percentage', 'standard_deduction', 'health_cess', 'is_active']
    list_filter = ['is_active']
    readonly_fields = ['id', 'created_at', 'updated_at']
