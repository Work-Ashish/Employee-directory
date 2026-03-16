from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee


class PerformanceTemplate(BaseModel):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    criteria = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'performance_templates'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class PerformanceReview(BaseModel):

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SUBMITTED = 'SUBMITTED', 'Submitted'
        ACKNOWLEDGED = 'ACKNOWLEDGED', 'Acknowledged'

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='performance_reviews',
    )
    reviewer = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        related_name='reviews_given',
    )
    template = models.ForeignKey(
        PerformanceTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    period = models.CharField(max_length=50)
    overall_score = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True,
    )
    strengths = models.TextField(blank=True)
    improvements = models.TextField(blank=True)
    goals = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    class Meta:
        db_table = 'performance_reviews'
        ordering = ['-created_at']

    def __str__(self):
        return f"Review: {self.employee} — {self.period}"


class PerformanceMetrics(BaseModel):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='perf_metrics',
    )
    period = models.CharField(max_length=50)
    task_completion_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
    )
    attendance_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
    )
    collaboration_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
    )
    quality_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
    )
    overall_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
    )

    class Meta:
        db_table = 'performance_metrics'
        ordering = ['-created_at']

    def __str__(self):
        return f"Metrics: {self.employee} — {self.period}"
