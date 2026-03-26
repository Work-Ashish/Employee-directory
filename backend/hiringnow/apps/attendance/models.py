from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee


# ── Attendance ───────────────────────────────────────────────────────

class Attendance(BaseModel):

    class Status(models.TextChoices):
        PRESENT = 'PRESENT', 'Present'
        ABSENT = 'ABSENT', 'Absent'
        HALF_DAY = 'HALF_DAY', 'Half Day'
        ON_LEAVE = 'ON_LEAVE', 'On Leave'
        WEEKEND = 'WEEKEND', 'Weekend'

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='attendances',
    )
    date = models.DateField()
    check_in = models.DateTimeField(null=True, blank=True)
    check_out = models.DateTimeField(null=True, blank=True)
    work_hours = models.FloatField(null=True, blank=True)
    overtime = models.FloatField(default=0, help_text='Overtime in minutes')
    is_late = models.BooleanField(default=False)
    is_early_exit = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PRESENT,
    )

    class Meta:
        db_table = 'attendances'
        ordering = ['-date']
        unique_together = [('employee', 'date')]
        indexes = [
            models.Index(fields=['employee', 'date']),
        ]

    def __str__(self):
        return f"{self.employee} - {self.date} ({self.status})"


# ── Time Session ─────────────────────────────────────────────────────

class TimeSession(BaseModel):

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        BREAK = 'BREAK', 'Break'
        COMPLETED = 'COMPLETED', 'Completed'

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='time_sessions',
    )
    check_in = models.DateTimeField(auto_now_add=True)
    check_out = models.DateTimeField(null=True, blank=True)
    total_work = models.IntegerField(default=0, help_text='Total work in seconds')
    total_break = models.IntegerField(default=0, help_text='Total break in seconds')
    total_idle = models.IntegerField(default=0, help_text='Total idle in seconds')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = 'time_sessions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee} - {self.check_in:%Y-%m-%d %H:%M} ({self.status})"


# ── Break Entry ──────────────────────────────────────────────────────

class BreakEntry(BaseModel):
    session = models.ForeignKey(
        TimeSession,
        on_delete=models.CASCADE,
        related_name='breaks',
    )
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    reason = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'break_entries'

    def __str__(self):
        return f"Break for session {self.session_id}"


# ── Shift ────────────────────────────────────────────────────────────

class Shift(BaseModel):
    name = models.CharField(max_length=100)
    start_time = models.TimeField()
    end_time = models.TimeField()
    work_days = models.JSONField(
        default=list,
        help_text='List of integers 0-6 (Mon=0, Sun=6)',
    )

    class Meta:
        db_table = 'shifts'
        ordering = ['name']

    def __str__(self):
        return self.name


# ── Shift Assignment ─────────────────────────────────────────────────

class ShiftAssignment(BaseModel):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='shift_assignments',
    )
    shift = models.ForeignKey(
        Shift,
        on_delete=models.CASCADE,
        related_name='assignments',
    )
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'shift_assignments'

    def __str__(self):
        return f"{self.employee} -> {self.shift} ({self.start_date})"


# ── Attendance Policy ────────────────────────────────────────────────

class AttendancePolicy(BaseModel):
    name = models.CharField(max_length=100, default='DEFAULT')
    late_grace_period = models.IntegerField(
        default=15,
        help_text='Late grace period in minutes',
    )
    early_exit_grace = models.IntegerField(
        default=15,
        help_text='Early exit grace period in minutes',
    )
    ot_threshold = models.IntegerField(
        default=60,
        help_text='Overtime threshold in minutes',
    )

    class Meta:
        db_table = 'attendance_policies'

    def __str__(self):
        return self.name


# ── Holiday ──────────────────────────────────────────────────────────

class Holiday(BaseModel):
    name = models.CharField(max_length=200)
    date = models.DateField()
    is_optional = models.BooleanField(default=False)

    class Meta:
        db_table = 'holidays'
        ordering = ['date']

    def __str__(self):
        return f"{self.name} ({self.date})"


# ── Attendance Regularization ────────────────────────────────────────

class AttendanceRegularization(BaseModel):

    class Type(models.TextChoices):
        MISSING_PUNCH = 'MISSING_PUNCH', 'Missing Punch'
        LATE_CORRECTION = 'LATE_CORRECTION', 'Late Correction'
        EARLY_EXIT_CORRECTION = 'EARLY_EXIT_CORRECTION', 'Early Exit Correction'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    attendance = models.OneToOneField(
        Attendance,
        on_delete=models.CASCADE,
        related_name='regularization',
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='regularizations',
    )
    reason = models.TextField()
    requested_time = models.DateTimeField(null=True, blank=True)
    type = models.CharField(max_length=30, choices=Type.choices)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'attendance_regularizations'

    def __str__(self):
        return f"Regularization: {self.employee} - {self.attendance.date} ({self.status})"
