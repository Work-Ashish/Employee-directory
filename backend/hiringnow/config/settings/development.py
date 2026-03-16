from .base import *

# The DEBUG setting is a boolean that is used to determine if the development server should be run.
DEBUG = True

# The ALLOWED_HOSTS setting is a list of all the hosts that are allowed to access the development server.
ALLOWED_HOSTS = ['*']

# The CORS_ALLOW_ALL_ORIGINS setting is a boolean that is used to determine if all origins are allowed to access the development server.
CORS_ALLOW_ALL_ORIGINS = True

# The EMAIL_BACKEND setting is the email backend that is used to send emails.
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'