from rest_framework.permissions import BasePermission

from apps.features.services import is_feature_enabled

class FeatureRequired(BasePermission):
    message = "You do not have permission to perform this action."

    def __init__(self, codename: str):
        self.codename = codename

    def has_permission(self, request, view) -> bool:
        return is_feature_enabled(self.codename)
