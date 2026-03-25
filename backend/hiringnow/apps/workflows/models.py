from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee


class WorkflowTemplate(BaseModel):

    class EntityType(models.TextChoices):
        LEAVE = 'LEAVE', 'Leave Request'
        REIMBURSEMENT = 'REIMBURSEMENT', 'Reimbursement'
        RESIGNATION = 'RESIGNATION', 'Resignation'
        ASSET_REQUEST = 'ASSET_REQUEST', 'Asset Request'
        ONBOARDING = 'ONBOARDING', 'Onboarding'
        OFFBOARDING = 'OFFBOARDING', 'Offboarding'

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        PUBLISHED = 'PUBLISHED', 'Published'
        ARCHIVED = 'ARCHIVED', 'Archived'

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    entity_type = models.CharField(max_length=30, choices=EntityType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(
        Employee, on_delete=models.SET_NULL, null=True, related_name='created_workflows',
    )

    class Meta:
        db_table = 'workflow_templates'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_entity_type_display()})"


class WorkflowStep(BaseModel):

    class ApproverType(models.TextChoices):
        REPORTING_MANAGER = 'REPORTING_MANAGER', 'Reporting Manager'
        HR = 'HR', 'HR'
        DEPARTMENT_HEAD = 'DEPARTMENT_HEAD', 'Department Head'
        SPECIFIC_EMPLOYEE = 'SPECIFIC_EMPLOYEE', 'Specific Employee'
        AUTO_APPROVE = 'AUTO_APPROVE', 'Auto Approve'

    template = models.ForeignKey(
        WorkflowTemplate, on_delete=models.CASCADE, related_name='steps',
    )
    order = models.PositiveIntegerField(default=0)
    name = models.CharField(max_length=200)
    approver_type = models.CharField(max_length=30, choices=ApproverType.choices)
    approver = models.ForeignKey(
        Employee, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='workflow_approver_steps',
    )
    sla_hours = models.PositiveIntegerField(default=24, help_text='SLA in hours')
    is_optional = models.BooleanField(default=False)

    class Meta:
        db_table = 'workflow_steps'
        ordering = ['order']

    def __str__(self):
        return f"Step {self.order}: {self.name}"


class WorkflowInstance(BaseModel):

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        CANCELLED = 'CANCELLED', 'Cancelled'

    template = models.ForeignKey(
        WorkflowTemplate, on_delete=models.CASCADE, related_name='instances',
    )
    entity_id = models.UUIDField(help_text='ID of the entity this workflow is running for')
    initiated_by = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name='workflow_instances',
    )
    current_step = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    class Meta:
        db_table = 'workflow_instances'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.template.name} – {self.get_status_display()}"


class WorkflowAction(BaseModel):

    class Decision(models.TextChoices):
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        RETURNED = 'RETURNED', 'Returned for Revision'

    instance = models.ForeignKey(
        WorkflowInstance, on_delete=models.CASCADE, related_name='actions',
    )
    step = models.ForeignKey(WorkflowStep, on_delete=models.CASCADE)
    actor = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name='workflow_actions',
    )
    decision = models.CharField(max_length=20, choices=Decision.choices)
    comments = models.TextField(blank=True)

    class Meta:
        db_table = 'workflow_actions'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.get_decision_display()} by {self.actor}"
