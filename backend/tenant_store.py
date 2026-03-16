"""
Tenant Store
============
Loads and saves TenantConfig objects with a two-tier storage backend:

  Tier 1 — Redis      (primary, fast, TTL-cached)
  Tier 2 — JSON files (fallback, d:\\Hire\\tenant_configs\\{tenant_id}.json)
  Tier 3 — Presets    (built-in presets from tenant_config.PRESETS)
  Tier 4 — Default    (TenantConfig with all defaults)

In-memory cache (module-level dict) avoids repeated Redis lookups within a
single process — cache entries expire after CACHE_TTL_SECONDS.

Usage
-----
    from tenant_store import load_tenant_config, save_tenant_config

    # Load (Redis → JSON file → preset → default)
    cfg = await load_tenant_config("acme_corp")

    # Save to both Redis and JSON file
    await save_tenant_config(cfg)

    # Delete
    await delete_tenant_config("acme_corp")

    # List all saved tenant IDs
    ids = await list_tenant_ids()

Environment variables
---------------------
  REDIS_URL   Redis connection URL (default: redis://localhost:6379/0)
"""

from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Optional

from tenant_config import TenantConfig, PRESETS

logger = logging.getLogger(__name__)

# ── Storage config ─────────────────────────────────────────────────────────────

REDIS_URL         = os.getenv("REDIS_URL", "redis://localhost:6379/0")
REDIS_KEY_PREFIX  = "hiringnow:tenant_config:"
REDIS_TTL         = 3600          # 1 hour TTL in Redis
CACHE_TTL_SECONDS = 300           # 5-minute in-process cache

# JSON file storage directory
_CONFIG_DIR = Path(__file__).parent / "tenant_configs"

# In-process cache: tenant_id → (TenantConfig, expiry_timestamp)
_cache: dict[str, tuple[TenantConfig, float]] = {}


# ══════════════════════════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _cache_get(tenant_id: str) -> Optional[TenantConfig]:
    entry = _cache.get(tenant_id)
    if entry and time.monotonic() < entry[1]:
        return entry[0]
    _cache.pop(tenant_id, None)
    return None


def _cache_set(cfg: TenantConfig) -> None:
    _cache[cfg.tenant_id] = (cfg, time.monotonic() + CACHE_TTL_SECONDS)


def _cache_delete(tenant_id: str) -> None:
    _cache.pop(tenant_id, None)


def _redis_key(tenant_id: str) -> str:
    return f"{REDIS_KEY_PREFIX}{tenant_id}"


def _json_path(tenant_id: str) -> Path:
    return _CONFIG_DIR / f"{tenant_id}.json"


def _ensure_config_dir() -> None:
    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)


# ── Redis helpers (graceful failure if Redis unavailable) ─────────────────────

async def _redis_get(tenant_id: str) -> Optional[TenantConfig]:
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(REDIS_URL, decode_responses=True)
        try:
            raw = await r.get(_redis_key(tenant_id))
            if raw:
                return TenantConfig(**json.loads(raw))
        finally:
            await r.aclose()
    except Exception as exc:
        logger.debug("[tenant_store] Redis get failed for '%s': %s", tenant_id, exc)
    return None


async def _redis_set(cfg: TenantConfig) -> None:
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(REDIS_URL, decode_responses=True)
        try:
            await r.setex(
                _redis_key(cfg.tenant_id),
                REDIS_TTL,
                cfg.model_dump_json(),
            )
        finally:
            await r.aclose()
    except Exception as exc:
        logger.debug("[tenant_store] Redis set failed for '%s': %s", cfg.tenant_id, exc)


async def _redis_delete(tenant_id: str) -> None:
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(REDIS_URL, decode_responses=True)
        try:
            await r.delete(_redis_key(tenant_id))
        finally:
            await r.aclose()
    except Exception as exc:
        logger.debug("[tenant_store] Redis delete failed for '%s': %s", tenant_id, exc)


async def _redis_list_keys() -> list[str]:
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(REDIS_URL, decode_responses=True)
        try:
            keys = await r.keys(f"{REDIS_KEY_PREFIX}*")
            return [k.removeprefix(REDIS_KEY_PREFIX) for k in keys]
        finally:
            await r.aclose()
    except Exception as exc:
        logger.debug("[tenant_store] Redis list failed: %s", exc)
    return []


# ── JSON file helpers ─────────────────────────────────────────────────────────

def _json_get(tenant_id: str) -> Optional[TenantConfig]:
    path = _json_path(tenant_id)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return TenantConfig(**data)
    except Exception as exc:
        logger.warning("[tenant_store] JSON read failed for '%s': %s", tenant_id, exc)
    return None


