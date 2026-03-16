from django.urls import path

from apps.attendance.views import (
    AttendanceDetailView,
    AttendanceListCreateView,
    AttendancePolicyView,
    HolidayListCreateView,
    RegularizationListCreateView,
    ShiftAssignView,
    ShiftListCreateView,
    TimeSessionListView,
)

app_name = 'attendance'

urlpatterns = [
    # Attendance CRUD
    path('attendance/', AttendanceListCreateView.as_view(), name='attendance-list-create'),
    path('attendance/<uuid:attendance_id>/', AttendanceDetailView.as_view(), name='attendance-detail'),

    # Shifts
    path('attendance/shifts/', ShiftListCreateView.as_view(), name='shift-list-create'),
    path('attendance/shifts/assign/', ShiftAssignView.as_view(), name='shift-assign'),

    # Policy
    path('attendance/policy/', AttendancePolicyView.as_view(), name='attendance-policy'),

    # Holidays
    path('attendance/holidays/', HolidayListCreateView.as_view(), name='holiday-list-create'),

    # Regularization
    path('attendance/regularization/', RegularizationListCreateView.as_view(), name='regularization-list-create'),

    # Time Sessions
    path('attendance/time-sessions/', TimeSessionListView.as_view(), name='time-session-list'),
]
