"""Unit tests for the payroll calculation engine."""

from decimal import Decimal

import pytest

from apps.payroll.engine import (
    calculate_dynamic_tax,
    calculate_net_salary,
    calculate_pf_contributions,
)


class TestCalculateNetSalary:

    def test_basic_calculation(self):
        result = calculate_net_salary(
            basic_salary=50000,
            allowances=5000,
            pf_deduction=6000,
            tax=2000,
        )
        # gross = 50000 + 5000 = 55000, deductions = 6000 + 2000 = 8000
        assert result == Decimal("47000.00")

    def test_all_components(self):
        result = calculate_net_salary(
            basic_salary=60000,
            allowances=10000,
            arrears=5000,
            reimbursements=2000,
            pf_deduction=7200,
            tax=3000,
            other_ded=1000,
            loans_advances=2000,
        )
        # gross = 60000 + 10000 + 5000 + 2000 = 77000
        # deductions = 7200 + 3000 + 1000 + 2000 = 13200
        assert result == Decimal("63800.00")

    def test_zero_deductions(self):
        result = calculate_net_salary(basic_salary=50000)
        assert result == Decimal("50000.00")

    def test_string_inputs(self):
        result = calculate_net_salary(basic_salary="50000.50", tax="1000.25")
        assert result == Decimal("49000.25")


class TestCalculatePFContributions:

    def test_default_rate(self):
        result = calculate_pf_contributions(50000)
        assert result["employee_contribution"] == Decimal("6000")
        assert result["employer_contribution"] == Decimal("6000")
        assert result["total_contribution"] == Decimal("12000")

    def test_custom_rate(self):
        result = calculate_pf_contributions(50000, pf_percentage=10.0)
        assert result["employee_contribution"] == Decimal("5000")

    def test_small_salary(self):
        result = calculate_pf_contributions(15000)
        assert result["employee_contribution"] == Decimal("1800")


class FakeConfig:
    """Minimal config object for tax calculation tests."""

    def __init__(self, standard_deduction=50000, health_cess=4.0, slabs=None):
        self.standard_deduction = standard_deduction
        self.health_cess = health_cess
        self._slabs = slabs or []

    @property
    def tax_slabs(self):
        return self

    def order_by(self, field):
        return sorted(self._slabs, key=lambda s: s.min_income)


class FakeSlab:
    def __init__(self, min_income, max_income, tax_rate, base_tax=0):
        self.min_income = min_income
        self.max_income = max_income
        self.tax_rate = tax_rate
        self.base_tax = base_tax


class TestCalculateDynamicTax:

    def test_below_standard_deduction(self):
        config = FakeConfig(standard_deduction=50000, slabs=[])
        result = calculate_dynamic_tax(40000, config)
        assert result["tax_amount"] == Decimal("0")
        assert result["effective_rate"] == 0.0

    def test_simple_slab(self):
        slabs = [
            FakeSlab(min_income=0, max_income=300000, tax_rate=0.05, base_tax=0),
        ]
        config = FakeConfig(standard_deduction=50000, health_cess=4.0, slabs=slabs)

        # annual_salary=600000, taxable=550000
        # slab: 0-300000 at 5% => base_tax(0) + 550000*0.05 = 27500
        # cess: 27500 * 4% = 1100 => total = 28600
        # monthly = 28600 / 12 ≈ 2383
        result = calculate_dynamic_tax(600000, config)
        assert result["tax_amount"] > 0
        assert result["effective_rate"] > 0

    def test_progressive_slabs(self):
        slabs = [
            FakeSlab(min_income=0, max_income=300000, tax_rate=0, base_tax=0),
            FakeSlab(min_income=300000, max_income=600000, tax_rate=0.05, base_tax=0),
            FakeSlab(min_income=600000, max_income=900000, tax_rate=0.10, base_tax=15000),
        ]
        config = FakeConfig(standard_deduction=50000, health_cess=4.0, slabs=slabs)

        # annual=1000000, taxable=950000
        # Highest applicable slab: 600000 -> base_tax=15000 + (950000-600000)*0.10 = 15000+35000 = 50000
        # cess: 50000 * 4% = 2000, total = 52000
        # monthly = 52000 / 12 ≈ 4333
        result = calculate_dynamic_tax(1000000, config)
        assert result["tax_amount"] == Decimal("4333")
        assert result["effective_rate"] > 0
