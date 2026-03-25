from rest_framework import serializers

from apps.users.models import User


# read-only representation of a user (for list/retrieve)
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'is_active', 'is_tenant_admin', 'created_at', 'updated_at']
        read_only_fields = fields


# used for POST /users/ — creates a new user in the current tenant DB
class UserCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    is_tenant_admin = serializers.BooleanField(default=False, read_only=True)

    def validate_email(self, value):
        # email must be unique within this tenant DB
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def create(self, validated_data):
        # request.tenant is set by middleware/JWT — manager uses it to build username
        tenant = self.context['request'].tenant
        return User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            tenant=tenant,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            is_tenant_admin=False,
        )


# used for PUT /users/{id}/ — partial updates allowed
# is_tenant_admin is intentionally excluded — privilege escalation risk
class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'is_active']

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
