from django.urls import path

from apps.announcements.views import (
    AnnouncementListCreateView,
    AnnouncementDetailView,
    KudosListCreateView,
    KudosDetailView,
)

urlpatterns = [
    path('announcements/', AnnouncementListCreateView.as_view(), name='announcement-list-create'),
    path('announcements/<uuid:pk>/', AnnouncementDetailView.as_view(), name='announcement-detail'),
    path('kudos/', KudosListCreateView.as_view(), name='kudos-list-create'),
    path('kudos/<uuid:pk>/', KudosDetailView.as_view(), name='kudos-detail'),
]
