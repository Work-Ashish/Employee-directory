from django.urls import path

from .views import (
    PermissionListView,
    RoleListCreateView,
    RoleDetailView,
    RolePermissionsView,
    UserRolesView,
)

app_name = "rbac"

urlpatterns = [
    path("permissions/", PermissionListView.as_view(), name="permissions-list"),
    path("rbac/roles/", RoleListCreateView.as_view(), name="role-list-create"),
    path("rbac/roles/<uuid:pk>/", RoleDetailView.as_view(), name="role-detail"),
    path("rbac/roles/<uuid:pk>/permissions/", RolePermissionsView.as_view(), name="role-permissions"),
    path("users/<uuid:user_id>/roles/", UserRolesView.as_view(), name="user-roles"),
]