def _json_set(cfg: TenantConfig) -> None:
    _ensure_config_dir()
    path = _json_path(cfg.tenant_id)
    try:
        path.write_text(cfg.model_dump_json(indent=2), encoding="utf-8")
        logger.debug("[tenant_store] Saved JSON config for '%s'", cfg.tenant_id)
    except Exception as exc:
        logger.warning("[tenant_store] JSON write failed for '%s': %s", cfg.tenant_id, exc)


def _json_delete(tenant_id: str) -> None:
    path = _json_path(tenant_id)
    if path.exists():
        path.unlink(missing_ok=True)


def _json_list_keys() -> list[str]:
    if not _CONFIG_DIR.exists():
        return []
    return [p.stem for p in _CONFIG_DIR.glob("*.json")]


# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ══════════════════════════════════════════════════════════════════════════════

async def load_tenant_config(tenant_id: str) -> TenantConfig:
    """
    Load a TenantConfig for the given tenant_id.

    Resolution order:
      1. In-process cache (5-min TTL)
      2. Redis (1-hour TTL)
      3. JSON file  (d:\\Hire\\tenant_configs\\{tenant_id}.json)
      4. Built-in preset  (PRESETS dict in tenant_config.py)
      5. Default config   (all defaults, never fails)

    Returns:
        TenantConfig — always returns a valid config, never raises.
    """
    # 1. Cache
    cached = _cache_get(tenant_id)
    if cached:
        logger.debug("[tenant_store] Cache hit for '%s'", tenant_id)
        return cached

    # 2. Redis
    cfg = await _redis_get(tenant_id)
    if cfg:
        logger.debug("[tenant_store] Redis hit for '%s'", tenant_id)
        _cache_set(cfg)
        return cfg

    # 3. JSON file
    cfg = _json_get(tenant_id)
    if cfg:
        logger.debug("[tenant_store] JSON hit for '%s'", tenant_id)
        await _redis_set(cfg)   # backfill Redis
        _cache_set(cfg)
        return cfg

    # 4. Preset
    preset = PRESETS.get(tenant_id)
    if preset:
        logger.debug("[tenant_store] Preset hit for '%s'", tenant_id)
        _cache_set(preset)
        return preset

    # 5. Default
    logger.info("[tenant_store] No config found for '%s' — using defaults", tenant_id)
    default = TenantConfig(tenant_id=tenant_id)
    _cache_set(default)
    return default


async def save_tenant_config(cfg: TenantConfig) -> None:
    """
    Save a TenantConfig to both Redis and a JSON file.
    Also updates the in-process cache.
    """
    _json_set(cfg)
    await _redis_set(cfg)
    _cache_set(cfg)
    logger.info("[tenant_store] Saved config for tenant '%s'", cfg.tenant_id)


async def delete_tenant_config(tenant_id: str) -> None:
    """Remove a tenant config from all storage layers."""
    _cache_delete(tenant_id)
    await _redis_delete(tenant_id)
    _json_delete(tenant_id)
    logger.info("[tenant_store] Deleted config for tenant '%s'", tenant_id)


async def list_tenant_ids() -> list[str]:
    """Return all tenant IDs that have saved configs (Redis + JSON files)."""
    redis_ids  = set(await _redis_list_keys())
    json_ids   = set(_json_list_keys())
    preset_ids = set(PRESETS.keys())
    return sorted(redis_ids | json_ids | preset_ids)


def invalidate_cache(tenant_id: str) -> None:
    """Force-expire a cache entry so the next load fetches fresh data."""
    _cache_delete(tenant_id)
    logger.debug("[tenant_store] Invalidated cache for '%s'", tenant_id)


# ══════════════════════════════════════════════════════════════════════════════
# SYNC CONVENIENCE (for non-async callers)
# ══════════════════════════════════════════════════════════════════════════════

def load_tenant_config_sync(tenant_id: str) -> TenantConfig:
    """
    Synchronous wrapper for load_tenant_config.
    Tries cache → JSON file → preset → default (skips Redis in sync context).
    """
    cached = _cache_get(tenant_id)
    if cached:
        return cached

    cfg = _json_get(tenant_id)
    if cfg:
        _cache_set(cfg)
        return cfg

    preset = PRESETS.get(tenant_id)
    if preset:
        _cache_set(preset)
        return preset

    default = TenantConfig(tenant_id=tenant_id)
    _cache_set(default)
    return default
