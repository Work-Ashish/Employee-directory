from django.urls import path

from apps.events.views import EventListCreateView, EventDetailView

urlpatterns = [
    path('events/', EventListCreateView.as_view(), name='event-list-create'),
    path('events/<uuid:pk>/', EventDetailView.as_view(), name='event-detail'),
]
