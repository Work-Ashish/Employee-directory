from .base import *

# The DEBUG setting is a boolean that is used to determine if the production server should be run.
DEBUG = False

# The ALLOWED_HOSTS setting is a list of all the hosts that are allowed to access the production server.
# Set ALLOWED_HOSTS in .env as comma-separated (e.g. yourapp.com,api.yourapp.com).
# Set ALLOWED_HOSTS_WILDCARD for subdomain tenants (e.g. .yourapp.com allows acme.yourapp.com, globex.yourapp.com).
_allowed = [h.strip() for h in env('ALLOWED_HOSTS', default='').split(',') if h.strip()]
_wildcard = env('ALLOWED_HOSTS_WILDCARD', default='').strip()
if _wildcard:
    _allowed.append(_wildcard)
ALLOWED_HOSTS = _allowed

# The CORS_ALLOWED_ORIGINS setting is a list of all the origins that are allowed to access the production server.
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])

# The SESSION_COOKIE_SECURE setting is a boolean that is used to determine if the session cookie should be secure.
SESSION_COOKIE_SECURE = True
# The CSRF_COOKIE_SECURE setting is a boolean that is used to determine if the CSRF cookie should be secure.
CSRF_COOKIE_SECURE = True
# The SECURE_BROWSER_XSS_FILTER setting is a boolean that is used to determine if the browser XSS filter should be enabled.
SECURE_BROWSER_XSS_FILTER = True
# The SECURE_CONTENT_TYPE_NOSNIFF setting is a boolean that is used to determine if the content type nosniff should be enabled.
SECURE_CONTENT_TYPE_NOSNIFF = True

# HSTS — instruct browsers to only use HTTPS
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Force HTTPS redirect
SECURE_SSL_REDIRECT = True

# Trust X-Forwarded-Proto from reverse proxy (nginx/ALB/CloudFront)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')