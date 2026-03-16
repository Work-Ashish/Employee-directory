from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

from apps.tenants.models import Tenant
from config.tenant_context import set_current_tenant


# JWT auth backend that also sets tenant context from token claims
class TenantJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        # This part mirrors JWTAuthentication.authenticate, but we add tenant handling.
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
        except InvalidToken:
            return None

        tenant_id = validated_token.get("tenant_id")
        if tenant_id:
            tenant = Tenant.objects.using("default").filter(id=str(tenant_id)).first()
            if tenant:
                request_tenant_before = getattr(request, "tenant", None)
                request.tenant = tenant
                set_current_tenant(tenant)
                if request_tenant_before is not None and str(request_tenant_before.id) != str(tenant_id):
                    raise AuthenticationFailed("Token tenant does not match request tenant.")

        user = self.get_user(validated_token)
        if user is None:
            return None

        return (user, validated_token)