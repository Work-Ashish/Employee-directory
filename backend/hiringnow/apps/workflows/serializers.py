from rest_framework import serializers

from apps.workflows.models import (
    WorkflowTemplate,
    WorkflowStep,
    WorkflowInstance,
    WorkflowAction,
)


class WorkflowStepSerializer(serializers.ModelSerializer):
    approver_name = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowStep
        fields = [
            'id', 'order', 'name', 'approver_type', 'approver', 'approver_name',
            'sla_hours', 'is_optional', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_approver_name(self, obj):
        if obj.approver:
            return f"{obj.approver.first_name} {obj.approver.last_name}"
        return None


class WorkflowTemplateSerializer(serializers.ModelSerializer):
    steps = WorkflowStepSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    entity_type_display = serializers.CharField(source='get_entity_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = WorkflowTemplate
        fields = [
            'id', 'name', 'description', 'entity_type', 'entity_type_display',
            'status', 'status_display', 'steps', 'created_by', 'created_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return None


class WorkflowTemplateCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    entity_type = serializers.ChoiceField(choices=WorkflowTemplate.EntityType.choices)
    status = serializers.ChoiceField(
        choices=WorkflowTemplate.Status.choices,
        required=False,
        default=WorkflowTemplate.Status.DRAFT,
    )
    steps = serializers.ListField(child=serializers.DictField(), required=False, default=list)

    def create(self, validated_data):
        steps_data = validated_data.pop('steps', [])
        template = WorkflowTemplate.objects.create(
            name=validated_data['name'],
            description=validated_data.get('description', ''),
            entity_type=validated_data['entity_type'],
            status=validated_data.get('status', WorkflowTemplate.Status.DRAFT),
            created_by_id=validated_data.get('created_by_id'),
        )
        for i, step in enumerate(steps_data):
            WorkflowStep.objects.create(
                template=template,
                order=step.get('order', i),
                name=step.get('name', f'Step {i + 1}'),
                approver_type=step.get('approver_type', 'REPORTING_MANAGER'),
                approver_id=step.get('approver_id'),
                sla_hours=step.get('sla_hours', 24),
                is_optional=step.get('is_optional', False),
            )
        return template


class WorkflowActionSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    step_name = serializers.SerializerMethodField()
    decision_display = serializers.CharField(source='get_decision_display', read_only=True)

    class Meta:
        model = WorkflowAction
        fields = [
            'id', 'step', 'step_name', 'actor', 'actor_name',
            'decision', 'decision_display', 'comments', 'created_at',
        ]
        read_only_fields = fields

    def get_actor_name(self, obj):
        if obj.actor:
            return f"{obj.actor.first_name} {obj.actor.last_name}"
        return None

    def get_step_name(self, obj):
        if obj.step:
            return obj.step.name
        return None


class WorkflowInstanceSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', read_only=True)
    entity_type = serializers.CharField(source='template.entity_type', read_only=True)
    initiated_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    actions = WorkflowActionSerializer(many=True, read_only=True)
    steps = serializers.SerializerMethodField()
    total_steps = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowInstance
        fields = [
            'id', 'template', 'template_name', 'entity_type', 'entity_id',
            'initiated_by', 'initiated_by_name', 'current_step', 'total_steps',
            'status', 'status_display', 'actions', 'steps',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_initiated_by_name(self, obj):
        if obj.initiated_by:
            return f"{obj.initiated_by.first_name} {obj.initiated_by.last_name}"
        return None

    def get_steps(self, obj):
        return WorkflowStepSerializer(obj.template.steps.all(), many=True).data

    def get_total_steps(self, obj):
        return obj.template.steps.count()


class WorkflowInstanceCreateSerializer(serializers.Serializer):
    template_id = serializers.UUIDField()
    entity_id = serializers.UUIDField()

    def validate_template_id(self, value):
        try:
            template = WorkflowTemplate.objects.get(pk=value, status=WorkflowTemplate.Status.PUBLISHED)
        except WorkflowTemplate.DoesNotExist:
            raise serializers.ValidationError('Workflow template not found or not published.')
        return value

    def create(self, validated_data):
        template = WorkflowTemplate.objects.get(pk=validated_data['template_id'])
        instance = WorkflowInstance.objects.create(
            template=template,
            entity_id=validated_data['entity_id'],
            initiated_by_id=validated_data['initiated_by_id'],
            status=WorkflowInstance.Status.IN_PROGRESS,
            current_step=1,
        )
        return instance


class WorkflowActionCreateSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=WorkflowAction.Decision.choices)
    comments = serializers.CharField(required=False, allow_blank=True, default='')
