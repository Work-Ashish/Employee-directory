from rest_framework import serializers

from apps.documents.models import Document


class DocumentSerializer(serializers.ModelSerializer):
    """Read serializer — includes all fields plus computed employee name."""

    uploaded_by_name = serializers.SerializerMethodField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = Document
        fields = [
            'id',
            'title',
            'file_url',
            'file_type',
            'size',
            'uploaded_by',
            'uploaded_by_name',
            'category',
            'category_display',
            'is_public',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}"
        return None


class DocumentCreateSerializer(serializers.Serializer):
    """Write serializer for uploading a document."""

    title = serializers.CharField(max_length=300)
    file_url = serializers.CharField(max_length=500)
    file_type = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    size = serializers.IntegerField(min_value=0, required=False, default=0)
    category = serializers.ChoiceField(choices=Document.Category.choices, required=False, default=Document.Category.OTHER)
    is_public = serializers.BooleanField(required=False, default=False)
    uploaded_by_id = serializers.UUIDField(required=False)

    def create(self, validated_data):
        return Document.objects.create(
            title=validated_data['title'],
            file_url=validated_data['file_url'],
            file_type=validated_data.get('file_type', ''),
            size=validated_data.get('size', 0),
            category=validated_data.get('category', Document.Category.OTHER),
            is_public=validated_data.get('is_public', False),
            uploaded_by_id=validated_data.get('uploaded_by_id'),
        )
