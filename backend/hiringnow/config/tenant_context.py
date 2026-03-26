import contextvars

_current_tenant = contextvars.ContextVar('current_tenant', default=None)


# set the current tenant in context-local storage (async-safe)
def set_current_tenant(tenant):
    _current_tenant.set(tenant)


# get the current tenant from context-local storage
def get_current_tenant():
    return _current_tenant.get()


# clear the current tenant from context-local storage
def clear_current_tenant():
    _current_tenant.set(None)
