from django.urls import path

from apps.resignations.views import ResignationListCreateView, ResignationDetailView

urlpatterns = [
    path('resignations/', ResignationListCreateView.as_view(), name='resignation-list-create'),
    path('resignations/<uuid:pk>/', ResignationDetailView.as_view(), name='resignation-detail'),
]
