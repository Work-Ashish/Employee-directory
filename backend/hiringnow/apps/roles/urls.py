from django.urls import path

from apps.roles.views import RoleListCreateView, RoleDetailView, CapabilitiesView

urlpatterns = [
    path('roles/', RoleListCreateView.as_view(), name='role-list-create'),
    path('roles/capabilities/', CapabilitiesView.as_view(), name='role-capabilities'),
    path('roles/<uuid:pk>/', RoleDetailView.as_view(), name='role-detail'),
]
