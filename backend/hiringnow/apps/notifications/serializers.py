from rest_framework import serializers

from apps.notifications.models import Notification, AdminAlert


class NotificationSerializer(serializers.ModelSerializer):
    """Read serializer for notifications."""

    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'user',
            'title',
            'message',
            'type',
            'type_display',
            'is_read',
            'link',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class AdminAlertSerializer(serializers.ModelSerializer):
    """Read serializer for admin alerts."""

    severity_display = serializers.CharField(source='get_severity_display', read_only=True)

    class Meta:
        model = AdminAlert
        fields = [
            'id',
            'title',
            'message',
            'severity',
            'severity_display',
            'is_resolved',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields
