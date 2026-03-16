from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee


class FunctionalRole(BaseModel):

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'functional_roles'
        ordering = ['name']

    def __str__(self):
        return self.name


class RoleCapability(BaseModel):

    role = models.ForeignKey(FunctionalRole, on_delete=models.CASCADE, related_name='capabilities')
    capability = models.CharField(max_length=100)

    class Meta:
        db_table = 'role_capabilities'
        unique_together = [('role', 'capability')]

    def __str__(self):
        return f"{self.role.name}: {self.capability}"


class EmployeeFunctionalRole(BaseModel):

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='functional_roles')
    role = models.ForeignKey(FunctionalRole, on_delete=models.CASCADE, related_name='assignments')
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'employee_functional_roles'
        unique_together = [('employee', 'role')]

    def __str__(self):
        return f"{self.employee} — {self.role}"
