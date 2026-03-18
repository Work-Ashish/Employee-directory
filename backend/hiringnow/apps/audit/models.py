from common.models import BaseModel
from django.conf import settings
from django.db import models


class AuditLog(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=20)  # CREATE, UPDATE, DELETE
    resource = models.CharField(max_length=100)
    resource_id = models.CharField(max_length=100, blank=True, default='')
    path = models.CharField(max_length=500)
    method = models.CharField(max_length=10)
    status_code = models.IntegerField(default=0)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')
    changes = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['resource', '-created_at']),
        ]

    def __str__(self):
        return f'{self.action} {self.resource} by {self.user_id} at {self.created_at}'
