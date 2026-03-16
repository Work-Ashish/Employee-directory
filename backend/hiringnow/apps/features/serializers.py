from rest_framework import serializers

class EnabledFeatureSerializer(serializers.Serializer):
    codename = serializers.CharField()
    name = serializers.CharField()
    config = serializers.DictField(default=dict)
