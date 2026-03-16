import threading

_thread_local = threading.local()


# set the current tenant in thread-local storage
def set_current_tenant(tenant):
    _thread_local.tenant = tenant


# get the current tenant from thread-local storage
def get_current_tenant():
    return getattr(_thread_local, "tenant", None)


# clear the current tenant from thread-local storage
def clear_current_tenant():
    if hasattr(_thread_local, "tenant"):
        del _thread_local.tenant