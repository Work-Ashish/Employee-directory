from django.urls import path

from apps.sessions.views import SessionListView, SessionTerminateView

urlpatterns = [
    path('sessions/', SessionListView.as_view(), name='session-list'),
    path('sessions/<uuid:pk>/', SessionTerminateView.as_view(), name='session-terminate'),
]
