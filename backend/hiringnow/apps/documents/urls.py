from django.urls import path

from apps.documents.views import DocumentListCreateView, DocumentDetailView, MyDocumentsView

urlpatterns = [
    path('documents/my/', MyDocumentsView.as_view(), name='my-documents'),
    path('documents/', DocumentListCreateView.as_view(), name='document-list-create'),
    path('documents/<uuid:pk>/', DocumentDetailView.as_view(), name='document-detail'),
]
