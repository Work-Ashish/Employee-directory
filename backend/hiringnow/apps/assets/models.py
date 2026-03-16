from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee


class Asset(BaseModel):

    class AssetType(models.TextChoices):
        LAPTOP = 'LAPTOP', 'Laptop'
        PHONE = 'PHONE', 'Phone'
        MONITOR = 'MONITOR', 'Monitor'
        KEYBOARD = 'KEYBOARD', 'Keyboard'
        HEADSET = 'HEADSET', 'Headset'
        OTHER = 'OTHER', 'Other'

    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        ASSIGNED = 'ASSIGNED', 'Assigned'
        MAINTENANCE = 'MAINTENANCE', 'Maintenance'
        RETIRED = 'RETIRED', 'Retired'

    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=AssetType.choices)
    serial_number = models.CharField(max_length=100, blank=True)
    assigned_to = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assets',
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.AVAILABLE,
    )
    purchase_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'assets'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.serial_number})"
