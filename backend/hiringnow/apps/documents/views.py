from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.documents.models import Document
from apps.documents.serializers import (
    DocumentSerializer,
    DocumentCreateSerializer,
)


# -- Document List / Create ---------------------------------------------------

class DocumentListCreateView(APIView):
    """
    GET  /documents/  -- list documents (admin sees all; others see own + public)
    POST /documents/  -- upload a new document
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('documents.manage')]
        return [IsAuthenticated(), HasPermission('documents.view')]

    def get(self, request):
        queryset = Document.objects.select_related('uploaded_by')

        # Non-admin users can only see public docs or their own uploads
        user = request.user
        if not getattr(user, 'is_tenant_admin', False):
            from django.db.models import Q
            queryset = queryset.filter(
                Q(is_public=True) | Q(uploaded_by__user=user),
            )

        # -- Filters
        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        # -- Pagination
        try:
            page = max(int(request.query_params.get('page', 1)), 1)
            limit = min(int(request.query_params.get('limit', 50)), 100)
        except (TypeError, ValueError):
            page, limit = 1, 50

        total = queryset.count()
        start = (page - 1) * limit
        page_qs = queryset[start:start + limit]

        return Response({
            'results': DocumentSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = DocumentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Resolve uploaded_by from the requesting user if not provided
        if not serializer.validated_data.get('uploaded_by_id'):
            employee_profile = getattr(request.user, 'employee_profile', None)
            if not employee_profile:
                return Response(
                    {'detail': 'No employee profile linked to your account.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer.validated_data['uploaded_by_id'] = employee_profile.id

        document = serializer.save()
        return Response(
            DocumentSerializer(document).data,
            status=status.HTTP_201_CREATED,
        )


# -- Document Detail ----------------------------------------------------------

class DocumentDetailView(APIView):
    """
    GET    /documents/{id}/ -- retrieve a single document
    DELETE /documents/{id}/ -- delete a document
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('documents.view')]
        return [IsAuthenticated(), HasPermission('documents.manage')]

    def _get_document(self, pk):
        return get_object_or_404(
            Document.objects.select_related('uploaded_by'),
            pk=pk,
        )

    def get(self, request, pk):
        document = self._get_document(pk)
        return Response(DocumentSerializer(document).data)

    def delete(self, request, pk):
        document = self._get_document(pk)
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
