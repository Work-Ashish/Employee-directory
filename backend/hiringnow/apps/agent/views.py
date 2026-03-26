from datetime import timedelta

from django.db import transaction
from django.db.models import Sum, Count, Q, F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.agent.models import (
    AgentDevice,
    ActivitySession,
    AppUsage,
    WebsiteVisit,
    IdleEvent,
    AgentCommand,
    Screenshot,
    DailyActivitySummary,
)
from apps.agent.serializers import (
    AgentDeviceSerializer,
    AgentCommandSerializer,
    DeviceRegisterSerializer,
    HeartbeatSerializer,
    DeviceStatusUpdateSerializer,
    CommandCreateSerializer,
    IngestBulkSerializer,
)
from apps.agent.categorization import categorize_app, categorize_domain
from apps.agent.services import compute_daily_summary


# ---------------------------------------------------------------------------
# Admin endpoints (called by the frontend dashboard)
# ---------------------------------------------------------------------------

class AgentDashboardView(APIView):
    """
    GET /admin/agent/dashboard/
    Aggregated stats for the agent tracking dashboard.
    """
    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('assets.view')]

    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        stale_threshold = now - timedelta(minutes=10)

        # -- Device counts by status
        device_qs = AgentDevice.objects.all()
        device_counts = {
            'active': device_qs.filter(status=AgentDevice.Status.ACTIVE).count(),
            'pending': device_qs.filter(status=AgentDevice.Status.PENDING).count(),
            'suspended': device_qs.filter(status=AgentDevice.Status.SUSPENDED).count(),
            'uninstalled': device_qs.filter(status=AgentDevice.Status.UNINSTALLED).count(),
        }
        device_counts['total'] = sum(device_counts.values())

        # -- Today's session aggregates
        today_sessions = ActivitySession.objects.filter(started_at__gte=today_start)
        session_agg = today_sessions.aggregate(
            total_active=Sum('active_seconds'),
            total_idle=Sum('idle_seconds'),
            total_keystrokes=Sum('keystrokes'),
            total_mouse_clicks=Sum('mouse_clicks'),
        )
        total_active = session_agg['total_active'] or 0
        total_idle = session_agg['total_idle'] or 0
        total_time = total_active + total_idle
        avg_productivity = round(total_active / total_time, 2) if total_time > 0 else 0

        snapshot_count = Screenshot.objects.filter(
            captured_at__gte=today_start,
        ).count()

        idle_event_count = IdleEvent.objects.filter(
            started_at__gte=today_start,
        ).count()

        today_data = {
            'avg_productivity': avg_productivity,
            'total_active_seconds': total_active,
            'total_idle_seconds': total_idle,
            'total_keystrokes': session_agg['total_keystrokes'] or 0,
            'total_mouse_clicks': session_agg['total_mouse_clicks'] or 0,
            'snapshot_count': snapshot_count,
            'idle_event_count': idle_event_count,
        }

        # -- Top apps today (top 10 by total seconds)
        today_session_ids = today_sessions.values_list('id', flat=True)
        top_apps = (
            AppUsage.objects
            .filter(session_id__in=today_session_ids)
            .values('app_name', 'category')
            .annotate(total_seconds=Sum('total_seconds'))
            .order_by('-total_seconds')[:10]
        )

        # -- Top websites today (top 10 by total seconds)
        top_websites = (
            WebsiteVisit.objects
            .filter(session_id__in=today_session_ids)
            .values('domain', 'category')
            .annotate(total_seconds=Sum('total_seconds'))
            .order_by('-total_seconds')[:10]
        )

        # -- Stale devices (active but no heartbeat for 10+ min)
        stale_devices = (
            AgentDevice.objects
            .filter(status=AgentDevice.Status.ACTIVE)
            .filter(
                Q(last_heartbeat__lt=stale_threshold) |
                Q(last_heartbeat__isnull=True)
            )
            .select_related('employee')[:20]
        )
        stale_list = [
            {
                'id': str(d.id),
                'device_name': d.device_name,
                'employee_name': f"{d.employee.first_name} {d.employee.last_name}",
                'last_heartbeat': d.last_heartbeat.isoformat() if d.last_heartbeat else None,
            }
            for d in stale_devices
        ]

        return Response({
            'devices': device_counts,
            'today': today_data,
            'top_apps': list(top_apps),
            'top_websites': list(top_websites),
            'stale_devices': stale_list,
        })


