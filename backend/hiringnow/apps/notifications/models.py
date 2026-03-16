from django.db import models

from common.models import BaseModel
from apps.users.models import User


class Notification(BaseModel):

    class NotificationType(models.TextChoices):
        INFO = 'INFO', 'Info'
        SUCCESS = 'SUCCESS', 'Success'
        WARNING = 'WARNING', 'Warning'
        ERROR = 'ERROR', 'Error'

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    title = models.CharField(max_length=300)
    message = models.TextField()
    type = models.CharField(
        max_length=20,
        choices=NotificationType.choices,
        default=NotificationType.INFO,
    )
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=500, blank=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user'], name='idx_notif_user'),
            models.Index(fields=['is_read'], name='idx_notif_is_read'),
            models.Index(fields=['user', 'is_read'], name='idx_notif_user_read'),
        ]

    def __str__(self):
        return f"{self.title} — {self.user}"


class AdminAlert(BaseModel):

    class Severity(models.TextChoices):
        INFO = 'INFO', 'Info'
        WARNING = 'WARNING', 'Warning'
        CRITICAL = 'CRITICAL', 'Critical'

    title = models.CharField(max_length=300)
    message = models.TextField()
    severity = models.CharField(
        max_length=20,
        choices=Severity.choices,
        default=Severity.INFO,
    )
    is_resolved = models.BooleanField(default=False)

    class Meta:
        db_table = 'admin_alerts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['severity'], name='idx_alert_severity'),
            models.Index(fields=['is_resolved'], name='idx_alert_resolved'),
        ]

    def __str__(self):
        return f"[{self.get_severity_display()}] {self.title}"
