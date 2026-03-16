from rest_framework import serializers

from apps.roles.models import FunctionalRole, RoleCapability, EmployeeFunctionalRole


# ── Read Serializers ─────────────────────────────────────────────────


class RoleCapabilitySerializer(serializers.ModelSerializer):
    """Read serializer for role capabilities."""

    class Meta:
        model = RoleCapability
        fields = [
            'id',
            'role',
            'capability',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class FunctionalRoleSerializer(serializers.ModelSerializer):
    """Read serializer — includes all fields plus nested capabilities."""

    capabilities = RoleCapabilitySerializer(many=True, read_only=True)

    class Meta:
        model = FunctionalRole
        fields = [
            'id',
            'name',
            'description',
            'is_active',
            'capabilities',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class EmployeeFunctionalRoleSerializer(serializers.ModelSerializer):
    """Read serializer for employee-role assignments."""

    role_name = serializers.CharField(source='role.name', read_only=True)
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeFunctionalRole
        fields = [
            'id',
            'employee',
            'employee_name',
            'role',
            'role_name',
            'assigned_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"


# ── Write Serializers ────────────────────────────────────────────────


class FunctionalRoleCreateSerializer(serializers.Serializer):
    """Write serializer for creating a functional role."""

    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    is_active = serializers.BooleanField(required=False, default=True)
    capabilities = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        default=list,
    )

    def create(self, validated_data):
        capabilities = validated_data.pop('capabilities', [])
        role = FunctionalRole.objects.create(**validated_data)

        if capabilities:
            RoleCapability.objects.bulk_create([
                RoleCapability(role=role, capability=cap)
                for cap in capabilities
            ])

        return role


class FunctionalRoleUpdateSerializer(serializers.Serializer):
    """Write serializer for updating a functional role."""

    name = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    capabilities = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
    )
