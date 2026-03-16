import os

# Load the appropriate settings file based on the environment.
# When DJANGO_SETTINGS_MODULE is explicitly set (e.g. to config.settings.test),
# skip the auto-import — Django will load the specified module directly.
_settings_module = os.environ.get('DJANGO_SETTINGS_MODULE', '')
if _settings_module and _settings_module != 'config.settings':
    # Django is loading a specific submodule (e.g. config.settings.test);
    # don't auto-import anything here — let Django handle it.
    pass
else:
    environment = os.environ.get('DJANGO_ENV', 'development')
    if environment == 'production':
        from .production import *  # noqa: F401,F403
    else:
        from .development import *  # noqa: F401,F403