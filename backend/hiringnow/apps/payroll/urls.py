from django.urls import path

from apps.payroll.views import (
    PayrollConfigView,
    PayrollDetailView,
    PayrollListCreateView,
    PayrollRunView,
    ProvidentFundListCreateView,
)

app_name = 'payroll'

urlpatterns = [
    path('payroll/run/', PayrollRunView.as_view(), name='payroll-run'),
    path('payroll/config/', PayrollConfigView.as_view(), name='payroll-config'),
    path('payroll/pf/', ProvidentFundListCreateView.as_view(), name='pf-list-create'),
    path('payroll/<uuid:payroll_id>/', PayrollDetailView.as_view(), name='payroll-detail'),
    path('payroll/', PayrollListCreateView.as_view(), name='payroll-list-create'),
]
