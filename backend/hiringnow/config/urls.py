# root URL configuration for health, admin, and API v1
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from config.views import health

urlpatterns = [
    path('health/', health),
    path('admin/', admin.site.urls),
    # API docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    # API v1
    path('api/v1/', include('apps.users.urls')),
    path('api/v1/', include('apps.rbac.urls')),
    path('api/v1/', include('apps.features.urls')),
    path('api/v1/', include('apps.employees.urls')),
    path('api/v1/', include('apps.departments.urls')),
    path('api/v1/', include('apps.dashboard.urls')),
    path('api/v1/', include('apps.attendance.urls')),
    path('api/v1/', include('apps.leave.urls')),
    path('api/v1/', include('apps.payroll.urls')),
    path('api/v1/', include('apps.teams.urls')),
    path('api/v1/', include('apps.performance.urls')),
    path('api/v1/', include('apps.training.urls')),
    path('api/v1/', include('apps.assets.urls')),
    path('api/v1/', include('apps.documents.urls')),
    path('api/v1/', include('apps.tickets.urls')),
    path('api/v1/', include('apps.announcements.urls')),
    path('api/v1/', include('apps.reimbursements.urls')),
    path('api/v1/', include('apps.resignations.urls')),
    path('api/v1/', include('apps.feedback.urls')),
    path('api/v1/', include('apps.events.urls')),
    path('api/v1/', include('apps.notifications.urls')),
    path('api/v1/', include('apps.reports.urls')),
    path('api/v1/', include('apps.roles.urls')),
    path('api/v1/', include('apps.sessions.urls')),
    path('api/v1/', include('apps.timetracker.urls')),
    path('api/v1/', include('apps.audit.urls')),
]