class AgentDeviceListView(APIView):
    """
    GET  /admin/agent/devices/ -- paginated device list
    POST /admin/agent/devices/ -- update device status
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('assets.view')]

    def get(self, request):
        queryset = (
            AgentDevice.objects
            .select_related('employee')
            .order_by('-last_heartbeat')
        )

        # -- Filters
        status_filter = request.query_params.get('status')
        search = request.query_params.get('search', '').strip()

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if search:
            queryset = queryset.filter(
                Q(device_name__icontains=search) |
                Q(employee__first_name__icontains=search) |
                Q(employee__last_name__icontains=search) |
                Q(employee__employee_code__icontains=search)
            )

        # -- Pagination
        try:
            page = max(int(request.query_params.get('page', 1)), 1)
            limit = min(int(request.query_params.get('limit', 20)), 100)
        except (TypeError, ValueError):
            page, limit = 1, 20

        total = queryset.count()
        start = (page - 1) * limit
        page_qs = queryset[start:start + limit]

        return Response({
            'data': AgentDeviceSerializer(page_qs, many=True).data,
            'error': None,
            'meta': {
                'total': total,
                'page': page,
                'limit': limit,
                'total_pages': (total + limit - 1) // limit if total > 0 else 1,
            },
        })

    def post(self, request):
        """Update device status (approve, suspend, etc.)."""
        serializer = DeviceStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        device = get_object_or_404(
            AgentDevice, pk=serializer.validated_data['device_id'],
        )
        device.status = serializer.validated_data['status']
        device.save(update_fields=['status', 'updated_at'])

        return Response(AgentDeviceSerializer(device).data)


class AgentCommandView(APIView):
    """
    POST /admin/agent/command/ -- issue a command to a device
    """
    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('assets.manage')]

    def post(self, request):
        serializer = CommandCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        device = get_object_or_404(
            AgentDevice, pk=serializer.validated_data['device_id'],
        )
        cmd = AgentCommand.objects.create(
            device=device,
            type=serializer.validated_data['type'],
            payload=serializer.validated_data.get('payload', {}),
        )

        # Side-effects: certain commands also update device status
        status_map = {
            AgentCommand.CommandType.SUSPEND: AgentDevice.Status.SUSPENDED,
            AgentCommand.CommandType.KILL_SWITCH: AgentDevice.Status.SUSPENDED,
            AgentCommand.CommandType.UNINSTALL: AgentDevice.Status.UNINSTALLED,
            AgentCommand.CommandType.RESUME: AgentDevice.Status.ACTIVE,
        }
        new_status = status_map.get(cmd.type)
        if new_status:
            device.status = new_status
            device.save(update_fields=['status', 'updated_at'])

        return Response(
            AgentCommandSerializer(cmd).data,
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------------------------
# Agent endpoints (called by the desktop agent application)
# ---------------------------------------------------------------------------

class AgentRegisterView(APIView):
    """
    POST /agent/register/ -- first-time device registration
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DeviceRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Idempotent: if machine_id exists, return existing device
        existing = AgentDevice.objects.filter(machine_id=data['machine_id']).first()
        if existing:
            return Response(AgentDeviceSerializer(existing).data)

        # Resolve employee from JWT if not provided
        employee_id = data.get('employee_id')
        if not employee_id:
            employee_profile = getattr(request.user, 'employee_profile', None)
            if not employee_profile:
                return Response(
                    {'detail': 'No employee profile linked to your account.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            employee_id = employee_profile.id

        device = AgentDevice.objects.create(
            employee_id=employee_id,
            device_name=data['device_name'],
            platform=data['platform'],
            machine_id=data['machine_id'],
            agent_version=data.get('agent_version', '1.0.0'),
            status=AgentDevice.Status.PENDING,
        )
        return Response(
            AgentDeviceSerializer(device).data,
            status=status.HTTP_201_CREATED,
        )


class AgentHeartbeatView(APIView):
    """
    POST /agent/heartbeat/ -- agent pings every 30s
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = HeartbeatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Find device by ID or machine_id
        device = None
        if data.get('device_id'):
            device = AgentDevice.objects.filter(pk=data['device_id']).first()
        if not device and data.get('machine_id'):
            device = AgentDevice.objects.filter(machine_id=data['machine_id']).first()
        if not device:
            return Response({'detail': 'Device not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Verify device ownership
        if device.employee.user != request.user:
            return Response({'error': 'Device not owned by authenticated user'}, status=status.HTTP_403_FORBIDDEN)

        device.last_heartbeat = timezone.now()
        update_fields = ['last_heartbeat', 'updated_at']

        if data.get('agent_version'):
            device.agent_version = data['agent_version']
            update_fields.append('agent_version')

        device.save(update_fields=update_fields)

        return Response({'status': 'ok', 'server_time': timezone.now().isoformat()})


class AgentIngestView(APIView):
    """
    POST /agent/ingest/ -- bulk activity data upload from desktop agent
    Accepts sessions with nested app_usages, website_visits, idle_events, screenshots.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = IngestBulkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        device = get_object_or_404(AgentDevice, pk=data['device_id'])

        # Verify device ownership
        if device.employee.user != request.user:
            return Response({'error': 'Device not owned by authenticated user'}, status=status.HTTP_403_FORBIDDEN)

        # Reject if device is not active
        if device.status != AgentDevice.Status.ACTIVE:
            return Response(
                {'detail': f'Device is {device.status}, cannot ingest data.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        created_sessions = 0
        with transaction.atomic():
            for sess_data in data['sessions']:
                session = ActivitySession.objects.create(
                    device=device,
                    started_at=sess_data['started_at'],
                    ended_at=sess_data.get('ended_at'),
                    active_seconds=sess_data.get('active_seconds', 0),
                    idle_seconds=sess_data.get('idle_seconds', 0),
                    keystrokes=sess_data.get('keystrokes', 0),
                    mouse_clicks=sess_data.get('mouse_clicks', 0),
                )

                # Bulk create nested records with auto-categorization
                app_usages = sess_data.get('app_usages', [])
                if app_usages:
                    app_objs = []
                    for a in app_usages:
                        cat = a.get('category', AppUsage.Category.UNCATEGORIZED)
                        if cat == AppUsage.Category.UNCATEGORIZED:
                            cat = categorize_app(a['app_name'])
                        app_objs.append(AppUsage(
                            session=session,
                            app_name=a['app_name'],
                            window_title=a.get('window_title', ''),
                            total_seconds=a['total_seconds'],
                            category=cat,
                        ))
                    AppUsage.objects.bulk_create(app_objs)

                website_visits = sess_data.get('website_visits', [])
                if website_visits:
                    visit_objs = []
                    for w in website_visits:
                        cat = w.get('category', AppUsage.Category.UNCATEGORIZED)
                        if cat == AppUsage.Category.UNCATEGORIZED:
                            cat = categorize_domain(w['domain'])
                        visit_objs.append(WebsiteVisit(
                            session=session,
                            domain=w['domain'],
                            url=w.get('url', ''),
                            total_seconds=w['total_seconds'],
                            category=cat,
                        ))
                    WebsiteVisit.objects.bulk_create(visit_objs)

                idle_events = sess_data.get('idle_events', [])
                if idle_events:
                    IdleEvent.objects.bulk_create([
                        IdleEvent(
                            session=session,
                            started_at=ie['started_at'],
                            ended_at=ie.get('ended_at'),
                            duration_seconds=ie['duration_seconds'],
                            response=ie.get('response', IdleEvent.Response.NO_RESPONSE),
                            work_description=ie.get('work_description', ''),
                        )
                        for ie in idle_events
                    ])

                screenshots = sess_data.get('screenshots', [])
                if screenshots:
                    Screenshot.objects.bulk_create([
                        Screenshot(
                            session=session,
                            image_url=s['image_url'],
                            captured_at=s['captured_at'],
                        )
                        for s in screenshots
                    ])

                created_sessions += 1

        return Response({
            'status': 'ok',
            'sessions_created': created_sessions,
        }, status=status.HTTP_201_CREATED)


class AgentPollCommandsView(APIView):
    """
    GET /agent/commands/?device_id=<uuid>
    Agent polls for pending commands and marks them as delivered.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        device_id = request.query_params.get('device_id')
        machine_id = request.query_params.get('machine_id')
        if not device_id and not machine_id:
            return Response(
                {'detail': 'device_id or machine_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if device_id:
            device = get_object_or_404(AgentDevice, pk=device_id)
        else:
            device = get_object_or_404(AgentDevice, machine_id=machine_id)
        pending = AgentCommand.objects.filter(
            device=device,
            status=AgentCommand.Status.PENDING,
        )

        commands_data = AgentCommandSerializer(pending, many=True).data

        # Mark as delivered
        pending.update(status=AgentCommand.Status.DELIVERED)

        return Response(commands_data)


# ---------------------------------------------------------------------------
# Screenshot upload endpoint (called by desktop agent)
# ---------------------------------------------------------------------------

class AgentScreenshotUploadView(APIView):
    """
    POST /agent/screenshot/upload/
    Accepts a base64-encoded JPEG screenshot from the desktop agent.
    Stores the image and returns a URL/path for the ingest payload.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import base64
        import os
        import uuid as uuid_mod
        from django.conf import settings

        filename = request.data.get('filename', f'screenshot-{uuid_mod.uuid4().hex[:8]}.jpg')
        data_b64 = request.data.get('data')
        captured_at = request.data.get('captured_at')

        if not data_b64:
            return Response(
                {'detail': 'Missing "data" field (base64-encoded image).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            image_bytes = base64.b64decode(data_b64)
        except Exception:
            return Response(
                {'detail': 'Invalid base64 data.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Save to MEDIA_ROOT/agent_screenshots/
        upload_dir = os.path.join(
            getattr(settings, 'MEDIA_ROOT', '/tmp'),
            'agent_screenshots',
        )
        os.makedirs(upload_dir, exist_ok=True)

        # Sanitize filename
        safe_name = f"{uuid_mod.uuid4().hex[:12]}_{filename.replace('/', '_').replace('\\', '_')}"
        file_path = os.path.join(upload_dir, safe_name)

        with open(file_path, 'wb') as f:
            f.write(image_bytes)

        # Build URL
        media_url = getattr(settings, 'MEDIA_URL', '/media/')
        image_url = f"{media_url}agent_screenshots/{safe_name}"

        return Response({
            'url': image_url,
            'image_url': image_url,
            'filename': safe_name,
            'captured_at': captured_at,
        }, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Employee daily report endpoint
# ---------------------------------------------------------------------------

class AgentDailyReportView(APIView):
    """
    GET /agent/daily-report/?date=YYYY-MM-DD
    Returns the requesting employee's daily activity summary.
    Today's report is only available after 8:00 PM.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import datetime, time as dt_time

        date_str = request.query_params.get('date')
        now = timezone.now()

        if date_str:
            try:
                report_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            report_date = now.date()

        # Today's report only available after 8 PM
        if report_date == now.date():
            cutoff = now.replace(hour=20, minute=0, second=0, microsecond=0)
            if now < cutoff:
                return Response(
                    {'detail': "Today's report is available after 8:00 PM."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Don't allow future dates
        if report_date > now.date():
            return Response(
                {'detail': 'Cannot view reports for future dates.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        employee = getattr(request.user, 'employee_profile', None)
        if not employee:
            return Response(
                {'detail': 'No employee profile linked to your account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get or compute the daily summary
        summary = compute_daily_summary(employee.id, report_date)

        if not summary:
            return Response(
                {'detail': 'No activity data for this date.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({
            'date': str(summary.date),
            'total_seconds': summary.total_seconds,
            'active_seconds': summary.active_seconds,
            'idle_seconds': summary.idle_seconds,
            'productive_seconds': summary.productive_seconds,
            'unproductive_seconds': summary.unproductive_seconds,
            'neutral_seconds': summary.neutral_seconds,
            'keystroke_count': summary.keystroke_count,
            'mouse_click_count': summary.mouse_click_count,
            'screenshot_count': summary.screenshot_count,
            'idle_event_count': summary.idle_event_count,
            'productivity_score': float(summary.productivity_score),
            'top_apps': summary.top_apps,
            'top_websites': summary.top_websites,
            'clock_in': summary.clock_in.isoformat() if summary.clock_in else None,
            'clock_out': summary.clock_out.isoformat() if summary.clock_out else None,
        })
