from django.urls import path

from apps.teams.views import (
    TeamListCreateView, TeamDetailView, TeamMemberView,
    OrgChartView, SyncTeamsFromHierarchyView,
)

urlpatterns = [
    path('teams/', TeamListCreateView.as_view(), name='team-list-create'),
    path('teams/org-chart/', OrgChartView.as_view(), name='org-chart'),
    path('teams/sync-from-hierarchy/', SyncTeamsFromHierarchyView.as_view(), name='sync-teams-hierarchy'),
    path('teams/<uuid:pk>/', TeamDetailView.as_view(), name='team-detail'),
    path('teams/<uuid:pk>/members/', TeamMemberView.as_view(), name='team-members'),
]
