from rest_framework import serializers

from apps.training.models import Training, TrainingEnrollment


class TrainingEnrollmentSerializer(serializers.ModelSerializer):
    """Read serializer for training enrollments."""

    employee_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = TrainingEnrollment
        fields = [
            'id',
            'training',
            'employee',
            'employee_name',
            'status',
            'status_display',
            'completed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"


class TrainingSerializer(serializers.ModelSerializer):
    """Read serializer — includes all fields plus computed counts."""

    status_display = serializers.CharField(source='get_status_display', read_only=True)
    department_name = serializers.SerializerMethodField()
    enrolled_count = serializers.SerializerMethodField()

    class Meta:
        model = Training
        fields = [
            'id',
            'title',
            'description',
            'instructor',
            'start_date',
            'end_date',
            'max_participants',
            'status',
            'status_display',
            'department',
            'department_name',
            'enrolled_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_department_name(self, obj):
        if obj.department:
            return obj.department.name
        return None

    def get_enrolled_count(self, obj):
        return obj.enrollments.filter(
            status=TrainingEnrollment.Status.ENROLLED,
        ).count()


class TrainingCreateSerializer(serializers.Serializer):
    """Write serializer for creating a training."""

    title = serializers.CharField(max_length=300)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    instructor = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    max_participants = serializers.IntegerField(required=False, default=50)
    status = serializers.ChoiceField(
        choices=Training.Status.choices, required=False, default=Training.Status.UPCOMING,
    )
    department_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, attrs):
        if attrs['start_date'] > attrs['end_date']:
            raise serializers.ValidationError({
                'end_date': 'end_date must be greater than or equal to start_date.',
            })
        return attrs

    def create(self, validated_data):
        return Training.objects.create(
            title=validated_data['title'],
            description=validated_data.get('description', ''),
            instructor=validated_data.get('instructor', ''),
            start_date=validated_data['start_date'],
            end_date=validated_data['end_date'],
            max_participants=validated_data.get('max_participants', 50),
            status=validated_data.get('status', Training.Status.UPCOMING),
            department_id=validated_data.get('department_id'),
        )


class TrainingUpdateSerializer(serializers.Serializer):
    """Write serializer for updating a training."""

    title = serializers.CharField(max_length=300, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    instructor = serializers.CharField(max_length=200, required=False, allow_blank=True)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    max_participants = serializers.IntegerField(required=False)
    status = serializers.ChoiceField(choices=Training.Status.choices, required=False)
    department_id = serializers.UUIDField(required=False, allow_null=True)
