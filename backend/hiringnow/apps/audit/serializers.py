from rest_framework import serializers
from apps.audit.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'username', 'action', 'resource', 'resource_id',
            'path', 'method', 'status_code', 'ip_address', 'changes', 'created_at',
        ]
