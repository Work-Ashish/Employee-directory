from rest_framework import serializers

from apps.tickets.models import Ticket


class TicketSerializer(serializers.ModelSerializer):
    """Read serializer — includes all fields plus computed employee names."""

    created_by_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id',
            'subject',
            'description',
            'category',
            'category_display',
            'priority',
            'priority_display',
            'status',
            'status_display',
            'assigned_to',
            'assigned_to_name',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}"

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}"
        return None


class TicketCreateSerializer(serializers.Serializer):
    """Write serializer for creating a ticket."""

    subject = serializers.CharField(max_length=300)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    category = serializers.ChoiceField(choices=Ticket.Category.choices, required=False, default=Ticket.Category.OTHER)
    priority = serializers.ChoiceField(choices=Ticket.Priority.choices, required=False, default=Ticket.Priority.MEDIUM)
    created_by_id = serializers.UUIDField(required=False)

    def create(self, validated_data):
        return Ticket.objects.create(
            subject=validated_data['subject'],
            description=validated_data.get('description', ''),
            category=validated_data.get('category', Ticket.Category.OTHER),
            priority=validated_data.get('priority', Ticket.Priority.MEDIUM),
            status=Ticket.Status.OPEN,
            created_by_id=validated_data['created_by_id'],
        )


class TicketUpdateSerializer(serializers.Serializer):
    """Write serializer for updating a ticket (status, assignment, priority)."""

    status = serializers.ChoiceField(choices=Ticket.Status.choices, required=False)
    priority = serializers.ChoiceField(choices=Ticket.Priority.choices, required=False)
    assigned_to_id = serializers.UUIDField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)
