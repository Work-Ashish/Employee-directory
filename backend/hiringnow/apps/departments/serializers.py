from django.db.models import Count, Q
from rest_framework import serializers

from apps.departments.models import Department


class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Department
        fields = ['id', 'name', 'color', 'employee_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class DepartmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['name', 'color']

    def validate_name(self, value):
        if Department.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError('A department with this name already exists.')
        return value
