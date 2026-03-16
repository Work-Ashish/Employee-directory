from django.urls import path

from apps.leave.views import LeaveListCreateView, LeaveDetailView

urlpatterns = [
    path('leaves/', LeaveListCreateView.as_view(), name='leave-list-create'),
    path('leaves/<uuid:pk>/', LeaveDetailView.as_view(), name='leave-detail'),
]
