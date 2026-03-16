from rest_framework import serializers

from apps.events.models import CalendarEvent


class EventSerializer(serializers.ModelSerializer):
    """Read serializer — includes all fields plus computed names."""

    created_by_name = serializers.SerializerMethodField()
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    attendee_ids = serializers.SerializerMethodField()

    class Meta:
        model = CalendarEvent
        fields = [
            'id',
            'title',
            'description',
            'start_date',
            'end_date',
            'is_all_day',
            'type',
            'type_display',
            'created_by',
            'created_by_name',
            'attendee_ids',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return None

    def get_attendee_ids(self, obj):
        return list(obj.attendees.values_list('id', flat=True))


class EventCreateSerializer(serializers.Serializer):
    """Write serializer for creating a calendar event."""

    title = serializers.CharField(max_length=300)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    start_date = serializers.DateTimeField()
    end_date = serializers.DateTimeField()
    is_all_day = serializers.BooleanField(default=False)
    type = serializers.ChoiceField(
        choices=CalendarEvent.EventType.choices,
        default=CalendarEvent.EventType.MEETING,
    )
    attendee_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
    )

    def validate(self, attrs):
        if attrs['start_date'] > attrs['end_date']:
            raise serializers.ValidationError({
                'end_date': 'end_date must be greater than or equal to start_date.',
            })
        return attrs

    def create(self, validated_data):
        attendee_ids = validated_data.pop('attendee_ids', [])
        event = CalendarEvent.objects.create(
            title=validated_data['title'],
            description=validated_data.get('description', ''),
            start_date=validated_data['start_date'],
            end_date=validated_data['end_date'],
            is_all_day=validated_data.get('is_all_day', False),
            type=validated_data.get('type', CalendarEvent.EventType.MEETING),
            created_by_id=validated_data.get('created_by_id'),
        )
        if attendee_ids:
            event.attendees.set(attendee_ids)
        return event


class EventUpdateSerializer(serializers.Serializer):
    """Write serializer for updating a calendar event."""

    title = serializers.CharField(max_length=300, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)
    is_all_day = serializers.BooleanField(required=False)
    type = serializers.ChoiceField(choices=CalendarEvent.EventType.choices, required=False)
    attendee_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
    )

    def validate(self, attrs):
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({
                'end_date': 'end_date must be greater than or equal to start_date.',
            })
        return attrs
