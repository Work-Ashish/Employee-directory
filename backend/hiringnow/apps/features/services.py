from __future__ import annotations

from apps.tenants.models import FeatureFlag
from apps.features.models import TenantFeature

def is_feature_enabled(codename: str) -> bool:
    try:
        override = TenantFeature.objects.get(feature_codename=codename)
        return override.is_enabled
    except TenantFeature.DoesNotExist:
        pass
    try:
        flag = FeatureFlag.objects.using("default").get(codename=codename)
        return flag.default_enabled
    except FeatureFlag.DoesNotExist:
        return False

def get_feature_config(codename: str) -> dict:
    try:
        override = TenantFeature.objects.get(feature_codename=codename)
        return override.config or {}
    except TenantFeature.DoesNotExist:
        return {}

def get_enabled_features() -> list[dict]:
    all_flags = {
        f.codename: f
        for f in FeatureFlag.objects.using("default").all()
    }
    overrides = {
        t.feature_codename: t
        for t in TenantFeature.objects.all()
    }

    enabled = []
    for codename, flag in all_flags.items():
        if codename in overrides:
            is_enabled = overrides[codename].is_enabled
            config = overrides[codename].config or {}
        else:
            is_enabled = flag.default_enabled
            config = {}

        if is_enabled:
            enabled.append({
                "codename": codename,
                "name": flag.name,
                "config": config,
            })

    return enabled
