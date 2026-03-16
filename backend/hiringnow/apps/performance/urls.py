from django.urls import path

from apps.performance.views import (
    PerformanceReviewListCreateView,
    PerformanceReviewDetailView,
    PerformanceTemplateListCreateView,
    PerformanceTemplateDetailView,
    PerformanceMetricsView,
)

urlpatterns = [
    path('performance/reviews/', PerformanceReviewListCreateView.as_view(), name='performance-review-list-create'),
    path('performance/reviews/<uuid:pk>/', PerformanceReviewDetailView.as_view(), name='performance-review-detail'),
    path('performance/templates/', PerformanceTemplateListCreateView.as_view(), name='performance-template-list-create'),
    path('performance/templates/<uuid:pk>/', PerformanceTemplateDetailView.as_view(), name='performance-template-detail'),
    path('performance/metrics/', PerformanceMetricsView.as_view(), name='performance-metrics'),
]
