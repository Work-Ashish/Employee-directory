from django.urls import path

from apps.reports.views import ReportListCreateView, ReportDetailView, ReportGenerateView

urlpatterns = [
    path('reports/', ReportListCreateView.as_view(), name='report-list-create'),
    path('reports/<uuid:pk>/', ReportDetailView.as_view(), name='report-detail'),
    path('reports/generate/', ReportGenerateView.as_view(), name='report-generate'),
]
