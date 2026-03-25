from django.urls import path

from apps.workflows.views import (
    WorkflowTemplateListCreateView,
    WorkflowTemplateDetailView,
    WorkflowInstanceListCreateView,
    WorkflowInstanceDetailView,
    WorkflowInstanceActionView,
)

urlpatterns = [
    path('workflows/templates/', WorkflowTemplateListCreateView.as_view(), name='workflow-template-list'),
    path('workflows/templates/<uuid:pk>/', WorkflowTemplateDetailView.as_view(), name='workflow-template-detail'),
    path('workflows/instances/', WorkflowInstanceListCreateView.as_view(), name='workflow-instance-list'),
    path('workflows/instances/<uuid:pk>/', WorkflowInstanceDetailView.as_view(), name='workflow-instance-detail'),
    path('workflows/instances/<uuid:pk>/action/', WorkflowInstanceActionView.as_view(), name='workflow-instance-action'),
]
