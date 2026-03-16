import uuid
from django.db import models

class TenantFeature(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    feature_codename = models.CharField(max_length=100, unique=True)
    is_enabled = models.BooleanField(default=False)
    config = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tenant_features"
        ordering = ["feature_codename"]

    def __str__(self):
        return f"{self.feature_codename} ({'on' if self.is_enabled else 'off'})"
