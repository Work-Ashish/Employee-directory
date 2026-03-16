from rest_framework import serializers

from apps.departments.serializers import DepartmentSerializer
from apps.employees.models import (
    Employee,
    EmployeeAddress,
    EmployeeBanking,
    EmployeeProfile,
    EmploymentType,
)


class EmploymentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmploymentType
        fields = ['id', 'name', 'code']
        read_only_fields = ['id']


# ── Sub-profile serializers ──────────────────────────────────────────

class EmployeeProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeProfile
        exclude = ['id', 'employee', 'created_at', 'updated_at']


class EmployeeAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeAddress
        exclude = ['id', 'employee', 'created_at', 'updated_at']


class EmployeeBankingSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeBanking
        exclude = ['id', 'employee', 'created_at', 'updated_at']


# ── Main read serializer ─────────────────────────────────────────────

class EmployeeSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    employment_type_detail = EmploymentTypeSerializer(source='employment_type', read_only=True)
    department_detail = DepartmentSerializer(source='department_ref', read_only=True)
    reporting_to_name = serializers.SerializerMethodField()
    profile = EmployeeProfileSerializer(read_only=True)
    address_info = EmployeeAddressSerializer(read_only=True)
    banking = EmployeeBankingSerializer(read_only=True)

    class Meta:
        model = Employee
        fields = [
            'id', 'employee_code',
            'user', 'candidate_id', 'offer_id',
            'first_name', 'last_name', 'email', 'phone',
            'department_ref', 'department_detail',
            'department',  # legacy text field
            'designation', 'location',
            'employment_type', 'employment_type_detail',
            'reporting_to', 'reporting_to_name',
            'salary', 'date_of_joining', 'address', 'avatar_url',
            'start_date', 'joined_at',
            'status', 'status_display',
            'exit_date', 'exit_reason',
            'is_archived',
            'profile', 'address_info', 'banking',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'employee_code', 'created_at', 'updated_at']

    def get_reporting_to_name(self, obj):
        if obj.reporting_to:
            return f"{obj.reporting_to.first_name} {obj.reporting_to.last_name}"
        return None


# ── Create serializer ─────────────────────────────────────────────────

class EmployeeCreateSerializer(serializers.ModelSerializer):
    # Nested write-support: pass profile/address/banking dicts in request body
    profile = EmployeeProfileSerializer(required=False)
    address_info = EmployeeAddressSerializer(required=False)
    banking = EmployeeBankingSerializer(required=False)

    class Meta:
        model = Employee
        fields = [
            'employee_code', 'user', 'candidate_id', 'offer_id',
            'first_name', 'last_name', 'email', 'phone',
            'department_ref', 'department', 'designation', 'location',
            'employment_type', 'reporting_to',
            'salary', 'date_of_joining', 'address', 'avatar_url',
            'start_date', 'joined_at',
            'status',
            'exit_date', 'exit_reason',
            'profile', 'address_info', 'banking',
        ]

    def validate_email(self, value):
        if Employee.objects.filter(email=value, deleted_at__isnull=True).exists():
            raise serializers.ValidationError('An employee with this email already exists.')
        return value

    def validate_employee_code(self, value):
        if value and Employee.objects.filter(employee_code=value).exists():
            raise serializers.ValidationError('This employee code is already in use.')
        return value

    def validate_user(self, user):
        if user and Employee.objects.filter(user=user, deleted_at__isnull=True).exists():
            raise serializers.ValidationError('This user already has an employee profile.')
        return user

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', None)
        address_data = validated_data.pop('address_info', None)
        banking_data = validated_data.pop('banking', None)

        employee = Employee.objects.create(**validated_data)

        if profile_data:
            EmployeeProfile.objects.create(employee=employee, **profile_data)
        if address_data:
            EmployeeAddress.objects.create(employee=employee, **address_data)
        if banking_data:
            EmployeeBanking.objects.create(employee=employee, **banking_data)

        return employee


# ── Update serializer ─────────────────────────────────────────────────

class EmployeeUpdateSerializer(serializers.ModelSerializer):
    profile = EmployeeProfileSerializer(required=False)
    address_info = EmployeeAddressSerializer(required=False)
    banking = EmployeeBankingSerializer(required=False)

    class Meta:
        model = Employee
        fields = [
            'first_name', 'last_name', 'email', 'phone',
            'department_ref', 'department', 'designation', 'location',
            'employment_type', 'reporting_to',
            'salary', 'date_of_joining', 'address', 'avatar_url',
            'start_date', 'joined_at',
            'status', 'user',
            'exit_date', 'exit_reason',
            'candidate_id', 'offer_id',
            'is_archived',
            'profile', 'address_info', 'banking',
        ]

    def validate_email(self, value):
        if Employee.objects.filter(email=value, deleted_at__isnull=True).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('An employee with this email already exists.')
        return value

    def validate_user(self, user):
        if user and Employee.objects.filter(user=user, deleted_at__isnull=True).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('This user already has an employee profile.')
        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        address_data = validated_data.pop('address_info', None)
        banking_data = validated_data.pop('banking', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Upsert sub-profiles
        if profile_data is not None:
            EmployeeProfile.objects.update_or_create(
                employee=instance, defaults=profile_data,
            )
        if address_data is not None:
            EmployeeAddress.objects.update_or_create(
                employee=instance, defaults=address_data,
            )
        if banking_data is not None:
            EmployeeBanking.objects.update_or_create(
                employee=instance, defaults=banking_data,
            )

        return instance


# ── Lightweight list serializer (for manager dropdowns, etc.) ─────────

class EmployeeMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ['id', 'employee_code', 'first_name', 'last_name', 'email', 'designation']
        read_only_fields = fields
