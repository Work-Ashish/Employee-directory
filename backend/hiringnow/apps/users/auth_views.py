from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

from common.throttles import LoginRateThrottle, RegisterRateThrottle
from .auth_serializers import (
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
    UserMeSerializer,
    UpdateMeSerializer,
    ChangePasswordSerializer,
)

class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        user = result["user"]
        tenant = result["tenant"]
        token_serializer = CustomTokenObtainPairSerializer()
        tokens = token_serializer.get_token(user)
        refresh = tokens
        access = refresh.access_token
        return Response(
            {
                "access": str(access),
                "refresh": str(refresh),
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "tenant_id": str(tenant.id),
                    "tenant_slug": tenant.slug,
                },
            },
            status=status.HTTP_201_CREATED,
        )

class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = CustomTokenObtainPairSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Update last_login_at timestamp
        from django.utils import timezone
        from .models import User
        email = request.data.get('email')
        if email:
            User.objects.filter(email=email).update(last_login_at=timezone.now())
        return Response(serializer.validated_data)

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserMeSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        serializer = UpdateMeSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_user = serializer.save()
        return Response(UserMeSerializer(updated_user, context={'request': request}).data)

class TenantTokenRefreshView(TokenRefreshView):
    """Refresh that extracts tenant from the refresh token before processing."""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        from rest_framework_simplejwt.tokens import UntypedToken
        from apps.tenants.models import Tenant
        from config.tenant_context import set_current_tenant
        raw_refresh = request.data.get('refresh', '')
        if raw_refresh:
            try:
                token = UntypedToken(raw_refresh)
                tenant_slug = token.get('tenant_slug')
                if tenant_slug:
                    tenant = Tenant.objects.using('default').filter(slug=tenant_slug).first()
                    if tenant:
                        set_current_tenant(tenant)
                        request.tenant = tenant
            except Exception:
                pass  # let the parent view handle invalid tokens
        return super().post(request, *args, **kwargs)


class TenantTokenBlacklistView(TokenBlacklistView):
    """Logout that extracts tenant from the refresh token before blacklisting."""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        from rest_framework_simplejwt.tokens import UntypedToken
        from apps.tenants.models import Tenant
        from config.tenant_context import set_current_tenant
        raw_refresh = request.data.get('refresh', '')
        if raw_refresh:
            try:
                token = UntypedToken(raw_refresh)
                tenant_slug = token.get('tenant_slug')
                if tenant_slug:
                    tenant = Tenant.objects.using('default').filter(slug=tenant_slug).first()
                    if tenant:
                        set_current_tenant(tenant)
                        request.tenant = tenant
            except Exception:
                pass
        return super().post(request, *args, **kwargs)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        # Clear first-login flag if it was set
        if getattr(user, 'must_change_password', False):
            user.must_change_password = False
        user.save()
        # blacklist the submitted refresh token so existing sessions are invalidated
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                from rest_framework_simplejwt.tokens import RefreshToken
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass  # token already invalid or blacklist not configured — non-fatal
        return Response({'detail': 'Password changed successfully. Please log in again.'}, status=status.HTTP_200_OK)