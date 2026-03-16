from django.urls import path

from apps.feedback.views import FeedbackListCreateView, FeedbackDetailView

urlpatterns = [
    path('feedback/', FeedbackListCreateView.as_view(), name='feedback-list-create'),
    path('feedback/<uuid:pk>/', FeedbackDetailView.as_view(), name='feedback-detail'),
]
