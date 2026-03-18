#!/usr/bin/env python
"""Management command: migrate data from a Prisma/Supabase PostgreSQL DB
into the Django tenant database.

Usage examples
--------------
# Full migration (all tiers)
python manage.py migrate_from_prisma \
    --source-db-url "postgresql://user:pass@host:5432/db" \
    --tenant-slug acme

# Dry-run tier 1 only
python manage.py migrate_from_prisma \
    --source-db-url "..." --tenant-slug acme --tier 1 --dry-run

# Rollback a previous run
python manage.py migrate_from_prisma \
    --source-db-url "..." --tenant-slug acme --rollback
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Set, Tuple

import psycopg2
import psycopg2.extras
from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.db import connections, transaction

from apps.rbac.models import Role, UserRole
from apps.tenants.models import Tenant
from scripts.prisma_field_map import (
    ENUM_MAP,
    FIELD_MAP,
    FK_MAP,
    MODEL_MAP,
    PRISMA_TABLE_MAP,
    TIER_MODELS,
    get_django_field,
    get_enum_value,
    transform_row,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resolve_django_model(app_label: str, model_name: str):
    """Return the Django model class for (app_label, model_name)."""
    return apps.get_model(app_label, model_name)


def _parse_source_row(row: dict) -> dict:
    """Normalise values coming from psycopg2 so they are Django-friendly."""
    cleaned: dict = {}
    for k, v in row.items():
        if isinstance(v, datetime):
            pass  # already a datetime
        elif isinstance(v, float):
            cleaned[k] = Decimal(str(v))
            continue
        cleaned[k] = v
    return cleaned


def _split_name(full_name: str) -> Tuple[str, str]:
    """Split 'John Doe' into ('John', 'Doe')."""
    parts = (full_name or "").strip().split(None, 1)
    first = parts[0] if parts else ""
    last = parts[1] if len(parts) > 1 else ""
    return first, last


# ---------------------------------------------------------------------------
# Command
# ---------------------------------------------------------------------------

class Command(BaseCommand):
    help = "Migrate data from a Prisma/Supabase PostgreSQL database into Django."

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Track created IDs per model for rollback
        self._created_ids: Dict[str, Set[str]] = {}

    # ------------------------------------------------------------------
    # CLI arguments
    # ------------------------------------------------------------------

    def add_arguments(self, parser):
        parser.add_argument(
            "--source-db-url",
            required=True,
            help="PostgreSQL connection string for the Prisma/Supabase DB.",
        )
        parser.add_argument(
            "--tenant-slug",
            required=True,
            help="Slug of the target tenant in Django.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Validate and report without writing data.",
        )
        parser.add_argument(
            "--tier",
            type=int,
            choices=[1, 2, 3, 4, 5],
            default=None,
            help="Migrate only this tier (1-5). Default: all.",
        )
        parser.add_argument(
            "--rollback",
            action="store_true",
            default=False,
            help="Delete all records created by the last migration run.",
        )

    # ------------------------------------------------------------------
    # Entry point
    # ------------------------------------------------------------------

    def handle(self, *args, **options):
        tenant_slug = options["tenant_slug"].strip()
        tenant = Tenant.objects.using("default").filter(slug=tenant_slug).first()
        if not tenant:
            raise CommandError(
                f"Tenant with slug '{tenant_slug}' not found in registry."
            )
        db_alias = tenant.db_name
        source_url = options["source_db_url"]
        dry_run = options["dry_run"]
        tier = options["tier"]
        rollback = options["rollback"]

        tiers = [tier] if tier else [1, 2, 3, 4, 5]

        if rollback:
            self._run_rollback(source_url, db_alias, tiers)
            return

        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"Prisma -> Django migration  |  tenant={tenant_slug}  "
                f"db={db_alias}  dry_run={dry_run}  tiers={tiers}"
            )
        )

        source_conn = self._connect_source(source_url)
        try:
            for t in tiers:
                self._migrate_tier(source_conn, db_alias, t, dry_run, tenant)
        finally:
            source_conn.close()

        if dry_run:
            self.stdout.write(self.style.WARNING(
                "\n[DRY-RUN] No data was written. Re-run without --dry-run to apply."
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                "\nMigration completed successfully."
            ))

    # ------------------------------------------------------------------
    # Source DB connection
    # ------------------------------------------------------------------

    def _connect_source(self, url: str):
        """Open a psycopg2 connection to the Prisma source DB."""
        try:
            conn = psycopg2.connect(url)
            conn.set_session(readonly=True)
            return conn
        except psycopg2.Error as exc:
            raise CommandError(f"Cannot connect to source DB: {exc}") from exc

    # ------------------------------------------------------------------
    # Per-tier migration
    # ------------------------------------------------------------------

    def _migrate_tier(
        self,
        source_conn,
        db_alias: str,
        tier: int,
        dry_run: bool,
        tenant: Tenant,
    ):
        models = TIER_MODELS.get(tier, [])
        if not models:
            return

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\n--- Tier {tier} ({len(models)} models) ---"
        ))

        sid = None
        if not dry_run:
            sid = transaction.savepoint(using=db_alias)

        try:
            for prisma_model in models:
                self._migrate_model(
                    source_conn, db_alias, prisma_model, dry_run, tenant,
                )
            if not dry_run and sid is not None:
                transaction.savepoint_commit(sid, using=db_alias)
        except Exception:
            if not dry_run and sid is not None:
                transaction.savepoint_rollback(sid, using=db_alias)
                self.stderr.write(self.style.ERROR(
                    f"Tier {tier} rolled back due to error."
                ))
            raise

    # ------------------------------------------------------------------
    # Per-model migration
    # ------------------------------------------------------------------

    def _migrate_model(
        self,
        source_conn,
        db_alias: str,
        prisma_model: str,
        dry_run: bool,
        tenant: Tenant,
    ):
        app_label, model_name = MODEL_MAP[prisma_model]
        DjangoModel = _resolve_django_model(app_label, model_name)
        table = PRISMA_TABLE_MAP[prisma_model]

        self.stdout.write(f"\n  {prisma_model} -> {app_label}.{model_name}")

        rows = self._read_source_rows(source_conn, table)
        count_read = len(rows)
        count_created = 0
        count_updated = 0
        count_skipped = 0
        created_ids: List[str] = []

        for row in rows:
            row = _parse_source_row(row)

            # Handle soft deletes: skip rows with deletedAt set
            if row.get("deletedAt") and prisma_model != "Employee":
                count_skipped += 1
                continue

            # Special handling per model
            if prisma_model == "Organization":
                result = self._handle_organization(
                    row, DjangoModel, db_alias, dry_run, tenant,
                )
            elif prisma_model == "User":
                result = self._handle_user(
                    row, db_alias, dry_run, tenant,
                )
            elif prisma_model == "Employee":
                result = self._handle_employee(
                    row, DjangoModel, db_alias, dry_run,
                )
            else:
                result = self._handle_generic(
                    row, prisma_model, DjangoModel, db_alias, dry_run,
                )

            if result == "created":
                count_created += 1
                created_ids.append(str(row.get("id", "")))
            elif result == "updated":
                count_updated += 1
            else:
                count_skipped += 1

        self._created_ids[prisma_model] = set(created_ids)
        self.stdout.write(
            f"    read={count_read}  created={count_created}  "
            f"updated={count_updated}  skipped={count_skipped}"
        )

    # ------------------------------------------------------------------
    # Source DB read
    # ------------------------------------------------------------------

    def _read_source_rows(self, conn, table: str) -> List[dict]:
        """SELECT * from the Prisma table, returning dicts."""
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(f"SELECT * FROM {table}")
            return cur.fetchall()

    # ------------------------------------------------------------------
    # Special handlers
    # ------------------------------------------------------------------

    def _handle_organization(
        self, row: dict, DjangoModel, db_alias: str,
        dry_run: bool, tenant: Tenant,
    ) -> str:
        """Map Organization -> Tenant.

        We update the *existing* tenant record rather than creating a new one
        because the tenant already exists in the registry (it was required to
        run this command).
        """
        if dry_run:
            return "skipped"

        update_fields = {}
        if row.get("name"):
            update_fields["name"] = row["name"]
        if row.get("domain"):
            update_fields["domain"] = row["domain"]

        if update_fields:
            Tenant.objects.using("default").filter(
                pk=tenant.pk,
            ).update(**update_fields)
            return "updated"
        return "skipped"

    def _handle_user(
        self, row: dict, db_alias: str, dry_run: bool, tenant: Tenant,
    ) -> str:
        """Map Prisma User -> Django User + RBAC role assignment."""
        from apps.users.models import User

        if dry_run:
            return "skipped"

        first_name, last_name = _split_name(row.get("name", ""))
        email = row.get("email", "")
        prisma_id = row.get("id", "")

        # Build a deterministic UUID from the Prisma cuid for stable mapping
        try:
            user_uuid = uuid.UUID(prisma_id)
        except ValueError:
            user_uuid = uuid.uuid5(uuid.NAMESPACE_URL, prisma_id)

        defaults = {
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "is_active": True,
            "avatar": row.get("avatar") or "",
            "accent_color": row.get("accentColor") or "",
            "bio": row.get("bio") or "",
            "must_change_password": row.get("mustChangePassword", False),
            "last_login_at": row.get("lastLoginAt"),
        }

        # Preserve the hashed password
        hashed = row.get("hashedPassword", "")

        user, created = User.objects.using(db_alias).update_or_create(
            id=user_uuid,
            defaults={
                **defaults,
                "username": email,
            },
        )
        # Set password hash directly (bypasses Django hashing)
        if hashed:
            user.password = hashed
            user.save(using=db_alias, update_fields=["password"])

        # Map Prisma role to RBAC
        prisma_role = row.get("role", "EMPLOYEE")
        role_slug = get_enum_value("User", "role", prisma_role)
        role = Role.objects.using(db_alias).filter(slug=role_slug).first()
        if role:
            UserRole.objects.using(db_alias).get_or_create(
                user=user, role=role,
            )

        # Mark tenant admins
        if prisma_role in ("CEO", "HR"):
            user.is_tenant_admin = True
            user.save(using=db_alias, update_fields=["is_tenant_admin"])

        return "created" if created else "updated"

    def _handle_employee(
        self, row: dict, DjangoModel, db_alias: str, dry_run: bool,
    ) -> str:
        """Map Prisma Employee -> Django Employee with soft-delete handling."""
        if dry_run:
            return "skipped"

        transformed = transform_row("Employee", row)

        # Handle soft deletes
        if row.get("deletedAt"):
            transformed["is_archived"] = True
            transformed["deleted_at"] = row["deletedAt"]

        prisma_id = row.get("id", "")
        try:
            pk = uuid.UUID(prisma_id)
        except ValueError:
            pk = uuid.uuid5(uuid.NAMESPACE_URL, prisma_id)

        # Resolve user FK: convert Prisma cuid to deterministic UUID
        user_id_raw = transformed.pop("user_id", None)
        if user_id_raw:
            try:
                transformed["user_id"] = uuid.UUID(user_id_raw)
            except ValueError:
                transformed["user_id"] = uuid.uuid5(
                    uuid.NAMESPACE_URL, user_id_raw,
                )

        # Resolve manager FK
        manager_id_raw = transformed.pop("reporting_to_id", None)
        if manager_id_raw:
            try:
                transformed["reporting_to_id"] = uuid.UUID(manager_id_raw)
            except ValueError:
                transformed["reporting_to_id"] = uuid.uuid5(
                    uuid.NAMESPACE_URL, manager_id_raw,
                )

        # Resolve department FK
        dept_id_raw = transformed.pop("department_ref_id", None)
        if dept_id_raw:
            try:
                transformed["department_ref_id"] = uuid.UUID(dept_id_raw)
            except ValueError:
                transformed["department_ref_id"] = uuid.uuid5(
                    uuid.NAMESPACE_URL, dept_id_raw,
                )

        # Ensure employee_code is populated
        if not transformed.get("employee_code"):
            transformed["employee_code"] = f"MIG-{prisma_id[:8]}"

        # Convert salary from float/int to Decimal
        salary = transformed.get("salary")
        if salary is not None and not isinstance(salary, Decimal):
            transformed["salary"] = Decimal(str(salary))

        obj, created = DjangoModel.objects.using(db_alias).update_or_create(
            id=pk,
            defaults=transformed,
        )
        return "created" if created else "updated"

    def _handle_generic(
        self, row: dict, prisma_model: str, DjangoModel,
        db_alias: str, dry_run: bool,
    ) -> str:
        """Generic handler for models without special migration logic."""
        if dry_run:
            return "skipped"

        transformed = transform_row(prisma_model, row)
        prisma_id = row.get("id", "")
        try:
            pk = uuid.UUID(prisma_id)
        except ValueError:
            pk = uuid.uuid5(uuid.NAMESPACE_URL, prisma_id)

        # Resolve all FK fields to deterministic UUIDs
        for (model, prisma_fk), (_, django_fk) in FK_MAP.items():
            if model != prisma_model or django_fk is None:
                continue
            fk_value = transformed.get(django_fk)
            if fk_value:
                try:
                    transformed[django_fk] = uuid.UUID(fk_value)
                except (ValueError, TypeError):
                    transformed[django_fk] = uuid.uuid5(
                        uuid.NAMESPACE_URL, str(fk_value),
                    )

        # Convert Shift.startTime / endTime from "HH:mm" string to TimeField
        if prisma_model == "Shift":
            for time_field in ("start_time", "end_time"):
                val = transformed.get(time_field)
                if isinstance(val, str) and ":" in val:
                    parts = val.split(":")
                    from datetime import time as dt_time
                    transformed[time_field] = dt_time(
                        int(parts[0]), int(parts[1]),
                    )

        # TrainingEnrollment: derive status from 'completed' boolean
        if prisma_model == "TrainingEnrollment":
            completed = row.get("completed", False)
            transformed["status"] = "COMPLETED" if completed else "ENROLLED"

        obj, created = DjangoModel.objects.using(db_alias).update_or_create(
            id=pk,
            defaults=transformed,
        )
        return "created" if created else "updated"

    # ------------------------------------------------------------------
    # Rollback
    # ------------------------------------------------------------------

    def _run_rollback(
        self, source_url: str, db_alias: str, tiers: List[int],
    ):
        """Delete all records that were created during migration.

        Re-reads source rows, computes the deterministic UUIDs, and
        deletes matching records from Django in reverse tier order.
        """
        self.stdout.write(self.style.WARNING(
            "Rolling back migrated data..."
        ))

        source_conn = self._connect_source(source_url)
        try:
            for tier in reversed(tiers):
                models = TIER_MODELS.get(tier, [])
                for prisma_model in reversed(models):
                    if prisma_model == "Organization":
                        continue  # never delete the tenant
                    self._rollback_model(
                        source_conn, db_alias, prisma_model,
                    )
        finally:
            source_conn.close()

        self.stdout.write(self.style.SUCCESS("Rollback completed."))

    def _rollback_model(
        self, source_conn, db_alias: str, prisma_model: str,
    ):
        """Delete Django records whose IDs match source Prisma rows."""
        app_label, model_name = MODEL_MAP[prisma_model]
        DjangoModel = _resolve_django_model(app_label, model_name)
        table = PRISMA_TABLE_MAP[prisma_model]

        rows = self._read_source_rows(source_conn, table)
        ids_to_delete = set()
        for row in rows:
            prisma_id = row.get("id", "")
            try:
                pk = uuid.UUID(prisma_id)
            except ValueError:
                pk = uuid.uuid5(uuid.NAMESPACE_URL, prisma_id)
            ids_to_delete.add(pk)

        if not ids_to_delete:
            return

        deleted_count, _ = (
            DjangoModel.objects.using(db_alias)
            .filter(id__in=ids_to_delete)
            .delete()
        )
        self.stdout.write(
            f"  Rollback {app_label}.{model_name}: "
            f"deleted {deleted_count} records"
        )
