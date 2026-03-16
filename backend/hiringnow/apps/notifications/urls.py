from django.urls import path

from apps.notifications.views import (
    NotificationListView,
    NotificationMarkReadView,
    AdminAlertListView,
)

urlpatterns = [
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/read/', NotificationMarkReadView.as_view(), name='notification-mark-all-read'),
    path('notifications/<uuid:pk>/read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('notifications/alerts/', AdminAlertListView.as_view(), name='admin-alert-list'),
]
