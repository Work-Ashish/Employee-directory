from django.db import models

from common.models import BaseModel


class Department(BaseModel):
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, blank=True, default='#6366f1')

    class Meta:
        db_table = 'departments'
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(fields=['name'], name='unique_department_name'),
        ]

    def __str__(self):
        return self.name
