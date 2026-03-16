from django.urls import path

from apps.tickets.views import TicketListCreateView, TicketDetailView

urlpatterns = [
    path('tickets/', TicketListCreateView.as_view(), name='ticket-list-create'),
    path('tickets/<uuid:pk>/', TicketDetailView.as_view(), name='ticket-detail'),
]
