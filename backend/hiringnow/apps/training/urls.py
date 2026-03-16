from django.urls import path

from apps.training.views import (
    TrainingListCreateView,
    TrainingDetailView,
    TrainingEnrollView,
)

urlpatterns = [
    path('training/', TrainingListCreateView.as_view(), name='training-list-create'),
    path('training/<uuid:pk>/', TrainingDetailView.as_view(), name='training-detail'),
    path('training/<uuid:pk>/enroll/', TrainingEnrollView.as_view(), name='training-enroll'),
]
