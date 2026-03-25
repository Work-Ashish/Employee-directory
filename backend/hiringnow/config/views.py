import logging

from django.http import JsonResponse
from django.db import connections

logger = logging.getLogger(__name__)


def health(request):
    """Basic health check — always 200 if the process is running."""
    return JsonResponse({'status': 'ok'})


def health_live(request):
    """Liveness probe — confirms the Django process is alive."""
    return JsonResponse({'status': 'alive'})


def health_ready(request):
    """Readiness probe — confirms the app can serve traffic (DB connectivity)."""
    try:
        connections['default'].ensure_connection()
        return JsonResponse({'status': 'ready', 'db': 'ok'})
    except Exception as e:
        logger.error("Health check failed: %s", str(e))
        return JsonResponse(
            {'status': 'not_ready', 'db': 'error', 'detail': 'Service unavailable'},
            status=503,
        )