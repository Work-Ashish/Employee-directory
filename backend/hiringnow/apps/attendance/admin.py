from django.contrib import admin

from apps.attendance.models import Attendance, Holiday, Shift, TimeSession


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['employee', 'date', 'status', 'check_in', 'check_out', 'work_hours']
    list_filter = ['status', 'date', 'is_late']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_code']
    date_hierarchy = 'date'


@admin.register(TimeSession)
class TimeSessionAdmin(admin.ModelAdmin):
    list_display = ['employee', 'check_in', 'check_out', 'status', 'total_work']
    list_filter = ['status']
    search_fields = ['employee__first_name', 'employee__last_name']


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_time', 'end_time', 'work_days']
    search_fields = ['name']


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ['name', 'date', 'is_optional']
    list_filter = ['is_optional']
    search_fields = ['name']
    date_hierarchy = 'date'
