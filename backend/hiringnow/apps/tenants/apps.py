from django.apps import AppConfig


# app config for tenants (registry) app
class TenantsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.tenants'
    label = 'tenants'
    verbose_name = 'Tenants'