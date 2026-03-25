from rest_framework import serializers

from apps.agent.models import (
    AgentDevice,
    ActivitySession,
    AppUsage,
    WebsiteVisit,
    IdleEvent,
    AgentCommand,
    Screenshot,
)


# ---------------------------------------------------------------------------
# Read serializers
# ---------------------------------------------------------------------------

class AgentDeviceSerializer(serializers.ModelSerializer):
    """Full device read serializer with nested employee info."""

    employee = serializers.SerializerMethodField()

    class Meta:
        model = AgentDevice
        fields = [
            'id',
            'device_name',
            'platform',
            'agent_version',
            'status',
            'last_heartbeat',
            'machine_id',
            'employee',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_employee(self, obj):
        emp = obj.employee
        return {
            'id': str(emp.id),
            'first_name': emp.first_name,
            'last_name': emp.last_name,
            'employee_code': emp.employee_code,
            'designation': getattr(emp, 'designation', '') or '',
        }


class AppUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppUsage
        fields = [
            'id', 'app_name', 'window_title', 'total_seconds', 'category',
        ]
        read_only_fields = fields


class WebsiteVisitSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsiteVisit
        fields = [
            'id', 'domain', 'url', 'total_seconds', 'category',
        ]
        read_only_fields = fields


class IdleEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = IdleEvent
        fields = [
            'id', 'started_at', 'ended_at', 'duration_seconds',
            'response', 'work_description',
        ]
        read_only_fields = fields


class ScreenshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Screenshot
        fields = ['id', 'image_url', 'captured_at']
        read_only_fields = fields


class ActivitySessionSerializer(serializers.ModelSerializer):
    app_usages = AppUsageSerializer(many=True, read_only=True)
    website_visits = WebsiteVisitSerializer(many=True, read_only=True)
    idle_events = IdleEventSerializer(many=True, read_only=True)

    class Meta:
        model = ActivitySession
        fields = [
            'id', 'started_at', 'ended_at', 'active_seconds',
            'idle_seconds', 'keystrokes', 'mouse_clicks',
            'app_usages', 'website_visits', 'idle_events',
        ]
        read_only_fields = fields


class AgentCommandSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentCommand
        fields = [
            'id', 'type', 'status', 'payload', 'executed_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Write serializers
# ---------------------------------------------------------------------------

class DeviceRegisterSerializer(serializers.Serializer):
    """First-time device registration from the desktop agent."""

    employee_id = serializers.UUIDField(required=False)
    device_name = serializers.CharField(max_length=200)
    platform = serializers.ChoiceField(choices=AgentDevice.Platform.choices)
    machine_id = serializers.CharField(max_length=200)
    agent_version = serializers.CharField(max_length=50, required=False, default='1.0.0')


class HeartbeatSerializer(serializers.Serializer):
    """Heartbeat ping from the desktop agent."""

    device_id = serializers.UUIDField(required=False)
    machine_id = serializers.CharField(max_length=200, required=False)
    agent_version = serializers.CharField(max_length=50, required=False)


class DeviceStatusUpdateSerializer(serializers.Serializer):
    """Admin updates device status (approve, suspend, etc.)."""

    device_id = serializers.UUIDField()
    status = serializers.ChoiceField(choices=AgentDevice.Status.choices)


class CommandCreateSerializer(serializers.Serializer):
    """Admin issues a command to a device."""

    device_id = serializers.UUIDField()
    type = serializers.ChoiceField(choices=AgentCommand.CommandType.choices)
    payload = serializers.JSONField(required=False, default=dict)


class IdleEventResponseSerializer(serializers.Serializer):
    """Employee responds to an idle event."""

    idle_event_id = serializers.UUIDField()
    response = serializers.ChoiceField(choices=IdleEvent.Response.choices)
    work_description = serializers.CharField(required=False, allow_blank=True, default='')


# -- Bulk ingest serializers --

class IngestAppUsageSerializer(serializers.Serializer):
    app_name = serializers.CharField(max_length=300)
    window_title = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')
    total_seconds = serializers.IntegerField(min_value=0)
    category = serializers.ChoiceField(
        choices=AppUsage.Category.choices,
        required=False,
        default=AppUsage.Category.UNCATEGORIZED,
    )


class IngestWebsiteVisitSerializer(serializers.Serializer):
    domain = serializers.CharField(max_length=500)
    url = serializers.URLField(max_length=2000, required=False, allow_blank=True, default='')
    total_seconds = serializers.IntegerField(min_value=0)
    category = serializers.ChoiceField(
        choices=AppUsage.Category.choices,
        required=False,
        default=AppUsage.Category.UNCATEGORIZED,
    )


class IngestIdleEventSerializer(serializers.Serializer):
    started_at = serializers.DateTimeField()
    ended_at = serializers.DateTimeField(required=False, allow_null=True)
    duration_seconds = serializers.IntegerField(min_value=0)
    response = serializers.ChoiceField(
        choices=IdleEvent.Response.choices,
        required=False,
        default=IdleEvent.Response.NO_RESPONSE,
    )
    work_description = serializers.CharField(required=False, allow_blank=True, default='')


class IngestScreenshotSerializer(serializers.Serializer):
    image_url = serializers.URLField(max_length=500)
    captured_at = serializers.DateTimeField()


class IngestSessionSerializer(serializers.Serializer):
    """A single session payload from the desktop agent."""

    started_at = serializers.DateTimeField()
    ended_at = serializers.DateTimeField(required=False, allow_null=True)
    active_seconds = serializers.IntegerField(min_value=0, default=0)
    idle_seconds = serializers.IntegerField(min_value=0, default=0)
    keystrokes = serializers.IntegerField(min_value=0, default=0)
    mouse_clicks = serializers.IntegerField(min_value=0, default=0)
    app_usages = IngestAppUsageSerializer(many=True, required=False, default=list)
    website_visits = IngestWebsiteVisitSerializer(many=True, required=False, default=list)
    idle_events = IngestIdleEventSerializer(many=True, required=False, default=list)
    screenshots = IngestScreenshotSerializer(many=True, required=False, default=list)


class IngestBulkSerializer(serializers.Serializer):
    """Top-level ingest payload from the desktop agent."""

    device_id = serializers.UUIDField()
    sessions = IngestSessionSerializer(many=True)
