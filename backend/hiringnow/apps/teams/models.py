from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee
from apps.departments.models import Department


class Team(BaseModel):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='teams',
    )
    lead = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='led_teams',
    )

    class Meta:
        db_table = 'teams'
        ordering = ['name']

    def __str__(self):
        return self.name


class TeamMember(BaseModel):
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='members',
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='team_memberships',
    )
    role = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = 'team_members'
        ordering = ['-created_at']
        unique_together = [('team', 'employee')]

    def __str__(self):
        return f"{self.employee} in {self.team}"
