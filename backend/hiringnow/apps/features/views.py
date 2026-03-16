from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.features.serializers import EnabledFeatureSerializer
from apps.features.services import get_enabled_features

class FeatureListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        features = get_enabled_features()
        serializer = EnabledFeatureSerializer(features, many=True)
        return Response(serializer.data)
