#!/usr/bin/env python
"""Post-migration data validation for Prisma -> Django migration.

Provides functions to compare row counts, verify FK integrity,
and detect orphaned records after a migration run.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import psycopg2
import psycopg2.extras
from django.apps import apps

from scripts.prisma_field_map import (
    FK_MAP,
    MODEL_MAP,
    PRISMA_TABLE_MAP,
    TIER_MODELS,
)


# ---------------------------------------------------------------------------
# Status constants
# ---------------------------------------------------------------------------

STATUS_OK = "OK"
STATUS_COUNT_MISMATCH = "COUNT_MISMATCH"
STATUS_FK_ERRORS = "FK_ERRORS"
STATUS_ERROR = "ERROR"


# ---------------------------------------------------------------------------
# Count validation
# ---------------------------------------------------------------------------

def validate_counts(
    source_db_url: str,
    target_db_alias: str,
    tiers: Optional[List[int]] = None,
) -> Dict[str, Dict[str, Any]]:
    """Compare row counts between the Prisma source and Django target.

    Parameters
    ----------
    source_db_url : str
        PostgreSQL connection string for the Prisma/Supabase DB.
    target_db_alias : str
        Django database alias for the tenant DB.
    tiers : list[int] | None
        If given, only validate these tiers. Default: all (1-5).

    Returns
    -------
    dict
        ``{prisma_model: {source_count, target_count, status}}``
    """
    if tiers is None:
        tiers = [1, 2, 3, 4, 5]

    results: Dict[str, Dict[str, Any]] = {}

    source_conn = psycopg2.connect(source_db_url)
    source_conn.set_session(readonly=True)

    try:
        for tier in tiers:
            for prisma_model in TIER_MODELS.get(tier, []):
                table = PRISMA_TABLE_MAP[prisma_model]
                app_label, model_name = MODEL_MAP[prisma_model]

                # Source count
                source_count = _get_source_count(source_conn, table)

                # Target count
                DjangoModel = apps.get_model(app_label, model_name)
                target_count = (
                    DjangoModel.objects.using(target_db_alias).count()
                )

                status = (
                    STATUS_OK
                    if source_count == target_count
                    else STATUS_COUNT_MISMATCH
                )

                results[prisma_model] = {
                    "source_count": source_count,
                    "target_count": target_count,
                    "status": status,
                }
    finally:
        source_conn.close()

    return results


def _get_source_count(conn, table: str) -> int:
    """Return row count for a quoted Prisma table."""
    with conn.cursor() as cur:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        return cur.fetchone()[0]


# ---------------------------------------------------------------------------
# Foreign key validation
# ---------------------------------------------------------------------------

def validate_foreign_keys(
    target_db_alias: str,
    tiers: Optional[List[int]] = None,
) -> Dict[str, Dict[str, Any]]:
    """Check that all FK references in the target DB resolve correctly.

    Parameters
    ----------
    target_db_alias : str
        Django database alias for the tenant DB.
    tiers : list[int] | None
        If given, only validate these tiers. Default: all (1-5).

    Returns
    -------
    dict
        ``{prisma_model: {fk_field: {total, broken, status}}}``
    """
    if tiers is None:
        tiers = [1, 2, 3, 4, 5]

    results: Dict[str, Dict[str, Any]] = {}

    all_models = set()
    for tier in tiers:
        all_models.update(TIER_MODELS.get(tier, []))

    for (prisma_model, prisma_fk), (target_model, django_fk) in FK_MAP.items():
        if prisma_model not in all_models:
            continue
        if django_fk is None:
            continue

        source_app, source_model_name = MODEL_MAP[prisma_model]
        target_app, target_model_name = MODEL_MAP.get(
            target_model, (None, None),
        )
        if target_app is None:
            continue

        SourceModel = apps.get_model(source_app, source_model_name)
        TargetModel = apps.get_model(target_app, target_model_name)

        # Collect all FK values from source model
        fk_values = set(
            SourceModel.objects.using(target_db_alias)
            .exclude(**{django_fk: None})
            .values_list(django_fk, flat=True)
        )
        if not fk_values:
            continue

        # Check which ones exist in target
        existing_ids = set(
            TargetModel.objects.using(target_db_alias)
            .filter(id__in=fk_values)
            .values_list("id", flat=True)
        )

        broken = len(fk_values - existing_ids)
        total = len(fk_values)
        status = STATUS_OK if broken == 0 else STATUS_FK_ERRORS

        if prisma_model not in results:
            results[prisma_model] = {}

        results[prisma_model][django_fk] = {
            "total": total,
            "broken": broken,
            "status": status,
        }

    return results


# ---------------------------------------------------------------------------
# Orphan detection
# ---------------------------------------------------------------------------

def validate_no_orphans(
    target_db_alias: str,
    tiers: Optional[List[int]] = None,
) -> Dict[str, Dict[str, Any]]:
    """Find records with broken FK references (orphans) in the target DB.

    Returns a dict of ``{prisma_model: {fk_field: [orphan_ids]}}``.
    """
    if tiers is None:
        tiers = [1, 2, 3, 4, 5]

    results: Dict[str, Dict[str, Any]] = {}

    all_models = set()
    for tier in tiers:
        all_models.update(TIER_MODELS.get(tier, []))

    for (prisma_model, prisma_fk), (target_model, django_fk) in FK_MAP.items():
        if prisma_model not in all_models:
            continue
        if django_fk is None:
            continue

        source_app, source_model_name = MODEL_MAP[prisma_model]
        target_app, target_model_name = MODEL_MAP.get(
            target_model, (None, None),
        )
        if target_app is None:
            continue

        SourceModel = apps.get_model(source_app, source_model_name)
        TargetModel = apps.get_model(target_app, target_model_name)

        # All FK values
        fk_queryset = (
            SourceModel.objects.using(target_db_alias)
            .exclude(**{django_fk: None})
            .values_list("id", django_fk)
        )

        existing_ids = set(
            TargetModel.objects.using(target_db_alias)
            .values_list("id", flat=True)
        )

        orphan_ids = [
            str(record_id)
            for record_id, fk_val in fk_queryset
            if fk_val not in existing_ids
        ]

        if orphan_ids:
            if prisma_model not in results:
                results[prisma_model] = {}
            results[prisma_model][django_fk] = orphan_ids

    return results


# ---------------------------------------------------------------------------
# Comprehensive report
# ---------------------------------------------------------------------------

def run_full_validation(
    source_db_url: str,
    target_db_alias: str,
    tiers: Optional[List[int]] = None,
) -> Dict[str, Dict[str, Any]]:
    """Run all validations and return a combined report.

    Returns
    -------
    dict
        ``{model: {source_count, target_count, fk_errors, orphan_count, status}}``
    """
    counts = validate_counts(source_db_url, target_db_alias, tiers)
    fk_results = validate_foreign_keys(target_db_alias, tiers)
    orphan_results = validate_no_orphans(target_db_alias, tiers)

    report: Dict[str, Dict[str, Any]] = {}

    for model, count_info in counts.items():
        fk_info = fk_results.get(model, {})
        orphan_info = orphan_results.get(model, {})

        total_fk_broken = sum(
            v.get("broken", 0) for v in fk_info.values()
        )
        total_orphans = sum(
            len(v) for v in orphan_info.values()
        )

        # Determine overall status
        status = STATUS_OK
        if count_info["status"] != STATUS_OK:
            status = STATUS_COUNT_MISMATCH
        if total_fk_broken > 0:
            status = STATUS_FK_ERRORS

        report[model] = {
            "source_count": count_info["source_count"],
            "target_count": count_info["target_count"],
            "fk_errors": total_fk_broken,
            "orphan_count": total_orphans,
            "status": status,
        }

    return report
