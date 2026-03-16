from django.urls import path

from apps.timetracker.views import (
    TimeSessionListView,
    CheckInView,
    CheckOutView,
    BreakView,
    ActivityView,
    StatusView,
)

urlpatterns = [
    path('time-tracker/', TimeSessionListView.as_view(), name='time-session-list'),
    path('time-tracker/check-in/', CheckInView.as_view(), name='time-tracker-check-in'),
    path('time-tracker/check-out/', CheckOutView.as_view(), name='time-tracker-check-out'),
    path('time-tracker/break/', BreakView.as_view(), name='time-tracker-break'),
    path('time-tracker/activity/', ActivityView.as_view(), name='time-tracker-activity'),
    path('time-tracker/status/', StatusView.as_view(), name='time-tracker-status'),
]
