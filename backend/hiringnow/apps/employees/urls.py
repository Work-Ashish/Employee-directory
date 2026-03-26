from django.urls import path

from apps.employees.views import (
    EmployeeListCreateView,
    EmployeeDetailView,
    EmployeeCredentialsView,
    EmployeeRelinkUsersView,
    EmployeeMyProfileView,
    EmploymentTypeListView,
    ManagerListView,
)

app_name = 'employees'

urlpatterns = [
    path('employment-types/', EmploymentTypeListView.as_view(), name='employment-type-list'),
    path('employees/managers/', ManagerListView.as_view(), name='manager-list'),
    path('employees/profile/', EmployeeMyProfileView.as_view(), name='employee-my-profile'),
    path('employees/relink-users/', EmployeeRelinkUsersView.as_view(), name='employee-relink-users'),
    path('employees/', EmployeeListCreateView.as_view(), name='employee-list-create'),
    path('employees/<uuid:employee_id>/', EmployeeDetailView.as_view(), name='employee-detail'),
    path('employees/<uuid:employee_id>/credentials/', EmployeeCredentialsView.as_view(), name='employee-credentials'),
]
