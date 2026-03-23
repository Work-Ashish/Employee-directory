from django.urls import path, include

from apps.users.views import UserListCreateView, UserDetailView, AdminResetPasswordView

app_name = 'users'

urlpatterns = [
    path('auth/', include('apps.users.auth_urls')),
    path('users/', UserListCreateView.as_view(), name='user-list-create'),
    path('users/<uuid:user_id>/', UserDetailView.as_view(), name='user-detail'),
    path('users/<uuid:user_id>/reset-password/', AdminResetPasswordView.as_view(), name='user-reset-password'),
]
