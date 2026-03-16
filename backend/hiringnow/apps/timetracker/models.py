from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee


class TimeSession(BaseModel):

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        COMPLETED = 'COMPLETED', 'Completed'
        PAUSED = 'PAUSED', 'Paused'

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='tracker_sessions')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    total_break_minutes = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'tracker_time_sessions'
        ordering = ['-start_time']

    def __str__(self):
        return f"{self.employee} — {self.start_time.date()}"


class BreakEntry(BaseModel):

    class BreakType(models.TextChoices):
        SHORT = 'SHORT', 'Short Break'
        LUNCH = 'LUNCH', 'Lunch'
        OTHER = 'OTHER', 'Other'

    session = models.ForeignKey(TimeSession, on_delete=models.CASCADE, related_name='breaks')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    type = models.CharField(max_length=20, choices=BreakType.choices, default=BreakType.SHORT)

    class Meta:
        db_table = 'tracker_break_entries'
        ordering = ['-start_time']

    def __str__(self):
        return f"Break: {self.session.employee} — {self.get_type_display()}"


class ActivityLog(BaseModel):

    session = models.ForeignKey(TimeSession, on_delete=models.CASCADE, related_name='activities')
    app = models.CharField(max_length=200)
    title = models.CharField(max_length=500, blank=True)
    duration = models.PositiveIntegerField(default=0)  # seconds
    category = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'activity_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.app} — {self.duration}s"
