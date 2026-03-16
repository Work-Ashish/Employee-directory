from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee


class Resignation(BaseModel):

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        WITHDRAWN = 'WITHDRAWN', 'Withdrawn'

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='resignations',
    )
    reason = models.TextField()
    last_working_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    approved_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_resignations',
    )
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'resignations'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['employee'], name='idx_resign_employee'),
            models.Index(fields=['status'], name='idx_resign_status'),
        ]

    def __str__(self):
        return f"{self.employee} — {self.get_status_display()}"
