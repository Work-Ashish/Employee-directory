from rest_framework import serializers

from apps.reports.models import SavedReport, ReportSchedule


# ── Read Serializers ─────────────────────────────────────────────────


class ReportScheduleSerializer(serializers.ModelSerializer):
    """Read serializer for report schedules."""

    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)

    class Meta:
        model = ReportSchedule
        fields = [
            'id',
            'report',
            'frequency',
            'frequency_display',
            'next_run',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class SavedReportSerializer(serializers.ModelSerializer):
    """Read serializer — includes all fields plus computed creator name."""

    type_display = serializers.CharField(source='get_type_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    schedules = ReportScheduleSerializer(many=True, read_only=True)

    class Meta:
        model = SavedReport
        fields = [
            'id',
            'name',
            'type',
            'type_display',
            'config',
            'created_by',
            'created_by_name',
            'schedules',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return None


# ── Write Serializers ────────────────────────────────────────────────


class SavedReportCreateSerializer(serializers.Serializer):
    """Write serializer for creating a saved report."""

    name = serializers.CharField(max_length=200)
    type = serializers.ChoiceField(choices=SavedReport.ReportType.choices)
    config = serializers.JSONField(required=False, default=dict)

    def create(self, validated_data):
        return SavedReport.objects.create(**validated_data)


class SavedReportUpdateSerializer(serializers.Serializer):
    """Write serializer for updating a saved report."""

    name = serializers.CharField(max_length=200, required=False)
    type = serializers.ChoiceField(choices=SavedReport.ReportType.choices, required=False)
    config = serializers.JSONField(required=False)


class ReportGenerateSerializer(serializers.Serializer):
    """Serializer for the report generation endpoint."""

    type = serializers.ChoiceField(choices=SavedReport.ReportType.choices)
    config = serializers.JSONField(required=False, default=dict)
