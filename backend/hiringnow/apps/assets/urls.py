from django.urls import path

from apps.assets.views import AssetListCreateView, AssetDetailView

urlpatterns = [
    path('assets/', AssetListCreateView.as_view(), name='asset-list-create'),
    path('assets/<uuid:pk>/', AssetDetailView.as_view(), name='asset-detail'),
]
