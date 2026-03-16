from django.urls import path

from apps.dashboard.views import DashboardStatsView, DashboardLoginsView

app_name = 'dashboard'

urlpatterns = [
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/logins/', DashboardLoginsView.as_view(), name='dashboard-logins'),
]
