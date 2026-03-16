from rest_framework import serializers

from apps.attendance.models import (
    Attendance,
    AttendancePolicy,
    AttendanceRegularization,
    BreakEntry,
    Holiday,
    Shift,
    ShiftAssignment,
    TimeSession,
)


# ── Attendance ───────────────────────────────────────────────────────

class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Attendance
        fields = [
            'id', 'employee', 'employee_name',
            'date', 'check_in', 'check_out',
            'work_hours', 'overtime',
            'is_late', 'is_early_exit',
            'status', 'status_display',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"


class AttendanceCreateSerializer(serializers.ModelSerializer):
    employee_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Attendance
        fields = [
            'employee_id', 'date', 'check_in', 'check_out',
            'work_hours', 'status',
        ]

    def validate_employee_id(self, value):
        from apps.employees.models import Employee
        if not Employee.objects.filter(pk=value, deleted_at__isnull=True).exists():
            raise serializers.ValidationError('Employee not found.')
        return value

    def create(self, validated_data):
        employee_id = validated_data.pop('employee_id', None)
        if employee_id:
            validated_data['employee_id'] = employee_id
        return Attendance.objects.create(**validated_data)


# ── Time Session ─────────────────────────────────────────────────────

class BreakEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = BreakEntry
        fields = [
            'id', 'session', 'started_at', 'ended_at', 'reason',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'started_at', 'created_at', 'updated_at']


class TimeSessionSerializer(serializers.ModelSerializer):
    breaks = BreakEntrySerializer(many=True, read_only=True)
    employee_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = TimeSession
        fields = [
            'id', 'employee', 'employee_name',
            'check_in', 'check_out',
            'total_work', 'total_break', 'total_idle',
            'status', 'status_display',
            'ip_address', 'user_agent',
            'breaks',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'check_in', 'created_at', 'updated_at']

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"


# ── Shift ────────────────────────────────────────────────────────────

class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = [
            'id', 'name', 'start_time', 'end_time', 'work_days',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ShiftCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = ['name', 'start_time', 'end_time', 'work_days']

    def validate_work_days(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('work_days must be a list of integers.')
        for day in value:
            if not isinstance(day, int) or day < 0 or day > 6:
                raise serializers.ValidationError(
                    'Each work day must be an integer between 0 and 6.'
                )
        return value


# ── Shift Assignment ─────────────────────────────────────────────────

class ShiftAssignmentSerializer(serializers.ModelSerializer):
    shift_detail = ShiftSerializer(source='shift', read_only=True)
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = ShiftAssignment
        fields = [
            'id', 'employee', 'employee_name',
            'shift', 'shift_detail',
            'start_date', 'end_date',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"


class ShiftAssignmentCreateSerializer(serializers.ModelSerializer):
    employee_id = serializers.UUIDField()
    shift_id = serializers.UUIDField()

    class Meta:
        model = ShiftAssignment
        fields = ['employee_id', 'shift_id', 'start_date', 'end_date']

    def validate_employee_id(self, value):
        from apps.employees.models import Employee
        if not Employee.objects.filter(pk=value, deleted_at__isnull=True).exists():
            raise serializers.ValidationError('Employee not found.')
        return value

    def validate_shift_id(self, value):
        if not Shift.objects.filter(pk=value).exists():
            raise serializers.ValidationError('Shift not found.')
        return value

    def create(self, validated_data):
        return ShiftAssignment.objects.create(**validated_data)


# ── Attendance Policy ────────────────────────────────────────────────

class AttendancePolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendancePolicy
        fields = [
            'id', 'name',
            'late_grace_period', 'early_exit_grace', 'ot_threshold',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ── Holiday ──────────────────────────────────────────────────────────

class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = [
            'id', 'name', 'date', 'is_optional',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class HolidayCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = ['name', 'date', 'is_optional']


# ── Regularization ───────────────────────────────────────────────────

class RegularizationSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = AttendanceRegularization
        fields = [
            'id', 'attendance', 'employee', 'employee_name',
            'reason', 'requested_time',
            'type', 'type_display',
            'status', 'status_display',
            'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"


class RegularizationCreateSerializer(serializers.ModelSerializer):
    employee_id = serializers.UUIDField(write_only=True, required=False)
    attendance_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = AttendanceRegularization
        fields = [
            'attendance_id', 'employee_id',
            'reason', 'requested_time', 'type', 'notes',
        ]

    def validate_attendance_id(self, value):
        if not Attendance.objects.filter(pk=value).exists():
            raise serializers.ValidationError('Attendance record not found.')
        if AttendanceRegularization.objects.filter(attendance_id=value).exists():
            raise serializers.ValidationError(
                'A regularization request already exists for this attendance record.'
            )
        return value

    def validate_employee_id(self, value):
        from apps.employees.models import Employee
        if not Employee.objects.filter(pk=value, deleted_at__isnull=True).exists():
            raise serializers.ValidationError('Employee not found.')
        return value

    def create(self, validated_data):
        return AttendanceRegularization.objects.create(**validated_data)
