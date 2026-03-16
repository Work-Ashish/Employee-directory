# base Django settings for multi-tenant recruitment platform
import os
from datetime import timedelta
from pathlib import Path

import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# The env variable is used to read the environment variables from the .env file.
env = environ.Env()
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

SECRET_KEY = env('SECRET_KEY')

# Application definition
# The INSTALLED_APPS setting is a list of all the applications that are installed in the project.

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third Party Apps - These are apps that are not part of the Django project but are used to add functionality to the project.
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    #Local Apps - These are apps that are part of the Django project.
    'apps.tenants.apps.TenantsConfig',
    'apps.users.apps.UsersConfig',
    'apps.rbac.apps.RbacConfig',
    'apps.features.apps.FeaturesConfig',
    'apps.employees.apps.EmployeesConfig',
    'apps.departments.apps.DepartmentsConfig',
    'apps.dashboard.apps.DashboardConfig',
    'apps.attendance.apps.AttendanceConfig',
    'apps.leave.apps.LeaveConfig',
    'apps.payroll.apps.PayrollConfig',
    'apps.teams.apps.TeamsConfig',
    'apps.performance.apps.PerformanceConfig',
    'apps.training.apps.TrainingConfig',
    'apps.assets.apps.AssetsConfig',
    'apps.documents.apps.DocumentsConfig',
    'apps.tickets.apps.TicketsConfig',
    'apps.announcements.apps.AnnouncementsConfig',
    'apps.reimbursements.apps.ReimbursementsConfig',
    'apps.resignations.apps.ResignationsConfig',
    'apps.feedback.apps.FeedbackConfig',
    'apps.events.apps.EventsConfig',
    'apps.notifications.apps.NotificationsConfig',
    'apps.reports.apps.ReportsConfig',
    'apps.roles.apps.RolesConfig',
    'apps.sessions.apps.SessionsConfig',
    'apps.timetracker.apps.TimetrackerConfig',
]

# The MIDDLEWARE setting is a list of all the middleware that is used in the project.
# Middleware is used to process the requests and responses.
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'apps.tenants.middleware.TenantMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# The ROOT_URLCONF setting is the URL configuration for the project.
ROOT_URLCONF = 'config.urls'

# The TEMPLATES setting is a list of all the templates that are used in the project.
# Templates are used to render the HTML pages.
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# The WSGI_APPLICATION setting is the WSGI application that is used in the project.
WSGI_APPLICATION = 'config.wsgi.application'

# The DATABASES setting is a dictionary of all the  databases that are used in the project.
# The default database is the PostgreSQL database.
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

def _get_databases():
    base = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': env('DB_NAME'),
            'USER': env('DB_USER'),
            'PASSWORD': env('DB_PASSWORD'),
            'HOST': env('DB_HOST', default='localhost'),
            'PORT': env('DB_PORT', default='5432'),
        }
    }
    
    # Tenant DBs: name = recruitment_db_<slug> (e.g. recruitment_db_acme)
    tenant_prefix = env('TENANT_DB_NAME_PREFIX', default=env('DB_NAME') + '_')  # recruitment_db_
    tenant_slugs = env('TENANT_DB_SLUGS', default='').strip().split(',')
    tenant_slugs = [s.strip() for s in tenant_slugs if s.strip()]

    for slug in tenant_slugs:
        alias = tenant_prefix + slug  # recruitment_db_acme
        base[alias] = {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': alias,
            'USER': env('DB_USER'),
            'PASSWORD': env('DB_PASSWORD'),
            'HOST': env('DB_HOST', default='localhost'),
            'PORT': env('DB_PORT', default='5432'),
        }
    return base

DATABASES = _get_databases()

# Single source of truth for tenant DB naming: recruitment_db_<slug>
TENANT_DB_NAME_PREFIX = env('TENANT_DB_NAME_PREFIX', default=env('DB_NAME') + '_')

DATABASE_ROUTERS = ['config.db_router.TenantDatabaseRouter']

# The AUTH_PASSWORD_VALIDATORS setting is a list of all the password validators that are used in the project.
# Password validators are used to validate the passwords of the users.
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# The LANGUAGE_CODE setting is the default language that is used in the project.
# The default language is English.
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

# The STATIC_URL setting is the URL that is used to serve the static files.
STATIC_URL = 'static/'

# The DEFAULT_AUTO_FIELD setting is the default auto field that is used in the project.
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# The AUTH_USER_MODEL setting is the user model that is used in the project.
# The user model is the model that is used to store the users of the project.
AUTH_USER_MODEL = 'users.User'

# The REST_FRAMEWORK setting is a dictionary of all the REST framework settings that are used in the project.
# REST framework is used to build the API for the project.
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'apps.users.auth_backends.TenantJWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'common.renderers.StandardJSONRenderer',
    ),
    'DEFAULT_PAGINATION_CLASS': 'common.pagination.StandardResultsPagination',
    'PAGE_SIZE': 25,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_CLASSES': [
        'common.throttles.GeneralAPIThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'login': '5/min',
        'register': '3/hour',
        'general': '1000/hour',
    },
}

# The SIMPLE_JWT setting is a dictionary of all the simple JWT settings that are used in the project.
# Simple JWT is used to authenticate the users of the project.
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# The SPECTACULAR_SETTINGS setting is a dictionary of all the Spectacular settings that are used in the project.
# Spectacular is used to generate the API documentation.
SPECTACULAR_SETTINGS = {
    'TITLE': 'Recruitment Platform API',
    'DESCRIPTION': 'Multi-tenant SaaS backend for AI-driven recruitment',
    'VERSION': '1.0.0',   
}

# The REDIS_URL setting is the URL that is used to connect to the Redis database.
REDIS_URL = env('REDIS_URL', default='redis://localhost:6379/0')

# CORS — allow the Next.js frontend to talk to the Django backend
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
])
CORS_ALLOW_HEADERS = [
    'accept',
    'authorization',
    'content-type',
    'x-tenant-slug',
    'x-requested-with',
]
CORS_ALLOW_CREDENTIALS = True