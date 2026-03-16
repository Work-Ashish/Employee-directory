from django.urls import path

from apps.features.views import FeatureListView

app_name = "features"

urlpatterns = [
    path("features/", FeatureListView.as_view(), name="feature-list"),
]
