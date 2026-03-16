from django.http import HttpResponseForbidden, HttpResponseNotFound
from django.utils.deprecation import MiddlewareMixin

from config.tenant_context import set_current_tenant, clear_current_tenant
from .models import Tenant


# resolve tenant from host or X-Tenant-Slug and attach to request
class TenantMiddleware(MiddlewareMixin):

    SKIP_PREFIXES = ("/admin/", "/health/", "/api/v1/auth/register/", "/api/v1/auth/login/")

    # set request.tenant and thread-local tenant for tenant-scoped DB routing
    def process_request(self, request):
        clear_current_tenant()
        for prefix in self.SKIP_PREFIXES:
            if request.path.startswith(prefix):
                return None
        slug = self._get_tenant_slug(request)
        if not slug:
            return None
        tenant = Tenant.objects.using("default").filter(slug=slug).first()
        if not tenant:
            return HttpResponseNotFound("Tenant not found.")
        if tenant.status != Tenant.Status.ACTIVE:
            return HttpResponseForbidden("Tenant is not active.")
        request.tenant = tenant
        set_current_tenant(tenant)
        return None

    # extract tenant slug from header or first subdomain
    def _get_tenant_slug(self, request):
        header_slug = request.headers.get("X-Tenant-Slug", "").strip()
        if header_slug:
            return header_slug
        host = request.get_host().split(":")[0]
        if "." in host:
            return host.split(".")[0]
        return None

    # clear tenant context after response is processed
    def process_response(self, request, response):
        clear_current_tenant()
        return response