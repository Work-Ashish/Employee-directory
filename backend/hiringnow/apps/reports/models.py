from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee


class SavedReport(BaseModel):

    class ReportType(models.TextChoices):
        EMPLOYEE = 'EMPLOYEE', 'Employee'
        ATTENDANCE = 'ATTENDANCE', 'Attendance'
        PAYROLL = 'PAYROLL', 'Payroll'
        LEAVE = 'LEAVE', 'Leave'
        PERFORMANCE = 'PERFORMANCE', 'Performance'
        CUSTOM = 'CUSTOM', 'Custom'

    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=ReportType.choices)
    config = models.JSONField(default=dict)
    created_by = models.ForeignKey(
        Employee, on_delete=models.SET_NULL, null=True, related_name='saved_reports',
    )

    class Meta:
        db_table = 'saved_reports'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class ReportSchedule(BaseModel):

    class Frequency(models.TextChoices):
        DAILY = 'DAILY', 'Daily'
        WEEKLY = 'WEEKLY', 'Weekly'
        MONTHLY = 'MONTHLY', 'Monthly'

    report = models.ForeignKey(SavedReport, on_delete=models.CASCADE, related_name='schedules')
    frequency = models.CharField(max_length=20, choices=Frequency.choices)
    next_run = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'report_schedules'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.report.name} — {self.get_frequency_display()}"
