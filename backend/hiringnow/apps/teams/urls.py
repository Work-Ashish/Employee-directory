from django.urls import path

from apps.teams.views import TeamListCreateView, TeamDetailView, TeamMemberView, OrgChartView

urlpatterns = [
    path('teams/', TeamListCreateView.as_view(), name='team-list-create'),
    path('teams/org-chart/', OrgChartView.as_view(), name='org-chart'),
    path('teams/<uuid:pk>/', TeamDetailView.as_view(), name='team-detail'),
    path('teams/<uuid:pk>/members/', TeamMemberView.as_view(), name='team-members'),
]
