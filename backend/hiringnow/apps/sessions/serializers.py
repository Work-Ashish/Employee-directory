from rest_framework import serializers

from apps.sessions.models import UserSession


# ── Read Serializers ─────────────────────────────────────────────────


class UserSessionSerializer(serializers.ModelSerializer):
    """Read serializer — includes all fields plus computed user email."""

    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = UserSession
        fields = [
            'id',
            'user',
            'user_email',
            'ip_address',
            'user_agent',
            'last_activity',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields
