from django.urls import path

from apps.agent.views import (
    AgentDashboardView,
    AgentDeviceListView,
    AgentCommandView,
    AgentRegisterView,
    AgentHeartbeatView,
    AgentIngestView,
    AgentPollCommandsView,
    AgentScreenshotUploadView,
    AgentDailyReportView,
)

urlpatterns = [
    # Admin endpoints (called by frontend dashboard)
    path('admin/agent/dashboard/', AgentDashboardView.as_view(), name='agent-dashboard'),
    path('admin/agent/devices/', AgentDeviceListView.as_view(), name='agent-devices'),
    path('admin/agent/command/', AgentCommandView.as_view(), name='agent-command'),
    # Agent endpoints (called by desktop agent)
    path('agent/register/', AgentRegisterView.as_view(), name='agent-register'),
    path('agent/heartbeat/', AgentHeartbeatView.as_view(), name='agent-heartbeat'),
    path('agent/ingest/', AgentIngestView.as_view(), name='agent-ingest'),
    path('agent/commands/', AgentPollCommandsView.as_view(), name='agent-poll-commands'),
    path('agent/screenshot/upload/', AgentScreenshotUploadView.as_view(), name='agent-screenshot-upload'),
    # Employee endpoints
    path('agent/daily-report/', AgentDailyReportView.as_view(), name='agent-daily-report'),
]
