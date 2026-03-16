"""Tests for Payroll API views."""

from decimal import Decimal

import pytest

from apps.payroll.models import Payroll, PayrollAudit, PayrollComplianceConfig, TaxSlab

PAYROLL_URL = "/api/v1/payroll/"
PAYROLL_RUN_URL = "/api/v1/payroll/run/"
PAYROLL_CONFIG_URL = "/api/v1/payroll/config/"
PF_URL = "/api/v1/payroll/pf/"


def _detail_url(payroll_id):
    return f"/api/v1/payroll/{payroll_id}/"


# ── Helpers ──────────────────────────────────────────────────────────


@pytest.fixture
def payroll_record(db, employee):
    return Payroll.objects.create(
        employee=employee,
        month="2026-03",
        basic_salary=Decimal("50000"),
        allowances=Decimal("5000"),
        pf_deduction=Decimal("6000"),
        tax=Decimal("2000"),
        net_salary=Decimal("47000"),
    )


@pytest.fixture
def compliance_config(db):
    config = PayrollComplianceConfig.objects.create(
        regime_name="NEW_REGIME",
        pf_percentage=12.0,
        standard_deduction=50000.0,
        health_cess=4.0,
        is_active=True,
    )
    TaxSlab.objects.create(config=config, min_income=0, max_income=300000, tax_rate=0, base_tax=0)
    TaxSlab.objects.create(config=config, min_income=300000, max_income=600000, tax_rate=0.05, base_tax=0)
    TaxSlab.objects.create(config=config, min_income=600000, max_income=900000, tax_rate=0.10, base_tax=15000)
    TaxSlab.objects.create(config=config, min_income=900000, max_income=1200000, tax_rate=0.15, base_tax=45000)
    return config


# ── List / Create ────────────────────────────────────────────────────


@pytest.mark.django_db
def test_list_payroll_paginated(auth_client, payroll_record):
    """GET /payroll/ returns paginated envelope."""
    response = auth_client.get(PAYROLL_URL)
    assert response.status_code == 200

    data = response.json()
    assert "results" in data
    assert data["total"] >= 1


