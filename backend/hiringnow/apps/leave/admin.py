from django.contrib import admin

from apps.leave.models import Leave


@admin.register(Leave)
class LeaveAdmin(admin.ModelAdmin):
    list_display = ['employee', 'type', 'start_date', 'end_date', 'status', 'created_at']
    list_filter = ['type', 'status']
    search_fields = [
        'employee__first_name',
        'employee__last_name',
        'employee__employee_code',
    ]
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-created_at']
