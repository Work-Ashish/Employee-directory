"""
Payroll calculation engine.

Pure functions that compute salary components — no database access.
All monetary inputs are converted to Decimal for precision.
"""

from decimal import Decimal, ROUND_HALF_UP


def calculate_net_salary(
    basic_salary,
    allowances=0,
    arrears=0,
    reimbursements=0,
    pf_deduction=0,
    tax=0,
    other_ded=0,
    loans_advances=0,
):
    """Return net salary = gross earnings - total deductions."""
    gross = (
        Decimal(str(basic_salary))
        + Decimal(str(allowances))
        + Decimal(str(arrears))
        + Decimal(str(reimbursements))
    )
    deductions = (
        Decimal(str(pf_deduction))
        + Decimal(str(tax))
        + Decimal(str(other_ded))
        + Decimal(str(loans_advances))
    )
    return (gross - deductions).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def calculate_pf_contributions(basic_salary, pf_percentage=12.0):
    """
    Calculate employee and employer PF contributions.

    Both sides contribute the same percentage of basic salary.
    Returns dict with employee_contribution, employer_contribution,
    and total_contribution.
    """
    rate = Decimal(str(pf_percentage)) / Decimal('100')
    base = Decimal(str(basic_salary))
    emp = (base * rate).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
    return {
        'employee_contribution': emp,
        'employer_contribution': emp,
        'total_contribution': emp + emp,
    }


def calculate_dynamic_tax(annual_salary, config):
    """
    Calculate monthly income tax using progressive slab rates.

    Steps:
    1. Subtract standard deduction from annual salary to get taxable income.
    2. Walk through ordered tax slabs to find the applicable bracket.
    3. Add Health & Education Cess on top.
    4. Divide annual tax by 12 to get monthly deduction.

    Args:
        annual_salary: Gross annual salary (numeric).
        config: A PayrollComplianceConfig instance with related tax_slabs.

    Returns:
        dict with 'tax_amount' (monthly Decimal) and 'effective_rate' (float).
    """
    taxable = Decimal(str(annual_salary)) - Decimal(str(config.standard_deduction))

    if taxable <= 0:
        return {'tax_amount': Decimal('0'), 'effective_rate': 0.0}

    slabs = list(config.tax_slabs.order_by('min_income'))
    tax = Decimal('0')

    for slab in slabs:
        slab_min = Decimal(str(slab.min_income))
        if slab_min <= taxable:
            excess = taxable - slab_min
            tax = Decimal(str(slab.base_tax)) + excess * Decimal(str(slab.tax_rate))

    # Health & Education Cess
    cess = tax * Decimal(str(config.health_cess)) / Decimal('100')
    tax += cess

    monthly = (tax / 12).quantize(Decimal('1'), rounding=ROUND_HALF_UP)

    effective_rate = (
        float(tax / Decimal(str(annual_salary)))
        if annual_salary > 0
        else 0.0
    )

    return {
        'tax_amount': monthly,
        'effective_rate': round(effective_rate, 4),
    }
