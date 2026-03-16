from django.db import models


class TenantAwareManager(models.Manager):
    # keep API-compatible manager; DB isolation is already by database
    def for_tenant(self, tenant):
        return self.get_queryset()