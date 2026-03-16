"""
Base Celery task classes with retry logic, lifecycle hooks, and tenant context.

Usage:
    from common.tasks import TenantTask

    @shared_task(base=TenantTask, bind=True)
    def my_task(self, schema_name, *args):
        # ORM queries automatically run in the correct tenant schema
        MyModel.objects.filter(...)

Adapted from PR #22 with multi-tenant schema_context support.
"""

import logging
from typing import Any

from celery import Task
from django_tenants.utils import schema_context

logger = logging.getLogger(__name__)


class BaseTask(Task):
    """Base task with retry logic and lifecycle logging.

    Features:
    - Automatic retry with exponential backoff (3 retries, 10min max)
    - Lifecycle hooks: on_failure, on_retry, on_success
    """

    autoretry_for = (Exception,)
    retry_kwargs = {"max_retries": 3}
    retry_backoff = True
    retry_backoff_max = 600  # 10 minutes
    retry_jitter = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(
            "Task %s [%s] failed: %s", self.name, task_id, exc,
            exc_info=einfo,
            extra={"task_id": task_id, "task_name": self.name},
        )
        super().on_failure(exc, task_id, args, kwargs, einfo)

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        logger.warning(
            "Task %s [%s] retrying: %s", self.name, task_id, exc,
            extra={"task_id": task_id, "task_name": self.name},
        )
        super().on_retry(exc, task_id, args, kwargs, einfo)

    def on_success(self, retval, task_id, args, kwargs):
        logger.info(
            "Task %s [%s] succeeded", self.name, task_id,
            extra={"task_id": task_id, "task_name": self.name},
        )
        super().on_success(retval, task_id, args, kwargs)


class TenantTask(BaseTask):
    """Task that automatically wraps execution in schema_context.

    The first positional argument after self must be schema_name.
    All ORM queries inside the task run in the correct tenant schema.

    Usage:
        @shared_task(base=TenantTask, bind=True)
        def process_candidate(self, schema_name, candidate_id):
            # Automatically runs in schema_context(schema_name)
            candidate = Candidate.objects.get(id=candidate_id)
    """

    def __call__(self, *args: Any, **kwargs: Any) -> Any:
        schema_name = kwargs.pop("schema_name", None) or (args[0] if args else "public")
        remaining_args = args[1:] if args and schema_name == args[0] else args

        with schema_context(schema_name):
            return super().__call__(*remaining_args, **kwargs)


class EmailTask(BaseTask):
    """Specialized task for email operations with extended retries."""

    retry_kwargs = {"max_retries": 5}
    retry_backoff_max = 1800  # 30 minutes

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(
            "Email task %s [%s] failed after all retries: %s", self.name, task_id, exc,
            exc_info=einfo,
            extra={
                "task_id": task_id,
                "task_name": self.name,
                "recipient": kwargs.get("to_email"),
                "subject": kwargs.get("subject"),
            },
        )
        super().on_failure(exc, task_id, args, kwargs, einfo)
