from rest_framework import serializers

from apps.teams.models import Team, TeamMember


class TeamMemberSerializer(serializers.ModelSerializer):
    """Read serializer for team members."""

    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = TeamMember
        fields = [
            'id',
            'team',
            'employee',
            'employee_name',
            'role',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"


class TeamSerializer(serializers.ModelSerializer):
    """Read serializer — includes all fields plus computed members count."""

    lead_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = [
            'id',
            'name',
            'description',
            'department',
            'department_name',
            'lead',
            'lead_name',
            'members_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_lead_name(self, obj):
        if obj.lead:
            return f"{obj.lead.first_name} {obj.lead.last_name}"
        return None

    def get_department_name(self, obj):
        if obj.department:
            return obj.department.name
        return None

    def get_members_count(self, obj):
        return obj.members.count()


class TeamCreateSerializer(serializers.Serializer):
    """Write serializer for creating a team."""

    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    department_id = serializers.UUIDField(required=False, allow_null=True)
    lead_id = serializers.UUIDField(required=False, allow_null=True)

    def create(self, validated_data):
        return Team.objects.create(
            name=validated_data['name'],
            description=validated_data.get('description', ''),
            department_id=validated_data.get('department_id'),
            lead_id=validated_data.get('lead_id'),
        )


class TeamUpdateSerializer(serializers.Serializer):
    """Write serializer for updating a team."""

    name = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    department_id = serializers.UUIDField(required=False, allow_null=True)
    lead_id = serializers.UUIDField(required=False, allow_null=True)
