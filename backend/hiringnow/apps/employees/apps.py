from django.apps import AppConfig


# app config for employees app
class EmployeesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.employees'
    label = 'employees'
    verbose_name = 'Employees'

    def ready(self):
        import apps.employees.signals  # noqa