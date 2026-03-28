import logging

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

from common.throttles import LoginRateThrottle, RegisterRateThrottle

logger = logging.getLogger(__name__)


class TokenRefreshThrottle(AnonRateThrottle):
    rate = '30/minute'


class TokenBlacklistThrottle(AnonRateThrottle):
    rate = '10/minute'
from .auth_serializers import (
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
    UserMeSerializer,
    UpdateMeSerializer,
    ChangePasswordSerializer,
)

import os as _os

# -- httpOnly cookie helpers ------------------------------------------------
_ACCESS_MAX_AGE = 15 * 60
_REFRESH_MAX_AGE = 7 * 24 * 60 * 60
_COOKIE_SAMESITE = 'Lax'

def _set_auth_cookies(response, access_token, refresh_token=None):
    secure = _os.environ.get('COOKIE_SECURE', 'true').lower() != 'false'
    response.set_cookie('access_token', access_token, max_age=_ACCESS_MAX_AGE, httponly=True, secure=secure, samesite=_COOKIE_SAMESITE, path='/')
    if refresh_token:
        response.set_cookie('refresh_token', refresh_token, max_age=_REFRESH_MAX_AGE, httponly=True, secure=secure, samesite=_COOKIE_SAMESITE, path='/api/v1/auth/')
    return response

def _clear_auth_cookies(response):
    response.delete_cookie('access_token', path='/')
    response.delete_cookie('refresh_token', path='/api/v1/auth/')
    return response

class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        user = result["user"]
        tenant = result["tenant"]
        # Refresh user from DB so employee_profile reverse relation is available
        user.refresh_from_db()
        token_serializer = CustomTokenObtainPairSerializer()
        tokens = token_serializer.get_token(user)
        refresh = tokens
        access = refresh.access_token
        response = Response(
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
        return _set_auth_cookies(response, str(access), str(refresh))

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
        data = serializer.validated_data
        response = Response(data)
        return _set_auth_cookies(response, data["access"], data["refresh"])

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
    throttle_classes = [TokenRefreshThrottle]

    def post(self, request, *args, **kwargs):
        from rest_framework_simplejwt.tokens import UntypedToken
        from apps.tenants.models import Tenant
        from config.tenant_context import set_current_tenant
        raw_refresh = request.data.get('refresh', '') or request.COOKIES.get('refresh_token', '')
        if raw_refresh and not request.data.get('refresh'):
            request._full_data = {**request.data, 'refresh': raw_refresh}
        if raw_refresh:
            try:
                token = UntypedToken(raw_refresh)
                tenant_slug = token.get('tenant_slug')
                if tenant_slug:
                    tenant = Tenant.objects.using('default').filter(slug=tenant_slug).first()
                    if tenant:
                        set_current_tenant(tenant)
                        request.tenant = tenant
            except Exception as e:
                logger.warning("Failed to extract tenant for refresh: %s", str(e))
        result = super().post(request, *args, **kwargs)
        if result.status_code == 200 and result.data.get('access'):
            _set_auth_cookies(result, result.data['access'], result.data.get('refresh'))
        return result


class TenantTokenBlacklistView(TokenBlacklistView):
    """Logout that extracts tenant from the refresh token before blacklisting."""
    permission_classes = [AllowAny]
    throttle_classes = [TokenBlacklistThrottle]

    def post(self, request, *args, **kwargs):
        from rest_framework_simplejwt.tokens import UntypedToken
        from apps.tenants.models import Tenant
        from config.tenant_context import set_current_tenant
        raw_refresh = request.data.get('refresh', '') or request.COOKIES.get('refresh_token', '')
        if raw_refresh and not request.data.get('refresh'):
            request._full_data = {**request.data, 'refresh': raw_refresh}
        if raw_refresh:
            try:
                token = UntypedToken(raw_refresh)
                tenant_slug = token.get('tenant_slug')
                if tenant_slug:
                    tenant = Tenant.objects.using('default').filter(slug=tenant_slug).first()
                    if tenant:
                        set_current_tenant(tenant)
                        request.tenant = tenant
            except Exception as e:
                logger.warning("Failed to extract tenant for blacklist: %s", str(e))
        result = super().post(request, *args, **kwargs)
        _clear_auth_cookies(result)
        return result


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
        response = Response({'detail': 'Password changed successfully. Please log in again.'}, status=status.HTTP_200_OK)
        return _clear_auth_cookies(response)