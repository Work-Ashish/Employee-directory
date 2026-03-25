from rest_framework import serializers

from apps.assets.models import Asset


class AssetSerializer(serializers.ModelSerializer):
    """Read serializer — includes all fields plus computed names."""

    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = [
            'id',
            'name',
            'type',
            'type_display',
            'serial_number',
            'assigned_to',
            'assigned_to_name',
            'status',
            'status_display',
            'purchase_date',
            'value',
            'image',
            'assigned_date',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}"
        return None


class AssetCreateSerializer(serializers.Serializer):
    """Write serializer for creating an asset."""

    name = serializers.CharField(max_length=200)
    type = serializers.ChoiceField(choices=Asset.AssetType.choices)
    serial_number = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    assigned_to_id = serializers.UUIDField(required=False, allow_null=True)
    status = serializers.ChoiceField(
        choices=Asset.Status.choices, required=False, default=Asset.Status.AVAILABLE,
    )
    purchase_date = serializers.DateField(required=False, allow_null=True)
    value = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0, allow_null=True)
    image = serializers.CharField(max_length=500, required=False, allow_blank=True, default='', allow_null=True)
    assigned_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def create(self, validated_data):
        return Asset.objects.create(
            name=validated_data['name'],
            type=validated_data['type'],
            serial_number=validated_data.get('serial_number', ''),
            assigned_to_id=validated_data.get('assigned_to_id'),
            status=validated_data.get('status', Asset.Status.AVAILABLE),
            purchase_date=validated_data.get('purchase_date'),
            value=validated_data.get('value') or 0,
            image=validated_data.get('image') or '',
            assigned_date=validated_data.get('assigned_date'),
            notes=validated_data.get('notes', ''),
        )


class AssetUpdateSerializer(serializers.Serializer):
    """Write serializer for updating an asset."""

    name = serializers.CharField(max_length=200, required=False)
    type = serializers.ChoiceField(choices=Asset.AssetType.choices, required=False)
    serial_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    assigned_to_id = serializers.UUIDField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=Asset.Status.choices, required=False)
    purchase_date = serializers.DateField(required=False, allow_null=True)
    value = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    image = serializers.CharField(max_length=500, required=False, allow_blank=True, allow_null=True)
    assigned_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
