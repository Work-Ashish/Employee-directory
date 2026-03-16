from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee


class EmployeeFeedback(BaseModel):

    class FeedbackType(models.TextChoices):
        PEER = 'PEER', 'Peer'
        MANAGER = 'MANAGER', 'Manager'
        ANONYMOUS = 'ANONYMOUS', 'Anonymous'

    from_employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='feedback_given',
    )
    to_employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='feedback_received',
    )
    type = models.CharField(max_length=20, choices=FeedbackType.choices)
    rating = models.PositiveIntegerField(default=0)
    content = models.TextField()
    is_anonymous = models.BooleanField(default=False)

    class Meta:
        db_table = 'employee_feedback'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['from_employee'], name='idx_feedback_from'),
            models.Index(fields=['to_employee'], name='idx_feedback_to'),
            models.Index(fields=['type'], name='idx_feedback_type'),
        ]

    def __str__(self):
        return f"Feedback: {self.from_employee} -> {self.to_employee or 'General'}"
