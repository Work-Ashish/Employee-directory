import threading

from django.conf import settings

from config.tenant_context import get_current_tenant

_db_lock = threading.Lock()

# Django built-in app labels that should always route to 'default'
_BUILTIN_APP_LABELS = frozenset({"contenttypes", "auth", "admin", "sessions"})


# route models between registry DB and tenant DBs
class TenantDatabaseRouter:
    registry_models = {
        "tenants.tenant",
        "tenants.permission",
        "tenants.featureflag",  # feature catalog lives in registry, managed by us
    }
    tenant_scoped_apps = ("users", "rbac", "features", "employees", "departments", "dashboard", "attendance", "leave", "payroll", "token_blacklist", "teams", "performance", "training", "assets", "documents", "tickets", "announcements", "reimbursements", "resignations", "feedback", "events", "notifications", "reports", "roles", "user_sessions", "timetracker", "audit", "workflows", "agent")

    def db_for_read(self, model, **hints):
        return self._db_for_model(model)

    def db_for_write(self, model, **hints):
        return self._db_for_model(model)

    def _db_for_model(self, model):
        label = f"{model._meta.app_label}.{model._meta.model_name}"
        if label in self.registry_models:
            return "default"
        # Fallback for Django built-in apps
        if model._meta.app_label in _BUILTIN_APP_LABELS:
            return "default"
        if model._meta.app_label in self.tenant_scoped_apps:
            tenant = get_current_tenant()
            if tenant and getattr(tenant, "db_name", None):
                db_name = tenant.db_name
                # Dynamically register tenant DB with thread-safe lock
                with _db_lock:
                    if db_name not in settings.DATABASES:
                        default = settings.DATABASES["default"].copy()
                        default["NAME"] = db_name
                        settings.DATABASES[db_name] = default
                if db_name in settings.DATABASES:
                    return db_name
        raise RuntimeError(
            f"Tenant context is not set or DB '{getattr(get_current_tenant(), 'db_name', None)}' "
            "is not in DATABASES. Cannot route query without tenant context."
        )

    def allow_relation(self, obj1, obj2, **hints):
        # Prevent cross-database relations
        db1 = self._db_for_model(type(obj1))
        db2 = self._db_for_model(type(obj2))
        return db1 == db2

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if db == "default":
            return app_label == "tenants"
        if app_label in ("contenttypes", "auth"):
            return True
        if app_label in self.tenant_scoped_apps:
            return True
        return False
