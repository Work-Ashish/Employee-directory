from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee
from apps.departments.models import Department


class Training(BaseModel):

    class Status(models.TextChoices):
        UPCOMING = 'UPCOMING', 'Upcoming'
        ONGOING = 'ONGOING', 'Ongoing'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    instructor = models.CharField(max_length=200, blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    max_participants = models.PositiveIntegerField(default=50)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.UPCOMING,
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='trainings',
    )

    class Meta:
        db_table = 'trainings'
        ordering = ['-start_date']

    def __str__(self):
        return self.title


class TrainingEnrollment(BaseModel):

    class Status(models.TextChoices):
        ENROLLED = 'ENROLLED', 'Enrolled'
        COMPLETED = 'COMPLETED', 'Completed'
        DROPPED = 'DROPPED', 'Dropped'

    training = models.ForeignKey(
        Training,
        on_delete=models.CASCADE,
        related_name='enrollments',
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='training_enrollments',
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ENROLLED,
    )
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'training_enrollments'
        ordering = ['-created_at']
        unique_together = [('training', 'employee')]

    def __str__(self):
        return f"{self.employee} — {self.training}"
