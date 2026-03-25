from apps.workflows.models import WorkflowTemplate, WorkflowInstance


def initiate_workflow(entity_type: str, entity_id, initiated_by_employee):
    """
    Find the first PUBLISHED workflow template matching entity_type.
    If found, create a WorkflowInstance and return it.
    If no matching template, return None (module proceeds without workflow).
    """
    template = WorkflowTemplate.objects.filter(
        entity_type=entity_type,
        status=WorkflowTemplate.Status.PUBLISHED,
    ).first()

    if not template:
        return None

    instance = WorkflowInstance.objects.create(
        template=template,
        entity_id=entity_id,
        initiated_by=initiated_by_employee,
        current_step=1,
        status=WorkflowInstance.Status.IN_PROGRESS,
    )
    return instance


def get_workflow_status(entity_type: str, entity_id):
    """Get the latest workflow instance for an entity."""
    return WorkflowInstance.objects.filter(
        template__entity_type=entity_type,
        entity_id=entity_id,
    ).select_related('template').prefetch_related('template__steps').order_by('-created_at').first()
