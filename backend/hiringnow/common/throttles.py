from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """5 login attempts per minute per IP."""
    scope = 'login'


class RegisterRateThrottle(AnonRateThrottle):
    """3 registration attempts per hour per IP."""
    scope = 'register'


class GeneralAPIThrottle(UserRateThrottle):
    """1000 requests per hour per authenticated user."""
    scope = 'general'
