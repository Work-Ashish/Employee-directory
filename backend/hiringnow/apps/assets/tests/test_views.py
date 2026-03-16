"""Tests for Assets API views."""

import datetime

import pytest

from apps.assets.models import Asset

ASSETS_URL = "/api/v1/assets/"


def _detail_url(asset_id):
    return f"/api/v1/assets/{asset_id}/"


# -- List ------------------------------------------------------------------


@pytest.mark.django_db
def test_list_assets_paginated(auth_client, employee):
    """GET /assets/ returns paginated envelope for admin."""
    Asset.objects.create(
        name="MacBook Pro 16",
        type=Asset.AssetType.LAPTOP,
        serial_number="SN-001",
        assigned_to=employee,
        status=Asset.Status.ASSIGNED,
    )
    Asset.objects.create(
        name="Dell Monitor",
        type=Asset.AssetType.MONITOR,
        serial_number="SN-002",
        status=Asset.Status.AVAILABLE,
    )
    response = auth_client.get(ASSETS_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert "total" in data
    assert data["total"] >= 2


@pytest.mark.django_db
def test_list_assets_filter_by_type(auth_client):
    """GET /assets/?type=LAPTOP filters by asset type."""
    Asset.objects.create(
        name="ThinkPad", type=Asset.AssetType.LAPTOP, serial_number="SN-100",
    )
    Asset.objects.create(
        name="Headset", type=Asset.AssetType.HEADSET, serial_number="SN-101",
    )
    response = auth_client.get(ASSETS_URL, {"type": "LAPTOP"})
    assert response.status_code == 200
    assert response.json()["total"] == 1


# -- Create ----------------------------------------------------------------


@pytest.mark.django_db
def test_create_asset(auth_client, employee):
    """POST /assets/ creates a new asset."""
    payload = {
        "name": "iPhone 15 Pro",
        "type": "PHONE",
        "serial_number": "SN-200",
        "assigned_to_id": str(employee.pk),
        "status": "ASSIGNED",
        "purchase_date": "2026-01-15",
        "notes": "Company phone",
    }
    response = auth_client.post(ASSETS_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["name"] == "iPhone 15 Pro"
    assert data["type"] == "PHONE"
    assert data["status"] == "ASSIGNED"
    assert data["assigned_to_name"] == "Test Employee"


@pytest.mark.django_db
def test_create_asset_minimal(auth_client):
    """POST /assets/ with only required fields succeeds."""
    payload = {"name": "Spare Cable", "type": "OTHER"}
    response = auth_client.post(ASSETS_URL, payload, format="json")
    assert response.status_code == 201
    assert response.json()["status"] == "AVAILABLE"


# -- Detail ----------------------------------------------------------------


@pytest.mark.django_db
def test_get_asset_detail(auth_client):
    """GET /assets/{id}/ returns single asset."""
    asset = Asset.objects.create(
        name="Keyboard", type=Asset.AssetType.KEYBOARD, serial_number="SN-300",
    )
    response = auth_client.get(_detail_url(asset.pk))
    assert response.status_code == 200
    assert response.json()["id"] == str(asset.pk)
    assert response.json()["name"] == "Keyboard"


# -- Update ----------------------------------------------------------------


@pytest.mark.django_db
def test_update_asset(auth_client, employee):
    """PUT /assets/{id}/ updates asset fields."""
    asset = Asset.objects.create(
        name="Old Laptop", type=Asset.AssetType.LAPTOP, serial_number="SN-400",
    )
    response = auth_client.put(
        _detail_url(asset.pk),
        {"name": "New Laptop", "assigned_to_id": str(employee.pk), "status": "ASSIGNED"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["name"] == "New Laptop"
    assert response.json()["status"] == "ASSIGNED"


# -- Delete ----------------------------------------------------------------


@pytest.mark.django_db
def test_delete_asset(auth_client):
    """DELETE /assets/{id}/ removes the asset."""
    asset = Asset.objects.create(
        name="Retired Monitor",
        type=Asset.AssetType.MONITOR,
        serial_number="SN-500",
        status=Asset.Status.RETIRED,
    )
    response = auth_client.delete(_detail_url(asset.pk))
    assert response.status_code == 204
    assert not Asset.objects.filter(pk=asset.pk).exists()


# -- Unauthenticated ------------------------------------------------------


@pytest.mark.django_db
def test_unauthenticated_assets(api_client):
    """Unauthenticated request returns 403."""
    response = api_client.get(ASSETS_URL)
    assert response.status_code == 403
