from django.urls import path

from apps.teams.views import TeamListCreateView, TeamDetailView, OrgChartView

urlpatterns = [
    path('teams/', TeamListCreateView.as_view(), name='team-list-create'),
    path('teams/<uuid:pk>/', TeamDetailView.as_view(), name='team-detail'),
    path('teams/org-chart/', OrgChartView.as_view(), name='org-chart'),
]
