from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin


class OnboardingEnforcementMiddleware(MiddlewareMixin):
    """
    Block non-admin users with incomplete onboarding from accessing most API endpoints.
    Whitelisted paths: auth, onboarding, password change, features, health.
    """

    WHITELIST_PREFIXES = (
        "/api/v1/auth/",
        "/api/v1/employees/onboarding/",
        "/api/v1/employees/profile/",
        "/api/v1/features/",
        "/api/v1/permissions/",
        "/api/v1/roles/capabilities/",
        "/api/v1/documents/my/",
        "/api/v1/upload/",
        "/health/",
        "/admin/",
    )

    def process_view(self, request, view_func, view_args, view_kwargs):
        # Skip if not an API request
        if not request.path.startswith("/api/"):
            return None

        # Skip whitelisted paths
        for prefix in self.WHITELIST_PREFIXES:
            if request.path.startswith(prefix):
                return None

        # Skip if user is not authenticated (auth middleware will handle it)
        user = getattr(request, "user", None)
        if user is None or not getattr(user, "is_authenticated", False):
            return None

        # Skip for tenant admins
        if getattr(user, "is_tenant_admin", False):
            return None

        # Check onboarding status
        employee_profile = getattr(user, "employee_profile", None)
        if employee_profile is None:
            return None  # No profile linked yet, let the endpoint handle it

        if employee_profile.onboarding_status != "completed":
            return JsonResponse(
                {
                    "error": {
                        "detail": "Please complete your onboarding before accessing this resource.",
                        "code": "onboarding_incomplete",
                    }
                },
                status=403,
            )

        return None
