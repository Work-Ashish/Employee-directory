from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee


class Ticket(BaseModel):

    class Category(models.TextChoices):
        IT = 'IT', 'IT Support'
        HR = 'HR', 'HR'
        FACILITIES = 'FACILITIES', 'Facilities'
        FINANCE = 'FINANCE', 'Finance'
        OTHER = 'OTHER', 'Other'

    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        URGENT = 'URGENT', 'Urgent'

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        RESOLVED = 'RESOLVED', 'Resolved'
        CLOSED = 'CLOSED', 'Closed'

    subject = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    assigned_to = models.ForeignKey(
        Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets',
    )
    created_by = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name='created_tickets',
    )

    class Meta:
        db_table = 'tickets'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_priority_display()}] {self.subject}"
