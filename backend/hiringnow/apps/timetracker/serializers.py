from rest_framework import serializers

from apps.timetracker.models import TimeSession, BreakEntry, ActivityLog


# ── Read Serializers ─────────────────────────────────────────────────


class BreakEntrySerializer(serializers.ModelSerializer):
    """Read serializer for break entries."""

    type_display = serializers.CharField(source='get_type_display', read_only=True)
    duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model = BreakEntry
        fields = [
            'id',
            'session',
            'start_time',
            'end_time',
            'type',
            'type_display',
            'duration_minutes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_duration_minutes(self, obj):
        if obj.start_time and obj.end_time:
            return int((obj.end_time - obj.start_time).total_seconds() / 60)
        return None


class ActivityLogSerializer(serializers.ModelSerializer):
    """Read serializer for activity logs."""

    class Meta:
        model = ActivityLog
        fields = [
            'id',
            'session',
            'app',
            'title',
            'duration',
            'category',
            'created_at',
        ]
        read_only_fields = fields


class TimeSessionSerializer(serializers.ModelSerializer):
    """Read serializer — includes all fields plus nested breaks."""

    status_display = serializers.CharField(source='get_status_display', read_only=True)
    employee_name = serializers.SerializerMethodField()
    breaks = BreakEntrySerializer(many=True, read_only=True)

    class Meta:
        model = TimeSession
        fields = [
            'id',
            'employee',
            'employee_name',
            'start_time',
            'end_time',
            'status',
            'status_display',
            'total_break_minutes',
            'breaks',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"


# ── Write Serializers ────────────────────────────────────────────────


class BreakActionSerializer(serializers.Serializer):
    """Write serializer for starting or ending a break."""

    action = serializers.ChoiceField(choices=['start', 'end'])
    type = serializers.ChoiceField(
        choices=BreakEntry.BreakType.choices,
        required=False,
        default=BreakEntry.BreakType.SHORT,
    )
