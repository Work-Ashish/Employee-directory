from django.contrib.auth.models import BaseUserManager

from config.tenant_context import get_current_tenant


class UserManager(BaseUserManager):
    # create a user, choosing the correct tenant database
    def create_user(self, email, password=None, tenant=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        db = self._db
        if tenant is not None and getattr(tenant, "db_name", None):
            from django.conf import settings
            if tenant.db_name in settings.DATABASES:
                db = tenant.db_name
        elif db is None:
            tenant = get_current_tenant()
            if tenant and getattr(tenant, "db_name", None):
                from django.conf import settings
                if tenant.db_name in settings.DATABASES:
                    db = tenant.db_name
        username = extra_fields.pop("username", None) or (f"{tenant.id}_{email}" if tenant else email)
        extra_fields.setdefault("username", username)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=db)
        return user

    # create a superuser/tenant admin in the chosen database
    def create_superuser(self, email, password=None, tenant=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_tenant_admin", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        return self.create_user(email, password, tenant=tenant, **extra_fields)