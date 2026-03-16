from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.assets.models import Asset
from apps.assets.serializers import (
    AssetSerializer,
    AssetCreateSerializer,
    AssetUpdateSerializer,
)


# -- Asset List / Create -------------------------------------------------------

class AssetListCreateView(APIView):
    """
    GET  /assets/  -- list assets (paginated, filterable)
    POST /assets/  -- create a new asset
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('assets.manage')]
        return [IsAuthenticated(), HasPermission('assets.view')]

    def get(self, request):
        queryset = Asset.objects.select_related('assigned_to')

        # Non-admin users can only see assets assigned to them
        user = request.user
        if not getattr(user, 'is_tenant_admin', False):
            queryset = queryset.filter(assigned_to__user=user)

        # -- Filters
        status_filter = request.query_params.get('status')
        type_filter = request.query_params.get('type')
        assigned_to = request.query_params.get('assigned_to')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if type_filter:
            queryset = queryset.filter(type=type_filter)
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)

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
            'results': AssetSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = AssetCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        asset = serializer.save()
        return Response(
            AssetSerializer(asset).data,
            status=status.HTTP_201_CREATED,
        )


# -- Asset Detail ---------------------------------------------------------------

class AssetDetailView(APIView):
    """
    GET    /assets/{id}/  -- retrieve a single asset
    PUT    /assets/{id}/  -- update an asset
    DELETE /assets/{id}/  -- delete an asset
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('assets.view')]
        return [IsAuthenticated(), HasPermission('assets.manage')]

    def _get_asset(self, pk):
        return get_object_or_404(
            Asset.objects.select_related('assigned_to'),
            pk=pk,
        )

    def get(self, request, pk):
        asset = self._get_asset(pk)
        return Response(AssetSerializer(asset).data)

    def put(self, request, pk):
        asset = self._get_asset(pk)
        serializer = AssetUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(asset, field, value)
        asset.save()

        return Response(AssetSerializer(asset).data)

    def delete(self, request, pk):
        asset = self._get_asset(pk)
        asset.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
