from django.urls import path

from apps.reimbursements.views import ReimbursementListCreateView, ReimbursementDetailView

urlpatterns = [
    path('reimbursements/', ReimbursementListCreateView.as_view(), name='reimbursement-list-create'),
    path('reimbursements/<uuid:pk>/', ReimbursementDetailView.as_view(), name='reimbursement-detail'),
]
