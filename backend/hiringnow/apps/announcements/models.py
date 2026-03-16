from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee


class Announcement(BaseModel):

    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        NORMAL = 'NORMAL', 'Normal'
        HIGH = 'HIGH', 'High'
        URGENT = 'URGENT', 'Urgent'

    title = models.CharField(max_length=300)
    content = models.TextField()
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        Employee, on_delete=models.SET_NULL, null=True, related_name='announcements',
    )

    class Meta:
        db_table = 'announcements'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Kudos(BaseModel):

    class Category(models.TextChoices):
        TEAMWORK = 'TEAMWORK', 'Teamwork'
        INNOVATION = 'INNOVATION', 'Innovation'
        LEADERSHIP = 'LEADERSHIP', 'Leadership'
        HELPING = 'HELPING', 'Helping Hand'
        EXCELLENCE = 'EXCELLENCE', 'Excellence'

    from_employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name='kudos_given',
    )
    to_employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name='kudos_received',
    )
    message = models.TextField()
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.TEAMWORK)
    is_public = models.BooleanField(default=True)

    class Meta:
        db_table = 'kudos'
        ordering = ['-created_at']

    def __str__(self):
        return f"Kudos: {self.from_employee} -> {self.to_employee}"
