from __future__ import annotations

import pytest

from ai_service.tools.base import ToolDomain, ToolResult
from ai_service.tools.factory import create_tool_provider
from ai_service.tools.mock_provider import MockProvider


@pytest.fixture
def mock_provider() -> MockProvider:
    return MockProvider()


# -- MockProvider Tests ------------------------------------------------------


@pytest.mark.asyncio
async def test_mock_provider_name(mock_provider: MockProvider) -> None:
    assert mock_provider.name == "mock"


@pytest.mark.asyncio
async def test_mock_send_email(mock_provider: MockProvider) -> None:
    mock_provider.set_response(
        "send_email", ToolResult(success=True, data={"id": "msg_1"})
    )
    result = await mock_provider.send_email(
        tenant_id="tenant_1", to="test@example.com", subject="Hi", body="Hello"
    )
    assert result.success is True
    assert result.data["id"] == "msg_1"
    assert mock_provider.calls["send_email"] == 1


@pytest.mark.asyncio
async def test_mock_send_email_with_tenant_id(
    mock_provider: MockProvider,
) -> None:
    """Verify tenant_id flows through all calls."""
    mock_provider.set_response("send_email", ToolResult(success=True))
    await mock_provider.send_email(
        tenant_id="tenant_abc", to="x@y.com", subject="S", body="B"
    )
    last_call = mock_provider.call_log[-1]
    assert last_call["method"] == "send_email"
    assert last_call["args"]["tenant_id"] == "tenant_abc"


@pytest.mark.asyncio
async def test_mock_notion_search(mock_provider: MockProvider) -> None:
    mock_provider.set_response(
        "search_notion",
        ToolResult(
            success=True,
            data={"results": [{"id": "page_1", "title": "Hiring Playbook"}]},
        ),
    )
    result = await mock_provider.search_notion(tenant_id="tenant_1", query="playbook")
    assert result.success is True
    assert len(result.data["results"]) == 1


@pytest.mark.asyncio
async def test_mock_default_response(mock_provider: MockProvider) -> None:
    """Unconfigured methods return success=False by default."""
    result = await mock_provider.send_email(
        tenant_id="t", to="a@b.com", subject="S", body="B"
    )
    assert result.success is False
    assert "not configured" in (result.error or "").lower()


# -- Factory Tests -----------------------------------------------------------


@pytest.mark.asyncio
async def test_factory_creates_mock() -> None:
    provider = await create_tool_provider({"tool_provider": "mock"})
    assert provider.name == "mock"


@pytest.mark.asyncio
async def test_factory_default_is_mock() -> None:
    provider = await create_tool_provider({})
    assert provider.name == "mock"


# -- Health Check Tests ------------------------------------------------------


@pytest.mark.asyncio
async def test_health_check(mock_provider: MockProvider) -> None:
    mock_provider.set_response("search_notion", ToolResult(success=True))
    health = await mock_provider.health_check()
    assert health["notion"] is True


# -- ToolDomain Tests --------------------------------------------------------


def test_tool_domain_values() -> None:
    assert ToolDomain.EMAIL.value == "email"
    assert ToolDomain.NOTION.value == "notion"
    assert len(ToolDomain) == 5
