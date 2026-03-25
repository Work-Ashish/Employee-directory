from django.urls import path
from apps.audit import views

app_name = 'audit'

urlpatterns = [
    path('audit-logs/', views.AuditLogListView.as_view(), name='audit-log-list'),
    path('audit-logs/create/', views.AuditLogCreateView.as_view(), name='audit-log-create'),
]
