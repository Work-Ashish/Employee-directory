from django.db import models

from common.models import BaseModel


class AgentDevice(BaseModel):
    """A desktop agent installed on an employee's machine."""

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        PENDING = 'PENDING', 'Pending'
        SUSPENDED = 'SUSPENDED', 'Suspended'
        UNINSTALLED = 'UNINSTALLED', 'Uninstalled'

    class Platform(models.TextChoices):
        WINDOWS = 'WINDOWS', 'Windows'
        MACOS = 'MACOS', 'macOS'
        LINUX = 'LINUX', 'Linux'

    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='agent_devices',
    )
    device_name = models.CharField(max_length=200)
    platform = models.CharField(max_length=20, choices=Platform.choices)
    agent_version = models.CharField(max_length=50, default='1.0.0')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    last_heartbeat = models.DateTimeField(null=True, blank=True)
    machine_id = models.CharField(max_length=200, unique=True)

    class Meta:
        db_table = 'agent_devices'
        ordering = ['-last_heartbeat']

    def __str__(self):
        return f"{self.device_name} ({self.machine_id})"


class ActivitySession(BaseModel):
    """A continuous period of activity on a device."""

    device = models.ForeignKey(
        AgentDevice,
        on_delete=models.CASCADE,
        related_name='sessions',
    )
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    active_seconds = models.PositiveIntegerField(default=0)
    idle_seconds = models.PositiveIntegerField(default=0)
    keystrokes = models.PositiveIntegerField(default=0)
    mouse_clicks = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'agent_activity_sessions'
        ordering = ['-started_at']

    def __str__(self):
        return f"Session {self.id} on {self.device}"


class AppUsage(BaseModel):
    """Time spent in a specific application."""

    class Category(models.TextChoices):
        PRODUCTIVE = 'PRODUCTIVE', 'Productive'
        NEUTRAL = 'NEUTRAL', 'Neutral'
        UNPRODUCTIVE = 'UNPRODUCTIVE', 'Unproductive'
        UNCATEGORIZED = 'UNCATEGORIZED', 'Uncategorized'

    session = models.ForeignKey(
        ActivitySession,
        on_delete=models.CASCADE,
        related_name='app_usages',
    )
    app_name = models.CharField(max_length=300)
    window_title = models.CharField(max_length=500, blank=True)
    total_seconds = models.PositiveIntegerField(default=0)
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.UNCATEGORIZED,
    )

    class Meta:
        db_table = 'agent_app_usage'

    def __str__(self):
        return f"{self.app_name} ({self.total_seconds}s)"


class WebsiteVisit(BaseModel):
    """Website visited during a session."""

    session = models.ForeignKey(
        ActivitySession,
        on_delete=models.CASCADE,
        related_name='website_visits',
    )
    domain = models.CharField(max_length=500)
    url = models.URLField(max_length=2000, blank=True)
    total_seconds = models.PositiveIntegerField(default=0)
    category = models.CharField(
        max_length=20,
        choices=AppUsage.Category.choices,
        default=AppUsage.Category.UNCATEGORIZED,
    )

    class Meta:
        db_table = 'agent_website_visits'

    def __str__(self):
        return f"{self.domain} ({self.total_seconds}s)"


class IdleEvent(BaseModel):
    """When user was detected idle for 10+ minutes."""

    class Response(models.TextChoices):
        WORKING = 'WORKING', 'Was Working'
        BREAK = 'BREAK', 'Took a Break'
        NO_RESPONSE = 'NO_RESPONSE', 'No Response'

    session = models.ForeignKey(
        ActivitySession,
        on_delete=models.CASCADE,
        related_name='idle_events',
    )
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    response = models.CharField(
        max_length=20,
        choices=Response.choices,
        default=Response.NO_RESPONSE,
    )
    work_description = models.TextField(blank=True)

    class Meta:
        db_table = 'agent_idle_events'
        ordering = ['-started_at']

    def __str__(self):
        return f"Idle {self.duration_seconds}s at {self.started_at}"


class AgentCommand(BaseModel):
    """Command queue for devices."""

    class CommandType(models.TextChoices):
        SUSPEND = 'SUSPEND', 'Suspend'
        RESUME = 'RESUME', 'Resume'
        KILL_SWITCH = 'KILL_SWITCH', 'Kill Switch'
        UNINSTALL = 'UNINSTALL', 'Uninstall'
        WIPE_DATA = 'WIPE_DATA', 'Wipe Data'
        FORCE_SYNC = 'FORCE_SYNC', 'Force Sync'
        FORCE_UPDATE = 'FORCE_UPDATE', 'Force Update'
        UPDATE_CONFIG = 'UPDATE_CONFIG', 'Update Config'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        DELIVERED = 'DELIVERED', 'Delivered'
        EXECUTED = 'EXECUTED', 'Executed'
        FAILED = 'FAILED', 'Failed'

    device = models.ForeignKey(
        AgentDevice,
        on_delete=models.CASCADE,
        related_name='commands',
    )
    type = models.CharField(max_length=20, choices=CommandType.choices)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    payload = models.JSONField(default=dict, blank=True)
    executed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'agent_commands'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.type} -> {self.device} ({self.status})"


class Screenshot(BaseModel):
    """Screenshot captured during a session."""

    session = models.ForeignKey(
        ActivitySession,
        on_delete=models.CASCADE,
        related_name='screenshots',
    )
    image_url = models.URLField(max_length=500)
    captured_at = models.DateTimeField()

    class Meta:
        db_table = 'agent_screenshots'
        ordering = ['-captured_at']

    def __str__(self):
        return f"Screenshot at {self.captured_at}"


class DailyActivitySummary(BaseModel):
    """Pre-computed daily activity summary for an employee."""

    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='activity_summaries',
    )
    date = models.DateField()
    total_seconds = models.PositiveIntegerField(default=0)
    active_seconds = models.PositiveIntegerField(default=0)
    idle_seconds = models.PositiveIntegerField(default=0)
    productive_seconds = models.PositiveIntegerField(default=0)
    unproductive_seconds = models.PositiveIntegerField(default=0)
    neutral_seconds = models.PositiveIntegerField(default=0)
    keystroke_count = models.PositiveIntegerField(default=0)
    mouse_click_count = models.PositiveIntegerField(default=0)
    screenshot_count = models.PositiveIntegerField(default=0)
    idle_event_count = models.PositiveIntegerField(default=0)
    productivity_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
    )
    top_apps = models.JSONField(default=list)
    top_websites = models.JSONField(default=list)
    clock_in = models.DateTimeField(null=True, blank=True)
    clock_out = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'agent_daily_summaries'
        unique_together = [('employee', 'date')]
        ordering = ['-date']

    def __str__(self):
        return f"Summary {self.employee_id} on {self.date}"
