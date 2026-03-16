from __future__ import annotations

import pytest

from ai_service.core import tool_router


@pytest.fixture(autouse=True)
def _reset_tool_provider() -> None:
    """Reset the cached tool provider singleton between tests."""
    tool_router._provider = None
