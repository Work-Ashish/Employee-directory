from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee


class Leave(BaseModel):

    class LeaveType(models.TextChoices):
        CASUAL = 'CASUAL', 'Casual'
        SICK = 'SICK', 'Sick'
        EARNED = 'EARNED', 'Earned'
        MATERNITY = 'MATERNITY', 'Maternity'
        PATERNITY = 'PATERNITY', 'Paternity'
        UNPAID = 'UNPAID', 'Unpaid'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    type = models.CharField(max_length=20, choices=LeaveType.choices)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='leaves',
    )

    class Meta:
        db_table = 'leaves'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['employee'], name='idx_leave_employee'),
            models.Index(fields=['status'], name='idx_leave_status'),
            models.Index(
                fields=['employee', 'start_date', 'end_date'],
                name='idx_leave_emp_dates',
            ),
        ]

    def __str__(self):
        return (
            f"{self.employee.first_name} {self.employee.last_name} "
            f"— {self.get_type_display()} ({self.start_date} to {self.end_date})"
        )
