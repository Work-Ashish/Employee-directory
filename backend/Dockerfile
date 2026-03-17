# HRMS Django Backend
# Multi-stage build for production-ready container

# --- Stage 1: Builder ---
FROM python:3.12-slim AS builder

WORKDIR /build

COPY hiringnow/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# --- Stage 2: Runtime ---
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY hiringnow/ .

# Collect static files (optional, Nginx can serve these)
RUN python manage.py collectstatic --noinput --settings=config.settings.base 2>/dev/null || true

EXPOSE 8001

# Run with Gunicorn (4 workers, bind to 0.0.0.0:8001)
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8001", \
     "--workers", "4", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
