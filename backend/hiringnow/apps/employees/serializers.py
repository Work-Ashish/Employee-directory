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
        read_only_fields = ['user']

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


# ── Flat profile serializer (for /employees/profile/) ────────────────

class EmployeeProfileFlatSerializer(serializers.Serializer):
    """
    Flattens Employee + EmployeeProfile + EmployeeAddress + EmployeeBanking
    into a single flat object for the frontend Profile page.
    """

    # ── Core employee fields (read-only)
    id = serializers.UUIDField(read_only=True)
    employee_code = serializers.CharField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    designation = serializers.CharField(read_only=True)
    date_of_joining = serializers.DateField(read_only=True)
    salary = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    status = serializers.CharField(read_only=True)
    avatar_url = serializers.URLField(read_only=True, allow_null=True)
    address = serializers.CharField(read_only=True)
    location = serializers.CharField(read_only=True)

    # ── Nested computed fields
    department = serializers.SerializerMethodField()
    manager = serializers.SerializerMethodField()
    educations = serializers.SerializerMethodField()
    assets = serializers.SerializerMethodField()
    documents = serializers.SerializerMethodField()

    # ── EmployeeProfile fields (writable)
    date_of_birth = serializers.SerializerMethodField()
    gender = serializers.SerializerMethodField()
    blood_group = serializers.SerializerMethodField()
    nationality = serializers.SerializerMethodField()
    marital_status = serializers.SerializerMethodField()
    religion = serializers.SerializerMethodField()
    caste = serializers.SerializerMethodField()
    father_name = serializers.SerializerMethodField()
    spouse = serializers.SerializerMethodField()
    emergency_contact_name = serializers.SerializerMethodField()
    emergency_contact_phone = serializers.SerializerMethodField()
    emergency_contact_relation = serializers.SerializerMethodField()
    passport_number = serializers.SerializerMethodField()
    passport_expiry = serializers.SerializerMethodField()
    visa_number = serializers.SerializerMethodField()
    visa_expiry = serializers.SerializerMethodField()
    previous_employment = serializers.SerializerMethodField()
    previous_ctc = serializers.SerializerMethodField()

    # ── EmployeeAddress fields
    contact_address = serializers.SerializerMethodField()
    contact_city = serializers.SerializerMethodField()
    contact_state = serializers.SerializerMethodField()
    contact_pincode = serializers.SerializerMethodField()
    permanent_address = serializers.SerializerMethodField()
    permanent_city = serializers.SerializerMethodField()
    permanent_state = serializers.SerializerMethodField()
    permanent_pincode = serializers.SerializerMethodField()

    # ── EmployeeBanking fields
    bank_name = serializers.SerializerMethodField()
    bank_account_number = serializers.SerializerMethodField()
    bank_branch = serializers.SerializerMethodField()
    ifsc_code = serializers.SerializerMethodField()
    pf_account_number = serializers.SerializerMethodField()
    aadhaar_number = serializers.SerializerMethodField()
    pan_number = serializers.SerializerMethodField()

    # ── Helpers to read sub-model fields
    def _profile(self, obj):
        return getattr(obj, 'profile', None)

    def _address(self, obj):
        return getattr(obj, 'address_info', None)

    def _banking(self, obj):
        return getattr(obj, 'banking', None)

    # ── Nested object getters
    def get_department(self, obj):
        dept = obj.department_ref
        if dept:
            return {'id': str(dept.id), 'name': dept.name}
        return {'id': '', 'name': obj.department or ''}

    def get_manager(self, obj):
        mgr = obj.reporting_to
        if mgr:
            return {
                'first_name': mgr.first_name,
                'last_name': mgr.last_name,
                'designation': mgr.designation,
            }
        return None

    def get_educations(self, obj):
        return []

    def get_assets(self, obj):
        return []

    def get_documents(self, obj):
        return []

    # ── Profile field getters
    def get_date_of_birth(self, obj):
        p = self._profile(obj)
        return p.date_of_birth if p else None

    def get_gender(self, obj):
        p = self._profile(obj)
        return p.gender if p else None

    def get_blood_group(self, obj):
        p = self._profile(obj)
        return p.blood_group if p else None

    def get_nationality(self, obj):
        p = self._profile(obj)
        return p.nationality if p else None

    def get_marital_status(self, obj):
        p = self._profile(obj)
        return p.marital_status if p else None

    def get_religion(self, obj):
        p = self._profile(obj)
        return p.religion if p else None

    def get_caste(self, obj):
        p = self._profile(obj)
        return p.caste if p else None

    def get_father_name(self, obj):
        p = self._profile(obj)
        return p.father_name if p else None

    def get_spouse(self, obj):
        p = self._profile(obj)
        return p.spouse_name if p else None

    def get_emergency_contact_name(self, obj):
        p = self._profile(obj)
        return p.emergency_contact_name if p else None

    def get_emergency_contact_phone(self, obj):
        p = self._profile(obj)
        return p.emergency_contact_phone if p else None

    def get_emergency_contact_relation(self, obj):
        p = self._profile(obj)
        return p.emergency_contact_relation if p else None

    def get_passport_number(self, obj):
        p = self._profile(obj)
        return p.passport_number if p else None

    def get_passport_expiry(self, obj):
        p = self._profile(obj)
        return p.passport_expiry if p else None

    def get_visa_number(self, obj):
        p = self._profile(obj)
        return p.visa_type if p else None

    def get_visa_expiry(self, obj):
        p = self._profile(obj)
        return p.visa_expiry if p else None

    def get_previous_employment(self, obj):
        p = self._profile(obj)
        return p.previous_company if p else None

    def get_previous_ctc(self, obj):
        return None  # not stored in current model

    # ── Address field getters
    def get_contact_address(self, obj):
        a = self._address(obj)
        return a.contact_address if a else None

    def get_contact_city(self, obj):
        a = self._address(obj)
        return a.contact_city if a else None

    def get_contact_state(self, obj):
        a = self._address(obj)
        return a.contact_state if a else None

    def get_contact_pincode(self, obj):
        a = self._address(obj)
        return a.contact_pincode if a else None

    def get_permanent_address(self, obj):
        a = self._address(obj)
        return a.permanent_address if a else None

    def get_permanent_city(self, obj):
        a = self._address(obj)
        return a.permanent_city if a else None

    def get_permanent_state(self, obj):
        a = self._address(obj)
        return a.permanent_state if a else None

    def get_permanent_pincode(self, obj):
        a = self._address(obj)
        return a.permanent_pincode if a else None

    # ── Banking field getters
    def get_bank_name(self, obj):
        b = self._banking(obj)
        return b.bank_name if b else None

    def get_bank_account_number(self, obj):
        b = self._banking(obj)
        return b.bank_account_number if b else None

    def get_bank_branch(self, obj):
        b = self._banking(obj)
        return b.bank_branch if b else None

    def get_ifsc_code(self, obj):
        b = self._banking(obj)
        return b.ifsc_code if b else None

    def get_pf_account_number(self, obj):
        b = self._banking(obj)
        return b.pf_account_number if b else None

    def get_aadhaar_number(self, obj):
        b = self._banking(obj)
        return b.aadhaar_number if b else None

    def get_pan_number(self, obj):
        b = self._banking(obj)
        return b.pan_number if b else None

    # ── Update support
    def update(self, instance, validated_data):
        # Update phone on Employee
        if 'phone' in validated_data:
            instance.phone = validated_data.pop('phone')
            instance.save(update_fields=['phone'])

        # Profile fields
        profile_fields = {
            'date_of_birth', 'gender', 'blood_group', 'nationality',
            'marital_status', 'religion', 'caste', 'father_name',
            'emergency_contact_name', 'emergency_contact_phone',
            'emergency_contact_relation', 'passport_number', 'passport_expiry',
            'visa_type', 'visa_expiry',
        }
        # Map frontend keys to model fields
        profile_remap = {'spouse': 'spouse_name', 'visa_number': 'visa_type',
                         'previous_employment': 'previous_company'}
        profile_data = {}
        for key in list(validated_data.keys()):
            model_key = profile_remap.get(key, key)
            if model_key in profile_fields or key in profile_remap:
                profile_data[model_key] = validated_data.pop(key)
        if profile_data:
            EmployeeProfile.objects.update_or_create(
                employee=instance, defaults=profile_data,
            )

        # Address fields
        address_fields = {
            'contact_address', 'contact_city', 'contact_state', 'contact_pincode',
            'permanent_address', 'permanent_city', 'permanent_state', 'permanent_pincode',
        }
        address_data = {k: validated_data.pop(k) for k in list(validated_data.keys()) if k in address_fields}
        if address_data:
            EmployeeAddress.objects.update_or_create(
                employee=instance, defaults=address_data,
            )

        # Banking fields
        banking_fields = {
            'bank_name', 'bank_account_number', 'bank_branch', 'ifsc_code',
            'pf_account_number', 'aadhaar_number', 'pan_number',
        }
        banking_data = {k: validated_data.pop(k) for k in list(validated_data.keys()) if k in banking_fields}
        if banking_data:
            EmployeeBanking.objects.update_or_create(
                employee=instance, defaults=banking_data,
            )

        # Refresh relations
        instance.refresh_from_db()
        return instance
