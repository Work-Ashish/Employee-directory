from rest_framework import serializers

from apps.rbac.models import Role, RolePermission, UserRole
from apps.rbac.services import normalize_codenames
from apps.tenants.models import Permission as RegistryPermission


# serialize registry permissions from default DB
class RegistryPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistryPermission
        fields = ["codename", "name", "module"]
        read_only_fields = fields

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "slug", "description", "is_system", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

class RolePermissionReadSerializer(serializers.Serializer):
    codename = serializers.CharField()
    name = serializers.CharField(required=False, allow_null=True)
    module = serializers.CharField(required=False, allow_null=True)

class RolePermissionsUpdateSerializer(serializers.Serializer):
    permission_codenames = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=True,
    )

    # clean and normalise permission codename list
    def validate_permission_codenames(self, value):
        return normalize_codenames(value)


class UserRolesUpdateSerializer(serializers.Serializer):
    role_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=True,
    )