@pytest.mark.django_db
def test_create_payroll(auth_client, employee):
    """POST /payroll/ creates a payroll record."""
    payload = {
        "employee_id": str(employee.pk),
        "month": "2026-04",
        "basic_salary": "60000.00",
        "allowances": "5000.00",
        "net_salary": "55000.00",
    }
    response = auth_client.post(PAYROLL_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["month"] == "2026-04"
    assert Decimal(data["basic_salary"]) == Decimal("60000.00")


@pytest.mark.django_db
def test_create_duplicate_payroll_rejected(auth_client, employee, payroll_record):
    """POST /payroll/ rejects duplicate employee+month."""
    payload = {
        "employee_id": str(employee.pk),
        "month": "2026-03",
        "basic_salary": "50000.00",
        "net_salary": "45000.00",
    }
    response = auth_client.post(PAYROLL_URL, payload, format="json")
    assert response.status_code == 400


# ── Detail ───────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_get_payroll_detail(auth_client, payroll_record):
    """GET /payroll/{id}/ returns payroll detail."""
    response = auth_client.get(_detail_url(payroll_record.pk))
    assert response.status_code == 200
    assert response.json()["id"] == str(payroll_record.pk)


# ── Finalize ─────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_finalize_payroll(auth_client, payroll_record):
    """PUT /payroll/{id}/ with action=FINALIZE marks payroll as processed."""
    response = auth_client.put(
        _detail_url(payroll_record.pk),
        {"action": "FINALIZE"},
        format="json",
    )
    assert response.status_code == 200

    data = response.json()
    assert data["is_finalized"] is True
    assert data["status"] == "PROCESSED"

    # Audit trail created
    assert PayrollAudit.objects.filter(
        payroll=payroll_record, action=PayrollAudit.Action.FINALIZED,
    ).exists()


@pytest.mark.django_db
def test_cannot_modify_finalized_payroll(auth_client, payroll_record):
    """PUT /payroll/{id}/ on finalized payroll returns 400."""
    payroll_record.is_finalized = True
    payroll_record.save(update_fields=["is_finalized"])

    response = auth_client.put(
        _detail_url(payroll_record.pk),
        {"action": "FINALIZE"},
        format="json",
    )
    assert response.status_code == 400


# ── Manual Override ──────────────────────────────────────────────────


@pytest.mark.django_db
def test_manual_override(auth_client, payroll_record):
    """PUT /payroll/{id}/ with action=MANUAL_OVERRIDE recalculates net_salary."""
    response = auth_client.put(
        _detail_url(payroll_record.pk),
        {"action": "MANUAL_OVERRIDE", "basic_salary": "55000.00"},
        format="json",
    )
    assert response.status_code == 200

    data = response.json()
    assert Decimal(data["basic_salary"]) == Decimal("55000.00")
    # Net salary should have been recalculated
    assert Decimal(data["net_salary"]) != Decimal("47000.00")

    assert PayrollAudit.objects.filter(
        payroll=payroll_record, action=PayrollAudit.Action.MANUAL_OVERRIDE,
    ).exists()


# ── Payroll Run (auto-calculate) ─────────────────────────────────────


@pytest.mark.django_db
def test_payroll_run(auth_client, employee, compliance_config):
    """POST /payroll/run/ auto-calculates PF + tax + net salary."""
    payload = {
        "employee_id": str(employee.pk),
        "month": "2026-05",
        "basic_salary": "50000.00",
        "allowances": "5000.00",
    }
    response = auth_client.post(PAYROLL_RUN_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["month"] == "2026-05"
    assert Decimal(data["pf_deduction"]) > 0
    assert Decimal(data["net_salary"]) > 0

    # Audit trail for RUN_CALCULATION
    payroll = Payroll.objects.get(pk=data["id"])
    assert PayrollAudit.objects.filter(
        payroll=payroll, action=PayrollAudit.Action.RUN_CALCULATION,
    ).exists()


@pytest.mark.django_db
def test_payroll_run_no_config(auth_client, employee):
    """POST /payroll/run/ returns 400 when no compliance config exists."""
    payload = {
        "employee_id": str(employee.pk),
        "month": "2026-06",
        "basic_salary": "50000.00",
    }
    response = auth_client.post(PAYROLL_RUN_URL, payload, format="json")
    assert response.status_code == 400
    assert "compliance configuration" in response.json()["detail"].lower()


# ── Payroll Config ───────────────────────────────────────────────────


@pytest.mark.django_db
def test_get_config_empty(auth_client):
    """GET /payroll/config/ returns empty dict when no config."""
    response = auth_client.get(PAYROLL_CONFIG_URL)
    assert response.status_code == 200
    assert response.json() == {}


@pytest.mark.django_db
def test_create_config(auth_client):
    """POST /payroll/config/ creates a compliance config with tax slabs."""
    payload = {
        "regime_name": "NEW_REGIME",
        "pf_percentage": 12.0,
        "standard_deduction": 50000.0,
        "health_cess": 4.0,
        "tax_slabs": [
            {"min_income": 0, "max_income": 300000, "tax_rate": 0, "base_tax": 0},
            {"min_income": 300000, "max_income": 600000, "tax_rate": 0.05, "base_tax": 0},
        ],
    }
    response = auth_client.post(PAYROLL_CONFIG_URL, payload, format="json")
    assert response.status_code == 201

    data = response.json()
    assert data["regime_name"] == "NEW_REGIME"
    assert len(data["tax_slabs"]) == 2


@pytest.mark.django_db
def test_create_config_deactivates_old(auth_client):
    """POST /payroll/config/ deactivates previous active config."""
    old = PayrollComplianceConfig.objects.create(regime_name="OLD", is_active=True)

    payload = {"regime_name": "NEW", "pf_percentage": 10.0}
    response = auth_client.post(PAYROLL_CONFIG_URL, payload, format="json")
    assert response.status_code == 201

    old.refresh_from_db()
    assert old.is_active is False


# ── Unauthenticated ──────────────────────────────────────────────────


@pytest.mark.django_db
def test_unauthenticated_payroll(api_client):
    """Unauthenticated request returns 403."""
    response = api_client.get(PAYROLL_URL)
    assert response.status_code == 403
