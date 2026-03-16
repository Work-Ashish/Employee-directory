from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee


class CalendarEvent(BaseModel):

    class EventType(models.TextChoices):
        MEETING = 'MEETING', 'Meeting'
        HOLIDAY = 'HOLIDAY', 'Holiday'
        BIRTHDAY = 'BIRTHDAY', 'Birthday'
        COMPANY = 'COMPANY', 'Company Event'
        TRAINING = 'TRAINING', 'Training'

    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_all_day = models.BooleanField(default=False)
    type = models.CharField(
        max_length=20,
        choices=EventType.choices,
        default=EventType.MEETING,
    )
    created_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_events',
    )
    attendees = models.ManyToManyField(
        Employee,
        blank=True,
        related_name='events',
    )

    class Meta:
        db_table = 'calendar_events'
        ordering = ['start_date']
        indexes = [
            models.Index(fields=['start_date', 'end_date'], name='idx_event_dates'),
            models.Index(fields=['type'], name='idx_event_type'),
            models.Index(fields=['created_by'], name='idx_event_created_by'),
        ]

    def __str__(self):
        return f"{self.title} ({self.start_date.date()})"
