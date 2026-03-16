from rest_framework import serializers

from apps.announcements.models import Announcement, Kudos


# -- Announcement Serializers --------------------------------------------------

class AnnouncementSerializer(serializers.ModelSerializer):
    """Read serializer — includes all fields plus computed employee name."""

    created_by_name = serializers.SerializerMethodField()
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = Announcement
        fields = [
            'id',
            'title',
            'content',
            'priority',
            'priority_display',
            'is_active',
            'expires_at',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return None


class AnnouncementCreateSerializer(serializers.Serializer):
    """Write serializer for creating an announcement."""

    title = serializers.CharField(max_length=300)
    content = serializers.CharField()
    priority = serializers.ChoiceField(
        choices=Announcement.Priority.choices, required=False, default=Announcement.Priority.NORMAL,
    )
    is_active = serializers.BooleanField(required=False, default=True)
    expires_at = serializers.DateTimeField(required=False, allow_null=True, default=None)
    created_by_id = serializers.UUIDField(required=False)

    def create(self, validated_data):
        return Announcement.objects.create(
            title=validated_data['title'],
            content=validated_data['content'],
            priority=validated_data.get('priority', Announcement.Priority.NORMAL),
            is_active=validated_data.get('is_active', True),
            expires_at=validated_data.get('expires_at'),
            created_by_id=validated_data.get('created_by_id'),
        )


class AnnouncementUpdateSerializer(serializers.Serializer):
    """Write serializer for updating an announcement."""

    title = serializers.CharField(max_length=300, required=False)
    content = serializers.CharField(required=False)
    priority = serializers.ChoiceField(choices=Announcement.Priority.choices, required=False)
    is_active = serializers.BooleanField(required=False)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)


# -- Kudos Serializers ---------------------------------------------------------

class KudosSerializer(serializers.ModelSerializer):
    """Read serializer — includes all fields plus computed employee names."""

    from_employee_name = serializers.SerializerMethodField()
    to_employee_name = serializers.SerializerMethodField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = Kudos
        fields = [
            'id',
            'from_employee',
            'from_employee_name',
            'to_employee',
            'to_employee_name',
            'message',
            'category',
            'category_display',
            'is_public',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_from_employee_name(self, obj):
        return f"{obj.from_employee.first_name} {obj.from_employee.last_name}"

    def get_to_employee_name(self, obj):
        return f"{obj.to_employee.first_name} {obj.to_employee.last_name}"


class KudosCreateSerializer(serializers.Serializer):
    """Write serializer for giving kudos."""

    to_employee_id = serializers.UUIDField()
    message = serializers.CharField()
    category = serializers.ChoiceField(
        choices=Kudos.Category.choices, required=False, default=Kudos.Category.TEAMWORK,
    )
    is_public = serializers.BooleanField(required=False, default=True)
    from_employee_id = serializers.UUIDField(required=False)

    def validate(self, attrs):
        from_id = attrs.get('from_employee_id')
        to_id = attrs.get('to_employee_id')

        if from_id and to_id and str(from_id) == str(to_id):
            raise serializers.ValidationError(
                'You cannot give kudos to yourself.',
            )
        return attrs

    def create(self, validated_data):
        return Kudos.objects.create(
            from_employee_id=validated_data['from_employee_id'],
            to_employee_id=validated_data['to_employee_id'],
            message=validated_data['message'],
            category=validated_data.get('category', Kudos.Category.TEAMWORK),
            is_public=validated_data.get('is_public', True),
        )
