from django.urls import path

from apps.performance.views import (
    PerformanceReviewListCreateView,
    PerformanceReviewDetailView,
    PerformanceTemplateListCreateView,
    PerformanceTemplateDetailView,
    PerformanceMetricsView,
    ReviewCycleListCreateView,
    MonthlyReviewListCreateView,
    MonthlyReviewDetailView,
    MonthlyReviewSignView,
    AppraisalListCreateView,
    AppraisalDetailView,
    AppraisalEligibilityView,
    PIPListCreateView,
    PIPDetailView,
)

urlpatterns = [
    # Existing endpoints
    path('performance/reviews/', PerformanceReviewListCreateView.as_view(), name='performance-review-list-create'),
    path('performance/reviews/<uuid:pk>/', PerformanceReviewDetailView.as_view(), name='performance-review-detail'),
    path('performance/templates/', PerformanceTemplateListCreateView.as_view(), name='performance-template-list-create'),
    path('performance/templates/<uuid:pk>/', PerformanceTemplateDetailView.as_view(), name='performance-template-detail'),
    path('performance/metrics/', PerformanceMetricsView.as_view(), name='performance-metrics'),

    # Source One evaluation endpoints
    path('performance/cycles/', ReviewCycleListCreateView.as_view(), name='review-cycle-list-create'),
    path('performance/monthly/', MonthlyReviewListCreateView.as_view(), name='monthly-review-list-create'),
    path('performance/monthly/<uuid:pk>/', MonthlyReviewDetailView.as_view(), name='monthly-review-detail'),
    path('performance/monthly/<uuid:pk>/sign/', MonthlyReviewSignView.as_view(), name='monthly-review-sign'),
    path('performance/appraisals/', AppraisalListCreateView.as_view(), name='appraisal-list-create'),
    path('performance/appraisals/eligibility/', AppraisalEligibilityView.as_view(), name='appraisal-eligibility'),
    path('performance/appraisals/<uuid:pk>/', AppraisalDetailView.as_view(), name='appraisal-detail'),
    path('performance/pip/', PIPListCreateView.as_view(), name='pip-list-create'),
    path('performance/pip/<uuid:pk>/', PIPDetailView.as_view(), name='pip-detail'),
]
