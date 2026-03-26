from rest_framework import serializers

from apps.teams.models import Team, TeamMember


class TeamMemberSerializer(serializers.ModelSerializer):
    """Read serializer for team members."""

    employee_name = serializers.SerializerMethodField()
    designation = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = TeamMember
        fields = [
            'id',
            'team',
            'employee',
            'employee_name',
            'designation',
            'avatar_url',
            'role',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"

    def get_designation(self, obj):
        return getattr(obj.employee, 'designation', '') or ''

    def get_avatar_url(self, obj):
        return getattr(obj.employee, 'avatar_url', None) or None


class TeamSerializer(serializers.ModelSerializer):
    """Read serializer — includes all fields plus computed members count."""

    lead_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()
    member_ids = serializers.SerializerMethodField()

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
            'member_ids',
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

    def get_member_ids(self, obj):
        return list(obj.members.values_list('employee_id', flat=True))


class TeamCreateSerializer(serializers.Serializer):
    """Write serializer for creating a team."""

    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    department_id = serializers.UUIDField(required=False, allow_null=True)
    lead_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_description(self, value):
        return value or ''

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
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    department_id = serializers.UUIDField(required=False, allow_null=True)
    lead_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_description(self, value):
        """Convert null to empty string for CharField storage."""
        return value or ''
