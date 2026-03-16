from django.urls import path

from apps.departments.views import DepartmentListCreateView, DepartmentDetailView

app_name = 'departments'

urlpatterns = [
    path('departments/', DepartmentListCreateView.as_view(), name='department-list-create'),
    path('departments/<uuid:pk>/', DepartmentDetailView.as_view(), name='department-detail'),
]
