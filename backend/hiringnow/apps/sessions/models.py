from django.db import models

from common.models import BaseModel
from apps.users.models import User


class UserSession(BaseModel):

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='managed_sessions')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    last_activity = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'managed_user_sessions'
        ordering = ['-last_activity']

    def __str__(self):
        return f"{self.user.email} — {self.ip_address}"
