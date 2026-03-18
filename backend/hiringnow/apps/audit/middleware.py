import logging

from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

METHOD_ACTION_MAP = {
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE',
}

SKIP_PREFIXES = ('/health/', '/admin/', '/api/schema/', '/api/docs/', '/api/redoc/')


class AuditLogMiddleware(MiddlewareMixin):

    def process_response(self, request, response):
        if request.method not in METHOD_ACTION_MAP:
            return response

        path = request.path
        for prefix in SKIP_PREFIXES:
            if path.startswith(prefix):
                return response

        action = METHOD_ACTION_MAP[request.method]
        user = getattr(request, 'user', None)
        if user and not getattr(user, 'is_authenticated', False):
            user = None

        # Extract resource from path: /api/v1/employees/... -> employees
        resource = ''
        parts = path.strip('/').split('/')
        if len(parts) >= 3 and parts[0] == 'api' and parts[1] == 'v1':
            resource = parts[2]

        try:
            from apps.audit.models import AuditLog
            AuditLog.objects.create(
                user=user,
                action=action,
                resource=resource,
                path=path,
                method=request.method,
                status_code=response.status_code,
                ip_address=self._get_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            )
        except Exception:
            logger.exception('Failed to create audit log entry')

        return response

    @staticmethod
    def _get_ip(request):
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if forwarded:
            return forwarded.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
