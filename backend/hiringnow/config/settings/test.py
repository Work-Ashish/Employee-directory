"""
Self-contained test settings — no .env needed, uses SQLite for speed.

Does NOT import from base.py to avoid django-environ reading env vars
that don't exist in CI/test environments.
"""
import sys
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Ensure hiringnow/ is on sys.path so bare imports like
# `from common.models import BaseModel` work during django.setup()
_hiringnow_dir = str(BASE_DIR)
if _hiringnow_dir not in sys.path:
    sys.path.insert(0, _hiringnow_dir)

DEBUG = False
SECRET_KEY = "test-secret-key-for-ci"

# ── Database ────────────────────────────────────────────────────────
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    },
}
DATABASE_ROUTERS = []
TENANT_DB_NAME_PREFIX = "test_"

# ── Apps ────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    # Local apps
    "apps.tenants.apps.TenantsConfig",
    "apps.users.apps.UsersConfig",
    "apps.rbac.apps.RbacConfig",
    "apps.features.apps.FeaturesConfig",
    "apps.employees.apps.EmployeesConfig",
    "apps.departments.apps.DepartmentsConfig",
    "apps.dashboard.apps.DashboardConfig",
    "apps.attendance.apps.AttendanceConfig",
    "apps.leave.apps.LeaveConfig",
    "apps.payroll.apps.PayrollConfig",
    "apps.teams.apps.TeamsConfig",
    "apps.performance.apps.PerformanceConfig",
    "apps.training.apps.TrainingConfig",
    "apps.assets.apps.AssetsConfig",
    "apps.documents.apps.DocumentsConfig",
    "apps.tickets.apps.TicketsConfig",
    "apps.announcements.apps.AnnouncementsConfig",
    "apps.reimbursements.apps.ReimbursementsConfig",
    "apps.resignations.apps.ResignationsConfig",
    "apps.feedback.apps.FeedbackConfig",
    "apps.events.apps.EventsConfig",
    "apps.notifications.apps.NotificationsConfig",
    "apps.reports.apps.ReportsConfig",
    "apps.roles.apps.RolesConfig",
    "apps.sessions.apps.SessionsConfig",
    "apps.timetracker.apps.TimetrackerConfig",
    "apps.audit.apps.AuditConfig",
]

# ── Middleware ──────────────────────────────────────────────────────
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "apps.audit.middleware.AuditLogMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "users.User"

# ── DRF ─────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
    "PAGE_SIZE": 25,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {},
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Recruitment Platform API",
    "DESCRIPTION": "Multi-tenant SaaS backend for AI-driven recruitment",
    "VERSION": "1.0.0",
}

# ── CORS ────────────────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_HEADERS = [
    "accept",
    "authorization",
    "content-type",
    "x-tenant-slug",
    "x-requested-with",
]
CORS_ALLOW_CREDENTIALS = True

# ── Test speedups ──────────────────────────────────────────────────
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]


class DisableMigrations:
    def __contains__(self, item):
        return True

    def __getitem__(self, item):
        return None


MIGRATION_MODULES = DisableMigrations()

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

REDIS_URL = "redis://localhost:6379/0"
